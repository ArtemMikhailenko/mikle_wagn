import React from 'react';
import { ArrowLeft, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ImpressumPage: React.FC = () => {
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
                <Building className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Impressum</h1>
            </div>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Impressum</h2>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Gesetzliche Anbieterkennung:</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
                <p className="text-gray-700 font-medium text-lg">Michael Wagner</p>
                <p className="text-gray-700 font-medium">Nontel</p>
                <p className="text-gray-600">Hermann-Wehrle-Str. 10</p>
                <p className="text-gray-600">67433 Neustadt an der Weinstraße</p>
                <p className="text-gray-600">Deutschland</p>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <p className="text-gray-600">
                    <span className="font-medium">Telefon:</span> +49 163 1661464
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">E-Mail:</span> info@nontel.de
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">USt-IdNr.:</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600">DE328488548</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Zuständige Aufsichtsbehörde für audiovisuelle Mediendienste:</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 font-medium">Medienanstalt Rheinland-Pfalz</p>
                  <p className="text-gray-600">Turmstraße 10</p>
                  <p className="text-gray-600">67059 Ludwigshafen</p>
                  <p className="text-gray-600">
                    <a href="https://medienanstalt-rlp.de/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                      https://medienanstalt-rlp.de/
                    </a>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Alternative Streitbeilegung:</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-gray-600 leading-relaxed">
                    Die Europäische Kommission stellt eine Plattform für die außergerichtliche Online-Streitbeilegung (OS-Plattform) bereit, aufrufbar unter:
                  </p>
                  <p className="text-gray-600">
                    <a href="https://ec.europa.eu/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                      https://ec.europa.eu/odr
                    </a>
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
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

export default ImpressumPage;