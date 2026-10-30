import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Search,
  PlusCircle,
  Trash2,
  Edit2,
  RefreshCw,
  MapPin,
  User,
} from 'lucide-react';
import { api } from '../../api';
import { Warehouse as WarehouseType } from '../../types';

interface WarehousesViewProps {
  onNavigate: (viewId: string) => void;
}

export const WarehousesView: React.FC<WarehousesViewProps> = ({ onNavigate }) => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const data = await api.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete warehouse "${name}"? Foreign key integrity will be checked.`)) {
      setErrorMsg(null);
      try {
        await api.deleteWarehouse(id);
        await loadWarehouses();
      } catch (err: any) {
        setErrorMsg(err.message || 'Cannot delete warehouse: Holds active stock records.');
      }
    }
  };

  const filtered = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.warehouseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Warehouse className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Warehouse Logistics Hubs</h1>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                Storage Topology
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Distribution centers, cross-dock transit points, and port-adjacent gateway depots.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('add-data')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Warehouse</span>
            </button>
            <button
              onClick={loadWarehouses}
              className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((wh) => (
          <div
            key={wh.id}
            className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              wh.status === 'Congested'
                ? 'border-amber-700/70 hover:border-amber-500'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-cyan-400 text-sm">{wh.warehouseCode}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    wh.status === 'Operational'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : wh.status === 'Congested'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {wh.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mt-2">{wh.name}</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{wh.location}</span>
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Capacity</span>
                  <span className="font-bold text-white mt-0.5 block font-mono">
                    {wh.capacity.toLocaleString()} Units
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Facility Lead</span>
                  <span className="font-medium text-slate-300 mt-0.5 block truncate">{wh.manager}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigate('inventory')}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Inspect On-Hand Inventory →
              </button>
              <button
                onClick={() => handleDelete(wh.id, wh.name)}
                className="text-slate-500 hover:text-rose-400 p-1"
                title="Delete warehouse"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
