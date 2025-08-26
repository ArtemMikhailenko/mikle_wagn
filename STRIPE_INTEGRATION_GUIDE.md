# Stripe Integration Guide

## Übersicht
Diese Anwendung integriert Stripe für sichere Zahlungsabwicklung. Die Integration unterstützt sowohl Produktions- als auch Demo-Modi.

## Setup

### 1. Stripe Account Setup
1. Registrieren Sie sich bei [Stripe](https://stripe.com)
2. Holen Sie sich Ihre API-Schlüssel aus dem Stripe Dashboard
3. Für Tests verwenden Sie die Test-Schlüssel (beginnen mit `pk_test_` und `sk_test_`)

### 2. Umgebungsvariablen
Aktualisieren Sie die `.env` Datei:

```env
# Stripe Integration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key
```

**Wichtig:** Verwenden Sie nie den Secret Key im Frontend. Dieser gehört nur auf den Server!

### 3. Supabase Edge Function (Optional)
Für Produktions-Deployments erstellen Sie eine Supabase Edge Function:

```bash
cd supabase/functions/create-payment-intent
supabase functions deploy create-payment-intent
```

## Verwendung

### Test-Seite
Besuchen Sie `/test/stripe` um die Stripe-Integration zu testen.

**Test-Kreditkarten:**
- **Visa:** 4242 4242 4242 4242
- **Visa (Debit):** 4000 0566 5566 5556
- **Mastercard:** 5555 5555 5555 4444
- **Ablaufdatum:** Beliebige Zukunft (z.B. 12/25)
- **CVC:** Beliebige 3 Ziffern (z.B. 123)

### Demo vs. Produktions-Modus

#### Demo-Modus
- Verwendet mock PaymentIntents
- Keine echten Transaktionen
- Funktioniert ohne Server-Setup
- Ideal für Entwicklung und Tests

#### Produktions-Modus
- Echte Stripe-Integration
- Benötigt Supabase Edge Functions
- Echte Transaktionen
- Vollständige Webhook-Unterstützung

## Komponenten

### StripeProvider
Wrapper-Komponente, die Stripe Elements bereitstellt:
```tsx
<StripeProvider>
  <YourPaymentComponent />
</StripeProvider>
```

### StripeCheckoutForm
Vollständiges Checkout-Formular mit:
- Kreditkarten-Input
- Rechnungsinformationen
- Fehlerbehandlung
- Success/Error Callbacks

### CartCheckout Integration
Der CartCheckout-Komponente wurde Stripe-Unterstützung hinzugefügt:
- Integriertes Stripe-Modal
- Bestellübersicht
- Automatische Preisberechnung

## Sicherheit

### Frontend (Public Key)
- Nur der Publishable Key wird im Frontend verwendet
- Niemals Secret Keys im Client-Code
- Alle sensiblen Operationen auf dem Server

### Backend (Secret Key)
- Secret Key nur in Supabase Edge Functions
- Sichere PaymentIntent-Erstellung
- Webhook-Signatur-Verifikation

## Webhooks (Optional)

Für vollständige Integration können Sie Stripe Webhooks einrichten:

1. **Webhook-Endpunkt:** `https://your-project.supabase.co/functions/v1/stripe-webhook`
2. **Events zu überwachen:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`

## Troubleshooting

### Häufige Probleme

**Stripe nicht geladen:**
- Überprüfen Sie den `VITE_STRIPE_PUBLISHABLE_KEY`
- Stellen Sie sicher, dass der Key mit `pk_` beginnt

**Demo-Modus aktiviert:**
- Dies passiert wenn kein gültiger Stripe-Key konfiguriert ist
- Der Demo-Modus funktioniert ohne echte Zahlungen

**PaymentIntent Fehler:**
- Überprüfen Sie die Supabase Edge Function
- Prüfen Sie die Server-Logs
- Stellen Sie sicher, dass der Secret Key korrekt konfiguriert ist

### Debug-Modus
Öffnen Sie die Browser-Konsole für detaillierte Logs:
```javascript
// Stripe Debug-Informationen
console.log('Stripe available:', !!window.Stripe);
console.log('Demo mode:', !isStripeAvailable());
```

## Deployment

### Entwicklung
```bash
npm run dev
# Besuchen Sie http://localhost:5174/test/stripe
```

### Produktion
1. Ersetzen Sie Test-Keys durch Live-Keys
2. Deployen Sie Supabase Edge Functions
3. Konfigurieren Sie Webhooks
4. Testen Sie mit echten (kleinen) Beträgen

## Support

Bei Problemen:
1. Überprüfen Sie die Stripe-Dashboard-Logs
2. Prüfen Sie die Browser-Konsole
3. Konsultieren Sie die [Stripe-Dokumentation](https://stripe.com/docs)
4. Prüfen Sie die Supabase-Logs bei Server-Problemen
