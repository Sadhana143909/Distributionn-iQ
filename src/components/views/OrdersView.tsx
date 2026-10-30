import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  PlusCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { api } from '../../api';
import { CustomerOrder } from '../../types';

interface OrdersViewProps {
  onNavigate: (viewId: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err: any) {
      console.error('Failed to load customer orders:', err);
      setActionError(err.message || 'Failed to load customer orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete order "${code}"?`)) return;
    try {
      await api.deleteOrder(id);
      loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete order');
    }
  };

  const filtered = orders.filter((o) => {
    const matchesPriority = priorityFilter === 'ALL' || o.priority === priorityFilter;
    const matchesQuery =
      o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.productName && o.productName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPriority && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Customer Demand & Order Commitments</h1>
              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
                Order Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Contract delivery commitments, production line lead times, customer priorities, and autonomous risk categorizations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('add-data')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Order</span>
            </button>
            <button
              onClick={loadOrders}
              className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {actionError}
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((pri) => (
            <button
              key={pri}
              onClick={() => setPriorityFilter(pri)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                priorityFilter === pri
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {pri === 'ALL' ? 'All Priorities' : `${pri} Priority`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order, customer, SKU..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Order Code</th>
                <th className="px-4 py-3">Customer Entity</th>
                <th className="px-4 py-3">Product Required</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Fulfilling Hub</th>
                <th className="px-4 py-3">Deadline Date</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk Assessment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="font-semibold text-slate-400">No customer orders found</p>
                    <p className="text-[11px] text-slate-500 mt-1">Use "Add New Data" or Data Import to enter customer demand orders.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white">{order.orderCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-200">{order.customerName}</p>
                      <span className="text-[10px] text-slate-500">{order.customerContact}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{order.productName || 'Components'}</td>
                    <td className="px-4 py-3 font-semibold text-white">{order.requiredQuantity} units</td>
                    <td className="px-4 py-3 text-slate-400">{order.warehouseName}</td>
                    <td className="px-4 py-3 font-medium">{order.deliveryDeadline}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.priority === 'Critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : order.priority === 'High'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          order.status === 'Delayed'
                            ? 'bg-rose-500/20 text-rose-300'
                            : order.status === 'Delivered'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onNavigate('risk-analysis')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 hover:underline ${
                          order.riskCategory === 'CRITICAL'
                            ? 'text-rose-400'
                            : order.riskCategory === 'HIGH'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        <span>{order.riskCategory} ({order.riskScore})</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(order.id, order.orderCode)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                        title="Delete order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
