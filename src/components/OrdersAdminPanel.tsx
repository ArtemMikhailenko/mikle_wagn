import React from 'react';
import { CheckCircle2, CreditCard, Download, Filter, Mail, Search, XCircle } from 'lucide-react';
import { getPaidOrders, formatCurrency, PaidOrder } from '../services/ordersService';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  const styles = s === 'completed' || s === 'paid' || s === 'succeeded'
    ? 'bg-green-100 text-green-800 border-green-200'
    : s === 'pending'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-red-100 text-red-800 border-red-200';
  const Icon = s === 'completed' || s === 'paid' || s === 'succeeded' ? CheckCircle2 : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
};

const OrdersAdminPanel: React.FC = () => {
  const [orders, setOrders] = React.useState<PaidOrder[]>([]);
  const [query, setQuery] = React.useState('');
  const [onlyPaid, setOnlyPaid] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    const list = await getPaidOrders();
    setOrders(list);
    setIsLoading(false);
  };

  const filtered = orders.filter(o => {
    const paid = ['paid', 'completed', 'succeeded'].includes(o.status.toLowerCase());
    if (onlyPaid && !paid) return false;
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      o.customerEmail?.toLowerCase().includes(q) ||
      o.paymentIntentId?.toLowerCase().includes(q) ||
      o.checkoutSessionId?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CreditCard className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Оплаченные заказы</h1>
          </div>
          <button onClick={load} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Обновить</button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex-1 flex items-center gap-2">
              <Search className="text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="E-Mail, PaymentIntent, Session ID, Order ID"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyPaid} onChange={() => setOnlyPaid(v => !v)} />
              Только оплаченные
            </label>
            <button className="px-3 py-2 bg-gray-100 rounded-md border flex items-center gap-2"><Filter className="w-4 h-4"/>Экспорт CSV</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Дата</th>
                <th className="px-4 py-2 text-left">Покупатель</th>
                <th className="px-4 py-2 text-left">Сумма</th>
                <th className="px-4 py-2 text-left">Статус</th>
                <th className="px-4 py-2 text-left">Источник</th>
                <th className="px-4 py-2 text-left">IDs</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Загрузка...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Нет данных</td></tr>
              ) : (
                filtered.map((o) => (
                  <tr key={`${o.source}-${o.id}`} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleString('de-DE')}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{o.customerEmail || '—'}</span>
                      </div>
                      <div className="text-xs text-gray-500">{o.billingName || '—'}</div>
                    </td>
                    <td className="px-4 py-2 font-semibold">{formatCurrency(o.amountGross, o.currency)}</td>
                    <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-2 uppercase text-gray-600 text-xs">{o.source}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {o.paymentIntentId && (<div>PI: {o.paymentIntentId}</div>)}
                      {o.checkoutSessionId && (<div>CS: {o.checkoutSessionId}</div>)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"><Download className="w-3.5 h-3.5"/>PDF</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Источники:
          <ul className="list-disc ml-5">
            <li>stripe_orders — создаются вебхуком после успешной оплаты</li>
            <li>orders — записи о созданных Intent (может быть pending)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OrdersAdminPanel;
