import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Инициализация Stripe с публичным ключом (с безопасной обработкой пробелов)
const rawKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const cleanedKey = typeof rawKey === 'string' ? rawKey.trim() : undefined;

if (!cleanedKey) {
  // Помогаем дебагу: нет ключа вообще
  // eslint-disable-next-line no-console
  console.warn('[Stripe] Publishable key is missing (VITE_STRIPE_PUBLISHABLE_KEY).');
}
if (cleanedKey && !cleanedKey.startsWith('pk_')) {
  // eslint-disable-next-line no-console
  console.warn('[Stripe] Publishable key does not start with pk_. Please check the value.');
}

const stripePromise = loadStripe(cleanedKey || '');

interface StripeProviderProps {
  children: React.ReactNode;
}

const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
