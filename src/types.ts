/**
 * ChainPulse AI - Core Data Models and Types
 */

export type UserRole =
  | 'Operations Analyst'
  | 'Supply Chain Manager'
  | 'Warehouse Operator'
  | 'Procurement Approver'
  | 'Administrator';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type DisruptionType =
  | 'Supplier Delay'
  | 'Shipment Delay'
  | 'Inventory Shortage'
  | 'Warehouse Disruption'
  | 'Transportation Disruption'
  | 'Unexpected Demand'
  | 'Other';

export type ShipmentStatus = 'Pending' | 'In Transit' | 'Delayed' | 'Delivered' | 'Cancelled';
export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'In Transit' | 'Delivered' | 'Delayed' | 'Cancelled';
export type PlanStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Executed';
export type PlanType = 'Stock Reallocation' | 'Expedited Shipping' | 'Alternative Supplier' | 'Order Splitting';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  location: string;
  reliabilityScore: number; // 0 - 100
  status: 'Active' | 'Inactive' | 'Suspended' | 'High Risk';
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  category: string;
  description: string;
  unitCost: number;
  status: 'Active' | 'Discontinued' | 'Supply Constrained';
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  warehouseCode: string;
  name: string;
  location: string;
  capacity: number; // Units
  manager: string;
  status: 'Operational' | 'Congested' | 'Maintenance' | 'Inactive';
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  availableStock: number;
  reservedStock: number;
  minimumStock: number;
  lastUpdatedDate: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  // Hydrated joins
  productName?: string;
  productCode?: string;
  warehouseName?: string;
  warehouseCode?: string;
  unitCost?: number;
}

export interface Shipment {
  id: string;
  shipmentCode: string;
  supplierId: string;
  productId: string;
  quantity: number;
  sourceLocation: string;
  // Destination and schedule information (Optional)
  destinationWarehouseId?: string; // Optional
  destinationLocation?: string; // Optional
  destinationAddress?: string; // Optional complete address
  destinationLatitude?: number; // Optional destination GPS Lat
  destinationLongitude?: number; // Optional destination GPS Lng
  carrierName: string;
  expectedDeliveryDate?: string; // Optional
  expectedDeliveryTime?: string; // Optional
  corridorRoute?: string; // Optional transit corridor / route
  journeyNotes?: string; // Optional journey instructions or checkpoints
  actualDeliveryDate?: string;
  status: ShipmentStatus;
  trackingReference?: string;
  delayDays: number;
  // Lorry & GPS integration
  lorryId?: string;
  driverName?: string;
  driverContactNumber?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  gpsTrackingEnabled?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  // Hydrated joins
  supplierName?: string;
  productName?: string;
  warehouseName?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  requiredQuantity: number;
  allocatedQuantity: number;
  shortageQuantity: number;
  productName?: string;
  unitCost?: number;
}

export interface CustomerOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerContact: string;
  destinationWarehouseId: string;
  deliveryAddress: string;
  orderDate: string;
  deliveryDeadline: string;
  priority: PriorityLevel;
  status: OrderStatus;
  riskScore: number; // 0 - 100
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  // Items & Joins
  items?: OrderItem[];
  warehouseName?: string;
  productId?: string; // Quick reference for primary product
  productName?: string;
  requiredQuantity?: number;
}

export interface Disruption {
  id: string;
  disruptionCode: string;
  disruptionType: DisruptionType;
  relatedSupplierId?: string;
  relatedShipmentId?: string;
  affectedWarehouseId?: string;
  affectedProductId?: string;
  expectedDelayDays: number;
  shortageQuantity: number;
  severity: SeverityLevel;
  description: string;
  reportedDate: string;
  status: 'Active' | 'Investigating' | 'Mitigating' | 'Resolved';
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  // Hydrated joins
  supplierName?: string;
  shipmentCode?: string;
  warehouseName?: string;
  productName?: string;
}

export interface RecoveryPlanItem {
  id: string;
  recoveryPlanId: string;
  itemAction: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  productId?: string;
  quantity: number;
  cost: number;
}

export interface RecoveryPlan {
  id: string;
  planCode: string;
  disruptionId: string;
  planType: PlanType;
  proposedByUserId: string;
  proposedByName: string;
  approverUserId?: string;
  status: PlanStatus;
  estimatedCost: number;
  estimatedDelayReductionDays: number;
  ordersRecoveredCount: number;
  recoveryPercentage: number;
  feasibilityScore: number;
  notes?: string;
  rejectionReason?: string;
  executionResult?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  items?: RecoveryPlanItem[];
  // Hydrated joins
  disruptionCode?: string;
  disruptionDescription?: string;
  disruptionSeverity?: SeverityLevel;
}

export interface Approval {
  id: string;
  recoveryPlanId: string;
  approverUserId: string;
  approverName: string;
  approverRole: UserRole;
  decision: 'Approved' | 'Rejected' | 'Modified';
  comments?: string;
  decidedAt: string;
  planCode?: string;
  planType?: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  targetRole?: UserRole | 'ALL';
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface CarrierWebhookPayload {
  shipment_id: string;
  event: 'DELAYED' | 'IN_TRANSIT' | 'DAMAGED' | 'DELIVERED' | 'CANCELLED';
  delay_days: number;
  location: string;
  event_time?: string;
  carrier_note?: string;
}

export interface RippleImpactNode {
  id: string;
  label: string;
  type: 'supplier' | 'shipment' | 'warehouse' | 'product' | 'order';
  status: string;
  severity?: string;
  details: Record<string, any>;
}

export interface RippleImpactLink {
  source: string;
  target: string;
  label?: string;
  weight?: number;
  critical?: boolean;
}

export interface RippleImpactResult {
  disruption: Disruption;
  affectedOrders: CustomerOrder[];
  affectedProducts: Product[];
  affectedWarehouses: Warehouse[];
  totalShortageQuantity: number;
  estimatedDeliveryImpactDays: number;
  nodes: RippleImpactNode[];
  links: RippleImpactLink[];
  urgencyRankedOrders: Array<{
    order: CustomerOrder;
    shortage: number;
    delayDays: number;
    daysUntilDeadline: number;
    riskScore: number;
  }>;
}

export interface RiskScoringWeights {
  delayWeight: number; // e.g. 0.25
  deadlineWeight: number; // e.g. 0.25
  shortageWeight: number; // e.g. 0.20
  stockWeight: number; // e.g. 0.15
  reliabilityWeight: number; // e.g. 0.15
}

export interface OrderRiskEvaluation {
  orderId: string;
  orderCode: string;
  customerName: string;
  riskScore: number;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  relatedShipmentCode?: string;
  expectedDelayDays: number;
  shortageQuantity: number;
  deadline: string;
  daysRemaining: number;
  factors: {
    delayContribution: number;
    deadlineContribution: number;
    shortageContribution: number;
    stockContribution: number;
    supplierContribution: number;
  };
  explanation: string;
  recommendedPriority: PriorityLevel;
}

export interface SimulationOptionResult {
  optionKey: 'STOCK_REALLOCATION' | 'EXPEDITED_SHIPPING' | 'ALTERNATIVE_SUPPLIER' | 'ORDER_SPLITTING';
  title: string;
  description: string;
  availableStock: number;
  quantityFulfilled: number;
  remainingShortage: number;
  estimatedAdditionalCost: number;
  estimatedDeliveryDelayDays: number;
  ordersRecoveredCount: number;
  expectedRecoveryPercentage: number;
  feasibilityScore: number; // 0 - 100
  newRiskScore: number;
  isRecommended?: boolean;
  tradeOffSummary: string;
  planItemsDraft: Array<{
    action: string;
    source: string;
    target: string;
    quantity: number;
    cost: number;
  }>;
}

export interface DigitalTwinSimulationReport {
  disruptionId: string;
  disruptionCode: string;
  beforeRecovery: {
    originalShortage: number;
    affectedOrdersCount: number;
    estimatedDelayDays: number;
    currentRiskScore: number;
    estimatedLoss: number;
  };
  options: SimulationOptionResult[];
  recommendedOptionKey: string;
  recommendationReason: string;
}

export type LorryMovementStatus = 'Moving' | 'Stopped' | 'Offline';

export type BreakdownType =
  | 'Engine Failure'
  | 'Tyre Puncture'
  | 'Battery Failure'
  | 'Fuel Problem'
  | 'Accident'
  | 'Mechanical Failure'
  | 'Other';

export type BreakdownWorkflowStatus =
  | 'Normal'
  | 'Possible Stoppage'
  | 'Breakdown Reported'
  | 'Breakdown Confirmed'
  | 'Assistance Requested'
  | 'Repairing'
  | 'Recovered'
  | 'Journey Resumed';

export type LocationSource = 'GPS_DEVICE' | 'GPS_API' | 'SIMULATED';

export interface GPSHistoryEntry {
  id: string;
  shipment_id?: string;
  lorry_id: string;
  driver_name?: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  movement_status: 'Moving' | 'Stopped' | 'Offline';
  gps_timestamp: string;
  location_source: LocationSource;
  created_at: string;
  updated_at?: string;
}

export interface BreakdownAlert {
  id: string;
  lorryId: string;
  lorryNumber: string;
  shipmentId?: string;
  shipmentCode?: string;
  reportedAt: string;
  severity: SeverityLevel;
  breakdownType: BreakdownType;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  workflowStatus: BreakdownWorkflowStatus;
  status: 'Active' | 'Investigating' | 'Assistance Dispatched' | 'Resolved' | 'Escalated to Disruption';
  dispatchedAssistance?: {
    serviceProvider: string;
    etaMinutes: number;
    mechanicName: string;
    contactPhone: string;
  };
  resolvedAt?: string;
  resolutionNotes?: string;
  stoppageDetectedAt?: string;
  breakdownTime?: string;
  disruptionId?: string;
}

export interface LorryTelemetry {
  id?: string;
  lorryId?: string;
  shipmentId?: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  speed_kmh?: number;
  heading?: number;
  engineStatus: 'Running' | 'Idling' | 'Off' | 'Failure';
  engineTemp?: number;
  fuelLevel?: number;
  batteryVoltage?: number;
  locationName: string;
  timestamp: string;
  movement_status?: 'Moving' | 'Stopped' | 'Offline';
  locationSource?: LocationSource;
  isSimulated?: boolean;
}

export interface Lorry {
  id: string;
  lorryNumber: string;
  model: string;
  capacityTons: number;
  carrierName: string;
  driverName: string;
  driverPhone: string;
  status: LorryMovementStatus | 'Breakdown' | 'Recovered' | 'Scheduled';
  movementStatus: 'Moving' | 'Stopped' | 'Offline';
  workflowStatus: BreakdownWorkflowStatus;
  locationSource: LocationSource;
  breakdownType?: BreakdownType;
  breakdownDescription?: string;
  stoppageDetectedAt?: string;
  breakdownReportedAt?: string;
  currentShipmentId?: string;
  currentShipmentCode?: string;
  destinationWarehouse?: string;
  originLocation?: string;
  destinationLocation?: string; // Optional
  destinationAddress?: string; // Optional complete address
  destinationLatitude?: number; // Optional destination GPS Lat
  destinationLongitude?: number; // Optional destination GPS Lng
  expectedDeliveryDate?: string; // Optional
  expectedDeliveryTime?: string; // Optional
  corridorRoute?: string; // Optional journey corridor / highway route
  journeyNotes?: string; // Optional journey instructions or checkpoint notes
  driverContactNumber?: string;
  currentLocationAddress?: string;
  lastTelemetry: LorryTelemetry;
  recentWaypoints?: Array<{ latitude: number; longitude: number; timestamp: string }>;
  activeBreakdown?: BreakdownAlert;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LorryGPSStats {
  totalLorries: number;
  movingLorries: number;
  stoppedLorries: number;
  offlineLorries: number;
  possibleStoppages: number;
  confirmedBreakdowns: number;
  delayedShipments: number;
  recoveredLorries: number;
  onTimeShipments?: number;
  atRiskShipments?: number;
}


