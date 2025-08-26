import React from 'react';
import { Lightbulb } from 'lucide-react';

interface MockupDisplayProps {
  width: number;
  height: number;
  elements: number;
  customerLogo?: string;
}

const MockupDisplay: React.FC<MockupDisplayProps> = ({
  width,
  height,
  elements,
  customerLogo,
}) => {
  const aspectRatio = width / height;
  const displayWidth = Math.min(400, aspectRatio * 200);
  const displayHeight = displayWidth / aspectRatio;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-2">
            <Lightbulb className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Ihr Neon-Design</h2>
        </div>
        {customerLogo && (
          <img
            src={customerLogo}
            alt="Kunden Logo"
            className="h-12 w-auto"
          />
        )}
      </div>

      {/* Mockup Display */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-8 flex items-center justify-center min-h-[300px]">
        <div
          className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-lg shadow-2xl"
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            filter: 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.5))',
          }}
        >
          {/* Neon glow effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 rounded-lg opacity-30 blur-sm"
            style={{ transform: 'scale(1.05)' }}
          />
          
          {/* Elements visualization */}
          <div className="relative h-full flex items-center justify-center">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(elements, 3)}, 1fr)` }}>
              {Array.from({ length: Math.min(elements, 9) }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-white rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-6 bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Technische Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Breite:</span>
            <span className="font-medium text-gray-800">{width} cm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Höhe:</span>
            <span className="font-medium text-gray-800">{height} cm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Elemente:</span>
            <span className="font-medium text-gray-800">{elements}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fläche:</span>
            <span className="font-medium text-gray-800">{((width * height) / 10000).toFixed(2)} m²</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockupDisplay;