import { supabase } from '../lib/supabase';

export type PaidOrder = {
  id: string;
  createdAt: string;
  source: 'stripe_orders' | 'orders';
  status: string;
  currency: string;
  amountGross: number; // in EUR
  customerEmail?: string | null;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  items?: any[] | null;
  billingName?: string | null;
  billingAddress?: {
    line1?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

function centsToEur(v?: number | null): number {
  if (!v && v !== 0) return 0;
  return Math.round(v) / 100;
}

export async function getPaidOrders(): Promise<PaidOrder[]> {
  // In demo mode supabase client is mocked; return empty list gracefully
  try {
    const [stripeOrdersRes, legacyOrdersRes] = await Promise.all([
      // stripe_orders created by webhook
      (supabase as any).from?.('stripe_orders')?.select?.('*').order?.('created_at', { ascending: false }),
      // legacy orders inserted at payment intent creation
      (supabase as any).from?.('orders')?.select?.('*').order?.('created_at', { ascending: false })
    ]);

    const stripeOrdersRows = stripeOrdersRes?.data || [];
    const legacyOrdersRows = legacyOrdersRes?.data || [];

    const stripePaid = stripeOrdersRows
      .filter((r: any) => (r.payment_status || '').toLowerCase() === 'paid' || r.status === 'completed')
      .map((r: any) => ({
        id: r.id?.toString?.() || r.checkout_session_id,
        createdAt: r.created_at,
        source: 'stripe_orders' as const,
        status: r.status || r.payment_status || 'paid',
        currency: r.currency || 'eur',
        amountGross: centsToEur(r.amount_total ?? r.amount_subtotal),
        customerEmail: r.customer_email || null,
        paymentIntentId: r.payment_intent_id || null,
        checkoutSessionId: r.checkout_session_id || null,
        items: r.items || null,
        billingName: r.billing_name || null,
        billingAddress: r.billing_address || null,
      }));

    const legacyPaid = legacyOrdersRows
      .filter((r: any) => (r.status || '').toLowerCase() === 'succeeded' || (r.status || '').toLowerCase() === 'paid' || (r.status || '').toLowerCase() === 'completed')
      .map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        source: 'orders' as const,
        status: r.status || 'paid',
        currency: r.currency || 'eur',
        amountGross: Number(r.amount ?? 0),
        customerEmail: r.customer_email || null,
        paymentIntentId: r.stripe_payment_intent_id || null,
        checkoutSessionId: null,
        items: null,
        billingName: (r.billing_details?.name) || null,
        billingAddress: r.billing_details?.address || null,
      }));

    const merged: PaidOrder[] = [...stripePaid, ...legacyPaid]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return merged;
  } catch (e) {
    console.warn('getPaidOrders failed (likely demo mode):', e);
    return [];
  }
}

export function formatCurrency(amount: number, currency: string = 'eur') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
}
