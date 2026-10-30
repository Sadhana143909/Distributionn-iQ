import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Search,
  Filter,
  PlusCircle,
  GitBranch,
  Cpu,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { api } from '../../api';
import { Disruption } from '../../types';

interface DisruptionsViewProps {
  onNavigate: (viewId: string) => void;
}

export const DisruptionsView: React.FC<DisruptionsViewProps> = ({ onNavigate }) => {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadDisruptions();
  }, []);

  const loadDisruptions = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await api.getDisruptions();
      setDisruptions(data);
    } catch (err: any) {
      console.error('Failed to load disruptions:', err);
      setActionError(err.message || 'Failed to load disruptions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete disruption "${code}"? Connected recovery plans will also be removed.`)) return;
    try {
      await api.deleteDisruption(id);
      loadDisruptions();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete disruption');
    }
  };

  const filtered = disruptions.filter((d) => {
    const matchesSev = severityFilter === 'ALL' || d.severity === severityFilter;
    const matchesQuery =
      d.disruptionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.disruptionType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Disruption Monitoring Command</h1>
              <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono">
                Threat Radar
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active surveillance of supplier delays, carrier exceptions, port congestions, and component shortages across the global footprint.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('add-data')}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Disruption</span>
            </button>
            <button
              onClick={loadDisruptions}
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

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                severityFilter === sev
                  ? sev === 'Critical'
                    ? 'bg-rose-600 text-white'
                    : sev === 'High'
                    ? 'bg-amber-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {sev} Severity
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search disruptions or causes..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Disruption Cards */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <AlertOctagon className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
          <p className="font-semibold text-slate-300">No active disruptions detected</p>
          <p className="text-xs text-slate-500 mt-1">Use "Report Disruption" to log supply chain incidents or simulate carrier delays in the Shipments view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((dis) => (
            <div
              key={dis.id}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                dis.severity === 'Critical'
                  ? 'border-rose-800/80 hover:border-rose-600'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{dis.disruptionCode}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                      {dis.disruptionType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        dis.severity === 'Critical'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : dis.severity === 'High'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {dis.severity} Severity
                    </span>
                    <button
                      onClick={() => handleDelete(dis.id, dis.disruptionCode)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      title="Delete disruption"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-200 mt-2 leading-relaxed">{dis.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Delay Impact</span>
                    <span className="font-bold text-rose-400 mt-0.5 block font-mono">
                      +{dis.expectedDelayDays} Days
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Shortage Deficit</span>
                    <span className="font-bold text-amber-400 mt-0.5 block font-mono">
                      {dis.shortageQuantity} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Status</span>
                    <span className="font-semibold text-cyan-400 mt-0.5 block">{dis.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Reported</span>
                    <span className="text-slate-400 mt-0.5 block">
                      {new Date(dis.reportedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {(dis.supplierName || dis.warehouseName) && (
                  <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                    <span>
                      Supplier: <strong className="text-slate-200">{dis.supplierName || 'N/A'}</strong>
                    </span>
                    <span>
                      Hub: <strong className="text-slate-200">{dis.warehouseName || 'N/A'}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => onNavigate('ripple-impact')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Calculate Ripple Impact</span>
                </button>
                <button
                  onClick={() => onNavigate('recovery-simulator')}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Launch Recovery Twin</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
