import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  Database, 
  CreditCard, 
  BarChart3,
  Settings,
  Home,
  TestTube,
  Layers
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const adminPages = [
    {
      title: 'CRM Admin Panel',
      description: 'Управление клиентами и проектами',
      path: '/admin/crm',
      icon: Users,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Orders (Paid)',
      description: 'Просмотр оплаченных заказов',
      path: '/admin/orders',
      icon: CreditCard,
      color: 'bg-pink-500 hover:bg-pink-600'
    },
    {
      title: 'Pricing Admin Panel', 
      description: 'Управление ценами и калькуляциями',
      path: '/admin/pricing',
      icon: DollarSign,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Discount Admin Panel',
      description: 'Управление скидками и промокодами',
      path: '/admin/discounts',
      icon: DollarSign,
      color: 'bg-emerald-500 hover:bg-emerald-600'
    },
    {
      title: 'Monday Test Panel',
      description: 'Тестирование интеграции с Monday.com',
      path: '/admin/monday',
      icon: Calendar,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Supabase Connection Test',
      description: 'Проверка подключения к базе данных',
      path: '/admin/supabase-test',
      icon: Database,
      color: 'bg-cyan-500 hover:bg-cyan-600'
    },
    {
      title: 'Database Setup',
      description: 'Настройка таблиц базы данных',
      path: '/admin/database-setup',
      icon: Database,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Monday Board Analyzer',
      description: 'Анализ досок Monday.com',
      path: '/admin/board-analyzer',
      icon: BarChart3,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    }
  ];

  const testPages = [
    {
      title: 'Pricing Test Page',
      description: 'Тестирование системы ценообразования',
      path: '/test/pricing',
      icon: TestTube,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'Stripe Test Page',
      description: 'Тестирование платежной системы',
      path: '/test/stripe',
      icon: CreditCard,
      color: 'bg-pink-500 hover:bg-pink-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Панель управления и тестирования системы</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <Home size={18} />
              На главную
            </button>
          </div>
        </div>

        {/* Admin Pages Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="text-gray-700" size={24} />
            <h2 className="text-2xl font-semibold text-gray-800">Административные панели</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminPages.map((page, index) => {
              const IconComponent = page.icon;
              return (
                <Link
                  key={index}
                  to={page.path}
                  className="group block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${page.color} transition-colors`}>
                      <IconComponent className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {page.title}
                      </h3>
                      <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                        {page.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Test Pages Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Layers className="text-gray-700" size={24} />
            <h2 className="text-2xl font-semibold text-gray-800">Тестовые страницы</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testPages.map((page, index) => {
              const IconComponent = page.icon;
              return (
                <Link
                  key={index}
                  to={page.path}
                  className="group block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${page.color} transition-colors`}>
                      <IconComponent className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {page.title}
                      </h3>
                      <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                        {page.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Быстрая статистика</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{adminPages.length}</div>
              <div className="text-sm text-gray-600">Админ панелей</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{testPages.length}</div>
              <div className="text-sm text-gray-600">Тестовых страниц</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{adminPages.length + testPages.length}</div>
              <div className="text-sm text-gray-600">Всего инструментов</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
