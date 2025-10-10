// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Simple CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Normalized order type
interface PaidOrder {
  id: string;
  createdAt: string;
  source: 'stripe_orders' | 'orders';
  status: string;
  currency: string;
  amountGross: number; // EUR
  customerEmail?: string | null;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
}

function centsToEur(v?: number | null) {
  if (typeof v !== 'number') return 0;
  return Math.round(v) / 100;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1) API key check
    const providedKey = req.headers.get('x-export-key');
    const expectedKey = Deno.env.get('ORDERS_EXPORT_KEY');
    if (!expectedKey || providedKey !== expectedKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2) Parse query params
    const url = new URL(req.url);
    const since = url.searchParams.get('since'); // ISO date
    const limit = Number(url.searchParams.get('limit') || '200');
    const onlyPaid = (url.searchParams.get('onlyPaid') ?? 'true').toLowerCase() !== 'false';

    // 3) Fetch data from both tables
    const [stripeOrdersRes, legacyOrdersRes] = await Promise.all([
      supabase.from('stripe_orders').select('*').order('created_at', { ascending: false }).limit(limit),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(limit)
    ]);

    const stripeRows = stripeOrdersRes.data ?? [];
    const legacyRows = legacyOrdersRes.data ?? [];

    // 4) Normalize
    let normalized: PaidOrder[] = [
      ...stripeRows.map((r: any) => ({
        id: r.id?.toString?.() || r.checkout_session_id,
        createdAt: r.created_at,
        source: 'stripe_orders' as const,
        status: r.status || r.payment_status || 'paid',
        currency: r.currency || 'eur',
        amountGross: centsToEur(r.amount_total ?? r.amount_subtotal),
        customerEmail: r.customer_email || null,
        paymentIntentId: r.payment_intent_id || null,
        checkoutSessionId: r.checkout_session_id || null,
      })),
      ...legacyRows.map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        source: 'orders' as const,
        status: r.status || 'paid',
        currency: r.currency || 'eur',
        amountGross: Number(r.amount ?? 0),
        customerEmail: r.customer_email || null,
        paymentIntentId: r.stripe_payment_intent_id || null,
        checkoutSessionId: null,
      })),
    ];

    // 5) Filters
    if (onlyPaid) {
      normalized = normalized.filter(o => ['paid', 'completed', 'succeeded'].includes((o.status || '').toLowerCase()));
    }

    if (since) {
      const ts = Date.parse(since);
      if (!isNaN(ts)) {
        normalized = normalized.filter(o => Date.parse(o.createdAt) >= ts);
      }
    }

    // Sort desc
    normalized.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return new Response(JSON.stringify({ count: normalized.length, orders: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('orders-export error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
