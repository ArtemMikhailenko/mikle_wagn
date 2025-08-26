import React from 'react';
import { Shield, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerHeaderProps {
  customerName: string;
  customerLogo?: string;
  orderToken: string;
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customerName,
  customerLogo,
  orderToken,
}) => {
  const navigate = useNavigate();

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50" 
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)'
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10 md:h-12">
          {/* Logo Only */}
          <div className="flex items-center">
            {customerLogo ? (
              <img
                src={customerLogo}
                alt="Company Logo"
                className="h-6 md:h-7 w-auto"
                style={{ opacity: 0.8 }}
              />
            ) : (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2" style={{ opacity: 0.8 }}>
                <User className="h-4 md:h-5 w-4 md:w-5 text-white" />
              </div>
            )}
          </div>

          {/* Center - Admin Button */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-800 bg-opacity-20 hover:bg-opacity-30 transition-all duration-200 backdrop-blur-sm"
              title="Админ панель"
            >
              <Settings className="h-3 w-3 text-gray-700" />
              <span className="text-xs font-medium text-gray-700 hidden sm:inline">Admin</span>
            </button>
          </div>

          {/* Security Badge */}
          <div 
            className="flex items-center space-x-1 px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}
          >
            <Shield className="h-2.5 w-2.5 text-green-600" />
            <span className="text-xs font-medium text-green-800 hidden sm:inline" style={{ opacity: 0.8 }}>Sichere Verbindung</span>
            <span className="text-xs font-medium text-green-800 sm:hidden" style={{ opacity: 0.8 }}>Sicher</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CustomerHeader;