import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../../api';
import { DigitalTwinSimulationReport, Disruption, SimulationOptionResult } from '../../types';

interface RecoverySimulatorViewProps {
  onNavigate: (viewId: string) => void;
}

export const RecoverySimulatorView: React.FC<RecoverySimulatorViewProps> = ({ onNavigate }) => {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [selectedDisruptionId, setSelectedDisruptionId] = useState<string>('');
  const [report, setReport] = useState<DigitalTwinSimulationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDisruptions();
  }, []);

  const loadDisruptions = async () => {
    try {
      const allDis = await api.getDisruptions();
      setDisruptions(allDis);
      if (allDis.length > 0) {
        setSelectedDisruptionId(allDis[0].id);
        runSimulation(allDis[0].id);
      }
    } catch (err) {
      console.error('Failed to load disruptions:', err);
    }
  };

  const runSimulation = async (disruptionId: string) => {
    setLoading(true);
    setPlanSuccess(null);
    try {
      const sim = await api.getRecoverySimulation(disruptionId);
      setReport(sim);

      // Trigger Gemini AI recovery comparison
      fetchAiInsights(disruptionId);
    } catch (err) {
      console.error('Failed to run simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInsights = async (disruptionId: string) => {
    setLoadingAi(true);
    try {
      const res = await api.getRecoveryInsights(disruptionId);
      setAiAnalysis(res.insights);
    } catch (err) {
      console.error('Failed to fetch AI recovery insights:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCreatePlan = async (opt: SimulationOptionResult) => {
    if (!report) return;
    try {
      const plan = await api.createRecoveryPlan({
        disruptionId: report.disruptionId,
        planType:
          opt.optionKey === 'STOCK_REALLOCATION'
            ? 'Stock Reallocation'
            : opt.optionKey === 'EXPEDITED_SHIPPING'
            ? 'Expedited Shipping'
            : opt.optionKey === 'ALTERNATIVE_SUPPLIER'
            ? 'Alternative Supplier'
            : 'Order Splitting',
        estimatedCost: opt.estimatedAdditionalCost,
        estimatedDelayReductionDays: Math.max(1, report.beforeRecovery.estimatedDelayDays - opt.estimatedDeliveryDelayDays),
        ordersRecoveredCount: opt.ordersRecoveredCount,
        recoveryPercentage: opt.expectedRecoveryPercentage,
        feasibilityScore: opt.feasibilityScore,
        notes: `Autonomous Digital Twin proposal for ${report.disruptionCode}: ${opt.description}. Trade-off: ${opt.tradeOffSummary}`,
        items: opt.planItemsDraft.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          recoveryPlanId: '',
          itemAction: item.action,
          sourceEntityId: item.source,
          targetEntityId: item.target,
          quantity: item.quantity,
          cost: item.cost,
        })),
      });

      setPlanSuccess(`Recovery Plan ${plan.planCode} queued for Manager review in Approvals!`);
    } catch (err: any) {
      console.error('Failed to create recovery plan:', err);
    }
  };

  // Chart data: Cost vs Recovery %
  const comparisonChartData = report?.options.map((opt) => ({
    name: opt.title.split(':')[0],
    Cost: opt.estimatedAdditionalCost,
    RecoveryPct: opt.expectedRecoveryPercentage,
    ResidualRisk: opt.newRiskScore,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <Cpu className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Counterfactual Recovery Digital Twin Simulator
              </h1>
              <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                Algorithm 3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic simulation comparing 4 operational recovery options before executing decisions. Zero live inventory modification until authorized approval.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Target Disruption:</span>
              <select
                value={selectedDisruptionId}
                onChange={(e) => {
                  setSelectedDisruptionId(e.target.value);
                  runSimulation(e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              >
                {disruptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.disruptionCode} ({d.disruptionType})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => runSimulation(selectedDisruptionId)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {planSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{planSuccess}</span>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="text-xs underline font-semibold text-emerald-200 hover:text-white"
          >
            Go to Approvals Workflow →
          </button>
        </div>
      )}

      {/* Before Recovery Baseline vs Recommendation Banner */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Baseline State */}
          <div className="bg-slate-900 border border-rose-900/40 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Before Recovery (Baseline)
                </span>
                <span className="text-xs text-slate-500 font-mono">{report.disruptionCode}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">Shortage Deficit:</span>
                  <p className="font-bold text-rose-400 text-sm">
                    {report.beforeRecovery.originalShortage} units
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Orders at Risk:</span>
                  <p className="font-bold text-white text-sm">
                    {report.beforeRecovery.affectedOrdersCount} orders
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Inbound Delay:</span>
                  <p className="font-bold text-amber-400 text-sm">
                    +{report.beforeRecovery.estimatedDelayDays} days
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Baseline Risk:</span>
                  <p className="font-bold text-rose-400 text-sm">
                    {report.beforeRecovery.currentRiskScore}/100
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              Estimated Inactivity Loss: ~${report.beforeRecovery.estimatedLoss.toLocaleString()}
            </div>
          </div>

          {/* Autonomous Digital Twin Recommendation */}
          <div className="md:col-span-2 bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/40 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Autonomous Decision Engine Recommendation
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed font-medium">
                {report.recommendationReason}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-blue-900/50 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Recommended Option: <span className="font-bold text-white">{report.recommendedOptionKey}</span>
              </span>
              <button
                onClick={() => {
                  const recOpt = report.options.find((o) => o.optionKey === report.recommendedOptionKey) || report.options[0];
                  handleCreatePlan(recOpt);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Adopt Recommended Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Counterfactual Options Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.options.map((opt) => (
            <div
              key={opt.optionKey}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                opt.isRecommended
                  ? 'border-blue-500 ring-1 ring-blue-500/50 shadow-lg shadow-blue-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      opt.isRecommended
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {opt.isRecommended ? 'Recommended Option' : 'Alternative Strategy'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Feasibility: {opt.feasibilityScore}%
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-1">{opt.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{opt.description}</p>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Additional Cost</span>
                    <span className="text-sm font-bold text-white mt-0.5 block font-mono">
                      ${opt.estimatedAdditionalCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Orders Recovered</span>
                    <span className="text-sm font-bold text-emerald-400 mt-0.5 block font-mono">
                      {opt.ordersRecoveredCount} / {report.beforeRecovery.affectedOrdersCount}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">New Risk Score</span>
                    <span className="text-sm font-bold text-cyan-400 mt-0.5 block font-mono">
                      {opt.newRiskScore}/100
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="font-semibold text-slate-300">Operational Trade-off: </span>
                  {opt.tradeOffSummary}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-xs font-semibold text-emerald-400">
                  {opt.expectedRecoveryPercentage}% Recovery Efficacy
                </span>
                <button
                  onClick={() => handleCreatePlan(opt)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition-colors"
                >
                  Create Recovery Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Chart & Gemini Executive Advice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost vs Risk Comparison Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Counterfactual Trade-off Analysis</h3>
              <p className="text-xs text-slate-400">Expenditure ($ USD) vs Residual Risk Score</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Cost" fill="#3B82F6" name="Addl Cost ($)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ResidualRisk" fill="#F59E0B" name="Residual Risk (/100)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gemini Executive Advisory Briefing */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Gemini AI Executive Advisory Briefing</h3>
              </div>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                gemini-3.8-flash
              </span>
            </div>

            {loadingAi ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Synthesizing managerial recommendations from digital twin metrics...</span>
              </div>
            ) : (
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto pr-1">
                {aiAnalysis ||
                  'Digital twin trade-off analysis ready. Evaluated Pareto optimality across stock reallocation, expedited air freight, and secondary procurement.'}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Grounded on real database records</span>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              Review Pending Approvals <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
