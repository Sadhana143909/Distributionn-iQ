import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { api, getActiveUser } from '../../api';
import { RecoveryPlan, Approval, UserProfile } from '../../types';

interface ApprovalsViewProps {
  onNavigate: (viewId: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [history, setHistory] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getActiveUser());

  // Decision Modal State
  const [selectedPlan, setSelectedPlan] = useState<RecoveryPlan | null>(null);
  const [decisionType, setDecisionType] = useState<'Approved' | 'Rejected' | 'Modified'>('Approved');
  const [comments, setComments] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    const handleUserChange = (e: any) => setCurrentUser(e.detail);
    window.addEventListener('chainpulse:user-changed', handleUserChange);
    return () => window.removeEventListener('chainpulse:user-changed', handleUserChange);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPlans, allApprovals] = await Promise.all([
        api.getRecoveryPlans(),
        api.getApprovalsHistory(),
      ]);
      setPlans(allPlans);
      setHistory(allApprovals);
    } catch (err) {
      console.error('Failed to load approvals data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingPlans = plans.filter((p) => p.status === 'Pending Approval');

  const handleOpenDecision = (plan: RecoveryPlan, decision: 'Approved' | 'Rejected' | 'Modified') => {
    setSelectedPlan(plan);
    setDecisionType(decision);
    setComments('');
    setErrorMsg(null);
  };

  const handleSubmitDecision = async () => {
    if (!selectedPlan) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.submitApprovalDecision(selectedPlan.id, decisionType, comments);
      setSuccessMsg(`Plan ${selectedPlan.planCode} has been ${decisionType.toLowerCase()} successfully!`);
      setSelectedPlan(null);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Approval action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEligibleApprover = ['Supply Chain Manager', 'Procurement Approver', 'Administrator'].includes(
    currentUser.role
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <CheckSquare className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Recovery Authorization & Approvals Workflow
              </h1>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                RBAC Governed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enforces managerial segregation of duties: <span className="text-slate-300 font-semibold">Users cannot approve their own proposed recovery plans.</span> Only authorized roles (SC Manager, Procurement Approver, Administrator) can authorize mitigation execution.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Current Role:</span>
            <span className="font-bold text-white">{currentUser.role}</span>
            {!isEligibleApprover && (
              <span className="text-[10px] text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded ml-1">
                Read-Only (Switch role in header to approve)
              </span>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Approvals Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">Pending Approval Queue</h2>
            <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingPlans.length} Pending
            </span>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {pendingPlans.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No recovery plans currently awaiting managerial sign-off.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPlans.map((plan) => {
              const isOwnPlan = plan.proposedByUserId === currentUser.id;
              return (
                <div
                  key={plan.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-white text-sm">{plan.planCode}</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-semibold">
                        {plan.planType}
                      </span>
                      <span className="text-xs text-slate-500">
                        Target: <span className="text-slate-300 font-mono">{plan.disruptionCode || 'Disruption'}</span>
                      </span>
                      <span className="text-xs text-slate-500">• Proposed by: {plan.proposedByName}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{plan.notes}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span>
                        Estimated Cost: <strong className="text-white">${plan.estimatedCost.toLocaleString()}</strong>
                      </span>
                      <span>
                        Delay Slashed: <strong className="text-emerald-400">-{plan.estimatedDelayReductionDays} days</strong>
                      </span>
                      <span>
                        Orders Saved: <strong className="text-cyan-400">{plan.ordersRecoveredCount} orders</strong>
                      </span>
                      <span>
                        Recovery Rate: <strong className="text-blue-400">{plan.recoveryPercentage}%</strong>
                      </span>
                    </div>

                    {isOwnPlan && (
                      <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded inline-block">
                        ⚠️ Policy Rule: You proposed this plan. A separate manager or administrator must sign off.
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenDecision(plan, 'Approved')}
                      disabled={!isEligibleApprover || isOwnPlan}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleOpenDecision(plan, 'Modified')}
                      disabled={!isEligibleApprover}
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                    >
                      Modify
                    </button>

                    <button
                      onClick={() => handleOpenDecision(plan, 'Rejected')}
                      disabled={!isEligibleApprover || isOwnPlan}
                      className="bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800 text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Approvals Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-4">Historical Approval Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Plan Code</th>
                <th className="px-4 py-3">Strategy</th>
                <th className="px-4 py-3">Approver Name</th>
                <th className="px-4 py-3">Approver Role</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Comments</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No approvals recorded yet
                  </td>
                </tr>
              ) : (
                history.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white">{app.planCode || 'REC-Plan'}</td>
                    <td className="px-4 py-3">{app.planType || 'General Recovery'}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{app.approverName}</td>
                    <td className="px-4 py-3 text-cyan-400">{app.approverRole}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.decision === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : app.decision === 'Rejected'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {app.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{app.comments || 'No comments'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(app.decidedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Confirm Decision: {selectedPlan.planCode}
                </h3>
                <p className="text-xs text-slate-400">Action: {decisionType.toUpperCase()} Recovery Proposal</p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                Cancel
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Approver Feedback / Comments {decisionType === 'Rejected' ? '*' : ''}
              </label>
              <textarea
                rows={3}
                required={decisionType === 'Rejected'}
                placeholder={`Provide reason or instructions for ${decisionType.toLowerCase()} decision...`}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={isSubmitting || (decisionType === 'Rejected' && !comments.trim())}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all ${
                  decisionType === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : decisionType === 'Rejected'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {isSubmitting ? 'Recording Decision...' : `Confirm ${decisionType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
