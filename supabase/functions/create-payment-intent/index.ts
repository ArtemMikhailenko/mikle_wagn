import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { amount, currency = 'eur', payment_method_id, customer_email, billing_details } = await req.json()

    // Создаем PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: payment_method_id,
      confirm: true,
      receipt_email: customer_email,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        customer_email,
        billing_name: billing_details?.name || '',
      },
    })

    // Сохраняем информацию о платеже в базу данных только после успешного подтверждения
    // В реальном приложении это будет обрабатываться через webhooks
    try {
      await supabaseClient.from('orders').insert({
        stripe_payment_intent_id: paymentIntent.id,
        amount: amount / 100, // конвертируем из центов
        currency,
        customer_email,
        billing_details,
        status: 'pending', // начальный статус
        created_at: new Date().toISOString(),
      })
    } catch (dbError) {
      console.warn('Database insert failed:', dbError)
      // Не прерываем процесс, если база данных недоступна
    }

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
