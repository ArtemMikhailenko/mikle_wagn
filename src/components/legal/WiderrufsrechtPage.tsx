import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WiderrufsrechtPage: React.FC = () => {
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
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Widerrufsrecht</h1>
            </div>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Widerrufsrecht für Unternehmer</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Wichtiger Hinweis:</strong> Diese Widerrufsbelehrung richtet sich ausschließlich an Geschäftskunden (B2B). 
                Bitte lassen Sie diese rechtlich prüfen, bevor Sie sie verwenden.
              </p>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Widerrufsbelehrung</h3>
            <h4 className="text-base font-semibold text-gray-700 mb-3">Kein gesetzliches Widerrufsrecht für Unternehmer</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Nach geltendem Recht (§ 312g Abs. 2 Nr. 1 BGB i. V. m. § 355 BGB) steht Unternehmern kein Widerrufsrecht zu.
              Das Widerrufsrecht gilt ausschließlich für Verbraucher im Sinne des § 13 BGB.
              Da unsere Verträge ausschließlich mit Geschäftskunden geschlossen werden, besteht kein gesetzlicher Anspruch auf Widerruf.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">Ausschluss des Widerrufsrechts bei individuellen Anfertigungen</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Unsere LED-Neon-Schilder werden grundsätzlich individuell nach Kundenspezifikationen gefertigt.
              Dazu zählen insbesondere:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
              <li>Anfertigung nach Logo, Schriftzug oder sonstigen grafischen Vorlagen</li>
              <li>Maßanfertigungen nach individuellen Größenangaben</li>
              <li>Wahl spezieller Neonfarben, Materialien oder Montagearten</li>
              <li>Kombination mehrerer Sonderoptionen (z. B. wasserdicht, Expressproduktion, spezielle Befestigungssysteme)</li>
            </ul>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Gemäß § 312g Abs. 2 Nr. 1 BGB ist das Widerrufsrecht ausgeschlossen bei Waren,
              die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Kunden maßgeblich ist oder die eindeutig auf persönliche Bedürfnisse zugeschnitten sind.
              Dieser Ausschluss gilt auch dann, wenn der Kunde Unternehmer ist – in diesem Fall besteht ohnehin kein gesetzlicher Anspruch.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">Verbindliche Designfreigabe (Mock-up)</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Vor Produktionsbeginn erhalten Sie von uns einen verbindlichen Designentwurf („Mock-up") zur Freigabe.
              Die Produktion beginnt erst nach Ihrer ausdrücklichen Freigabe.
              Mit dieser Freigabe bestätigen Sie, dass:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
              <li>Sie das Design vollständig geprüft haben</li>
              <li>alle Maße, Farben, Inhalte und Positionierungen korrekt sind</li>
              <li>nach Produktionsfreigabe keine Änderungen, Stornierungen oder ein Widerruf möglich sind</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">Folgen der Freigabe</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Mit Ihrer Designfreigabe wird der Vertrag verbindlich und bindend.
              Eine nachträgliche Änderung des Designs ist nur im Rahmen einer gesonderten Kulanzprüfung möglich
              und kann zusätzliche Kosten verursachen.
              Eine Rücknahme der individuell gefertigten Ware ist ausgeschlossen.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">Muster-Widerrufsformular (nur zu Informationszwecken)</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Da Sie als Unternehmer kein Widerrufsrecht haben,
              ist dieses Musterformular für Ihre Bestellungen nicht anwendbar.
              Es wird hier lediglich zu Transparenzzwecken bereitgestellt:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-600 mb-2">
                <strong>An:</strong> Nontel, Michael Wagner, Hermann-Wehrle-Str. 10, 67433 Neustadt an der Weinstraße,<br/>
                E-Mail: info@nontel.de
              </p>
              <p className="text-gray-600 mb-2">
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über
                den Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*)
              </p>
              <div className="space-y-2 text-gray-600">
                <p>- Bestellt am (*) / erhalten am (*)</p>
                <p>- Name des/der Besteller(s)</p>
                <p>- Firma / Unternehmensname</p>
                <p>- Anschrift des/der Besteller(s)</p>
                <p>- Unterschrift (nur bei Mitteilung auf Papier)</p>
                <p>- Datum</p>
              </div>
              <p className="text-gray-600 text-sm mt-2 italic">(*) Unzutreffendes streichen.</p>
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">Checkbox-Bestätigung im Bestellprozess</h3>
            <p className="text-gray-600 mb-3 leading-relaxed">
              Vor Abschluss jeder Bestellung muss aktiv bestätigt werden:
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 border-2 border-gray-400 rounded mt-0.5 flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                </div>
                <p className="text-gray-800 font-medium">
                  Ich habe das Mock-up geprüft und bestätige, dass es meinen Vorgaben entspricht.
                  Nach meiner Bestellung sind keine Änderungen oder ein Widerruf möglich.
                </p>
              </div>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Ohne diese Bestätigung ist eine Auftragserteilung nicht möglich.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">Stand dieser Widerrufsbelehrung</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              August 2025 – Wir behalten uns vor, diese Widerrufsbelehrung jederzeit anzupassen,
              um sie an aktuelle gesetzliche Vorgaben oder interne Abläufe anzupassen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WiderrufsrechtPage;
