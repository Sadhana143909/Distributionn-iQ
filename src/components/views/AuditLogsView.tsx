import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { api } from '../../api';
import { AuditLog } from '../../types';

interface AuditLogsViewProps {
  onNavigate: (viewId: string) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const entities = ['ALL', 'Disruption', 'RecoveryPlan', 'Inventory', 'Shipment', 'Supplier', 'Order', 'System'];

  const filtered = logs.filter((log) => {
    const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
    const matchesQuery =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEntity && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Audit Trail & Compliance Ledger</h1>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tamper-evident record of all manual inputs, automated status updates, approval decisions, and inventory movements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAuditLogs}
              className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {entities.map((ent) => (
            <button
              key={ent}
              onClick={() => setEntityFilter(ent)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                entityFilter === ent
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {ent}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, user, or entity ID..."
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
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User & Identity</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action Performed</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3 text-right">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-sans font-medium text-white">{log.userName}</td>
                  <td className="px-4 py-3 font-sans">
                    <span className="text-[10px] bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-300">{log.action}</td>
                  <td className="px-4 py-3 text-slate-300">{log.entityType}</td>
                  <td className="px-4 py-3 text-slate-400">{log.entityId}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setExpandedLog(log)}
                      className="text-xs font-sans text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      View Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff / Details Modal */}
      {expandedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Audit Transaction Details: {expandedLog.action}
                </h3>
                <p className="text-xs text-slate-400">
                  By {expandedLog.userName} ({expandedLog.userRole}) at {new Date(expandedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setExpandedLog(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-72 overflow-y-auto">
              <pre className="text-xs text-cyan-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(expandedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
