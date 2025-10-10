import React, { useEffect, useState } from 'react';
import LottieLoader from './LottieLoader';
import { useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
import { CheckCircle, ArrowLeft, Download, Mail } from 'lucide-react';

interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  receipt_email?: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    if (paymentIntentId) {
      fetchPaymentDetails();
    }
  }, [paymentIntentId]);

  const fetchPaymentDetails = async () => {
    try {
      // In einem echten System würden wir hier die Zahlungsdetails vom Server abrufen
      setPaymentDetails({
        id: paymentIntentId || '',
        amount: 0, // Könnte aus localStorage oder Server abgerufen werden
        currency: 'eur',
        status: 'succeeded',
        created: Date.now(),
      });
    } catch (err) {
      setError('Fehler beim Laden der Zahlungsinformationen');
    } finally {
      setLoading(false);
    }
  };

    const handleDownloadReceipt = async () => {
    if (paymentIntentId) {
      try {
        console.log('Скачиваем чек для:', paymentIntentId);
        
        // Используем supabase client для вызова функции
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ payment_intent_id: paymentIntentId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Ошибка ответа:', errorData);
          alert('Ошибка при создании чека: ' + errorData.error);
          return;
        }
        
        // Получаем HTML контент
        const htmlContent = await response.text();
        console.log('Получили HTML чек');
        
        // Создаем blob и скачиваем
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `quittung-${paymentIntentId}.html`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log('Чек скачан успешно');
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при создании чека: ' + (error as Error).message);
      }
    } else {
      alert('Не найден ID платежа');
    }
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
            <LottieLoader size={96} label="Zahlungsinformationen werden geladen..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-gray-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Fehler</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleBackToHome}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Zur Startseite zurückkehren
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Zahlung erfolgreich!</h1>
          <p className="text-gray-600">Vielen Dank für Ihre Bestellung. Wir haben Ihre Zahlung erhalten.</p>
        </div>

        {/* Payment Details */}
        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Zahlungsdetails</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Zahlungs-ID:</span>
                <span className="font-mono text-gray-800 text-xs">{paymentDetails.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-semibold">Erfolgreich</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Datum:</span>
                <span className="text-gray-800">{new Date().toLocaleDateString('de-DE')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Wie geht es weiter?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Wir senden Ihnen eine Bestätigung per E-Mail</li>
            <li>• Ihre Bestellung geht in die Produktion</li>
            <li>• Wir kontaktieren Sie für Details zur Lieferung</li>
            <li>• Produktionszeit: 3-5 Werktage</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleBackToHome}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zur Startseite</span>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleDownloadReceipt}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Quittung</span>
            </button>
            <button 
              onClick={() => window.location.href = 'mailto:support@nontel.de'}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <Mail className="h-4 w-4" />
              <span>Support</span>
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Fragen? Kontaktieren Sie uns: 
            <a href="mailto:support@nontel.de" className="text-blue-600 hover:underline ml-1">
              support@nontel.de
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
