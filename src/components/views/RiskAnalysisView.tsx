import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Sliders,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../../api';
import { OrderRiskEvaluation, RiskScoringWeights } from '../../types';

interface RiskAnalysisViewProps {
  onNavigate: (viewId: string) => void;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({ onNavigate }) => {
  const [evaluations, setEvaluations] = useState<OrderRiskEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRiskEvaluation | null>(null);

  // Dynamic weight tuner state
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [weights, setWeights] = useState<RiskScoringWeights>({
    delayWeight: 0.25,
    deadlineWeight: 0.25,
    shortageWeight: 0.2,
    stockWeight: 0.15,
    reliabilityWeight: 0.15,
  });

  useEffect(() => {
    loadRiskData();
  }, []);

  const loadRiskData = async () => {
    setLoading(true);
    try {
      const [data, settings] = await Promise.all([
        api.getRiskAnalysis(),
        api.getSettings(),
      ]);
      setEvaluations(data);
      if (settings?.riskWeights) {
        setWeights(settings.riskWeights);
      }
    } catch (err) {
      console.error('Failed to load risk evaluations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWeights = async () => {
    try {
      await api.updateRiskWeights(weights);
      await loadRiskData();
      setShowWeightTuner(false);
    } catch (err) {
      console.error('Failed to update weights:', err);
    }
  };

  const filteredEvaluations = evaluations.filter((ev) => {
    const matchesFilter = filterCategory === 'ALL' || ev.riskCategory === filterCategory;
    const matchesSearch =
      ev.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Intelligent Order Risk Scoring Engine
              </h1>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                Algorithm 2
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic 0–100 scoring based on multi-factor physics: shipment delay, supplier reliability, inventory availability, order deadline urgency, and shortage volume.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowWeightTuner(!showWeightTuner)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Configure Weights</span>
            </button>

            <button
              onClick={loadRiskData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Configurable Risk Weights Panel */}
        {showWeightTuner && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-4 animate-in fade-in">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Delay Weight: {(weights.delayWeight * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={weights.delayWeight}
                onChange={(e) => setWeights({ ...weights, delayWeight: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Deadline Urgency: {(weights.deadlineWeight * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={weights.deadlineWeight}
                onChange={(e) =>
                  setWeights({ ...weights, deadlineWeight: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Shortage Ratio: {(weights.shortageWeight * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={weights.shortageWeight}
                onChange={(e) =>
                  setWeights({ ...weights, shortageWeight: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Stock Safety Buffer: {(weights.stockWeight * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={weights.stockWeight}
                onChange={(e) => setWeights({ ...weights, stockWeight: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleUpdateWeights}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
              >
                Apply Weights
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterCategory === cat
                  ? cat === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : cat === 'HIGH'
                    ? 'bg-amber-600 text-white'
                    : cat === 'MEDIUM'
                    ? 'bg-blue-600 text-white'
                    : cat === 'LOW'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Orders' : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order or customer..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Order Code</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Risk Category</th>
                <th className="px-4 py-3">Related Shipment</th>
                <th className="px-4 py-3">Shortage</th>
                <th className="px-4 py-3">Days Remaining</th>
                <th className="px-4 py-3">Recommended Priority</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No orders match the selected risk criteria
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev) => (
                  <tr key={ev.orderId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white">{ev.orderCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{ev.customerName}</td>
                    <td className="px-4 py-3 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{ev.riskScore}</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              ev.riskScore >= 80
                                ? 'bg-rose-500'
                                : ev.riskScore >= 60
                                ? 'bg-amber-500'
                                : ev.riskScore >= 30
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${ev.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.riskCategory === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : ev.riskCategory === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : ev.riskCategory === 'MEDIUM'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {ev.riskCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {ev.relatedShipmentCode || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {ev.shortageQuantity > 0 ? (
                        <span className="text-rose-400 font-bold">{ev.shortageQuantity} units</span>
                      ) : (
                        <span className="text-emerald-400">0 (Covered)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          ev.daysRemaining <= 3 ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {ev.daysRemaining} days
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {ev.recommendedPriority}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedOrder(ev)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Explain
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Order Factor Explanation Drawer */}
      {selectedOrder && (
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Deterministic Risk Breakdown: {selectedOrder.orderCode} ({selectedOrder.customerName})
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    selectedOrder.riskCategory === 'CRITICAL'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {selectedOrder.riskCategory} ({selectedOrder.riskScore}/100)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{selectedOrder.explanation}</p>
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded-lg"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Delay Contribution</span>
              <span className="text-base font-bold text-rose-400 mt-1 block">
                +{selectedOrder.factors.delayContribution} pts
              </span>
              <span className="text-[10px] text-slate-500">
                {selectedOrder.expectedDelayDays} days delay
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Deadline Urgency</span>
              <span className="text-base font-bold text-amber-400 mt-1 block">
                +{selectedOrder.factors.deadlineContribution} pts
              </span>
              <span className="text-[10px] text-slate-500">
                {selectedOrder.daysRemaining} days remaining
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Shortage Contribution</span>
              <span className="text-base font-bold text-rose-400 mt-1 block">
                +{selectedOrder.factors.shortageContribution} pts
              </span>
              <span className="text-[10px] text-slate-500">
                {selectedOrder.shortageQuantity} units deficit
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Stock Buffer Factor</span>
              <span className="text-base font-bold text-cyan-400 mt-1 block">
                +{selectedOrder.factors.stockContribution} pts
              </span>
              <span className="text-[10px] text-slate-500">Warehouse on-hand</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Supplier Risk Factor</span>
              <span className="text-base font-bold text-indigo-400 mt-1 block">
                +{selectedOrder.factors.supplierContribution} pts
              </span>
              <span className="text-[10px] text-slate-500">Historical performance</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
