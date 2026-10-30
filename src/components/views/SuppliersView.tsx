import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  PlusCircle,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api';
import { Supplier } from '../../types';

interface SuppliersViewProps {
  onNavigate: (viewId: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ onNavigate }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete supplier "${name}"? Database foreign keys will be verified.`)) {
      setActionError(null);
      try {
        await api.deleteSupplier(id);
        await loadSuppliers();
      } catch (err: any) {
        setActionError(err.message || 'Cannot delete supplier');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    try {
      await api.updateSupplier(editingSupplier.id, editingSupplier);
      setEditingSupplier(null);
      await loadSuppliers();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update supplier');
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.supplierCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Building2 className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Suppliers Directory</h1>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                Tier-1 / Tier-2
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tier partner performance ratings, contact profiles, and real-time reliability index metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('add-data')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
            <button
              onClick={loadSuppliers}
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

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search supplier name, code, or city..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Email & Phone</th>
                <th className="px-4 py-3">Origin Location</th>
                <th className="px-4 py-3">Reliability Index</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-white">{s.supplierCode}</td>
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {s.name}
                    {s.isDemo && (
                      <span className="ml-1.5 text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded">Demo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{s.contactPerson}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-300">{s.email}</p>
                    <p className="text-[10px] text-slate-500">{s.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{s.location}</td>
                  <td className="px-4 py-3 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{s.reliabilityScore}%</span>
                      <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            s.reliabilityScore >= 90
                              ? 'bg-emerald-400'
                              : s.reliabilityScore >= 80
                              ? 'bg-blue-400'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${s.reliabilityScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : s.status === 'High Risk'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingSupplier(s)}
                        className="p-1 text-slate-400 hover:text-blue-400 rounded transition-colors"
                        title="Edit supplier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                        title="Delete supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleUpdate}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Edit Supplier: {editingSupplier.supplierCode}</h3>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingSupplier.contactPerson}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editingSupplier.email}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  value={editingSupplier.location}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Reliability: {editingSupplier.reliabilityScore}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingSupplier.reliabilityScore}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, reliabilityScore: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
