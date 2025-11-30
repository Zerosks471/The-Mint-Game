import { apiClient } from './client';

export interface CheckoutResponse {
  checkoutUrl: string;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  plan: 'monthly' | 'annual' | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PortalResponse {
  portalUrl: string;
}

export async function createCheckoutSession(plan: 'monthly' | 'annual') {
  const response = await apiClient.post<CheckoutResponse>('/subscriptions/checkout', { plan });
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to create checkout session');
  }
  return response.data;
}

export async function getSubscriptionStatus() {
  const response = await apiClient.get<SubscriptionStatus>('/subscriptions/status');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get subscription status');
  }
  return response.data;
}

export async function createPortalSession() {
  const response = await apiClient.post<PortalResponse>('/subscriptions/portal');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to create portal session');
  }
  return response.data;
}
