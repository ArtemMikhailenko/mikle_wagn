import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Nontel Receipt Generator',
    version: '1.0.0',
  },
});

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    let payment_intent_id: string;

    // POST request - получаем из body
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await req.json();
      payment_intent_id = body.payment_intent_id;
    } else {
      // Try to parse as JSON anyway
      try {
        const body = await req.json();
        payment_intent_id = body.payment_intent_id;
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid request format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'payment_intent_id ist erforderlich' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // PaymentIntent von Stripe abrufen
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (!paymentIntent) {
      return new Response(
        JSON.stringify({ error: 'PaymentIntent nicht gefunden' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Einfache HTML-Quittung generieren
    const receiptHtml = generateReceiptHtml(paymentIntent);

    // Возвращаем HTML с заголовками для скачивания
    return new Response(receiptHtml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="quittung-${payment_intent_id}.html"`,
      },
    });

  } catch (error) {
    console.error('Fehler beim Generieren der Quittung:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Fehler beim Generieren der Quittung',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateReceiptHtml(paymentIntent: any): string {
  const amount = (paymentIntent.amount / 100).toFixed(2);
  const currency = paymentIntent.currency.toUpperCase();
  const date = new Date(paymentIntent.created * 1000).toLocaleDateString('de-DE');
  const time = new Date(paymentIntent.created * 1000).toLocaleTimeString('de-DE');
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quittung - ${paymentIntent.id}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 5px;
        }
        .receipt-title {
            font-size: 20px;
            margin-bottom: 20px;
            color: #333;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 30px;
        }
        .detail-item {
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .detail-label {
            font-weight: bold;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .detail-value {
            font-size: 14px;
            color: #333;
        }
        .amount-section {
            background-color: #e8f5e8;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
        .amount {
            font-size: 32px;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 5px;
        }
        .status {
            color: #28a745;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
        }
        .footer {
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        @media print {
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">Nontel</div>
        <div style="color: #666; font-size: 14px;">Premium Neon-Schilder</div>
        <div class="receipt-title">Zahlungsquittung</div>
    </div>

    <div class="details-grid">
        <div class="detail-item">
            <div class="detail-label">Quittungs-Nr.</div>
            <div class="detail-value">${paymentIntent.id}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Datum</div>
            <div class="detail-value">${date}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Uhrzeit</div>
            <div class="detail-value">${time}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Zahlungsmethode</div>
            <div class="detail-value">Kreditkarte</div>
        </div>
    </div>

    <div class="amount-section">
        <div class="amount">${amount} ${currency}</div>
        <div class="status">✓ Erfolgreich bezahlt</div>
    </div>

    <div class="footer">
        <p><strong>Nontel - Premium Neon-Schilder</strong></p>
        <p>Diese Quittung wurde automatisch generiert.</p>
        <p>Bei Fragen kontaktieren Sie uns: support@nontel.de</p>
        <p>Generiert am: ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
    </div>
</body>
</html>
  `;
}
