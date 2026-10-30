import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Building2,
  Truck,
  Warehouse,
  Boxes,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api';
import { RippleImpactResult, Disruption } from '../../types';

interface RippleImpactViewProps {
  onNavigate: (viewId: string) => void;
}

export const RippleImpactView: React.FC<RippleImpactViewProps> = ({ onNavigate }) => {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [selectedDisruptionId, setSelectedDisruptionId] = useState<string>('');
  const [rippleData, setRippleData] = useState<RippleImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    loadDisruptions();
  }, []);

  const loadDisruptions = async () => {
    try {
      const allDis = await api.getDisruptions();
      setDisruptions(allDis);
      if (allDis.length > 0 && !selectedDisruptionId) {
        setSelectedDisruptionId(allDis[0].id);
        fetchRipple(allDis[0].id);
      }
    } catch (err) {
      console.error('Failed to load disruptions:', err);
    }
  };

  const fetchRipple = async (disruptionId: string) => {
    setLoading(true);
    try {
      const res = await api.getRippleImpact(disruptionId);
      setRippleData(res);
      setSelectedNode(null);
    } catch (err) {
      console.error('Failed to fetch ripple impact:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisruptionChange = (id: string) => {
    setSelectedDisruptionId(id);
    fetchRipple(id);
  };

  return (
    <div className="space-y-6">
      {/* Header & Disruption Selector */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl">
                <GitBranch className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Ripple Impact Intelligence Engine
              </h1>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                Algorithm 1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic propagation tracing: Supplier Delay → Delayed Shipment → Warehouse Inflow → Inventory Deficit → Customer Order Impact.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Select Disruption:</span>
              <select
                value={selectedDisruptionId}
                onChange={(e) => handleDisruptionChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
              >
                {disruptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.disruptionCode} ({d.disruptionType} - {d.severity})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchRipple(selectedDisruptionId)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              title="Recalculate Ripple Graph"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Ripple Summary KPI Row */}
      {rippleData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block">Delay Propagation</span>
            <span className="text-xl font-bold text-rose-400 mt-1 block">
              +{rippleData.estimatedDeliveryImpactDays} Days
            </span>
            <span className="text-[10px] text-slate-500">Inbound transit slip</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block">Net Stock Shortage</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">
              {rippleData.totalShortageQuantity} Units
            </span>
            <span className="text-[10px] text-slate-500">Deficit at destination</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block">Affected Orders</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {rippleData.affectedOrders.length}
            </span>
            <span className="text-[10px] text-rose-400 font-semibold">Production lines at risk</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block">Affected Hub</span>
            <span className="text-sm font-bold text-white mt-1 block truncate">
              {rippleData.affectedWarehouses[0]?.name || 'Network Node'}
            </span>
            <span className="text-[10px] text-slate-500">Destination target</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] text-slate-400">Next Action</span>
            <button
              onClick={() => onNavigate('recovery-simulator')}
              className="mt-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Simulate Recovery</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Propagation Pipeline & Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Deterministic Supply Chain Ripple Pipeline
            </h2>
            <p className="text-xs text-slate-400">
              Interactive node topology from disruption root origin down to customer delivery commitments.
            </p>
          </div>
          <span className="text-xs text-slate-500">Click any node to inspect details</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Calculating propagation paths through network topology...</span>
          </div>
        ) : rippleData ? (
          <div className="space-y-6">
            {/* 5-Stage Multi-Tier Propagation Flow */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {/* STAGE 1: SUPPLIER */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>1. Supplier</span>
                </div>
                {rippleData.nodes
                  .filter((n) => n.type === 'supplier')
                  .map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedNode?.id === node.id
                          ? 'border-cyan-400 bg-slate-800/90 ring-1 ring-cyan-400'
                          : 'border-slate-700 bg-slate-950/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">{node.details.code}</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                          {node.details.reliability} Rel.
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1.5">{node.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{node.details.location}</p>
                    </div>
                  ))}
              </div>

              {/* STAGE 2: SHIPMENT */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2. Shipment</span>
                </div>
                {rippleData.nodes
                  .filter((n) => n.type === 'shipment')
                  .map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedNode?.id === node.id
                          ? 'border-cyan-400 bg-slate-800/90 ring-1 ring-cyan-400'
                          : 'border-rose-800/60 bg-rose-950/20 hover:border-rose-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-rose-400 font-bold">{node.details.code}</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold animate-pulse">
                          +{node.details.delayDays}d Delayed
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1.5">{node.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Cargo: {node.details.quantity} units</p>
                    </div>
                  ))}
              </div>

              {/* STAGE 3: WAREHOUSE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
                  <span>3. Destination</span>
                </div>
                {rippleData.nodes
                  .filter((n) => n.type === 'warehouse')
                  .map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedNode?.id === node.id
                          ? 'border-cyan-400 bg-slate-800/90 ring-1 ring-cyan-400'
                          : 'border-slate-700 bg-slate-950/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold">{node.details.code}</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                          {node.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1.5">{node.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{node.details.location}</p>
                    </div>
                  ))}
              </div>

              {/* STAGE 4: INVENTORY SHORTAGE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Boxes className="w-3.5 h-3.5 text-orange-400" />
                  <span>4. On-Hand Deficit</span>
                </div>
                {rippleData.nodes
                  .filter((n) => n.type === 'product')
                  .map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedNode?.id === node.id
                          ? 'border-cyan-400 bg-slate-800/90 ring-1 ring-cyan-400'
                          : 'border-amber-700/60 bg-amber-950/20 hover:border-amber-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-orange-400 font-bold">{node.details.code}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                          Stock: {node.details.availableStock}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1.5">{node.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Safety Buffer: {node.details.safetyStock} units
                      </p>
                    </div>
                  ))}
              </div>

              {/* STAGE 5: AFFECTED CUSTOMER ORDERS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <ShoppingCart className="w-3.5 h-3.5 text-rose-400" />
                  <span>5. Customer SLA Risk</span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {rippleData.nodes
                    .filter((n) => n.type === 'order')
                    .map((node) => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedNode?.id === node.id
                            ? 'border-cyan-400 bg-slate-800/90 ring-1 ring-cyan-400'
                            : node.severity === 'Critical'
                            ? 'border-rose-800/60 bg-rose-950/30 hover:border-rose-600'
                            : 'border-slate-700 bg-slate-950/80 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">{node.details.code}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              node.details.priority === 'Critical'
                                ? 'bg-rose-500 text-white'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {node.details.priority}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white mt-1 truncate">{node.details.customer}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>Need: {node.details.requiredQty} units</span>
                          <span className="text-rose-400 font-bold">{node.details.daysRemaining}d to SLA</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Selected Node Details Drawer */}
            {selectedNode && (
              <div className="bg-slate-950 border border-cyan-500/40 p-4 rounded-xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{selectedNode.label}</span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono uppercase">
                      {selectedNode.type}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-300 pt-1">
                  {Object.entries(selectedNode.details).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-slate-500 capitalize block text-[10px]">{key}</span>
                      <span className="font-medium text-slate-200">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Urgency Ranked Affected Customer Orders Table */}
      {rippleData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Urgency-Ranked Order Shortage & Delivery Impact
              </h3>
              <p className="text-xs text-slate-400">
                Ranked by deadline proximity, shortage volume, and customer contract priority
              </p>
            </div>
            <button
              onClick={() => onNavigate('recovery-simulator')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              Simulate Counterfactual Options →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Rank & Order Code</th>
                  <th className="px-4 py-3">Customer Entity</th>
                  <th className="px-4 py-3">Required Qty</th>
                  <th className="px-4 py-3">Calculated Shortage</th>
                  <th className="px-4 py-3">Delivery Deadline</th>
                  <th className="px-4 py-3">Days Remaining</th>
                  <th className="px-4 py-3">Contract Priority</th>
                  <th className="px-4 py-3">Risk Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {rippleData.urgencyRankedOrders.map((item, idx) => (
                  <tr key={item.order.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span>{item.order.orderCode}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {item.order.customerName}
                    </td>
                    <td className="px-4 py-3">{item.order.requiredQuantity} units</td>
                    <td className="px-4 py-3 font-bold text-amber-400">
                      {item.shortage} units deficit
                    </td>
                    <td className="px-4 py-3">{item.order.deliveryDeadline}</td>
                    <td className="px-4 py-3 font-semibold text-rose-400">
                      {item.daysUntilDeadline} days left
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.order.priority === 'Critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.order.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-rose-400">CRITICAL</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
