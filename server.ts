import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { db } from './server/db';
import { calculateRippleImpact } from './server/algorithms/rippleImpact';
import { evaluateAllOrdersRisk, calculateOrderRisk } from './server/algorithms/riskScoring';
import { simulateRecoveryDigitalTwin } from './server/algorithms/recoveryDigitalTwin';
import {
  explainDisruptionWithGemini,
  getRecoveryInsightsWithGemini,
  answerSupplyChainAssistant,
  generateExecutiveReportWithGemini,
} from './server/gemini';
import { UserRole } from './src/types';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Helper to extract authenticated user from header or fallback
  const getAuthUser = (req: Request) => {
    const rawRole = (req.headers['x-user-role'] as string) || 'Administrator';
    const role: UserRole = [
      'Operations Analyst',
      'Supply Chain Manager',
      'Warehouse Operator',
      'Procurement Approver',
      'Administrator',
    ].includes(rawRole)
      ? (rawRole as UserRole)
      : 'Administrator';

    const userId = (req.headers['x-user-id'] as string) || 'usr_admin';
    const userName = (req.headers['x-user-name'] as string) || 'Sarah Chen (Admin)';

    return { id: userId, name: userName, role };
  };

  // -------------------------------------------------------------
  // HEALTH & SYSTEM STATUS
  // -------------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      appName: 'ChainPulse AI',
      version: '2.5.0-resilience',
    });
  });

  // -------------------------------------------------------------
  // DASHBOARD KPIS
  // -------------------------------------------------------------
  app.get('/api/dashboard/kpis', (_req: Request, res: Response) => {
    const raw = db.getRawData();
    const activeSuppliers = raw.suppliers.filter((s) => s.status === 'Active').length;
    const activeShipments = raw.shipments.filter(
      (s) => s.status === 'In Transit' || s.status === 'Delayed'
    ).length;
    const delayedShipments = raw.shipments.filter((s) => s.status === 'Delayed').length;
    const activeDisruptions = raw.disruptions.filter((d) => d.status !== 'Resolved').length;
    const openOrders = raw.orders.filter(
      (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
    ).length;
    const criticalOrders = raw.orders.filter(
      (o) => o.riskCategory === 'CRITICAL' && o.status !== 'Delivered' && o.status !== 'Cancelled'
    ).length;
    const inventoryShortages = raw.inventory.filter((i) => i.availableStock < i.minimumStock).length;
    const pendingApprovals = raw.recoveryPlans.filter((p) => p.status === 'Pending Approval').length;
    const executedPlans = raw.recoveryPlans.filter((p) => p.status === 'Executed').length;
    const totalDecidedPlans = raw.recoveryPlans.filter(
      (p) => p.status === 'Executed' || p.status === 'Approved'
    ).length;
    const recoverySuccessRate =
      raw.recoveryPlans.length > 0
        ? Math.round((totalDecidedPlans / Math.max(1, raw.recoveryPlans.length)) * 100)
        : 92;

    res.json({
      activeSuppliers,
      activeShipments,
      delayedShipments,
      activeDisruptions,
      openOrders,
      criticalOrders,
      inventoryShortages,
      pendingApprovals,
      recoverySuccessRate,
      totalWarehouses: raw.warehouses.length,
      totalProducts: raw.products.length,
    });
  });

  // -------------------------------------------------------------
  // AUTH & PROFILES
  // -------------------------------------------------------------
  app.get('/api/auth/profiles', (_req: Request, res: Response) => {
    res.json(db.getRawData().profiles);
  });

  app.put('/api/auth/profiles/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updated = db.updateUserProfile(req.params.id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // SUPPLIERS
  // -------------------------------------------------------------
  app.get('/api/suppliers', (_req: Request, res: Response) => {
    res.json(db.getSuppliers());
  });

  app.post('/api/suppliers', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const supplier = db.createSupplier(req.body, user);
      res.status(201).json(supplier);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/suppliers/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updated = db.updateSupplier(req.params.id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/suppliers/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteSupplier(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------------
  app.get('/api/products', (_req: Request, res: Response) => {
    res.json(db.getProducts());
  });

  app.post('/api/products', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const product = db.createProduct(req.body, user);
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updated = db.updateProduct(req.params.id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteProduct(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // WAREHOUSES
  // -------------------------------------------------------------
  app.get('/api/warehouses', (_req: Request, res: Response) => {
    res.json(db.getWarehouses());
  });

  app.post('/api/warehouses', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const warehouse = db.createWarehouse(req.body, user);
      res.status(201).json(warehouse);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/warehouses/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updated = db.updateWarehouse(req.params.id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/warehouses/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteWarehouse(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // INVENTORY
  // -------------------------------------------------------------
  app.get('/api/inventory', (_req: Request, res: Response) => {
    res.json(db.getInventory());
  });

  app.post('/api/inventory', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const inventory = db.createOrUpdateInventory(req.body, user);
      res.status(201).json(inventory);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/inventory/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteInventory(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // SHIPMENTS
  // -------------------------------------------------------------
  app.get('/api/shipments', (_req: Request, res: Response) => {
    res.json(db.getShipments());
  });

  app.post('/api/shipments', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const shipment = db.createShipment(req.body, user);
      res.status(201).json(shipment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/shipments/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updated = db.updateShipment(req.params.id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/shipments/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteShipment(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // CUSTOMER ORDERS
  // -------------------------------------------------------------
  app.get('/api/orders', (_req: Request, res: Response) => {
    res.json(db.getOrders());
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const order = db.createOrder(req.body, user);
      res.status(201).json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/orders/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteOrder(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // DISRUPTIONS
  // -------------------------------------------------------------
  app.get('/api/disruptions', (_req: Request, res: Response) => {
    res.json(db.getDisruptions());
  });

  app.post('/api/disruptions', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const disruption = db.createDisruption(req.body, user);
      res.status(201).json(disruption);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/disruptions/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteDisruption(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // UNIQUE ALGORITHM 1: RIPPLE IMPACT INTELLIGENCE
  // -------------------------------------------------------------
  app.get('/api/ripple-analysis/:disruptionId', (req: Request, res: Response) => {
    try {
      const result = calculateRippleImpact(req.params.disruptionId);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // UNIQUE ALGORITHM 2: ORDER RISK SCORING
  // -------------------------------------------------------------
  app.get('/api/risk-analysis', (_req: Request, res: Response) => {
    try {
      const evaluations = evaluateAllOrdersRisk();
      res.json(evaluations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // UNIQUE ALGORITHM 3: COUNTERFACTUAL RECOVERY DIGITAL TWIN
  // -------------------------------------------------------------
  app.get('/api/recovery-simulation/:disruptionId', (req: Request, res: Response) => {
    try {
      const simulation = simulateRecoveryDigitalTwin(req.params.disruptionId);
      res.json(simulation);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // RECOVERY PLANS & APPROVALS WORKFLOW
  // -------------------------------------------------------------
  app.get('/api/recovery-plans', (_req: Request, res: Response) => {
    res.json(db.getRecoveryPlans());
  });

  app.post('/api/recovery-plans', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const plan = db.createRecoveryPlan(req.body, user);
      res.status(201).json(plan);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/recovery-plans/:id/approval', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const { decision, comments } = req.body;
      const result = db.approveOrRejectRecoveryPlan(req.params.id, decision, comments || '', user);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/recovery-plans/:id/execute', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const executed = db.executeRecoveryPlan(req.params.id, user);
      res.json(executed);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/recovery-plans/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      db.deleteRecoveryPlan(req.params.id, user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/approvals', (_req: Request, res: Response) => {
    res.json(db.getRawData().approvals);
  });

  // -------------------------------------------------------------
  // CARRIER WEBHOOK SIMULATOR
  // -------------------------------------------------------------
  app.post('/api/carrier-webhook', (req: Request, res: Response) => {
    try {
      const payload = req.body;
      if (!payload.shipment_id || !payload.event) {
        res.status(400).json({ error: 'shipment_id and event are required parameters' });
        return;
      }
      const result = db.handleCarrierWebhook(payload);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // BULK IMPORT
  // -------------------------------------------------------------
  app.post('/api/import/bulk', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const { entityType, records } = req.body;
      if (!entityType || !Array.isArray(records)) {
        res.status(400).json({ error: 'entityType and records array are required' });
        return;
      }
      const result = db.bulkImport(entityType, records, user);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // DEMO DATA GENERATION & SELECTIVE RESET / CLEAR ALL
  // -------------------------------------------------------------
  app.post('/api/demo/seed', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const result = db.seedDemoData(user);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/demo/reset', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const result = db.resetDemoData(user);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/data/clear-all', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const result = db.clearAllData(user);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  app.get('/api/notifications', (_req: Request, res: Response) => {
    res.json(db.getRawData().notifications);
  });

  app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
    const raw = db.getRawData();
    const notif = raw.notifications.find((n) => n.id === req.params.id);
    if (notif) {
      notif.isRead = true;
      db.save();
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read', (_req: Request, res: Response) => {
    const raw = db.getRawData();
    raw.notifications.forEach((n) => (n.isRead = true));
    db.save();
    res.json({ success: true });
  });

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  app.get('/api/audit-logs', (_req: Request, res: Response) => {
    res.json(db.getRawData().auditLogs);
  });

  // -------------------------------------------------------------
  // SETTINGS & CONFIGURATION
  // -------------------------------------------------------------
  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json(db.getSettings());
  });

  app.post('/api/settings/weights', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updatedWeights = db.updateRiskWeights(req.body, user);
      res.json(updatedWeights);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/settings/supabase', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updatedConfig = db.updateSupabaseConfig(req.body, user);
      res.json(updatedConfig);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // GPS LORRY TRACKING & BREAKDOWN MONITORING API
  // -------------------------------------------------------------
  app.get('/api/gps/stats', (_req: Request, res: Response) => {
    try {
      const stats = db.getLorryGpsStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/gps/lorries', (req: Request, res: Response) => {
    try {
      const { status, search } = req.query;
      const lorries = db.getLorries({
        status: status as string,
        search: search as string,
      });
      res.json(lorries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/gps/lorries/:id', (req: Request, res: Response) => {
    try {
      const lorry = db.getLorryById(req.params.id);
      if (!lorry) {
        return res.status(404).json({ error: 'Lorry not found' });
      }
      res.json(lorry);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/gps/lorries', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const lorry = db.createLorry(req.body, user);
      res.status(201).json(lorry);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/gps/lorries/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const updated = db.updateLorry(req.params.id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/gps/lorries/:id', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const deleted = db.deleteLorry(req.params.id, user);
      if (!deleted) {
        return res.status(404).json({ error: 'Lorry not found' });
      }
      res.json({ success: true, message: 'Lorry deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GPS Telemetry Ingestion (from physical device, tracking API or simulation)
  app.post('/api/gps/telemetry', (req: Request, res: Response) => {
    try {
      const { lorryId, ...telemetry } = req.body;
      if (!lorryId) {
        return res.status(400).json({ error: 'lorryId is required for telemetry ingestion' });
      }
      const user = getAuthUser(req);
      const updatedLorry = db.recordLorryTelemetry(lorryId, telemetry, user);
      res.json({ success: true, lorry: updatedLorry });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Breakdown Incident Reporting
  app.post('/api/gps/breakdown', (req: Request, res: Response) => {
    try {
      const { lorryId, ...alertData } = req.body;
      if (!lorryId) {
        return res.status(400).json({ error: 'lorryId is required' });
      }
      const user = getAuthUser(req);
      const alert = db.reportBreakdown(lorryId, alertData, user);
      res.status(201).json(alert);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Stoppage Detection (Speed 0 for >= threshold duration)
  app.post('/api/gps/stoppage-check', (req: Request, res: Response) => {
    try {
      const { thresholdMinutes } = req.body || {};
      const result = db.detectStoppages(thresholdMinutes ? Number(thresholdMinutes) : undefined);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Driver Breakdown Reporting
  app.post('/api/gps/driver-breakdown', (req: Request, res: Response) => {
    try {
      const { lorryId, shipmentId, breakdownType, description, latitude, longitude, breakdownTime } = req.body;
      if (!lorryId) {
        return res.status(400).json({ error: 'Lorry ID is required' });
      }
      if (!breakdownType) {
        return res.status(400).json({ error: 'Breakdown type is required' });
      }
      const user = getAuthUser(req);
      const alert = db.reportDriverBreakdown(
        { lorryId, shipmentId, breakdownType, description, latitude, longitude, breakdownTime },
        user
      );
      res.status(201).json(alert);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Confirm Breakdown & ChainPulse AI Ripple Impact Integration
  app.post('/api/gps/breakdown/:id/confirm', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const result = db.confirmBreakdown(req.params.id, user);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Workflow Transition (Normal -> Possible Stoppage -> Breakdown Reported -> Breakdown Confirmed -> Assistance Requested -> Repairing -> Recovered -> Journey Resumed)
  app.post('/api/gps/breakdown/:id/transition', (req: Request, res: Response) => {
    try {
      const { targetStatus, ...payload } = req.body;
      if (!targetStatus) {
        return res.status(400).json({ error: 'targetStatus is required' });
      }
      const user = getAuthUser(req);
      const result = db.transitionBreakdownWorkflow(req.params.id, targetStatus, payload, user);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GPS History Records
  app.get('/api/gps/history', (_req: Request, res: Response) => {
    try {
      res.json(db.getGpsHistory());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/gps/history/:lorryId', (req: Request, res: Response) => {
    try {
      res.json(db.getGpsHistory(req.params.lorryId));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dispatch Roadside Assistance
  app.post('/api/gps/dispatch-assistance', (req: Request, res: Response) => {
    try {
      const { breakdownId, serviceProvider, etaMinutes, mechanicName, contactPhone } = req.body;
      if (!breakdownId) {
        return res.status(400).json({ error: 'breakdownId is required' });
      }
      const user = getAuthUser(req);
      const alert = db.dispatchBreakdownAssistance(
        breakdownId,
        { serviceProvider, etaMinutes, mechanicName, contactPhone },
        user
      );
      res.json(alert);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Resolve Breakdown and Clear Vehicle
  app.post('/api/gps/resolve-breakdown', (req: Request, res: Response) => {
    try {
      const { breakdownId, notes } = req.body;
      if (!breakdownId) {
        return res.status(400).json({ error: 'breakdownId is required' });
      }
      const user = getAuthUser(req);
      const alert = db.resolveBreakdown(breakdownId, notes, user);
      res.json(alert);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Route Simulation Ping (clearly labelled simulation mode)
  app.post('/api/gps/simulate-ping', (req: Request, res: Response) => {
    try {
      const { lorryId } = req.body;
      if (!lorryId) {
        return res.status(400).json({ error: 'lorryId is required' });
      }
      const updated = db.simulateLorryPing(lorryId);
      res.json({ success: true, lorry: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reset fleet
  app.post('/api/gps/reset-fleet', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const fleet = db.resetLorryFleet(user);
      res.json({ success: true, lorries: fleet });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Seed Section 9 Example Test Shipment (SHIP-001 • TRUCK-101 Chennai to Bengaluru)
  app.post('/api/gps/seed-example', (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const result = db.seedExampleShipment(user);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // GEMINI AI INTEGRATION ROUTES
  // -------------------------------------------------------------
  app.post('/api/gemini/explain-disruption', async (req: Request, res: Response) => {
    try {
      const { disruptionId } = req.body;
      const explanation = await explainDisruptionWithGemini(disruptionId);
      res.json({ explanation });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/gemini/recovery-insights', async (req: Request, res: Response) => {
    try {
      const { disruptionId } = req.body;
      const insights = await getRecoveryInsightsWithGemini(disruptionId);
      res.json({ insights });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/gemini/assistant', async (req: Request, res: Response) => {
    try {
      const { query, activeContext } = req.body;
      const answer = await answerSupplyChainAssistant(query, activeContext);
      res.json({ answer });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/gemini/executive-report', async (req: Request, res: Response) => {
    try {
      const { timeframe } = req.body;
      const report = await generateExecutiveReportWithGemini(timeframe);
      res.json({ report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE SERVER MOUNTING
  // -------------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ChainPulse AI] Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ChainPulse AI] Fatal server boot error:', err);
  process.exit(1);
});
