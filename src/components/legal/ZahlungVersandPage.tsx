import React from 'react';
import { ArrowLeft, CreditCard, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ZahlungVersandPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Zurück</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Zahlung und Versand</h1>
            </div>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Zahlung und Versand (B2B)</h2>
            
            {/* Liefergebiet */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Liefergebiet:</h3>
              <p className="text-gray-600 leading-relaxed">
                Die Lieferung erfolgt ausschließlich innerhalb Deutschlands.
              </p>
            </div>

            {/* Versandoptionen & Preise */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Versandoptionen & Preise</h3>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Selbstabholung – kostenlos in 67433 Neustadt</h4>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">DHL-Versand (bis 120 cm) – €20,00 bis €80,00</h4>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Spedition (120–240 cm) – €160,00</h4>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Persönliche Lieferung (ab 240 cm) – Preis nach Entfernung</h4>
                </div>
              </div>
              
              <p className="text-gray-600 mt-4 font-medium">
                Alle Preise verstehen sich zzgl. gesetzlicher MwSt.
              </p>
            </div>

            {/* Lieferzeiten */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Lieferzeiten</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-800">Standard:</span>
                  <span className="text-gray-600">2–3 Wochen</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium text-gray-800">Express:</span>
                  <span className="text-orange-600">4–6 Tage (gegen Aufpreis)</span>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800 text-sm leading-relaxed">
                  Die Lieferzeit beginnt nach Freigabe des finalen Mock-ups und Zahlungseingang. An Sonn- und Feiertagen erfolgt keine Zustellung.
                  Werden mehrere Produkte mit unterschiedlichen Lieferzeiten bestellt, gilt die längste Lieferzeit für die gesamte Sendung, sofern nichts anderes vereinbart wurde.
                </p>
              </div>
            </div>

            {/* Zahlungsmöglichkeiten */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Zahlungsmöglichkeiten</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">PayPal & PayPal Express</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Kreditkarte (Visa, Mastercard)</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Klarna (Rechnung, Sofortüberweisung, Ratenkauf, Lastschrift)</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Google Pay</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Apple Pay</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Revolut</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Link (Stripe)</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Banküberweisung (Vorkasse)</span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 mt-4 leading-relaxed">
                Bei Selbstabholung erfolgt die Zahlung im Voraus, es fallen keine Versandkosten an.
              </p>
            </div>

            {/* Hinweis */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600 text-lg">💡</span>
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-2">Hinweis:</h4>
                  <p className="text-yellow-800 text-sm leading-relaxed">
                    Individuell angefertigte Neon-Schilder sind von Umtausch und Widerruf ausgeschlossen (§ 312g Abs. 2 Nr. 1 BGB). 
                    Änderungen am Design sind nach Bestätigung des Mock-ups nicht mehr möglich.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZahlungVersandPage;