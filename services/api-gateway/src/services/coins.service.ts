import Stripe from 'stripe';
import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

// Coin package definitions
export interface CoinPackage {
  id: string;
  coins: number;
  price: number; // in cents
  bonus: number | null; // percentage bonus
  label: string | null; // "Popular", "Best Value", etc.
}

const COIN_PACKAGES: CoinPackage[] = [
  { id: 'coins_100', coins: 100, price: 99, bonus: null, label: null },
  { id: 'coins_550', coins: 550, price: 499, bonus: 10, label: 'Popular' },
  { id: 'coins_1200', coins: 1200, price: 999, bonus: 20, label: 'Best Value' },
  { id: 'coins_2600', coins: 2600, price: 1999, bonus: 30, label: null },
];

function getStripe(): Stripe {
  if (!config.STRIPE_SECRET_KEY) {
    throw new AppError(
      ErrorCodes.SERVICE_UNAVAILABLE,
      'Stripe is not configured. Set STRIPE_SECRET_KEY in environment.',
      503
    );
  }
  return new Stripe(config.STRIPE_SECRET_KEY);
}

export class CoinsService {
  /**
   * Get all available coin packages with user's current balance
   */
  async getPackages(userId: string): Promise<{ packages: CoinPackage[]; balance: number }> {
    const stats = await prisma.playerStats.findUnique({
      where: { userId },
      select: { premiumCurrency: true },
    });

    return {
      packages: COIN_PACKAGES,
      balance: stats?.premiumCurrency ?? 0,
    };
  }

  /**
   * Create a Stripe Checkout session for coin purchase
   */
  async createCheckoutSession(
    userId: string,
    packageId: string
  ): Promise<{ checkoutUrl: string }> {
    const stripe = getStripe();

    // Validate package
    const coinPackage = COIN_PACKAGES.find((p) => p.id === packageId);
    if (!coinPackage) {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'Invalid package ID', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${coinPackage.coins} Mint Coins`,
              description: coinPackage.bonus
                ? `Includes ${coinPackage.bonus}% bonus!`
                : 'Premium currency for The Mint',
            },
            unit_amount: coinPackage.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${config.APP_URL}/coins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.APP_URL}/shop`,
      metadata: {
        userId: user.id,
        packageId: coinPackage.id,
        coins: coinPackage.coins.toString(),
        type: 'coin_purchase',
      },
    });

    if (!session.url) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create checkout session', 500);
    }

    return { checkoutUrl: session.url };
  }

  /**
   * Handle webhook for coin purchase fulfillment
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = getStripe();

    if (!config.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Stripe webhook secret not configured',
        503
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'Invalid webhook signature', 400);
    }

    // Only handle coin purchases (check metadata.type)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if this is a coin purchase
      if (session.metadata?.type !== 'coin_purchase') {
        // Not a coin purchase, ignore (let subscription webhook handle it)
        return;
      }

      await this.fulfillCoinPurchase(session);
    }
  }

  /**
   * Grant coins to user after successful payment
   */
  private async fulfillCoinPurchase(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const coins = parseInt(session.metadata?.coins || '0', 10);

    if (!userId || !coins) {
      // Log failed purchase for admin review instead of silently failing
      console.error('Invalid coin purchase metadata:', session.metadata);
      await prisma.failedPurchase.create({
        data: {
          stripeSessionId: session.id,
          userId: session.metadata?.userId || null,
          packageId: session.metadata?.packageId || null,
          coins: coins || null,
          errorReason: !userId ? 'Missing userId' : 'Missing coins amount',
          metadata: session.metadata as any,
        },
      });
      // Throw error to trigger Stripe retry
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid coin purchase metadata - logged for admin review',
        400
      );
    }

    // Check if already fulfilled (idempotency)
    const existingPurchase = await prisma.coinPurchase.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (existingPurchase) {
      console.log('Coin purchase already fulfilled:', session.id);
      return;
    }

    // Grant coins and record purchase
    await prisma.$transaction(async (tx) => {
      // Add coins to player
      await tx.playerStats.update({
        where: { userId },
        data: { premiumCurrency: { increment: coins } },
      });

      // Record purchase for idempotency
      await tx.coinPurchase.create({
        data: {
          userId,
          stripeSessionId: session.id,
          packageId: session.metadata?.packageId || 'unknown',
          coins,
          amountPaid: session.amount_total || 0,
        },
      });
    });

    console.log(`Granted ${coins} coins to user ${userId}`);
  }
}

export const coinsService = new CoinsService();
