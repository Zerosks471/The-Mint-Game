import Stripe from 'stripe';
import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const MINT_COINS_ON_SUBSCRIBE = 500;

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

export class SubscriptionService {
  async createCheckoutSession(
    userId: string,
    plan: 'monthly' | 'annual'
  ): Promise<{ checkoutUrl: string }> {
    const stripe = getStripe();

    const priceId =
      plan === 'monthly' ? config.STRIPE_PRICE_MONTHLY : config.STRIPE_PRICE_ANNUAL;

    if (!priceId) {
      throw new AppError(
        ErrorCodes.SERVICE_UNAVAILABLE,
        `Stripe price not configured for ${plan} plan`,
        503
      );
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.APP_URL}/subscription/cancel`,
      metadata: { userId: user.id, plan },
      subscription_data: {
        metadata: { userId: user.id, plan },
      },
    });

    if (!session.url) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create checkout session', 500);
    }

    return { checkoutUrl: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const stripe = getStripe();

    if (!config.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(ErrorCodes.SERVICE_UNAVAILABLE, 'Webhook secret not configured', 503);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, config.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError(ErrorCodes.INVALID_INPUT, 'Invalid webhook signature', 400);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'monthly' | 'annual';

    if (!userId || !session.subscription) {
      console.error('Missing userId or subscription in checkout session');
      return;
    }

    const stripe = getStripe();

    // Retrieve subscription details with items expanded
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
      expand: ['items.data'],
    });

    // In Stripe v20+, period info is on subscription items
    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      console.error('No subscription items found');
      return;
    }
    const periodStart = new Date(firstItem.current_period_start * 1000);
    const periodEnd = new Date(firstItem.current_period_end * 1000);

    await prisma.$transaction(async (tx) => {
      // Create subscription record
      await tx.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        create: {
          userId,
          planId: plan === 'monthly' ? 'premium_monthly' : 'premium_annual',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        update: {
          status: subscription.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      // Update user premium status
      await tx.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumUntil: periodEnd,
        },
      });

      // Grant Mint Coins on first subscription
      await tx.playerStats.update({
        where: { userId },
        data: {
          premiumCurrency: { increment: MINT_COINS_ON_SUBSCRIBE },
        },
      });
    });

    console.log(`Premium activated for user ${userId}, granted ${MINT_COINS_ON_SUBSCRIBE} coins`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.error('Missing userId in subscription metadata');
      return;
    }

    // In Stripe v20+, period info is on subscription items
    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      console.error('No subscription items found');
      return;
    }
    const periodStart = new Date(firstItem.current_period_start * 1000);
    const periodEnd = new Date(firstItem.current_period_end * 1000);

    await prisma.$transaction(async (tx) => {
      // Update subscription record
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
        },
      });

      // Update user premium status if still active
      if (subscription.status === 'active') {
        await tx.user.update({
          where: { id: userId },
          data: {
            isPremium: true,
            premiumUntil: periodEnd,
          },
        });
      }
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.error('Missing userId in subscription metadata');
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update subscription record
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
        },
      });

      // Remove premium status
      await tx.user.update({
        where: { id: userId },
        data: {
          isPremium: false,
          premiumUntil: null,
        },
      });
    });

    console.log(`Premium deactivated for user ${userId}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    console.warn(`Payment failed for customer ${customerId}`);
    // TODO: Send email notification to user
  }

  async getSubscriptionStatus(userId: string): Promise<{
    isPremium: boolean;
    plan: 'monthly' | 'annual' | null;
    expiresAt: Date | null;
    cancelAtPeriodEnd: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumUntil: true },
    });

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isPremium: user.isPremium,
      plan: subscription
        ? subscription.planId === 'premium_monthly'
          ? 'monthly'
          : 'annual'
        : null,
      expiresAt: user.premiumUntil,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    };
  }

  async createPortalSession(userId: string): Promise<{ portalUrl: string }> {
    const stripe = getStripe();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'No billing account found', 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.APP_URL}/stats`,
    });

    return { portalUrl: session.url };
  }
}

export const subscriptionService = new SubscriptionService();
