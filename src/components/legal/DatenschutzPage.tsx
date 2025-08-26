import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DatenschutzPage: React.FC = () => {
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
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Datenschutzerklärung (B2B)</h1>
            </div>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Datenschutzerklärung</h2>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">1. Grundsätzliche Hinweise</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Soweit nachstehend keine anderen Angaben gemacht werden, ist die Bereitstellung Ihrer personenbezogenen Daten weder gesetzlich noch vertraglich vorgeschrieben, noch für einen Vertragsabschluss zwingend erforderlich. 
              Sie sind zur Bereitstellung der Daten nicht verpflichtet. Eine Nichtbereitstellung kann jedoch dazu führen, dass wir Ihren Auftrag nicht ausführen können.
              "Personenbezogene Daten" sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.
              Im B2B-Bereich verarbeiten wir zudem häufig Unternehmensdaten (z. B. Firmenname, USt-ID, Ansprechpartner).
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">2. Verantwortlicher</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 font-medium">Nontel</p>
              <p className="text-gray-600">Inhaber: Michael Wagner</p>
              <p className="text-gray-600">Hermann-Wehrle-Straße 10</p>
              <p className="text-gray-600">67433 Neustadt an der Weinstraße</p>
              <p className="text-gray-600">📞 +49 163 1661464</p>
              <p className="text-gray-600">📧 info@nontel.de</p>
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">3. Server-Logfiles</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Beim Aufrufen unserer Website werden automatisch folgende Daten erfasst und in sog. Server-Logfiles gespeichert: aufgerufene Seite/Datei, Datum und Uhrzeit des Zugriffs, IP-Adresse, übertragene Datenmenge, verwendeter Browser, anfragender Provider.
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an stabiler und sicherer Funktion unserer Website).
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">4. Kontaktaufnahme</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wenn Sie uns per E-Mail oder über das Kontaktformular kontaktieren, verarbeiten wir Ihre Kontaktdaten ausschließlich zur Bearbeitung Ihrer Anfrage, Angebotserstellung oder Vertragsabwicklung.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">5. Verarbeitung bei Datei-Upload</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Für die Herstellung individueller Schilder stellen wir Ihnen einen gesicherten Datei-Upload (Google Drive, Monday.com) zur Verfügung.
              Hochgeladene Dateien werden ausschließlich zur Auftragsabwicklung und Designproduktion verwendet.
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">6. WhatsApp Business</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wir nutzen WhatsApp Business zur schnellen Kommunikation mit Geschäftskunden.
              Ihre Telefonnummer, Nachrichteninhalte und ggf. bereitgestellte Dateien werden im Rahmen der Auftragsbearbeitung genutzt.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">7. CRM- und Prozessautomatisierung</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wir verarbeiten Kundendaten in Monday.com, Zapier und Perspective ausschließlich zur Projektabwicklung, Angebotserstellung, Produktionsplanung und Nachverfolgung.
              Datenverarbeitung erfolgt auf Grundlage von Auftragsverarbeitungsverträgen.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">8. Bestell- und Zahlungsabwicklung</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Für die Abwicklung Ihrer Bestellung verarbeiten wir Unternehmens- und Rechnungsdaten, Ansprechpartner, Bestell- und Produktdaten sowie Lieferadressen.
              Daten werden an Versand- und Zahlungsdienstleister übermittelt.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">9. Cookies & Tracking</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wir verwenden technisch notwendige Cookies sowie – nach Einwilligung – Analyse- und Marketing-Tools (Google Analytics 4, Meta Pixel, TikTok Pixel).
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">10. Rechte der betroffenen Personen</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch sowie Datenübertragbarkeit.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">11. Speicherdauer</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wir speichern personenbezogene Daten so lange, wie sie für die Erfüllung des Vertragszwecks erforderlich sind. 
              Gesetzliche Aufbewahrungsfristen bleiben unberührt.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">12. Internationale Datenübermittlung</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wir nutzen teilweise Dienstleister mit Sitz außerhalb der EU. Übermittlungen erfolgen nur bei Vorliegen eines Angemessenheitsbeschlusses oder geeigneter Garantien.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">13. Beschwerderecht</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sie können sich jederzeit bei einer Datenschutzaufsichtsbehörde beschweren. Zuständig für uns ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">14. Aktualisierung</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Stand: 15. August 2025. Wir behalten uns vor, diese Datenschutzerklärung jederzeit zu aktualisieren.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-blue-800 text-sm">
                <strong>Hinweis:</strong> Diese Datenschutzerklärung richtet sich an Geschäftskunden (B2B) für individuelle Schilderbestellungen und sollte vor Nutzung rechtlich geprüft werden.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatenschutzPage;