import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { NeonDesign } from '../types/configurator';

interface SVGPreviewProps {
  design: NeonDesign;
  width: number;
  height: number;
  className?: string;
  uploadedSvgContent?: string | null; // SVG загруженный пользователем
}

const SVGPreview: React.FC<SVGPreviewProps> = ({
  design,
  width,
  height,
  className = "w-20 h-20",
  uploadedSvgContent
}) => {
  const [showModal, setShowModal] = useState(false);

  const handlePreviewClick = () => {
    setShowModal(true);
  };

  const renderPreview = () => {
    console.log('🎨 SVGPreview - Rendering design:', {
      designId: design.id,
      designName: design.name,
      hasSvgContent: !!design.svgContent,
      hasSvgUrl: !!design.svgUrl,
      hasUploadedSvg: !!uploadedSvgContent,
      svgContentLength: design.svgContent?.length || 0,
      uploadedSvgLength: uploadedSvgContent?.length || 0,
      className: className
    });

    // Priority 1: Uploaded SVG from user (passed as prop)
    if (uploadedSvgContent) {
      console.log('✅ Using uploaded SVG for', design.name, 'className:', className);
      return (
        <div 
          className={`${className} bg-white border-2 border-orange-300 rounded-lg p-1 md:p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative`}
          onClick={handlePreviewClick}
        >
          <div 
            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain [&>svg]:scale-50 sm:[&>svg]:scale-60 md:[&>svg]:scale-75 lg:[&>svg]:scale-90 xl:[&>svg]:scale-100"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            dangerouslySetInnerHTML={{ __html: uploadedSvgContent }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="absolute bottom-1 left-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded-full font-bold shadow-sm" style={{ fontSize: '10px', lineHeight: '12px' }}>
            ↑
          </div>
        </div>
      );
    }

    // Priority 2: SVG content from design data (from CRM/Monday)
    if (design.svgContent) {
      console.log('✅ Using design.svgContent for', design.name, 'className:', className);
      return (
        <div 
          className={`${className} bg-white border-2 border-gray-200 rounded-lg p-1 md:p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative`}
          onClick={handlePreviewClick}
        >
          <div 
            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain [&>svg]:scale-50 sm:[&>svg]:scale-60 md:[&>svg]:scale-75 lg:[&>svg]:scale-90 xl:[&>svg]:scale-100"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            dangerouslySetInnerHTML={{ __html: design.svgContent }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {/* Indicator that this is real SVG */}
          <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full shadow-sm" style={{ fontSize: '10px', lineHeight: '12px' }}>
            S
          </div>
        </div>
      );
    }

    // Priority 3: SVG URL from design data
    if (design.svgUrl) {
      return (
        <div 
          className={`${className} bg-white border-2 border-gray-200 rounded-lg p-1 md:p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative`}
          onClick={handlePreviewClick}
        >
          <object
            data={design.svgUrl}
            type="image/svg+xml"
            className="max-w-full max-h-full w-auto h-auto scale-50 sm:scale-60 md:scale-75 lg:scale-90 xl:scale-100"
            onError={() => console.warn('Failed to load SVG from URL:', design.svgUrl)}
          >
            {/* Fallback to mockup image if SVG fails to load */}
            <img
              src={design.mockupUrl}
              alt={design.name}
              className="max-w-full max-h-full object-contain rounded"
            />
          </object>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
            SVG
          </div>
        </div>
      );
    }

    // Fallback to mockup image
    console.log('⚠️ Using fallback mockup image for', design.name, 'URL:', design.mockupUrl);
    return (
      <div 
        className={`${className} bg-white border-2 border-gray-200 rounded-lg p-1 md:p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative`}
        onClick={handlePreviewClick}
      >
        <img
          src={design.mockupUrl}
          alt={design.name}
          className="max-w-full max-h-full object-contain rounded scale-50 sm:scale-60 md:scale-75 lg:scale-90 xl:scale-100"
          onError={(e) => {
            console.error('❌ Failed to load mockup image:', design.mockupUrl);
            // Show placeholder
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
          <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {/* Show placeholder text if image fails */}
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 bg-gray-100 rounded">
          <div className="text-center">
            <div className="font-medium">{design.name}</div>
            <div className="text-xs">{width}×{height}cm</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderPreview()}

      {/* Modal for enlarged view */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{design.name}</h3>
                <p className="text-sm text-gray-600">{width}×{height}cm</p>
                {design.svgContent && (
                  <p className="text-xs text-green-600 font-medium">✓ SVG aus CRM-Daten</p>
                )}
                {design.svgUrl && !design.svgContent && (
                  <p className="text-xs text-blue-600 font-medium">✓ SVG-Datei verlinkt</p>
                )}
                {uploadedSvgContent && !design.svgContent && !design.svgUrl && (
                  <p className="text-xs text-orange-600 font-medium">✓ Hochgeladenes SVG</p>
                )}
                {!design.svgContent && !design.svgUrl && !uploadedSvgContent && (
                  <p className="text-xs text-gray-500 font-medium">📷 Mockup-Bild</p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg relative">
                {/* Priority 1: Uploaded SVG from user (passed as prop) */}
                {uploadedSvgContent ? (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="w-full h-full max-w-[600px] max-h-[450px] min-h-[300px] flex items-center justify-center bg-white rounded border shadow-sm">
                      <div 
                        className="w-full h-full p-6 flex items-center justify-center"
                        style={{ 
                          minWidth: '300px',
                          minHeight: '200px',
                          maxWidth: '100%',
                          maxHeight: '100%'
                        }}
                      >
                        <div
                          className="flex items-center justify-center [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain"
                          style={{ 
                            width: '300px', 
                            height: '200px',
                            maxWidth: '300px',
                            maxHeight: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          dangerouslySetInnerHTML={{ __html: uploadedSvgContent }}
                        />
                      </div>
                    </div>
                  </div>
                ) : design.svgContent ? (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="w-full h-full max-w-[600px] max-h-[450px] min-h-[300px] flex items-center justify-center bg-white rounded border shadow-sm">
                      <div 
                        className="w-full h-full p-6 flex items-center justify-center"
                        style={{ 
                          minWidth: '300px',
                          minHeight: '200px'
                        }}
                      >
                        <div
                          className="flex items-center justify-center [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain"
                          style={{ 
                            width: '400px', 
                            height: '300px',
                            maxWidth: '400px',
                            maxHeight: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          dangerouslySetInnerHTML={{ __html: design.svgContent }}
                        />
                      </div>
                    </div>
                  </div>
                ) : design.svgUrl ? (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="w-full h-full max-w-[800px] max-h-[600px] min-h-[300px] flex items-center justify-center bg-white rounded border shadow-sm">
                      <object
                        data={design.svgUrl}
                        type="image/svg+xml"
                        className="w-full h-full"
                        onError={() => console.warn('Failed to load SVG from URL in modal:', design.svgUrl)}
                      >
                        <img
                          src={design.mockupUrl}
                          alt={design.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </object>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="w-full h-full max-w-[800px] max-h-[600px] min-h-[300px] flex items-center justify-center bg-white rounded border shadow-sm">
                      <div className="text-center">
                        <img
                          src={design.mockupUrl}
                          alt={design.name}
                          className="max-w-full max-h-full object-contain mb-4"
                          onError={(e) => {
                            console.error('❌ Failed to load mockup image in modal:', design.mockupUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="text-gray-500">
                          <div className="text-lg font-medium">{design.name}</div>
                          <div className="text-sm">Kein SVG verfügbar</div>
                          <div className="text-xs mt-2">
                            Bitte laden Sie ein SVG-Design hoch oder kontaktieren Sie den Support.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Design Info */}
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{width}cm</div>
                    <div className="text-gray-600">Breite</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{height}cm</div>
                    <div className="text-gray-600">Höhe</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{design.elements}</div>
                    <div className="text-gray-600">Elemente</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{design.ledLength}m</div>
                    <div className="text-gray-600">LED-Länge</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SVGPreview;