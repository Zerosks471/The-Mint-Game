import { apiClient } from './client';

export interface CoinPackage {
  id: string;
  coins: number;
  price: number; // in cents
  bonus: number | null;
  label: string | null;
}

export interface PackagesResponse {
  packages: CoinPackage[];
  balance: number;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

export async function getPackages() {
  const response = await apiClient.get<PackagesResponse>('/coins/packages');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get coin packages');
  }
  return response.data;
}

export async function createCoinCheckout(packageId: string) {
  const response = await apiClient.post<CheckoutResponse>('/coins/checkout', { packageId });
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to create checkout session');
  }
  return response.data;
}
