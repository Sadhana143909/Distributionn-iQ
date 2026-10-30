import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingDown,
  DollarSign,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../../api';
import { RecoveryPlan } from '../../types';

interface RecoveryPlansViewProps {
  onNavigate: (viewId: string) => void;
}

export const RecoveryPlansView: React.FC<RecoveryPlansViewProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getRecoveryPlans();
      setPlans(data);
    } catch (err: any) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete recovery plan "${code}"?`)) return;
    try {
      await api.deleteRecoveryPlan(id);
      loadPlans();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete recovery plan');
    }
  };

  const handleExecute = async (planId: string) => {
    setExecutingId(planId);
    setErrorMsg(null);
    try {
      const executed = await api.executeRecoveryPlan(planId);
      setSuccessMsg(`Plan ${executed.planCode} executed! Inventory rebalanced and disruption resolved.`);
      await loadPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute recovery plan');
    } finally {
      setExecutingId(null);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <FileCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Recovery Plan Repository</h1>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                Execution Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Centralized repository of generated, reviewed, and executed recovery procedures. Approved plans can be executed to adjust live physical stock.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('recovery-simulator')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Simulate New Plan</span>
            </button>
            <button
              onClick={loadPlans}
              className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {['ALL', 'Pending Approval', 'Approved', 'Executed', 'Rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlans.length === 0 ? (
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
            No recovery plans match the current filter.
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{plan.planCode}</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-semibold">
                      {plan.planType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        plan.status === 'Executed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : plan.status === 'Approved'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : plan.status === 'Rejected'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {plan.status}
                    </span>
                    <button
                      onClick={() => handleDelete(plan.id, plan.planCode)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      title="Delete recovery plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{plan.notes}</p>

                {plan.executionResult && (
                  <div className="mt-2.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] p-2.5 rounded-lg">
                    <strong>Execution Log:</strong> {plan.executionResult}
                  </div>
                )}

                {plan.rejectionReason && (
                  <div className="mt-2.5 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[11px] p-2.5 rounded-lg">
                    <strong>Rejection Reason:</strong> {plan.rejectionReason}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Est. Cost</span>
                    <span className="font-bold text-white mt-0.5 block font-mono">
                      ${plan.estimatedCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Delay Slashed</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block font-mono">
                      -{plan.estimatedDelayReductionDays} days
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Recovery %</span>
                    <span className="font-bold text-blue-400 mt-0.5 block font-mono">
                      {plan.recoveryPercentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Proposed by {plan.proposedByName}</span>

                {plan.status === 'Approved' ? (
                  <button
                    onClick={() => handleExecute(plan.id)}
                    disabled={executingId === plan.id}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{executingId === plan.id ? 'Executing...' : 'Execute Recovery Plan'}</span>
                  </button>
                ) : plan.status === 'Pending Approval' ? (
                  <button
                    onClick={() => onNavigate('approvals')}
                    className="text-amber-400 hover:text-amber-300 text-xs font-medium underline"
                  >
                    Review in Approvals →
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
