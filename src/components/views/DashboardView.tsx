import React, { useState, useEffect } from 'react';
import {
  Building2,
  Truck,
  AlertOctagon,
  ShoppingCart,
  ShieldAlert,
  Boxes,
  CheckSquare,
  TrendingUp,
  RefreshCw,
  Sparkles,
  ArrowRight,
  GitBranch,
  Cpu,
  RotateCcw,
  PlusCircle,
  Clock,
  Layers,
  Trash2,
  Navigation,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../../api';

interface DashboardViewProps {
  onNavigate: (viewId: string) => void;
  onOpenAssistant: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenAssistant }) => {
  const [kpis, setKpis] = useState<any>(null);
  const [gpsStats, setGpsStats] = useState<any>(null);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [kpiRes, gpsRes, disRes, ordRes, whRes] = await Promise.all([
        api.getDashboardKpis(),
        api.getLorryGpsStats(),
        api.getDisruptions(),
        api.getOrders(),
        api.getWarehouses(),
      ]);
      setKpis(kpiRes);
      setGpsStats(gpsRes);
      setDisruptions(disRes);
      setOrders(ordRes);
      setWarehouses(whRes);

      // Trigger AI insight for primary disruption if available
      const activeDis = disRes.find((d: any) => d.status !== 'Resolved');
      if (activeDis) {
        fetchAiInsight(activeDis.id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAiInsight = async (disruptionId: string) => {
    setLoadingAi(true);
    try {
      const res = await api.explainDisruption(disruptionId);
      setAiInsight(res.explanation);
    } catch (err) {
      console.error('Failed to fetch AI explanation:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      await api.seedDemoData();
      await loadData();
    } catch (err) {
      console.error('Failed to seed demo data:', err);
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset demo data? User-created records will be preserved.')) {
      try {
        await api.resetDemoData();
        await loadData();
      } catch (err) {
        console.error('Failed to reset demo data:', err);
      }
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        'Are you sure you want to remove ALL application data? This will clear all suppliers, products, warehouses, inventory, shipments, orders, and disruptions.'
      )
    ) {
      try {
        await api.clearAllData();
        await loadData();
      } catch (err) {
        console.error('Failed to clear all data:', err);
      }
    }
  };

  // Recharts Chart Data
  const orderRiskData = [
    { name: 'Low Risk (0-29)', value: orders.filter((o) => o.riskCategory === 'LOW').length || 0, color: '#10B981' },
    { name: 'Medium (30-59)', value: orders.filter((o) => o.riskCategory === 'MEDIUM').length || 0, color: '#F59E0B' },
    { name: 'High (60-79)', value: orders.filter((o) => o.riskCategory === 'HIGH').length || 0, color: '#F97316' },
    { name: 'Critical (80-100)', value: orders.filter((o) => o.riskCategory === 'CRITICAL').length || 0, color: '#EF4444' },
  ];

  const warehouseBarData = warehouses.map((wh) => ({
    name: wh.name.split(' ')[0],
    capacity: wh.capacity,
    status: wh.status,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Autonomous Supply Chain Control Tower</h1>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Database Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-tier disruption detection, deterministic ripple propagation, and counterfactual recovery simulation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate('lorry-gps')}
            className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold px-3 py-2 rounded-lg border border-cyan-500/40 transition-colors shadow-sm"
            title="Open Live GPS Lorry Tracking & Breakdown Monitoring"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lorry GPS Tracking</span>
          </button>

          <button
            onClick={handleSeedDemo}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors"
            title="Generate 10 suppliers, 15 products, 5 warehouses, 30 inventory, 30 shipments, 40 orders"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Seed Demo Data</span>
          </button>

          <button
            onClick={handleResetDemo}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-medium px-2.5 py-2 rounded-lg border border-slate-700 transition-colors"
            title="Clean demo records while keeping user manual entries"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-medium px-2.5 py-2 rounded-lg border border-rose-500/30 transition-colors"
            title="Delete all data records across the entire application"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* 6 Required GPS Lorry Tracking & Breakdown KPI Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Navigation className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-white">Live GPS Fleet Telemetry & Breakdown Tracking</h2>
          </div>
          <button
            onClick={() => onNavigate('lorry-gps')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 hover:underline"
          >
            <span>Open GPS Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Active Lorries */}
          <div
            onClick={() => onNavigate('lorry-gps')}
            className="bg-slate-950 border border-slate-800 hover:border-blue-500/50 p-3 rounded-xl cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Active Lorries</span>
              <Truck className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-bold text-white">{gpsStats?.totalLorries ?? 0}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Live fleet stream</div>
          </div>

          {/* Moving Lorries */}
          <div
            onClick={() => onNavigate('lorry-gps')}
            className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-xl cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Moving Lorries</span>
              <Navigation className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-bold text-emerald-400">{gpsStats?.movingLorries ?? 0}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> In transit ({'>'}5 km/h)
            </div>
          </div>

          {/* Stopped Lorries */}
          <div
            onClick={() => onNavigate('lorry-gps')}
            className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Stopped Lorries</span>
              <Clock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-bold text-amber-400">{gpsStats?.stoppedLorries ?? 0}</div>
            <div className="text-[10px] text-amber-500/80 mt-0.5">Speed = 0 km/h</div>
          </div>

          {/* Possible Stoppages */}
          <div
            onClick={() => onNavigate('lorry-gps')}
            className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Possible Stoppages</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-bold text-amber-400">{gpsStats?.possibleStoppages ?? 0}</div>
            <div className="text-[10px] text-amber-500/80 mt-0.5">10m+ stationary</div>
          </div>

          {/* Confirmed Breakdowns */}
          <div
            onClick={() => onNavigate('lorry-gps')}
            className="bg-slate-950 border border-slate-800 hover:border-rose-500/50 p-3 rounded-xl cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Confirmed Breakdowns</span>
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform animate-pulse" />
            </div>
            <div className="text-xl font-bold text-rose-400">{gpsStats?.confirmedBreakdowns ?? 0}</div>
            <div className="text-[10px] text-rose-500/80 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Disruption active
            </div>
          </div>

          {/* Recovered Lorries */}
          <div
            onClick={() => onNavigate('lorry-gps')}
            className="bg-slate-950 border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Recovered Lorries</span>
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-bold text-cyan-400">{gpsStats?.recoveredLorries ?? 0}</div>
            <div className="text-[10px] text-cyan-500/80 mt-0.5">Repairs cleared</div>
          </div>
        </div>
      </div>

      {/* 8 Primary Enterprise KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Suppliers */}
        <div
          onClick={() => onNavigate('suppliers')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Suppliers</span>
            <Building2 className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{kpis?.activeSuppliers ?? 0}</span>
            <span className="text-[11px] text-emerald-400">Verified</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Multi-tier manufacturing partners</p>
        </div>

        {/* Shipments */}
        <div
          onClick={() => onNavigate('shipments')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Shipments</span>
            <Truck className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{kpis?.activeShipments ?? 0}</span>
            {kpis?.delayedShipments > 0 && (
              <span className="text-[11px] font-semibold text-rose-400">
                {kpis.delayedShipments} Delayed
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">In-transit ocean, air & road legs</p>
        </div>

        {/* Active Disruptions */}
        <div
          onClick={() => onNavigate('disruptions')}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Disruptions</span>
            <AlertOctagon className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400">{kpis?.activeDisruptions ?? 0}</span>
            <span className="text-[11px] text-rose-300">Under Analysis</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Supplier, port & logistics bottlenecks</p>
        </div>

        {/* Customer Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Open Customer Orders</span>
            <ShoppingCart className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{kpis?.openOrders ?? 0}</span>
            <span className="text-[11px] text-slate-400">In Pipeline</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Industrial and OEM delivery SLAs</p>
        </div>

        {/* Critical Risk Orders */}
        <div
          onClick={() => onNavigate('risk-analysis')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Critical Risk Orders</span>
            <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{kpis?.criticalOrders ?? 0}</span>
            <span className="text-[11px] text-amber-300">Score &gt; 80</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Imminent deadline & stockout danger</p>
        </div>

        {/* Inventory Shortages */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Inventory Shortages</span>
            <Boxes className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{kpis?.inventoryShortages ?? 0}</span>
            <span className="text-[11px] text-orange-400">&lt; Safety Stock</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">SKUs below minimum buffer threshold</p>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Pending Approvals</span>
            <CheckSquare className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{kpis?.pendingApprovals ?? 0}</span>
            <span className="text-[11px] text-amber-400">Awaiting Manager</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Autonomous plans requiring sign-off</p>
        </div>

        {/* Recovery Success Rate */}
        <div
          onClick={() => onNavigate('recovery-plans')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Recovery Success Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">
              {kpis?.recoverySuccessRate ?? 92}%
            </span>
            <span className="text-[11px] text-emerald-300">Resolved SLAs</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Executed mitigation efficacy</p>
        </div>
      </div>

      {/* Flagship Academic Scenarios Showcase Box */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-800/40 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Demonstration & Evaluation Scenarios</h2>
              <p className="text-xs text-slate-400">
                Pre-configured multi-tier disruption cases for immediate testing and verification
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
            Interactive Testbed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scenario 1 */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/60 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                  Scenario 1: Critical
                </span>
                <span className="text-xs text-slate-400">DIS-001 (Foxconn)</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mt-2">
                Supplier Delivery Disruption at Chennai Central Hub
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Foxconn semiconductor shipment SHIP-001 delayed by 4 days. Chennai warehouse holds only 30 units of Microcontroller MC-900 vs 70 units required for urgent Tata Motors and Mahindra EV lines.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigate('ripple-impact')}
                className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                Inspect Ripple Impact <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('recovery-simulator')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
              >
                Launch Digital Twin
              </button>
            </div>
          </div>

          {/* Scenario 2 */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/60 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  Scenario 2: High Risk
                </span>
                <span className="text-xs text-slate-400">DIS-002 (Rotterdam)</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mt-2">
                Port Congestion Delay at Rotterdam Gateway Depot
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Container handling backlog causes 6-day delay for Bosch precision sensors shipment SHIP-002. European robotic automation orders at risk of stalling.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigate('ripple-impact')}
                className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                Inspect Ripple Impact <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('recovery-simulator')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
              >
                Launch Digital Twin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Disruption Intelligence Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white">Google Gemini AI Disruption Analysis</h2>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono">
              gemini-3.8-flash
            </span>
          </div>
          <button
            onClick={onOpenAssistant}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
          >
            Chat with AI Copilot <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingAi ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Generating executive disruption breakdown from live telemetry...</span>
          </div>
        ) : (
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {aiInsight ||
              'Select an active disruption to generate real-time AI root-cause analysis, operational risk impact, and autonomous recovery recommendations.'}
          </div>
        )}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Risk Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Customer Order Risk Distribution</h3>
              <p className="text-xs text-slate-400">Calculated via deterministic multi-factor scoring</p>
            </div>
            <button
              onClick={() => onNavigate('risk-analysis')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View Risk Details →
            </button>
          </div>

          <div className="h-60 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderRiskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => (name ? `${name.split(' ')[0]}: ${value}` : `${value}`)}
                >
                  {orderRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Warehouse Capacities */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Hub Capacity & Network Node Status</h3>
              <p className="text-xs text-slate-400">Total rated storage capacity (Units)</p>
            </div>
            <button
              onClick={() => onNavigate('warehouses')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Manage Hubs →
            </button>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseBarData}>
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
                <Bar dataKey="capacity" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
