import React from 'react';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminLinkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'link' | 'icon';
  position?: 'fixed' | 'relative';
}

const AdminLink: React.FC<AdminLinkProps> = ({ 
  className = '', 
  size = 'md', 
  variant = 'button',
  position = 'relative' 
}) => {
  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-2 text-sm', 
    lg: 'p-3 text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  const baseClasses = `
    inline-flex items-center gap-2 rounded-lg transition-all duration-200
    hover:shadow-md active:scale-95
  `;

  const variantClasses = {
    button: `
      bg-gray-800 text-white hover:bg-gray-700 
      border border-gray-700 hover:border-gray-600
    `,
    link: `
      text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline
    `,
    icon: `
      bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900
      border border-gray-200 hover:border-gray-300
    `
  };

  const positionClasses = position === 'fixed' 
    ? 'fixed bottom-4 right-4 z-50 shadow-lg' 
    : '';

  if (variant === 'link') {
    return (
      <Link 
        to="/admin" 
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${positionClasses} ${className}`}
      >
        <Settings size={iconSizes[size]} />
        <span>Admin Panel</span>
      </Link>
    );
  }

  if (variant === 'icon') {
    return (
      <Link 
        to="/admin" 
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${positionClasses} ${className}`}
        title="Admin Panel"
      >
        <Settings size={iconSizes[size]} />
      </Link>
    );
  }

  return (
    <Link 
      to="/admin" 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${positionClasses} ${className}`}
    >
      <Settings size={iconSizes[size]} />
      <span>Admin</span>
    </Link>
  );
};

export default AdminLink;
