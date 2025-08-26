import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AgbPage: React.FC = () => {
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
              <h1 className="text-2xl font-bold text-gray-800">Allgemeine Geschäftsbedingungen</h1>
            </div>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Allgemeine Geschäftsbedingungen und Kundeninformationen</h2>
            
            <h3 className="text-lg font-semibold text-gray-700 mb-4 mt-6">I. Allgemeine Geschäftsbedingungen</h3>
            
            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 1 Grundlegende Bestimmungen</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Die nachstehenden Geschäftsbedingungen gelten für Verträge, die Sie mit uns als Anbieter (Michael Wagner) über die Internetseite https://www.nontel.de schließen. Soweit nicht anders vereinbart, wird der Einbeziehung gegebenenfalls von Ihnen verwendeter eigener Bedingungen widersprochen.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Verbraucher im Sinne der nachstehenden Regelungen ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden kann. Unternehmer ist jede natürliche oder juristische Person oder eine rechtsfähige Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts in Ausübung ihrer selbständigen beruflichen oder gewerblichen Tätigkeit handelt.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 2 Zustandekommen des Vertrages</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Gegenstand des Vertrages ist der Verkauf von Waren, insbesondere individuell angefertigten Neon-Schildern.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Unsere Angebote im Internet sind unverbindlich und kein verbindliches Angebot zum Abschluss eines Vertrages.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (3) Sie können ein verbindliches Kaufangebot (Bestellung) über das Online-Warenkorbsystem abgeben.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (4) Die Annahme des Angebots erfolgt schriftlich oder in Textform (z. B. per E-Mail) oder durch Auslieferung der Ware.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 3 Individuell gestaltete Waren</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Sie stellen uns die für die individuelle Gestaltung der Waren erforderlichen geeigneten Informationen, Texte oder Dateien über das Online-Bestellsystem oder per E-Mail spätestens unverzüglich nach Vertragsschluss zur Verfügung. Unsere etwaigen Vorgaben zu Dateiformaten sind zu beachten.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Sie verpflichten sich, keine Daten zu übermitteln, deren Inhalt Rechte Dritter (insbesondere Urheberrechte, Namensrechte, Markenrechte) verletzen oder gegen bestehende Gesetze verstoßen. Sie stellen uns ausdrücklich von sämtlichen in diesem Zusammenhang geltend gemachten Ansprüchen Dritter frei. Das betrifft auch die Kosten der in diesem Zusammenhang erforderlichen rechtlichen Vertretung.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (3) Wir nehmen keine Prüfung der übermittelten Daten auf inhaltliche Richtigkeit vor und übernehmen insoweit keine Haftung für Fehler.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (4) Soweit im jeweiligen Angebot angegeben, erhalten Sie von uns eine Korrekturvorlage übersandt, die von Ihnen unverzüglich zu prüfen ist. Sind Sie mit dem Entwurf einverstanden, geben Sie die Korrekturvorlage durch Gegenzeichnung in Textform (z. B. E-Mail) zur Ausführung frei. Eine Ausführung der Gestaltungsarbeiten ohne Ihre Freigabe erfolgt nicht. Sie sind dafür verantwortlich, die Korrekturvorlage auf Richtigkeit und Vollständigkeit zu überprüfen und uns etwaige Fehler mitzuteilen. Wir übernehmen keine Haftung für nicht beanstandete Fehler.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (5) Bei individuell gestalteten Neon-Schildern besteht kein gesetzliches Widerrufsrecht. Dies gilt sowohl für Verbraucher als auch für Unternehmer. Grundlage ist § 312g Abs. 2 Nr. 1 BGB, da es sich um Waren handelt, die nach Kundenspezifikation angefertigt werden und eindeutig auf die persönlichen Bedürfnisse zugeschnitten sind.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 4 Preise und Zahlungsbedingungen</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Die in den jeweiligen Angeboten angeführten Preise sind Nettopreise und verstehen sich zuzüglich der gesetzlichen Umsatzsteuer.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Es gelten die Preise zum Zeitpunkt der Bestellung.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (3) Die Zahlungsmöglichkeiten werden dem Kunden im Online-Shop mitgeteilt.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 5 Lieferbedingungen</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Die Lieferbedingungen, Liefertermine und bestehende Lieferbeschränkungen finden sich im jeweiligen Angebot.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Soweit nicht anders angegeben, erfolgt die Lieferung ab Werk.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (3) Die Gefahr des zufälligen Untergangs und der zufälligen Verschlechterung der verkauften Sache geht bei Unternehmern mit der Übergabe an den Spediteur, Frachtführer oder die sonst zur Ausführung der Versendung bestimmte Person über.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 6 Zurückbehaltungsrecht, Eigentumsvorbehalt</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Ein Zurückbehaltungsrecht können Sie nur ausüben, soweit es sich um Forderungen aus demselben Vertragsverhältnis handelt.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Die Ware bleibt bis zur vollständigen Zahlung unser Eigentum.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 7 Mängelhaftung</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Es gelten die gesetzlichen Mängelhaftungsrechte.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Bei Unternehmern beträgt die Gewährleistungsfrist ein Jahr ab Ablieferung der Ware.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 8 Haftung</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wir haften für Schäden nur bei Vorsatz oder grober Fahrlässigkeit.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">§ 9 Rechtswahl, Erfüllungsort, Gerichtsstand</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Es gilt deutsches Recht.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Erfüllungsort für alle Leistungen aus den mit uns bestehenden Geschäftsbeziehungen ist unser Firmensitz.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (3) Ausschließlicher Gerichtsstand für alle Streitigkeiten ist, soweit zulässig, der Sitz unseres Unternehmens.
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-4 mt-8">II. Kundeninformationen</h3>
            
            <h4 className="text-base font-semibold text-gray-700 mb-3">Identität des Verkäufers</h4>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 font-medium">Michael Wagner</p>
              <p className="text-gray-600">Herman-Wehrle-Strasse 10</p>
              <p className="text-gray-600">67433 Neustadt an der Weinstrasse</p>
              <p className="text-gray-600">Deutschland</p>
              <p className="text-gray-600">📞 +49 163 1661464</p>
              <p className="text-gray-600">📧 info@nontel.de</p>
            </div>

            <h4 className="text-base font-semibold text-gray-700 mb-3">Informationen zum Zustandekommen des Vertrages</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Der Vertrag kommt zustande, wie in § 2 beschrieben.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">Vertragssprache, Vertragstextspeicherung</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (1) Die Vertragssprache ist Deutsch.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              (2) Der Vertragstext wird von uns gespeichert und kann vom Kunden nach Vertragsschluss angefordert werden.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">Wesentliche Merkmale der Ware oder Dienstleistung</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Die wesentlichen Merkmale der Ware oder Dienstleistung finden sich im jeweiligen Angebot.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">Preise und Zahlungsmodalitäten</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Die in den jeweiligen Angeboten genannten Preise sind Nettopreise und verstehen sich zuzüglich der gesetzlichen Umsatzsteuer.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">Lieferbedingungen</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Die Lieferbedingungen, Liefertermine und Lieferbeschränkungen finden sich im jeweiligen Angebot.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">Ausschluss des Widerrufsrechts bei Maßanfertigungen</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Bei individuell gestalteten Neon-Schildern besteht nach § 312g Abs. 2 Nr. 1 BGB kein Widerrufsrecht, da diese nach Kundenspezifikation angefertigt werden und eindeutig auf persönliche Bedürfnisse zugeschnitten sind. Dieser Ausschluss gilt gleichermaßen für Verbraucher und Unternehmer.
            </p>

            <h4 className="text-base font-semibold text-gray-700 mb-3">Gesetzliches Mängelhaftungsrecht</h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Es gelten die gesetzlichen Mängelhaftungsrechte.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-blue-800 text-sm">
                <strong>Hinweis:</strong> Diese AGB sind speziell für individuell angefertigte Neon-Schilder erstellt.
                Bei Fragen wenden Sie sich bitte an info@nontel.de.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgbPage;