import {
  UserProfile,
  Supplier,
  Product,
  Warehouse,
  InventoryItem,
  Shipment,
  CustomerOrder,
  Disruption,
  RecoveryPlan,
  Approval,
  NotificationItem,
  AuditLog,
  RippleImpactResult,
  OrderRiskEvaluation,
  DigitalTwinSimulationReport,
  RiskScoringWeights,
  UserRole,
  Lorry,
  LorryTelemetry,
  BreakdownAlert,
  BreakdownType,
  BreakdownWorkflowStatus,
  GPSHistoryEntry,
  LorryGPSStats,
} from './types';

// State for active user identity in frontend
let currentActiveUser: UserProfile = {
  id: 'usr_admin',
  email: 'admin@chainpulse.ai',
  fullName: 'Sarah Chen (Admin)',
  role: 'Administrator',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  createdAt: new Date().toISOString(),
};

export function setActiveUser(user: UserProfile) {
  currentActiveUser = user;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chainpulse:user-changed', { detail: user }));
  }
}

export function getActiveUser(): UserProfile {
  return currentActiveUser;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-role', currentActiveUser.role);
  headers.set('x-user-id', currentActiveUser.id);
  headers.set('x-user-name', currentActiveUser.fullName);

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // KPIs
  getDashboardKpis: () => request<any>('/api/dashboard/kpis'),

  // Profiles
  getProfiles: () => request<UserProfile[]>('/api/auth/profiles'),
  updateProfile: (id: string, data: Partial<UserProfile>) =>
    request<UserProfile>(`/api/auth/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Suppliers
  getSuppliers: () => request<Supplier[]>('/api/suppliers'),
  createSupplier: (data: any) => request<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => request<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request<{ success: boolean }>(`/api/suppliers/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: () => request<Product[]>('/api/products'),
  createProduct: (data: any) => request<Product>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request<{ success: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),

  // Warehouses
  getWarehouses: () => request<Warehouse[]>('/api/warehouses'),
  createWarehouse: (data: any) => request<Warehouse>('/api/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  updateWarehouse: (id: string, data: any) => request<Warehouse>(`/api/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWarehouse: (id: string) => request<{ success: boolean }>(`/api/warehouses/${id}`, { method: 'DELETE' }),

  // Inventory
  getInventory: () => request<InventoryItem[]>('/api/inventory'),
  createOrUpdateInventory: (data: any) => request<InventoryItem>('/api/inventory', { method: 'POST', body: JSON.stringify(data) }),
  deleteInventory: (id: string) => request<{ success: boolean }>(`/api/inventory/${id}`, { method: 'DELETE' }),

  // Shipments
  getShipments: () => request<Shipment[]>('/api/shipments'),
  createShipment: (data: any) => request<Shipment>('/api/shipments', { method: 'POST', body: JSON.stringify(data) }),
  updateShipment: (id: string, data: any) => request<Shipment>(`/api/shipments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShipment: (id: string) => request<{ success: boolean }>(`/api/shipments/${id}`, { method: 'DELETE' }),

  // Customer Orders
  getOrders: () => request<CustomerOrder[]>('/api/orders'),
  createOrder: (data: any) => request<CustomerOrder>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  deleteOrder: (id: string) => request<{ success: boolean }>(`/api/orders/${id}`, { method: 'DELETE' }),

  // Disruptions
  getDisruptions: () => request<Disruption[]>('/api/disruptions'),
  createDisruption: (data: any) => request<Disruption>('/api/disruptions', { method: 'POST', body: JSON.stringify(data) }),
  deleteDisruption: (id: string) => request<{ success: boolean }>(`/api/disruptions/${id}`, { method: 'DELETE' }),

  // Unique Algorithm 1: Ripple Impact
  getRippleImpact: (disruptionId: string) => request<RippleImpactResult>(`/api/ripple-analysis/${disruptionId}`),

  // Unique Algorithm 2: Risk Scoring
  getRiskAnalysis: () => request<OrderRiskEvaluation[]>('/api/risk-analysis'),

  // Unique Algorithm 3: Recovery Digital Twin
  getRecoverySimulation: (disruptionId: string) => request<DigitalTwinSimulationReport>(`/api/recovery-simulation/${disruptionId}`),

  // Recovery Plans & Approvals
  getRecoveryPlans: () => request<RecoveryPlan[]>('/api/recovery-plans'),
  createRecoveryPlan: (data: any) => request<RecoveryPlan>('/api/recovery-plans', { method: 'POST', body: JSON.stringify(data) }),
  deleteRecoveryPlan: (id: string) => request<{ success: boolean }>(`/api/recovery-plans/${id}`, { method: 'DELETE' }),
  submitApprovalDecision: (planId: string, decision: 'Approved' | 'Rejected' | 'Modified', comments?: string) =>
    request<any>(`/api/recovery-plans/${planId}/approval`, {
      method: 'POST',
      body: JSON.stringify({ decision, comments }),
    }),
  executeRecoveryPlan: (planId: string) =>
    request<RecoveryPlan>(`/api/recovery-plans/${planId}/execute`, { method: 'POST' }),
  getApprovalsHistory: () => request<Approval[]>('/api/approvals'),

  // Carrier Webhook Simulator
  triggerCarrierWebhook: (payload: any) =>
    request<any>('/api/carrier-webhook', { method: 'POST', body: JSON.stringify(payload) }),

  // Bulk Import
  bulkImport: (entityType: string, records: any[]) =>
    request<any>('/api/import/bulk', { method: 'POST', body: JSON.stringify({ entityType, records }) }),

  // Demo Seed & Reset / Clear All
  seedDemoData: () => request<any>('/api/demo/seed', { method: 'POST' }),
  resetDemoData: () => request<any>('/api/demo/reset', { method: 'POST' }),
  clearAllData: () => request<any>('/api/data/clear-all', { method: 'POST' }),

  // Notifications
  getNotifications: () => request<NotificationItem[]>('/api/notifications'),
  markNotificationRead: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/api/notifications/mark-all-read', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),

  // Settings
  getSettings: () => request<any>('/api/settings'),
  updateRiskWeights: (weights: Partial<RiskScoringWeights>) =>
    request<RiskScoringWeights>('/api/settings/weights', { method: 'POST', body: JSON.stringify(weights) }),
  updateSupabaseConfig: (config: any) =>
    request<any>('/api/settings/supabase', { method: 'POST', body: JSON.stringify(config) }),

  // Gemini AI Endpoints
  explainDisruption: (disruptionId: string) =>
    request<{ explanation: string }>('/api/gemini/explain-disruption', {
      method: 'POST',
      body: JSON.stringify({ disruptionId }),
    }),
  getRecoveryInsights: (disruptionId: string) =>
    request<{ insights: string }>('/api/gemini/recovery-insights', {
      method: 'POST',
      body: JSON.stringify({ disruptionId }),
    }),
  askAssistant: (query: string, activeContext?: string) =>
    request<{ answer: string }>('/api/gemini/assistant', {
      method: 'POST',
      body: JSON.stringify({ query, activeContext }),
    }),
  generateExecutiveReport: (timeframe?: string) =>
    request<{ report: string }>('/api/gemini/executive-report', {
      method: 'POST',
      body: JSON.stringify({ timeframe }),
    }),

  // GPS Lorry Tracking & Breakdown Monitoring
  getLorryGpsStats: () => request<LorryGPSStats>('/api/gps/stats'),
  getLorries: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<Lorry[]>(`/api/gps/lorries${qs ? `?${qs}` : ''}`);
  },
  getLorryById: (id: string) => request<Lorry>(`/api/gps/lorries/${id}`),
  createLorry: (data: Partial<Lorry>) =>
    request<Lorry>('/api/gps/lorries', { method: 'POST', body: JSON.stringify(data) }),
  updateLorry: (id: string, data: Partial<Lorry>) =>
    request<Lorry>(`/api/gps/lorries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLorry: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/gps/lorries/${id}`, { method: 'DELETE' }),
  sendLorryTelemetry: (data: { lorryId: string } & Partial<LorryTelemetry>) =>
    request<{ success: boolean; lorry: Lorry }>('/api/gps/telemetry', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reportBreakdown: (data: { lorryId: string } & Partial<BreakdownAlert>) =>
    request<BreakdownAlert>('/api/gps/breakdown', { method: 'POST', body: JSON.stringify(data) }),
  dispatchAssistance: (data: {
    breakdownId: string;
    serviceProvider: string;
    etaMinutes: number;
    mechanicName: string;
    contactPhone: string;
  }) =>
    request<BreakdownAlert>('/api/gps/dispatch-assistance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveBreakdown: (breakdownId: string, notes?: string) =>
    request<BreakdownAlert>('/api/gps/resolve-breakdown', {
      method: 'POST',
      body: JSON.stringify({ breakdownId, notes }),
    }),
  simulateLorryPing: (lorryId: string) =>
    request<{ success: boolean; lorry: Lorry }>('/api/gps/simulate-ping', {
      method: 'POST',
      body: JSON.stringify({ lorryId }),
    }),
  checkStoppages: (thresholdMinutes?: number) =>
    request<{ detectedCount: number; lorries: Lorry[] }>('/api/gps/stoppage-check', {
      method: 'POST',
      body: JSON.stringify({ thresholdMinutes }),
    }),
  reportDriverBreakdown: (data: {
    lorryId: string;
    shipmentId?: string;
    breakdownType: BreakdownType;
    description: string;
    latitude?: number;
    longitude?: number;
    breakdownTime?: string;
  }) =>
    request<BreakdownAlert>('/api/gps/driver-breakdown', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  confirmBreakdown: (lorryId: string) =>
    request<{ success: boolean; alert: BreakdownAlert; disruption?: Disruption; recoveryPlan?: RecoveryPlan }>(
      `/api/gps/breakdown/${lorryId}/confirm`,
      { method: 'POST' }
    ),
  transitionBreakdownWorkflow: (
    lorryId: string,
    targetStatus: BreakdownWorkflowStatus,
    payload?: any
  ) =>
    request<{ success: boolean; lorry: Lorry; alert?: BreakdownAlert }>(
      `/api/gps/breakdown/${lorryId}/transition`,
      {
        method: 'POST',
        body: JSON.stringify({ targetStatus, ...payload }),
      }
    ),
  getGpsHistory: (lorryId?: string) =>
    request<GPSHistoryEntry[]>(`/api/gps/history${lorryId ? `/${lorryId}` : ''}`),
  resetLorryFleet: () =>
    request<{ success: boolean; lorries: Lorry[] }>('/api/gps/reset-fleet', { method: 'POST' }),
  seedExampleShipment: () =>
    request<{ success: boolean; shipment: Shipment; lorry: Lorry }>('/api/gps/seed-example', {
      method: 'POST',
    }),
};
