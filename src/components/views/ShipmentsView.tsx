import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  Filter,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  RefreshCw,
  ExternalLink,
  Trash2,
  Navigation,
} from 'lucide-react';
import { api } from '../../api';
import { Shipment } from '../../types';

interface ShipmentsViewProps {
  onNavigate: (viewId: string) => void;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({ onNavigate }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Webhook Simulator State
  const [showWebhookTester, setShowWebhookTester] = useState(false);
  const [webhookPayload, setWebhookPayload] = useState({
    shipment_id: 'SHIP-001',
    event: 'DELAYED' as const,
    delay_days: 4,
    location: 'Chennai Port Checkpoint',
    carrier_note: 'Severe maritime terminal container congestion',
  });
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await api.getShipments();
      setShipments(data);
      if (data.length > 0 && !webhookPayload.shipment_id) {
        setWebhookPayload((prev) => ({ ...prev, shipment_id: data[0].shipmentCode }));
      }
    } catch (err: any) {
      console.error('Failed to load shipments:', err);
      setActionError(err.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete shipment "${code}"?`)) return;
    try {
      await api.deleteShipment(id);
      loadShipments();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete shipment');
    }
  };

  const handleTriggerWebhook = async () => {
    setIsSendingWebhook(true);
    setWebhookResult(null);
    try {
      const res = await api.triggerCarrierWebhook({
        ...webhookPayload,
        event_time: new Date().toISOString(),
      });
      setWebhookResult(res);
      await loadShipments();
    } catch (err: any) {
      setWebhookResult({ error: err.message || 'Webhook simulation failed' });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesFilter = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch =
      s.shipmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.carrierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.trackingReference && s.trackingReference.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl">
                <Truck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Shipments & Logistics Fleet</h1>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                Fleet Tracking
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live tracking across ocean carriers, air charters, and road freight legs. Integrates with the simulated carrier webhook.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigate('lorry-gps')}
              className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all"
            >
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Live Lorry GPS Map</span>
            </button>

            <button
              onClick={() => setShowWebhookTester(!showWebhookTester)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Simulate Carrier Webhook</span>
            </button>

            <button
              onClick={() => onNavigate('add-data')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Shipment</span>
            </button>

            <button
              onClick={loadShipments}
              className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Carrier Webhook Simulation Interactive Drawer */}
        {showWebhookTester && (
          <div className="mt-5 pt-4 border-t border-slate-800 bg-slate-950/70 p-4 rounded-xl border border-purple-500/30 animate-in fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white">Simulated Carrier Webhook Endpoint (POST /api/carrier-webhook)</h3>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded font-mono">
                Simulated Sandbox Event
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target Shipment Code</label>
                <select
                  value={webhookPayload.shipment_id}
                  onChange={(e) => setWebhookPayload({ ...webhookPayload, shipment_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  {shipments.map((s) => (
                    <option key={s.id} value={s.shipmentCode}>
                      {s.shipmentCode} ({s.carrierName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Event Type</label>
                <select
                  value={webhookPayload.event}
                  onChange={(e) => setWebhookPayload({ ...webhookPayload, event: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                >
                  <option value="DELAYED">DELAYED (Triggers Disruption)</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="DELIVERED">DELIVERED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Delay Incurred (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={webhookPayload.delay_days}
                  onChange={(e) =>
                    setWebhookPayload({ ...webhookPayload, delay_days: Number(e.target.value) })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Checkpoint Location</label>
                <input
                  type="text"
                  value={webhookPayload.location}
                  onChange={(e) => setWebhookPayload({ ...webhookPayload, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Payload updates shipment state, detects disruption, recalculates order risks & logs audit trail.
              </span>
              <button
                onClick={handleTriggerWebhook}
                disabled={isSendingWebhook}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingWebhook ? 'Dispatching...' : 'Dispatch Webhook Event'}</span>
              </button>
            </div>

            {webhookResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs font-mono ${
                  webhookResult.error
                    ? 'bg-rose-950/60 border border-rose-800 text-rose-300'
                    : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                }`}
              >
                {JSON.stringify(webhookResult, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs">
          {actionError}
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'In Transit', 'Delayed', 'Delivered', 'Pending'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, carrier or tracking..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Shipment Code</th>
                <th className="px-4 py-3">Carrier Name</th>
                <th className="px-4 py-3">Supplier Origin</th>
                <th className="px-4 py-3">Product Item</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Destination Hub</th>
                <th className="px-4 py-3">ETA Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tracking Reference</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="font-semibold text-slate-400">No shipments registered</p>
                    <p className="text-[11px] text-slate-500 mt-1">Use "Add New Data" or "Simulate Carrier Webhook" to register active shipments.</p>
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white">{s.shipmentCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{s.carrierName}</td>
                    <td className="px-4 py-3 text-slate-400">{s.supplierName || 'Supplier'}</td>
                    <td className="px-4 py-3">{s.productName || 'Product'}</td>
                    <td className="px-4 py-3 font-semibold text-white">{s.quantity} units</td>
                    <td className="px-4 py-3 text-slate-400">{s.warehouseName || 'Warehouse'}</td>
                    <td className="px-4 py-3 font-medium">{s.expectedDeliveryDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'Delayed'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : s.status === 'In Transit'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : s.status === 'Delivered'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.status} {s.delayDays > 0 ? `(+${s.delayDays}d)` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {s.trackingReference || 'TRK-Pending'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNavigate('lorry-gps')}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                          title="View live GPS telemetry & lorry tracking"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.shipmentCode)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="Delete shipment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
