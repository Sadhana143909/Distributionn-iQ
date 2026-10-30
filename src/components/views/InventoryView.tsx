import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Warehouse,
  Trash2,
} from 'lucide-react';
import { api } from '../../api';
import { InventoryItem } from '../../types';

interface InventoryViewProps {
  onNavigate: (viewId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNavigate }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await api.getInventory();
      setInventory(data);
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setActionError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete inventory record for "${name}"?`)) return;
    try {
      await api.deleteInventory(id);
      loadInventory();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete inventory record');
    }
  };

  const warehouses = ['ALL', ...Array.from(new Set(inventory.map((i) => i.warehouseName || 'Unknown')))];

  const filtered = inventory.filter((item) => {
    const matchesWh = warehouseFilter === 'ALL' || item.warehouseName === warehouseFilter;
    const matchesQuery =
      (item.productName && item.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.productCode && item.productCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.warehouseName && item.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesWh && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-orange-500/10 text-orange-400 rounded-xl">
                <Boxes className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Inventory & Safety Stock Master</h1>
              <span className="text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded font-mono">
                ATP Balances
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              On-hand available inventory, allocated customer reservations, and automated safety stock depletion warnings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('add-data')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Update Stock</span>
            </button>
            <button
              onClick={loadInventory}
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
          {warehouses.map((wh) => (
            <button
              key={wh}
              onClick={() => setWarehouseFilter(wh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                warehouseFilter === wh
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {wh === 'ALL' ? 'All Warehouses' : wh.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU or product..."
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
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Warehouse Facility</th>
                <th className="px-4 py-3">Available Stock</th>
                <th className="px-4 py-3">Reserved Stock</th>
                <th className="px-4 py-3">Available-to-Promise</th>
                <th className="px-4 py-3">Minimum Safety</th>
                <th className="px-4 py-3">Buffer Health</th>
                <th className="px-4 py-3">Last Verified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="font-semibold text-slate-400">No inventory records found</p>
                    <p className="text-[11px] text-slate-500 mt-1">Use "Add New Data" or Data Import to record on-hand warehouse inventory.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const atp = Math.max(0, item.availableStock - item.reservedStock);
                  const isShortage = item.availableStock < item.minimumStock;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{item.productName}</p>
                        <span className="text-[10px] text-slate-500 font-mono">{item.productCode}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{item.warehouseName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        {item.availableStock} units
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {item.reservedStock} units
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400">{atp} units</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{item.minimumStock} units</td>
                      <td className="px-4 py-3">
                        {isShortage ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Shortage Deficit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Optimal Buffer
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {new Date(item.lastUpdatedDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(item.id, item.productName || item.productCode || 'record')}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="Delete inventory record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
