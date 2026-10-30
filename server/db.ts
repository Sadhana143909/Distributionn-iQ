import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  Supplier,
  Product,
  Warehouse,
  InventoryItem,
  Shipment,
  CustomerOrder,
  OrderItem,
  Disruption,
  RecoveryPlan,
  RecoveryPlanItem,
  Approval,
  NotificationItem,
  AuditLog,
  CarrierWebhookPayload,
  RiskScoringWeights,
  Lorry,
  LorryTelemetry,
  BreakdownAlert,
  BreakdownType,
  BreakdownWorkflowStatus,
  LocationSource,
  GPSHistoryEntry,
  LorryGPSStats,
  LorryMovementStatus,
} from '../src/types';

interface DatabaseSchema {
  profiles: UserProfile[];
  suppliers: Supplier[];
  products: Product[];
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  shipments: Shipment[];
  orders: CustomerOrder[];
  orderItems: OrderItem[];
  disruptions: Disruption[];
  recoveryPlans: RecoveryPlan[];
  recoveryPlanItems: RecoveryPlanItem[];
  approvals: Approval[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  carrierWebhookEvents: any[];
  lorries: Lorry[];
  breakdownAlerts: BreakdownAlert[];
  lorryTelemetryHistory: LorryTelemetry[];
  gpsHistory: GPSHistoryEntry[];
  settings: {
    riskWeights: RiskScoringWeights;
    stoppageThresholdMinutes: number;
    supabaseConfig: {
      url: string;
      anonKey: string;
      serviceRoleKey: string;
      connected: boolean;
      lastTested?: string;
    };
  };
}

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'chainpulse_db.json');

// Default initial system users
const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'usr_admin',
    email: 'admin@chainpulse.ai',
    fullName: 'Sarah Chen (Admin)',
    role: 'Administrator',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_manager',
    email: 'manager@chainpulse.ai',
    fullName: 'Marcus Vance (SC Manager)',
    role: 'Supply Chain Manager',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_analyst',
    email: 'analyst@chainpulse.ai',
    fullName: 'Priya Sharma (Ops Analyst)',
    role: 'Operations Analyst',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_procurement',
    email: 'procurement@chainpulse.ai',
    fullName: 'David Mueller (Procurement)',
    role: 'Procurement Approver',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_operator',
    email: 'operator@chainpulse.ai',
    fullName: 'Rajesh Kumar (WH Operator)',
    role: 'Warehouse Operator',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_RISK_WEIGHTS: RiskScoringWeights = {
  delayWeight: 0.25,
  deadlineWeight: 0.25,
  shortageWeight: 0.2,
  stockWeight: 0.15,
  reliabilityWeight: 0.15,
};

class PersistentDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    let loadedData: DatabaseSchema | null = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        loadedData = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to read db.json, creating empty schema:', err);
    }

    if (!loadedData) {
      loadedData = {
        profiles: [...DEFAULT_USERS],
        suppliers: [],
        products: [],
        warehouses: [],
        inventory: [],
        shipments: [],
        orders: [],
        orderItems: [],
        disruptions: [],
        recoveryPlans: [],
        recoveryPlanItems: [],
        approvals: [],
        notifications: [],
        auditLogs: [],
        carrierWebhookEvents: [],
        lorries: [],
        breakdownAlerts: [],
        lorryTelemetryHistory: [],
        gpsHistory: [],
        settings: {
          riskWeights: { ...DEFAULT_RISK_WEIGHTS },
          stoppageThresholdMinutes: 10,
          supabaseConfig: {
            url: process.env.VITE_SUPABASE_URL || '',
            anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            connected: false,
          },
        },
      };
    }

    const data: DatabaseSchema = loadedData;

    if (!data.lorries) data.lorries = [];
    if (!data.breakdownAlerts) data.breakdownAlerts = [];
    if (!data.lorryTelemetryHistory) data.lorryTelemetryHistory = [];
    if (!data.gpsHistory) data.gpsHistory = [];
    if (!data.settings) {
      data.settings = {
        riskWeights: { ...DEFAULT_RISK_WEIGHTS },
        stoppageThresholdMinutes: 10,
        supabaseConfig: {
          url: '',
          anonKey: '',
          serviceRoleKey: '',
          connected: false,
        },
      };
    }
    if (typeof data.settings.stoppageThresholdMinutes !== 'number') {
      data.settings.stoppageThresholdMinutes = 10;
    }

    // If lorries are empty, initialize default fleet for immediate tracking
    if (data.lorries.length === 0) {
      this.initDefaultFleet(data);
    }

    return data;
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  // --- Audit Log Utility ---
  public logAudit(
    userId: string,
    userName: string,
    userRole: any,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, any> = {}
  ): AuditLog {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs in memory
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
    return log;
  }

  // --- Notification Utility ---
  public addNotification(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'danger' | 'success',
    targetRole?: any,
    link?: string,
    userId?: string
  ): NotificationItem {
    const notif: NotificationItem = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      targetRole: targetRole || 'ALL',
      title,
      message,
      type,
      isRead: false,
      link,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 150) {
      this.data.notifications.pop();
    }
    this.save();
    return notif;
  }

  // --- Reset Demo Data (Deletes ONLY records marked as isDemo) ---
  public resetDemoData(user: { id: string; name: string; role: any }) {
    this.data.suppliers = this.data.suppliers.filter((s) => !s.isDemo);
    this.data.products = this.data.products.filter((p) => !p.isDemo);
    this.data.warehouses = this.data.warehouses.filter((w) => !w.isDemo);
    this.data.inventory = this.data.inventory.filter((i) => !i.isDemo);
    this.data.shipments = this.data.shipments.filter((s) => !s.isDemo);
    this.data.orders = this.data.orders.filter((o) => !o.isDemo);
    this.data.disruptions = this.data.disruptions.filter((d) => !d.isDemo);
    this.data.recoveryPlans = this.data.recoveryPlans.filter((r) => !r.isDemo);

    this.logAudit(
      user.id,
      user.name,
      user.role,
      'RESET_DEMO_DATA',
      'System',
      'ALL_DEMO',
      { action: 'Cleaned demonstration records, preserved user data' }
    );
    this.save();
    return { success: true, message: 'Demonstration records cleared. User data retained.' };
  }

  // --- Clear All Data (Wipes all records completely) ---
  public clearAllData(user?: { id: string; name: string; role: any }) {
    this.data.suppliers = [];
    this.data.products = [];
    this.data.warehouses = [];
    this.data.inventory = [];
    this.data.shipments = [];
    this.data.orders = [];
    this.data.orderItems = [];
    this.data.disruptions = [];
    this.data.recoveryPlans = [];
    this.data.recoveryPlanItems = [];
    this.data.carrierWebhookEvents = [];

    this.logAudit(
      user ? user.id : 'system',
      user ? user.name : 'System User',
      user ? user.role : 'Administrator',
      'CLEAR_ALL_DATA',
      'System',
      'ALL',
      { action: 'Cleaned all application database records' }
    );
    this.save();
    return { success: true, message: 'All application data has been cleared.' };
  }

  // --- Seed Demo Data (10 suppliers, 15 products, 5 warehouses, 30 inventory, 30 shipments, 40 orders, 2 disruptions) ---
  public seedDemoData(user?: { id: string; name: string; role: any }) {
    // 5 Warehouses
    const warehouses: Warehouse[] = [
      {
        id: 'wh-chn',
        warehouseCode: 'WH-CHN',
        name: 'Chennai Central Logistics Hub',
        location: 'Chennai, Tamil Nadu, India',
        capacity: 10000,
        manager: 'Anand Natarajan',
        status: 'Operational',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'wh-mum',
        warehouseCode: 'WH-MUM',
        name: 'Mumbai Maritime Logistics Park',
        location: 'Navi Mumbai, Maharashtra, India',
        capacity: 15000,
        manager: 'Vikram Joshi',
        status: 'Operational',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'wh-sin',
        warehouseCode: 'WH-SIN',
        name: 'Singapore Gateway Terminal',
        location: 'Jurong West, Singapore',
        capacity: 20000,
        manager: 'Li Wei Tan',
        status: 'Operational',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'wh-rot',
        warehouseCode: 'WH-ROT',
        name: 'Rotterdam Port Logistics Center',
        location: 'Rotterdam, Netherlands',
        capacity: 25000,
        manager: 'Klaas Van Dijk',
        status: 'Congested',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'wh-chi',
        warehouseCode: 'WH-CHI',
        name: 'Chicago Midwest Distribution Depot',
        location: 'Chicago, Illinois, USA',
        capacity: 18000,
        manager: 'Robert Kowalski',
        status: 'Operational',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
    ];

    // 10 Suppliers
    const suppliers: Supplier[] = [
      {
        id: 'sup-fox',
        supplierCode: 'SUP-001',
        name: 'Foxconn Microelectronics Ltd',
        contactPerson: 'Terry Kuo',
        email: 't.kuo@foxconn-sc.com',
        phone: '+886-2-2268-3466',
        location: 'Taipei, Taiwan',
        reliabilityScore: 78.5,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-bos',
        supplierCode: 'SUP-002',
        name: 'Bosch Mobility Solutions',
        contactPerson: 'Stefan Brandt',
        email: 's.brandt@bosch-supply.de',
        phone: '+49-711-811-0',
        location: 'Stuttgart, Germany',
        reliabilityScore: 94.2,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-nip',
        supplierCode: 'SUP-003',
        name: 'Nippon Precision Bearings Corp',
        contactPerson: 'Kenji Sato',
        email: 'sato.k@nippon-bearing.jp',
        phone: '+81-3-3779-7111',
        location: 'Tokyo, Japan',
        reliabilityScore: 97.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-glo',
        supplierCode: 'SUP-004',
        name: 'Global Chem Polymers Inc',
        contactPerson: 'Elena Rostova',
        email: 'e.rostova@globalchem.com',
        phone: '+1-713-555-0199',
        location: 'Houston, Texas, USA',
        reliabilityScore: 88.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-sch',
        supplierCode: 'SUP-005',
        name: 'Schneider Electric Power Drives',
        contactPerson: 'Jean-Luc Moreau',
        email: 'jl.moreau@se-drives.fr',
        phone: '+33-1-41-29-70-00',
        location: 'Grenoble, France',
        reliabilityScore: 91.5,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-inf',
        supplierCode: 'SUP-006',
        name: 'Infineon Auto Semiconductors',
        contactPerson: 'Markus Weber',
        email: 'm.weber@infineon-auto.at',
        phone: '+43-4242-305-0',
        location: 'Villach, Austria',
        reliabilityScore: 92.8,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-tsm',
        supplierCode: 'SUP-007',
        name: 'TSMC Advanced Packaging',
        contactPerson: 'Wei-Lin Chang',
        email: 'wchang@tsmc-advanced.tw',
        phone: '+886-3-5636688',
        location: 'Hsinchu, Taiwan',
        reliabilityScore: 96.5,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-skh',
        supplierCode: 'SUP-008',
        name: 'SK Hynix Flash Memory',
        contactPerson: 'Min-Jun Park',
        email: 'mjpark@skhynix-global.kr',
        phone: '+82-31-630-4114',
        location: 'Icheon, South Korea',
        reliabilityScore: 89.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-sie',
        supplierCode: 'SUP-009',
        name: 'Siemens Industrial Automation',
        contactPerson: 'Claudia Fischer',
        email: 'c.fischer@siemens-auto.de',
        phone: '+49-89-636-00',
        location: 'Nuremberg, Germany',
        reliabilityScore: 95.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'sup-tat',
        supplierCode: 'SUP-010',
        name: 'Tata Steel Tubes & Plates',
        contactPerson: 'Rohan Mehra',
        email: 'rmehra@tatasteel-tubes.in',
        phone: '+91-22-6665-8282',
        location: 'Jamshedpur, India',
        reliabilityScore: 86.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
    ];

    // 15 Products
    const products: Product[] = [
      {
        id: 'prd-mc9',
        productCode: 'PRD-001',
        name: 'Microcontroller MC-900 Core',
        category: 'Semiconductors',
        description: '32-bit automotive-grade RISC-V microcontroller unit',
        unitCost: 45.0,
        status: 'Supply Constrained',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-bat',
        productCode: 'PRD-002',
        name: 'Lithium Iron Battery Pack 48V',
        category: 'Energy Storage',
        description: 'Modular high-density LiFePO4 energy storage cell',
        unitCost: 320.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-sns',
        productCode: 'PRD-003',
        name: 'Precision Pressure Sensor 1000-Bar',
        category: 'Sensors',
        description: 'Harsh-environment piezoresistive pressure transmitter',
        unitCost: 85.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-brg',
        productCode: 'PRD-004',
        name: 'Ceramic Deep Groove Ball Bearings',
        category: 'Mechanical',
        description: 'Silicon nitride high-speed turbine ceramic bearing',
        unitCost: 62.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-inv',
        productCode: 'PRD-005',
        name: 'Three-Phase Inverter Module 15kW',
        category: 'Power Electronics',
        description: 'SiC MOSFET power conversion module with heat sink',
        unitCost: 480.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-res',
        productCode: 'PRD-006',
        name: 'Aerospace Composite Resin Grade-A',
        category: 'Raw Materials',
        description: 'Epoxy resin system for lightweight structural panels',
        unitCost: 110.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-plc',
        productCode: 'PRD-007',
        name: 'Industrial PLC Controller S7-X',
        category: 'Automation',
        description: 'Programmable logic controller with Ethernet/IP',
        unitCost: 650.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-lid',
        productCode: 'PRD-008',
        name: 'Solid-State LiDAR Scanner 360',
        category: 'Optics & Vision',
        description: 'Compact 3D flash LiDAR for autonomous guided vehicles',
        unitCost: 890.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-flx',
        productCode: 'PRD-009',
        name: 'High-Temperature Hydraulic Hose 2-inch',
        category: 'Fluid Handling',
        description: 'Four-spiral wire reinforced flexible pressure hose',
        unitCost: 38.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-mot',
        productCode: 'PRD-010',
        name: 'Brushless DC Servo Motor 750W',
        category: 'Motion Control',
        description: 'Integrated absolute encoder synchronous servo motor',
        unitCost: 240.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-cbl',
        productCode: 'PRD-011',
        name: 'Industrial Shielded Profinet Cable 100m',
        category: 'Cabling',
        description: 'Ruggedized PUR jacket cat6a industrial ethernet cable',
        unitCost: 140.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-vlv',
        productCode: 'PRD-012',
        name: 'Pneumatic Solenoid Valve Bank 24V',
        category: 'Pneumatics',
        description: '5/2-way pilot operated directional control valve manifold',
        unitCost: 175.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-hmi',
        productCode: 'PRD-013',
        name: 'Touchscreen HMI Display 10-inch IP65',
        category: 'Displays',
        description: 'Industrial capacitive operator terminal with OPC-UA',
        unitCost: 420.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-tbe',
        productCode: 'PRD-014',
        name: 'Seamless Stainless Steel Tubing 316L',
        category: 'Raw Materials',
        description: 'High-purity annealed instrument tubing 12mm x 1.5mm',
        unitCost: 28.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'prd-gps',
        productCode: 'PRD-015',
        name: 'Multi-Band RTK GNSS Receiver Module',
        category: 'Sensors',
        description: 'Centimeter-accuracy dual-antenna positioning module',
        unitCost: 195.0,
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
    ];

    // 30 Inventory Records
    // Key scenario: Chennai warehouse has only 30 units of MC-900, but customer orders require 70+ units!
    const inventory: InventoryItem[] = [
      // Chennai Hub (wh-chn)
      {
        id: 'inv-chn-001',
        productId: 'prd-mc9',
        warehouseId: 'wh-chn',
        availableStock: 30, // Critical shortage scenario!
        reservedStock: 25,
        minimumStock: 80,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chn-002',
        productId: 'prd-bat',
        warehouseId: 'wh-chn',
        availableStock: 120,
        reservedStock: 40,
        minimumStock: 50,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chn-003',
        productId: 'prd-sns',
        warehouseId: 'wh-chn',
        availableStock: 250,
        reservedStock: 60,
        minimumStock: 100,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chn-004',
        productId: 'prd-brg',
        warehouseId: 'wh-chn',
        availableStock: 400,
        reservedStock: 150,
        minimumStock: 150,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chn-005',
        productId: 'prd-inv',
        warehouseId: 'wh-chn',
        availableStock: 60,
        reservedStock: 20,
        minimumStock: 30,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chn-006',
        productId: 'prd-plc',
        warehouseId: 'wh-chn',
        availableStock: 45,
        reservedStock: 15,
        minimumStock: 20,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },

      // Mumbai Hub (wh-mum) - Has surplus MC-900 (150 units) suitable for Stock Reallocation!
      {
        id: 'inv-mum-001',
        productId: 'prd-mc9',
        warehouseId: 'wh-mum',
        availableStock: 150, // Surplus available for transfer!
        reservedStock: 30,
        minimumStock: 40,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-mum-002',
        productId: 'prd-bat',
        warehouseId: 'wh-mum',
        availableStock: 80,
        reservedStock: 25,
        minimumStock: 40,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-mum-003',
        productId: 'prd-sns',
        warehouseId: 'wh-mum',
        availableStock: 180,
        reservedStock: 40,
        minimumStock: 80,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-mum-004',
        productId: 'prd-res',
        warehouseId: 'wh-mum',
        availableStock: 210,
        reservedStock: 50,
        minimumStock: 90,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-mum-005',
        productId: 'prd-mot',
        warehouseId: 'wh-mum',
        availableStock: 95,
        reservedStock: 30,
        minimumStock: 40,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-mum-006',
        productId: 'prd-tbe',
        warehouseId: 'wh-mum',
        availableStock: 600,
        reservedStock: 120,
        minimumStock: 200,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },

      // Singapore Gateway (wh-sin)
      {
        id: 'inv-sin-001',
        productId: 'prd-mc9',
        warehouseId: 'wh-sin',
        availableStock: 220,
        reservedStock: 40,
        minimumStock: 60,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-sin-002',
        productId: 'prd-lid',
        warehouseId: 'wh-sin',
        availableStock: 75,
        reservedStock: 20,
        minimumStock: 30,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-sin-003',
        productId: 'prd-gps',
        warehouseId: 'wh-sin',
        availableStock: 140,
        reservedStock: 35,
        minimumStock: 50,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-sin-004',
        productId: 'prd-brg',
        warehouseId: 'wh-sin',
        availableStock: 310,
        reservedStock: 90,
        minimumStock: 100,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-sin-005',
        productId: 'prd-flx',
        warehouseId: 'wh-sin',
        availableStock: 480,
        reservedStock: 110,
        minimumStock: 150,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-sin-006',
        productId: 'prd-vlv',
        warehouseId: 'wh-sin',
        availableStock: 130,
        reservedStock: 45,
        minimumStock: 50,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },

      // Rotterdam Port (wh-rot)
      {
        id: 'inv-rot-001',
        productId: 'prd-sns',
        warehouseId: 'wh-rot',
        availableStock: 18, // Shortage due to port congestion
        reservedStock: 35,
        minimumStock: 60,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-rot-002',
        productId: 'prd-plc',
        warehouseId: 'wh-rot',
        availableStock: 85,
        reservedStock: 25,
        minimumStock: 30,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-rot-003',
        productId: 'prd-inv',
        warehouseId: 'wh-rot',
        availableStock: 50,
        reservedStock: 15,
        minimumStock: 25,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-rot-004',
        productId: 'prd-hmi',
        warehouseId: 'wh-rot',
        availableStock: 65,
        reservedStock: 20,
        minimumStock: 25,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-rot-005',
        productId: 'prd-cbl',
        warehouseId: 'wh-rot',
        availableStock: 190,
        reservedStock: 60,
        minimumStock: 70,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-rot-006',
        productId: 'prd-res',
        warehouseId: 'wh-rot',
        availableStock: 110,
        reservedStock: 30,
        minimumStock: 45,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },

      // Chicago Depot (wh-chi)
      {
        id: 'inv-chi-001',
        productId: 'prd-bat',
        warehouseId: 'wh-chi',
        availableStock: 140,
        reservedStock: 35,
        minimumStock: 50,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chi-002',
        productId: 'prd-lid',
        warehouseId: 'wh-chi',
        availableStock: 55,
        reservedStock: 15,
        minimumStock: 20,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chi-003',
        productId: 'prd-mot',
        warehouseId: 'wh-chi',
        availableStock: 115,
        reservedStock: 25,
        minimumStock: 40,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chi-004',
        productId: 'prd-vlv',
        warehouseId: 'wh-chi',
        availableStock: 180,
        reservedStock: 40,
        minimumStock: 60,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chi-005',
        productId: 'prd-flx',
        warehouseId: 'wh-chi',
        availableStock: 320,
        reservedStock: 80,
        minimumStock: 100,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'inv-chi-006',
        productId: 'prd-tbe',
        warehouseId: 'wh-chi',
        availableStock: 450,
        reservedStock: 90,
        minimumStock: 150,
        lastUpdatedDate: '2026-10-28T10:00:00Z',
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      },
    ];

    // 30 Shipments (including the delayed shipment SHIP-001 from Foxconn to Chennai)
    const carriers = ['Maersk Ocean Line', 'DHL Express Air', 'FedEx Trade Networks', 'MSC Mediterranean', 'Hapag-Lloyd'];
    const shipments: Shipment[] = [
      // Primary Disruption Shipment: SHIP-001
      {
        id: 'shp-001',
        shipmentCode: 'SHIP-001',
        supplierId: 'sup-fox',
        productId: 'prd-mc9',
        quantity: 120,
        sourceLocation: 'Taipei, Taiwan',
        destinationWarehouseId: 'wh-chn',
        carrierName: 'Maersk Ocean Line',
        expectedDeliveryDate: '2026-11-01',
        status: 'Delayed',
        delayDays: 4,
        trackingReference: 'MSK-992819-TW',
        isDemo: true,
        createdAt: '2026-10-20T08:00:00Z',
        updatedAt: '2026-10-29T10:00:00Z',
      },
      // Second Disruption Shipment: SHIP-002
      {
        id: 'shp-002',
        shipmentCode: 'SHIP-002',
        supplierId: 'sup-bos',
        productId: 'prd-sns',
        quantity: 80,
        sourceLocation: 'Stuttgart, Germany',
        destinationWarehouseId: 'wh-rot',
        carrierName: 'DHL Express Air',
        expectedDeliveryDate: '2026-11-03',
        status: 'Delayed',
        delayDays: 6,
        trackingReference: 'DHL-DE-77812',
        isDemo: true,
        createdAt: '2026-10-22T08:00:00Z',
        updatedAt: '2026-10-29T11:00:00Z',
      },
    ];

    // Generate 28 additional realistic shipments
    const supplierList = suppliers;
    const productList = products;
    const warehouseList = warehouses;

    for (let i = 3; i <= 30; i++) {
      const sup = supplierList[(i * 3) % supplierList.length];
      const prd = productList[(i * 2) % productList.length];
      const wh = warehouseList[i % warehouseList.length];
      const carrier = carriers[i % carriers.length];
      const isDelivered = i % 5 === 0;
      const isPending = i % 7 === 0;
      const status: any = isDelivered ? 'Delivered' : isPending ? 'Pending' : 'In Transit';

      shipments.push({
        id: `shp-${String(i).padStart(3, '0')}`,
        shipmentCode: `SHIP-${String(i).padStart(3, '0')}`,
        supplierId: sup.id,
        productId: prd.id,
        quantity: 50 + (i * 15) % 250,
        sourceLocation: sup.location,
        destinationWarehouseId: wh.id,
        carrierName: carrier,
        expectedDeliveryDate: `2026-11-${String((i % 25) + 3).padStart(2, '0')}`,
        actualDeliveryDate: isDelivered ? '2026-10-27' : undefined,
        status,
        delayDays: 0,
        trackingReference: `TRK-${carrier.slice(0, 3).toUpperCase()}-${10000 + i * 147}`,
        isDemo: true,
        createdAt: '2026-10-15T08:00:00Z',
        updatedAt: '2026-10-28T08:00:00Z',
      });
    }

    // 40 Customer Orders (including high-priority critical orders demanding MC-900 at Chennai!)
    const customerNames = [
      'Tata Motors EV Division',
      'Mahindra Aerospace',
      'Ashok Leyland Defense Systems',
      'Hyundai Heavy Industries',
      'Volvo Trucks Europe',
      'Tesla Gigafactory Berlin',
      'Siemens Energy Systems',
      'ABB Robotics India',
      'Rolls-Royce Marine Solutions',
      'Alstom Transportation',
      'Foxconn Industrial Internet',
      'Stellantis North America',
      'Schneider Modular Power',
      'BHEL Power Sector',
      'Godrej Aerospace Systems',
    ];

    const orders: CustomerOrder[] = [];
    const orderItems: OrderItem[] = [];

    // Critical Customer Orders affected directly by Scenario 1 (MC-900 shortage at Chennai)
    const scenario1Orders = [
      {
        code: 'ORD-001',
        customer: 'Tata Motors EV Division',
        contact: 's.nair@tatamotors.com',
        qty: 35,
        deadline: '2026-11-03', // Deadline is in 5 days! Before delayed shipment arrives!
        priority: 'Critical' as const,
        whId: 'wh-chn',
        productId: 'prd-mc9',
      },
      {
        code: 'ORD-002',
        customer: 'Mahindra Aerospace',
        contact: 'k.patel@mahindra.com',
        qty: 25,
        deadline: '2026-11-04',
        priority: 'High' as const,
        whId: 'wh-chn',
        productId: 'prd-mc9',
      },
      {
        code: 'ORD-003',
        customer: 'Ashok Leyland Defense Systems',
        contact: 'm.balaji@ashokleyland.com',
        qty: 15,
        deadline: '2026-11-05',
        priority: 'Critical' as const,
        whId: 'wh-chn',
        productId: 'prd-mc9',
      },
      {
        code: 'ORD-004',
        customer: 'ABB Robotics India',
        contact: 'v.shankar@abb.com',
        qty: 10,
        deadline: '2026-11-08',
        priority: 'Medium' as const,
        whId: 'wh-chn',
        productId: 'prd-mc9',
      },
    ];

    scenario1Orders.forEach((o, idx) => {
      const orderId = `ord-${String(idx + 1).padStart(3, '0')}`;
      orders.push({
        id: orderId,
        orderCode: o.code,
        customerName: o.customer,
        customerContact: o.contact,
        destinationWarehouseId: o.whId,
        deliveryAddress: `${o.whId === 'wh-chn' ? 'Ambattur Industrial Estate, Chennai, India' : 'Industrial Zone'}`,
        orderDate: '2026-10-24',
        deliveryDeadline: o.deadline,
        priority: o.priority,
        status: 'Processing',
        riskScore: o.priority === 'Critical' ? 88.5 : 72.0,
        riskCategory: o.priority === 'Critical' ? 'CRITICAL' : 'HIGH',
        productId: o.productId,
        productName: 'Microcontroller MC-900 Core',
        requiredQuantity: o.qty,
        isDemo: true,
        createdAt: '2026-10-24T09:00:00Z',
        updatedAt: '2026-10-29T10:00:00Z',
      });

      orderItems.push({
        id: `oi-${orderId}`,
        orderId,
        productId: o.productId,
        requiredQuantity: o.qty,
        allocatedQuantity: 0,
        shortageQuantity: o.qty,
        productName: 'Microcontroller MC-900 Core',
        unitCost: 45.0,
      });
    });

    // 36 more diverse orders across all warehouses and products
    for (let i = 5; i <= 40; i++) {
      const customer = customerNames[i % customerNames.length];
      const wh = warehouses[i % warehouses.length];
      const prd = products[i % products.length];
      const priority: any = i % 6 === 0 ? 'Critical' : i % 3 === 0 ? 'High' : i % 2 === 0 ? 'Medium' : 'Low';
      const orderId = `ord-${String(i).padStart(3, '0')}`;
      const qty = 10 + (i * 7) % 80;
      const deadlineDay = 2 + (i % 26);
      const isDelayed = wh.status === 'Congested' && i % 3 === 0;

      orders.push({
        id: orderId,
        orderCode: `ORD-${String(i).padStart(3, '0')}`,
        customerName: `${customer} (${wh.name.split(' ')[0]})`,
        customerContact: `orders@${customer.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        destinationWarehouseId: wh.id,
        deliveryAddress: `${100 + i * 5} Enterprise Way, Sector ${i % 12}, ${wh.location}`,
        orderDate: '2026-10-20',
        deliveryDeadline: `2026-11-${String(deadlineDay).padStart(2, '0')}`,
        priority,
        status: isDelayed ? 'Delayed' : i % 8 === 0 ? 'Delivered' : 'Processing',
        riskScore: isDelayed ? 68.0 : priority === 'Critical' ? 45.0 : 18.0,
        riskCategory: isDelayed ? 'HIGH' : priority === 'Critical' ? 'MEDIUM' : 'LOW',
        productId: prd.id,
        productName: prd.name,
        requiredQuantity: qty,
        isDemo: true,
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      });

      orderItems.push({
        id: `oi-${orderId}`,
        orderId,
        productId: prd.id,
        requiredQuantity: qty,
        allocatedQuantity: qty,
        shortageQuantity: 0,
        productName: prd.name,
        unitCost: prd.unitCost,
      });
    }

    // 2 Disruption Scenarios
    const disruptions: Disruption[] = [
      {
        id: 'dis-001',
        disruptionCode: 'DIS-001',
        disruptionType: 'Supplier Delay',
        relatedSupplierId: 'sup-fox',
        relatedShipmentId: 'shp-001',
        affectedWarehouseId: 'wh-chn',
        affectedProductId: 'prd-mc9',
        expectedDelayDays: 4,
        shortageQuantity: 40, // 70 units needed vs 30 available
        severity: 'Critical',
        description:
          'Supplier Foxconn reported unexpected semiconductor assembly line delay. Shipment SHIP-001 delayed by 4 days. Chennai warehouse stock is insufficient (30 units on hand vs 70 units required for urgent defense & automotive orders).',
        reportedDate: '2026-10-29T08:30:00Z',
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-29T08:30:00Z',
        updatedAt: '2026-10-29T08:30:00Z',
      },
      {
        id: 'dis-002',
        disruptionCode: 'DIS-002',
        disruptionType: 'Transportation Disruption',
        relatedSupplierId: 'sup-bos',
        relatedShipmentId: 'shp-002',
        affectedWarehouseId: 'wh-rot',
        affectedProductId: 'prd-sns',
        expectedDelayDays: 6,
        shortageQuantity: 35,
        severity: 'High',
        description:
          'Severe port congestion and container handling strike at Port of Rotterdam causing 6-day backlog for Bosch precision sensors shipment SHIP-002.',
        reportedDate: '2026-10-29T09:15:00Z',
        status: 'Active',
        isDemo: true,
        createdAt: '2026-10-29T09:15:00Z',
        updatedAt: '2026-10-29T09:15:00Z',
      },
    ];

    // Initial Recovery Plan recommendation
    const recoveryPlans: RecoveryPlan[] = [
      {
        id: 'rec-001',
        planCode: 'REC-001',
        disruptionId: 'dis-001',
        planType: 'Stock Reallocation',
        proposedByUserId: 'usr_analyst',
        proposedByName: 'Priya Sharma (Ops Analyst)',
        status: 'Pending Approval',
        estimatedCost: 1850.0,
        estimatedDelayReductionDays: 3,
        ordersRecoveredCount: 3,
        recoveryPercentage: 87.5,
        feasibilityScore: 94.0,
        notes:
          'Autonomous Digital Twin recommended Option A: Transfer 50 units of MC-900 from Mumbai Logistics Park (which holds 150 surplus units) to Chennai via dedicated express road freight (18hr transit). Recovering Tata Motors and Mahindra orders before penalty deadlines.',
        isDemo: true,
        createdAt: '2026-10-29T09:30:00Z',
        updatedAt: '2026-10-29T09:30:00Z',
        items: [
          {
            id: 'rpi-001',
            recoveryPlanId: 'rec-001',
            itemAction: 'INTER_WAREHOUSE_TRANSFER',
            sourceEntityId: 'wh-mum',
            targetEntityId: 'wh-chn',
            productId: 'prd-mc9',
            quantity: 50,
            cost: 1850.0,
          },
        ],
      },
    ];

    // Populate data object
    this.data.warehouses = warehouses;
    this.data.suppliers = suppliers;
    this.data.products = products;
    this.data.inventory = inventory;
    this.data.shipments = shipments;
    this.data.orders = orders;
    this.data.orderItems = orderItems;
    this.data.disruptions = disruptions;
    this.data.recoveryPlans = recoveryPlans;

    // Initial notifications
    this.addNotification(
      'Critical Supply Disruption Detected (DIS-001)',
      'Foxconn shipment SHIP-001 delayed by 4 days affecting 4 automotive customer orders at Chennai Central Hub.',
      'danger',
      'ALL',
      '/disruptions'
    );
    this.addNotification(
      'Recovery Plan REC-001 Pending Approval',
      'Stock Reallocation plan from Mumbai to Chennai proposed. Needs Supply Chain Manager or Procurement review.',
      'warning',
      'Supply Chain Manager',
      '/approvals'
    );
    this.addNotification(
      'Port Congestion Alert (DIS-002)',
      'Rotterdam Depot experiencing 6-day inbound customs clearance delays.',
      'warning',
      'Operations Analyst',
      '/disruptions'
    );

    this.logAudit(
      user ? user.id : 'system',
      user ? user.name : 'System Initializer',
      user ? user.role : 'Administrator',
      'SEED_DEMO_DATA',
      'System',
      'INITIAL_SEED',
      {
        suppliersCount: suppliers.length,
        productsCount: products.length,
        warehousesCount: warehouses.length,
        inventoryCount: inventory.length,
        shipmentsCount: shipments.length,
        ordersCount: orders.length,
        disruptionsCount: disruptions.length,
      }
    );

    this.save();
    return { success: true, message: 'Sample demonstration dataset generated successfully.' };
  }

  // --- CRUD & Helper Methods ---

  // SUPPLIERS
  public getSuppliers() {
    return this.data.suppliers;
  }
  public getSupplierById(id: string) {
    return this.data.suppliers.find((s) => s.id === id || s.supplierCode === id);
  }
  public createSupplier(supplierData: Omit<Supplier, 'id' | 'supplierCode' | 'createdAt' | 'updatedAt'>, user: any) {
    const code = `SUP-${String(this.data.suppliers.length + 1).padStart(3, '0')}`;
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      supplierCode: code,
      ...supplierData,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.suppliers.unshift(newSupplier);
    this.logAudit(user.id, user.name, user.role, 'CREATE_SUPPLIER', 'Supplier', newSupplier.id, newSupplier);
    this.save();
    return newSupplier;
  }
  public updateSupplier(id: string, updates: Partial<Supplier>, user: any) {
    const idx = this.data.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Supplier not found');
    const old = { ...this.data.suppliers[idx] };
    this.data.suppliers[idx] = { ...old, ...updates, updatedAt: new Date().toISOString() };
    this.logAudit(user.id, user.name, user.role, 'UPDATE_SUPPLIER', 'Supplier', id, { previous: old, updated: updates });
    this.save();
    return this.data.suppliers[idx];
  }
  public deleteSupplier(id: string, user: any) {
    const idx = this.data.suppliers.findIndex((s) => s.id === id || s.supplierCode === id);
    if (idx === -1) throw new Error('Supplier not found');
    const deleted = this.data.suppliers.splice(idx, 1)[0];
    // Remove or unlink from shipments if any
    this.data.shipments = this.data.shipments.filter((s) => s.supplierId !== deleted.id);
    this.logAudit(user.id, user.name, user.role, 'DELETE_SUPPLIER', 'Supplier', id, deleted);
    this.save();
    return true;
  }

  // PRODUCTS
  public getProducts() {
    return this.data.products;
  }
  public getProductById(id: string) {
    return this.data.products.find((p) => p.id === id || p.productCode === id);
  }
  public createProduct(productData: Omit<Product, 'id' | 'productCode' | 'createdAt' | 'updatedAt'>, user: any) {
    const code = `PRD-${String(this.data.products.length + 1).padStart(3, '0')}`;
    const newProduct: Product = {
      id: `prd-${Date.now()}`,
      productCode: code,
      ...productData,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.products.unshift(newProduct);
    this.logAudit(user.id, user.name, user.role, 'CREATE_PRODUCT', 'Product', newProduct.id, newProduct);
    this.save();
    return newProduct;
  }
  public updateProduct(id: string, updates: Partial<Product>, user: any) {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    const old = { ...this.data.products[idx] };
    this.data.products[idx] = { ...old, ...updates, updatedAt: new Date().toISOString() };
    this.logAudit(user.id, user.name, user.role, 'UPDATE_PRODUCT', 'Product', id, { previous: old, updated: updates });
    this.save();
    return this.data.products[idx];
  }
  public deleteProduct(id: string, user: any) {
    const idx = this.data.products.findIndex((p) => p.id === id || p.productCode === id);
    if (idx === -1) throw new Error('Product not found');
    const deleted = this.data.products.splice(idx, 1)[0];
    // Clean up associated inventory & orderItems
    this.data.inventory = this.data.inventory.filter((i) => i.productId !== deleted.id);
    this.data.orderItems = this.data.orderItems.filter((oi) => oi.productId !== deleted.id);
    this.data.shipments = this.data.shipments.filter((s) => s.productId !== deleted.id);
    this.logAudit(user.id, user.name, user.role, 'DELETE_PRODUCT', 'Product', id, deleted);
    this.save();
    return true;
  }

  // WAREHOUSES
  public getWarehouses() {
    return this.data.warehouses;
  }
  public getWarehouseById(id: string) {
    return this.data.warehouses.find((w) => w.id === id || w.warehouseCode === id);
  }
  public createWarehouse(whData: Omit<Warehouse, 'id' | 'warehouseCode' | 'createdAt' | 'updatedAt'>, user: any) {
    const code = `WH-${whData.name.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const newWarehouse: Warehouse = {
      id: `wh-${Date.now()}`,
      warehouseCode: code,
      ...whData,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.warehouses.unshift(newWarehouse);
    this.logAudit(user.id, user.name, user.role, 'CREATE_WAREHOUSE', 'Warehouse', newWarehouse.id, newWarehouse);
    this.save();
    return newWarehouse;
  }
  public updateWarehouse(id: string, updates: Partial<Warehouse>, user: any) {
    const idx = this.data.warehouses.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Warehouse not found');
    const old = { ...this.data.warehouses[idx] };
    this.data.warehouses[idx] = { ...old, ...updates, updatedAt: new Date().toISOString() };
    this.logAudit(user.id, user.name, user.role, 'UPDATE_WAREHOUSE', 'Warehouse', id, { previous: old, updated: updates });
    this.save();
    return this.data.warehouses[idx];
  }
  public deleteWarehouse(id: string, user: any) {
    const idx = this.data.warehouses.findIndex((w) => w.id === id || w.warehouseCode === id);
    if (idx === -1) throw new Error('Warehouse not found');
    const deleted = this.data.warehouses.splice(idx, 1)[0];
    // Clean up associated inventory records
    this.data.inventory = this.data.inventory.filter((i) => i.warehouseId !== deleted.id);
    this.logAudit(user.id, user.name, user.role, 'DELETE_WAREHOUSE', 'Warehouse', id, deleted);
    this.save();
    return true;
  }

  public deleteInventory(id: string, user: any) {
    const idx = this.data.inventory.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inventory record not found');
    const deleted = this.data.inventory.splice(idx, 1)[0];
    this.logAudit(user.id, user.name, user.role, 'DELETE_INVENTORY', 'Inventory', id, deleted);
    this.save();
    return true;
  }

  // INVENTORY
  public getInventory(): InventoryItem[] {
    return this.data.inventory.map((inv) => {
      const prod = this.getProductById(inv.productId);
      const wh = this.getWarehouseById(inv.warehouseId);
      return {
        ...inv,
        productName: prod ? prod.name : 'Unknown Product',
        productCode: prod ? prod.productCode : '',
        unitCost: prod ? prod.unitCost : 0,
        warehouseName: wh ? wh.name : 'Unknown Warehouse',
        warehouseCode: wh ? wh.warehouseCode : '',
      };
    });
  }
  public createOrUpdateInventory(
    data: {
      productId: string;
      warehouseId: string;
      availableStock: number;
      reservedStock: number;
      minimumStock: number;
    },
    user: any
  ) {
    if (data.availableStock < 0 || data.reservedStock < 0 || data.minimumStock < 0) {
      throw new Error('Stock quantities cannot be negative.');
    }
    const prod = this.getProductById(data.productId);
    const wh = this.getWarehouseById(data.warehouseId);
    if (!prod) throw new Error('Referenced product does not exist.');
    if (!wh) throw new Error('Referenced warehouse does not exist.');

    const existingIdx = this.data.inventory.findIndex(
      (i) => i.productId === data.productId && i.warehouseId === data.warehouseId
    );

    if (existingIdx !== -1) {
      const old = this.data.inventory[existingIdx];
      this.data.inventory[existingIdx] = {
        ...old,
        availableStock: data.availableStock,
        reservedStock: data.reservedStock,
        minimumStock: data.minimumStock,
        lastUpdatedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.logAudit(user.id, user.name, user.role, 'UPDATE_INVENTORY', 'Inventory', old.id, {
        previous: old,
        updated: this.data.inventory[existingIdx],
      });
      this.save();
      return this.data.inventory[existingIdx];
    } else {
      const newInv: InventoryItem = {
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: data.productId,
        warehouseId: data.warehouseId,
        availableStock: data.availableStock,
        reservedStock: data.reservedStock,
        minimumStock: data.minimumStock,
        lastUpdatedDate: new Date().toISOString(),
        isDemo: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.inventory.unshift(newInv);
      this.logAudit(user.id, user.name, user.role, 'CREATE_INVENTORY', 'Inventory', newInv.id, newInv);
      this.save();
      return newInv;
    }
  }

  // SHIPMENTS
  public getShipments(): Shipment[] {
    return this.data.shipments.map((s) => {
      const sup = this.getSupplierById(s.supplierId);
      const prod = this.getProductById(s.productId);
      const wh = s.destinationWarehouseId ? this.getWarehouseById(s.destinationWarehouseId) : undefined;
      return {
        ...s,
        supplierName: sup ? sup.name : 'Unknown Supplier',
        productName: prod ? prod.name : 'Unknown Product',
        warehouseName: wh ? wh.name : s.destinationLocation || 'In-Transit / Unassigned Hub',
      };
    });
  }
  public getShipmentById(id: string) {
    return this.getShipments().find((s) => s.id === id || s.shipmentCode === id);
  }
  public createShipment(
    shipmentData: Partial<Shipment> & {
      supplierId: string;
      productId: string;
      quantity: number;
      carrierName?: string;
      sourceLocation?: string;
      lorryId?: string;
      driverName?: string;
      currentLatitude?: number;
      currentLongitude?: number;
      destinationWarehouseId?: string;
      destinationLocation?: string;
      expectedDeliveryDate?: string;
      gpsTrackingEnabled?: boolean;
      customShipmentId?: string;
      locationSource?: LocationSource;
    },
    user: any
  ) {
    if (shipmentData.quantity <= 0) {
      throw new Error('Shipment quantity must be greater than zero.');
    }

    // Validate GPS coordinates if provided or GPS tracking enabled
    if (shipmentData.currentLatitude !== undefined && shipmentData.currentLatitude !== null) {
      const lat = Number(shipmentData.currentLatitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and +90 degrees.');
      }
    }
    if (shipmentData.currentLongitude !== undefined && shipmentData.currentLongitude !== null) {
      const lng = Number(shipmentData.currentLongitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and +180 degrees.');
      }
    }

    // Validate optional destination coordinates if provided (SEPARATE from lorry current GPS)
    if (shipmentData.destinationLatitude !== undefined && shipmentData.destinationLatitude !== null && (shipmentData.destinationLatitude as any) !== '') {
      const dLat = Number(shipmentData.destinationLatitude);
      if (isNaN(dLat) || dLat < -90 || dLat > 90) {
        throw new Error('Destination Latitude must be between -90 and +90 degrees.');
      }
    }
    if (shipmentData.destinationLongitude !== undefined && shipmentData.destinationLongitude !== null && (shipmentData.destinationLongitude as any) !== '') {
      const dLng = Number(shipmentData.destinationLongitude);
      if (isNaN(dLng) || dLng < -180 || dLng > 180) {
        throw new Error('Destination Longitude must be between -180 and +180 degrees.');
      }
    }

    const sup = this.getSupplierById(shipmentData.supplierId);
    const prod = this.getProductById(shipmentData.productId);
    if (!sup) throw new Error('Selected supplier does not exist.');
    if (!prod) throw new Error('Selected product does not exist.');

    // Unique Shipment ID / Code validation
    let code = shipmentData.customShipmentId?.trim() || shipmentData.shipmentCode?.trim();
    if (code) {
      const duplicate = this.data.shipments.find(
        (s) => s.shipmentCode.toLowerCase() === code!.toLowerCase() || s.id.toLowerCase() === code!.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Shipment ID "${code}" already exists. Shipment ID must be unique.`);
      }
    } else {
      code = `SHIP-${String(this.data.shipments.length + 1).padStart(3, '0')}`;
    }

    const isoNow = new Date().toISOString();
    const destAddr = shipmentData.destinationAddress?.trim() || shipmentData.destinationLocation?.trim() || undefined;
    const destLat = (shipmentData.destinationLatitude !== undefined && shipmentData.destinationLatitude !== null && (shipmentData.destinationLatitude as any) !== '')
      ? Number(shipmentData.destinationLatitude)
      : undefined;
    const destLng = (shipmentData.destinationLongitude !== undefined && shipmentData.destinationLongitude !== null && (shipmentData.destinationLongitude as any) !== '')
      ? Number(shipmentData.destinationLongitude)
      : undefined;

    const newShipment: Shipment = {
      id: `shp-${Date.now()}`,
      shipmentCode: code,
      supplierId: shipmentData.supplierId,
      productId: shipmentData.productId,
      quantity: Number(shipmentData.quantity),
      sourceLocation: shipmentData.sourceLocation || sup.location || 'Origin Hub',
      destinationWarehouseId: shipmentData.destinationWarehouseId || undefined,
      destinationLocation: destAddr,
      destinationAddress: destAddr,
      destinationLatitude: destLat,
      destinationLongitude: destLng,
      carrierName: shipmentData.carrierName || 'Fleet Logistics Services',
      expectedDeliveryDate: shipmentData.expectedDeliveryDate || undefined,
      expectedDeliveryTime: shipmentData.expectedDeliveryTime || undefined,
      status: (shipmentData.status as any) || 'In Transit',
      trackingReference: shipmentData.trackingReference || `TRK-${code}`,
      delayDays: shipmentData.delayDays || 0,
      lorryId: shipmentData.lorryId || undefined,
      driverName: shipmentData.driverName || undefined,
      driverContactNumber: shipmentData.driverContactNumber || undefined,
      currentLatitude: shipmentData.currentLatitude !== undefined ? Number(shipmentData.currentLatitude) : undefined,
      currentLongitude: shipmentData.currentLongitude !== undefined ? Number(shipmentData.currentLongitude) : undefined,
      gpsTrackingEnabled: Boolean(shipmentData.gpsTrackingEnabled || shipmentData.currentLatitude !== undefined),
      isDemo: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    this.data.shipments.unshift(newShipment);

    // If Lorry ID and Driver Name are provided, register or attach to Lorry and log GPS Telemetry & History
    if (shipmentData.lorryId) {
      const lorryNumber = shipmentData.lorryId.trim();
      const lat = shipmentData.currentLatitude !== undefined ? Number(shipmentData.currentLatitude) : 39.8283;
      const lng = shipmentData.currentLongitude !== undefined ? Number(shipmentData.currentLongitude) : -98.5795;
      const locSource: LocationSource = shipmentData.locationSource || 'GPS_DEVICE';

      let lorry = this.data.lorries.find(
        (l) => l.lorryNumber.toLowerCase() === lorryNumber.toLowerCase() || l.id === lorryNumber
      );

      const initialTelemetry: LorryTelemetry = {
        id: `tel_${Date.now()}`,
        latitude: lat,
        longitude: lng,
        speed: 62,
        speed_kmh: 62,
        heading: 90,
        engineStatus: 'Running',
        engineTemp: 86,
        fuelLevel: 88,
        batteryVoltage: 24.2,
        locationName: destAddr ? `En route to ${destAddr.slice(0, 35)}` : 'Active Logistics Corridor',
        timestamp: isoNow,
        locationSource: locSource,
        movement_status: 'Moving',
        isSimulated: locSource === 'SIMULATED',
      };

      if (lorry) {
        lorry.currentShipmentId = newShipment.id;
        lorry.currentShipmentCode = newShipment.shipmentCode;
        if (shipmentData.driverName) lorry.driverName = shipmentData.driverName;
        if (shipmentData.driverContactNumber) {
          lorry.driverPhone = shipmentData.driverContactNumber;
          lorry.driverContactNumber = shipmentData.driverContactNumber;
        }
        lorry.destinationAddress = destAddr;
        lorry.destinationLocation = destAddr;
        lorry.destinationLatitude = destLat;
        lorry.destinationLongitude = destLng;
        lorry.expectedDeliveryDate = shipmentData.expectedDeliveryDate;
        lorry.expectedDeliveryTime = shipmentData.expectedDeliveryTime;
        lorry.status = 'Moving';
        lorry.movementStatus = 'Moving';
        lorry.workflowStatus = 'Normal';
        lorry.lastTelemetry = initialTelemetry;
        lorry.recentWaypoints = [...(lorry.recentWaypoints || []), { latitude: lat, longitude: lng, timestamp: isoNow }].slice(-20);
        lorry.updatedAt = isoNow;
      } else {
        lorry = {
          id: `lor_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          lorryNumber,
          model: 'Heavy Duty Intermodal Lorry',
          capacityTons: 28,
          carrierName: newShipment.carrierName,
          driverName: shipmentData.driverName || 'Designated Driver',
          driverPhone: shipmentData.driverContactNumber || '+1 (555) 019-7721',
          driverContactNumber: shipmentData.driverContactNumber || '+1 (555) 019-7721',
          status: 'Moving',
          movementStatus: 'Moving',
          workflowStatus: 'Normal',
          locationSource: locSource,
          currentShipmentId: newShipment.id,
          currentShipmentCode: newShipment.shipmentCode,
          originLocation: newShipment.sourceLocation,
          destinationLocation: destAddr,
          destinationAddress: destAddr,
          destinationLatitude: destLat,
          destinationLongitude: destLng,
          expectedDeliveryDate: newShipment.expectedDeliveryDate,
          expectedDeliveryTime: newShipment.expectedDeliveryTime,
          lastTelemetry: initialTelemetry,
          recentWaypoints: [{ latitude: lat, longitude: lng, timestamp: isoNow }],
          createdAt: isoNow,
          updatedAt: isoNow,
        };
        this.data.lorries.unshift(lorry);
      }

      // Record in GPS History Table
      const historyEntry: GPSHistoryEntry = {
        id: `gps_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        shipment_id: newShipment.id,
        lorry_id: lorry.lorryNumber,
        driver_name: lorry.driverName,
        latitude: lat,
        longitude: lng,
        speed_kmh: 62,
        movement_status: 'Moving',
        gps_timestamp: isoNow,
        location_source: locSource,
        created_at: isoNow,
        updated_at: isoNow,
      };
      this.data.gpsHistory.unshift(historyEntry);
      if (this.data.gpsHistory.length > 1000) {
        this.data.gpsHistory.pop();
      }
    }

    this.logAudit(user.id, user.name, user.role, 'CREATE_SHIPMENT', 'Shipment', newShipment.id, newShipment);
    this.save();
    return newShipment;
  }
  public updateShipment(id: string, updates: Partial<Shipment>, user: any) {
    const idx = this.data.shipments.findIndex((s) => s.id === id || s.shipmentCode === id);
    if (idx === -1) throw new Error('Shipment not found');
    const old = { ...this.data.shipments[idx] };
    const updatedShip = { ...old, ...updates, updatedAt: new Date().toISOString() };
    this.data.shipments[idx] = updatedShip;

    // Synchronize destination and journey address to associated lorry
    if (updatedShip.lorryId) {
      const lorry = this.data.lorries.find(
        (l) => l.lorryNumber.toLowerCase() === updatedShip.lorryId?.toLowerCase() || l.id === updatedShip.lorryId
      );
      if (lorry) {
        if (updates.destinationAddress !== undefined) lorry.destinationAddress = updates.destinationAddress;
        if (updates.destinationLocation !== undefined) lorry.destinationLocation = updates.destinationLocation || updates.destinationAddress;
        if (updates.destinationLatitude !== undefined) lorry.destinationLatitude = updates.destinationLatitude;
        if (updates.destinationLongitude !== undefined) lorry.destinationLongitude = updates.destinationLongitude;
        if (updates.expectedDeliveryDate !== undefined) lorry.expectedDeliveryDate = updates.expectedDeliveryDate;
        if (updates.expectedDeliveryTime !== undefined) lorry.expectedDeliveryTime = updates.expectedDeliveryTime;
        if (updates.sourceLocation !== undefined) lorry.originLocation = updates.sourceLocation;
        if (updates.corridorRoute !== undefined) lorry.corridorRoute = updates.corridorRoute;
        if (updates.journeyNotes !== undefined) lorry.journeyNotes = updates.journeyNotes;
        lorry.updatedAt = new Date().toISOString();
      }
    }

    this.logAudit(user.id, user.name, user.role, 'UPDATE_SHIPMENT', 'Shipment', id, { previous: old, updated: updates });
    this.save();
    return this.data.shipments[idx];
  }

  public deleteShipment(id: string, user: any) {
    const idx = this.data.shipments.findIndex((s) => s.id === id || s.shipmentCode === id);
    if (idx === -1) throw new Error('Shipment not found');
    const deleted = this.data.shipments.splice(idx, 1)[0];
    this.logAudit(user.id, user.name, user.role, 'DELETE_SHIPMENT', 'Shipment', id, deleted);
    this.save();
    return true;
  }

  // CUSTOMER ORDERS
  public getOrders(): CustomerOrder[] {
    return this.data.orders.map((o) => {
      const wh = this.getWarehouseById(o.destinationWarehouseId);
      const prd = o.productId ? this.getProductById(o.productId) : undefined;
      const items = this.data.orderItems
        .filter((oi) => oi.orderId === o.id)
        .map((oi) => {
          const p = this.getProductById(oi.productId);
          return {
            ...oi,
            productName: p ? p.name : 'Unknown Product',
            unitCost: p ? p.unitCost : 0,
          };
        });

      return {
        ...o,
        warehouseName: wh ? wh.name : 'Unknown Warehouse',
        productName: prd ? prd.name : items[0]?.productName || 'General Goods',
        items,
      };
    });
  }
  public getOrderById(id: string) {
    return this.getOrders().find((o) => o.id === id || o.orderCode === id);
  }
  public createOrder(
    orderData: {
      customerName: string;
      customerContact: string;
      destinationWarehouseId: string;
      deliveryAddress: string;
      orderDate: string;
      deliveryDeadline: string;
      priority: any;
      productId: string;
      requiredQuantity: number;
    },
    user: any
  ) {
    if (orderData.requiredQuantity <= 0) {
      throw new Error('Order quantity must be positive.');
    }
    const wh = this.getWarehouseById(orderData.destinationWarehouseId);
    const prod = this.getProductById(orderData.productId);
    if (!wh) throw new Error('Destination warehouse does not exist.');
    if (!prod) throw new Error('Specified product does not exist.');

    const code = `ORD-${String(this.data.orders.length + 1).padStart(3, '0')}`;
    const orderId = `ord-${Date.now()}`;

    const newOrder: CustomerOrder = {
      id: orderId,
      orderCode: code,
      customerName: orderData.customerName,
      customerContact: orderData.customerContact,
      destinationWarehouseId: orderData.destinationWarehouseId,
      deliveryAddress: orderData.deliveryAddress,
      orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
      deliveryDeadline: orderData.deliveryDeadline,
      priority: orderData.priority || 'Medium',
      status: 'Confirmed',
      riskScore: 15.0,
      riskCategory: 'LOW',
      productId: orderData.productId,
      productName: prod.name,
      requiredQuantity: orderData.requiredQuantity,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newOrderItem: OrderItem = {
      id: `oi-${orderId}`,
      orderId,
      productId: orderData.productId,
      requiredQuantity: orderData.requiredQuantity,
      allocatedQuantity: 0,
      shortageQuantity: 0,
    };

    this.data.orders.unshift(newOrder);
    this.data.orderItems.unshift(newOrderItem);
    this.logAudit(user.id, user.name, user.role, 'CREATE_ORDER', 'Order', newOrder.id, newOrder);
    this.save();
    return newOrder;
  }

  public deleteOrder(id: string, user: any) {
    const idx = this.data.orders.findIndex((o) => o.id === id || o.orderCode === id);
    if (idx === -1) throw new Error('Order not found');
    const deleted = this.data.orders.splice(idx, 1)[0];
    this.data.orderItems = this.data.orderItems.filter((oi) => oi.orderId !== deleted.id);
    this.logAudit(user.id, user.name, user.role, 'DELETE_ORDER', 'Order', id, deleted);
    this.save();
    return true;
  }

  // DISRUPTIONS
  public getDisruptions(): Disruption[] {
    return this.data.disruptions.map((d) => {
      const sup = d.relatedSupplierId ? this.getSupplierById(d.relatedSupplierId) : undefined;
      const shp = d.relatedShipmentId ? this.getShipmentById(d.relatedShipmentId) : undefined;
      const wh = d.affectedWarehouseId ? this.getWarehouseById(d.affectedWarehouseId) : undefined;
      const prod = d.affectedProductId ? this.getProductById(d.affectedProductId) : undefined;

      return {
        ...d,
        supplierName: sup ? sup.name : undefined,
        shipmentCode: shp ? shp.shipmentCode : undefined,
        warehouseName: wh ? wh.name : undefined,
        productName: prod ? prod.name : undefined,
      };
    });
  }
  public getDisruptionById(id: string) {
    return this.getDisruptions().find((d) => d.id === id || d.disruptionCode === id);
  }
  public createDisruption(
    disruptionData: Omit<Disruption, 'id' | 'disruptionCode' | 'createdAt' | 'updatedAt'>,
    user: any
  ) {
    const code = `DIS-${String(this.data.disruptions.length + 1).padStart(3, '0')}`;
    const newDisruption: Disruption = {
      id: `dis-${Date.now()}`,
      disruptionCode: code,
      ...disruptionData,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.disruptions.unshift(newDisruption);

    // If linked to shipment, update shipment status
    if (newDisruption.relatedShipmentId) {
      const shpIdx = this.data.shipments.findIndex((s) => s.id === newDisruption.relatedShipmentId);
      if (shpIdx !== -1) {
        this.data.shipments[shpIdx].status = 'Delayed';
        this.data.shipments[shpIdx].delayDays = newDisruption.expectedDelayDays;
        this.data.shipments[shpIdx].updatedAt = new Date().toISOString();
      }
    }

    this.addNotification(
      `New Disruption Reported: ${code}`,
      `${newDisruption.disruptionType} - ${newDisruption.description.slice(0, 80)}...`,
      newDisruption.severity === 'Critical' ? 'danger' : 'warning',
      'ALL',
      '/disruptions'
    );

    this.logAudit(user.id, user.name, user.role, 'REPORT_DISRUPTION', 'Disruption', newDisruption.id, newDisruption);
    this.save();
    return newDisruption;
  }

  public deleteDisruption(id: string, user: any) {
    const idx = this.data.disruptions.findIndex((d) => d.id === id || d.disruptionCode === id);
    if (idx === -1) throw new Error('Disruption not found');
    const deleted = this.data.disruptions.splice(idx, 1)[0];
    // Remove connected recovery plans
    this.data.recoveryPlans = this.data.recoveryPlans.filter((r) => r.disruptionId !== deleted.id);
    this.logAudit(user.id, user.name, user.role, 'DELETE_DISRUPTION', 'Disruption', id, deleted);
    this.save();
    return true;
  }

  // RECOVERY PLANS & APPROVALS
  public getRecoveryPlans(): RecoveryPlan[] {
    return this.data.recoveryPlans.map((r) => {
      const dis = this.getDisruptionById(r.disruptionId);
      return {
        ...r,
        disruptionCode: dis?.disruptionCode,
        disruptionDescription: dis?.description,
        disruptionSeverity: dis?.severity,
      };
    });
  }
  public createRecoveryPlan(planData: Omit<RecoveryPlan, 'id' | 'planCode' | 'createdAt' | 'updatedAt'>, user: any) {
    const code = `REC-${String(this.data.recoveryPlans.length + 1).padStart(3, '0')}`;
    const newPlan: RecoveryPlan = {
      id: `rec-${Date.now()}`,
      planCode: code,
      ...planData,
      proposedByUserId: user.id,
      proposedByName: user.name,
      status: 'Pending Approval',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.recoveryPlans.unshift(newPlan);

    this.addNotification(
      `New Recovery Plan Created: ${code}`,
      `${planData.planType} proposal submitted by ${user.name}. Awaiting review.`,
      'info',
      'Supply Chain Manager',
      '/approvals'
    );

    this.logAudit(user.id, user.name, user.role, 'CREATE_RECOVERY_PLAN', 'RecoveryPlan', newPlan.id, newPlan);
    this.save();
    return newPlan;
  }

  public deleteRecoveryPlan(id: string, user: any) {
    const idx = this.data.recoveryPlans.findIndex((r) => r.id === id || r.planCode === id);
    if (idx === -1) throw new Error('Recovery plan not found');
    const deleted = this.data.recoveryPlans.splice(idx, 1)[0];
    this.data.approvals = this.data.approvals.filter((a) => a.recoveryPlanId !== deleted.id);
    this.logAudit(user.id, user.name, user.role, 'DELETE_RECOVERY_PLAN', 'RecoveryPlan', id, deleted);
    this.save();
    return true;
  }

  public approveOrRejectRecoveryPlan(
    planId: string,
    decision: 'Approved' | 'Rejected' | 'Modified',
    comments: string,
    user: { id: string; name: string; role: any }
  ) {
    const plan = this.data.recoveryPlans.find((r) => r.id === planId);
    if (!plan) throw new Error('Recovery plan not found');

    // Rule: Users cannot approve their own recovery plans!
    if (plan.proposedByUserId === user.id) {
      throw new Error('Self-approval violation: You cannot approve your own recovery plan proposal. A separate authorized manager must review it.');
    }

    // Role check: Only Supply Chain Manager, Procurement Approver, or Administrator
    const allowedRoles = ['Supply Chain Manager', 'Procurement Approver', 'Administrator'];
    if (!allowedRoles.includes(user.role)) {
      throw new Error(`Permission denied: Role ${user.role} is not authorized to approve recovery plans.`);
    }

    if (decision === 'Approved') {
      plan.status = 'Approved';
      plan.approverUserId = user.id;
    } else if (decision === 'Rejected') {
      plan.status = 'Rejected';
      plan.rejectionReason = comments;
    } else if (decision === 'Modified') {
      plan.status = 'Pending Approval';
      plan.notes = `${plan.notes || ''}\n[Modified by ${user.name}]: ${comments}`;
    }
    plan.updatedAt = new Date().toISOString();

    const approval: Approval = {
      id: `app-${Date.now()}`,
      recoveryPlanId: plan.id,
      approverUserId: user.id,
      approverName: user.name,
      approverRole: user.role,
      decision,
      comments,
      decidedAt: new Date().toISOString(),
      planCode: plan.planCode,
      planType: plan.planType,
    };
    this.data.approvals.unshift(approval);

    this.addNotification(
      `Recovery Plan ${plan.planCode} ${decision}`,
      `${user.name} (${user.role}) has ${decision.toLowerCase()} plan ${plan.planCode}.`,
      decision === 'Approved' ? 'success' : 'warning',
      'ALL',
      '/recovery-plans'
    );

    this.logAudit(user.id, user.name, user.role, `${decision.toUpperCase()}_RECOVERY_PLAN`, 'RecoveryPlan', plan.id, {
      decision,
      comments,
    });
    this.save();
    return { plan, approval };
  }

  // EXECUTE APPROVED RECOVERY PLAN
  public executeRecoveryPlan(planId: string, user: { id: string; name: string; role: any }) {
    const plan = this.data.recoveryPlans.find((r) => r.id === planId);
    if (!plan) throw new Error('Recovery plan not found');
    if (plan.status !== 'Approved') {
      throw new Error('Plan must be officially Approved before execution.');
    }

    const dis = this.data.disruptions.find((d) => d.id === plan.disruptionId);

    // Apply deterministic business updates based on plan type
    if (plan.planType === 'Stock Reallocation' && dis?.affectedWarehouseId && dis?.affectedProductId) {
      // Find source warehouse from plan items or fallback to Mumbai
      const targetWhId = dis.affectedWarehouseId;
      const prodId = dis.affectedProductId;
      const transferQty = Math.min(plan.ordersRecoveredCount * 15 || 50, 50);

      // Deduct from Mumbai
      const sourceInv = this.data.inventory.find(
        (i) => i.productId === prodId && i.warehouseId !== targetWhId && i.availableStock >= transferQty
      );
      const targetInv = this.data.inventory.find((i) => i.productId === prodId && i.warehouseId === targetWhId);

      if (sourceInv && targetInv) {
        sourceInv.availableStock -= transferQty;
        sourceInv.lastUpdatedDate = new Date().toISOString();
        targetInv.availableStock += transferQty;
        targetInv.lastUpdatedDate = new Date().toISOString();
      }
    }

    if (dis) {
      dis.status = 'Resolved';
      dis.updatedAt = new Date().toISOString();
    }

    plan.status = 'Executed';
    plan.executionResult = `Executed on ${new Date().toLocaleDateString()}. Inventory rebalanced, customer order risk resolved.`;
    plan.updatedAt = new Date().toISOString();

    this.addNotification(
      `Recovery Plan ${plan.planCode} Executed!`,
      `Autonomous execution complete. Inventory updated, customer order commitments protected.`,
      'success',
      'ALL',
      '/recovery-plans'
    );

    this.logAudit(user.id, user.name, user.role, 'EXECUTE_RECOVERY_PLAN', 'RecoveryPlan', plan.id, {
      disruptionId: plan.disruptionId,
      result: plan.executionResult,
    });

    this.save();
    return plan;
  }

  // CARRIER WEBHOOK EVENT HANDLER
  public handleCarrierWebhook(payload: CarrierWebhookPayload) {
    const shp = this.data.shipments.find(
      (s) => s.id === payload.shipment_id || s.shipmentCode === payload.shipment_id || s.trackingReference === payload.shipment_id
    );

    const eventRecord = {
      id: `cwe-${Date.now()}`,
      shipment_id: payload.shipment_id,
      event: payload.event,
      delay_days: payload.delay_days || 0,
      location: payload.location,
      event_time: payload.event_time || new Date().toISOString(),
      carrier_note: payload.carrier_note,
      processed: true,
      createdAt: new Date().toISOString(),
    };
    this.data.carrierWebhookEvents.unshift(eventRecord);

    if (shp) {
      shp.delayDays = payload.delay_days || shp.delayDays;
      if (payload.event === 'DELAYED') {
        shp.status = 'Delayed';
        // Auto-create disruption if not already existing
        const existingDis = this.data.disruptions.find(
          (d) => d.relatedShipmentId === shp.id && d.status !== 'Resolved'
        );
        if (!existingDis) {
          const newDis: Disruption = {
            id: `dis-${Date.now()}`,
            disruptionCode: `DIS-${String(this.data.disruptions.length + 1).padStart(3, '0')}`,
            disruptionType: 'Shipment Delay',
            relatedSupplierId: shp.supplierId,
            relatedShipmentId: shp.id,
            affectedWarehouseId: shp.destinationWarehouseId,
            affectedProductId: shp.productId,
            expectedDelayDays: payload.delay_days,
            shortageQuantity: Math.round(shp.quantity * 0.4),
            severity: payload.delay_days >= 5 ? 'Critical' : 'High',
            description: `Automated Carrier Webhook: ${shp.carrierName} reported delay of ${payload.delay_days} days at checkpoint ${payload.location}. ${payload.carrier_note || ''}`,
            reportedDate: new Date().toISOString(),
            status: 'Active',
            isDemo: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.data.disruptions.unshift(newDis);
        }
      } else if (payload.event === 'DELIVERED') {
        shp.status = 'Delivered';
        shp.actualDeliveryDate = new Date().toISOString().split('T')[0];
      }
      shp.updatedAt = new Date().toISOString();
    }

    this.addNotification(
      `Carrier Webhook Event: ${payload.event}`,
      `Shipment ${payload.shipment_id} update from ${payload.location}: ${payload.delay_days} days delay.`,
      payload.delay_days > 0 ? 'danger' : 'info',
      'ALL',
      '/shipments'
    );

    this.logAudit(
      'carrier_webhook_service',
      'Simulated Carrier Service',
      'Operations Analyst',
      'CARRIER_WEBHOOK_EVENT',
      'Shipment',
      payload.shipment_id,
      payload
    );

    this.save();
    return { success: true, shipmentUpdated: !!shp, eventRecord };
  }

  // BULK IMPORT
  public bulkImport(
    entityType: 'suppliers' | 'products' | 'warehouses' | 'inventory' | 'shipments' | 'orders',
    records: any[],
    user: any
  ) {
    let successCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    records.forEach((rec, idx) => {
      try {
        if (entityType === 'suppliers') {
          if (!rec.name || !rec.email) throw new Error('Missing name or email');
          if (this.data.suppliers.some((s) => s.email === rec.email || s.name === rec.name)) {
            duplicateCount++;
            return;
          }
          this.createSupplier(
            {
              name: rec.name,
              contactPerson: rec.contactPerson || rec.contact_person || 'N/A',
              email: rec.email,
              phone: rec.phone || '+1-000-000-0000',
              location: rec.location || 'Global',
              reliabilityScore: Number(rec.reliabilityScore || rec.reliability_score || 90),
              status: rec.status || 'Active',
            },
            user
          );
          successCount++;
        } else if (entityType === 'products') {
          if (!rec.name) throw new Error('Missing product name');
          if (this.data.products.some((p) => p.name === rec.name)) {
            duplicateCount++;
            return;
          }
          this.createProduct(
            {
              name: rec.name,
              category: rec.category || 'General',
              description: rec.description || '',
              unitCost: Number(rec.unitCost || rec.unit_cost || 50),
              status: rec.status || 'Active',
            },
            user
          );
          successCount++;
        } else if (entityType === 'warehouses') {
          if (!rec.name || !rec.location) throw new Error('Missing warehouse name or location');
          if (this.data.warehouses.some((w) => w.name === rec.name)) {
            duplicateCount++;
            return;
          }
          this.createWarehouse(
            {
              name: rec.name,
              location: rec.location,
              capacity: Number(rec.capacity || 10000),
              manager: rec.manager || 'Operations Lead',
              status: rec.status || 'Operational',
            },
            user
          );
          successCount++;
        } else if (entityType === 'inventory') {
          const prod = this.getProductById(rec.productId || rec.product_id || rec.productName);
          const wh = this.getWarehouseById(rec.warehouseId || rec.warehouse_id || rec.warehouseName);
          if (!prod) throw new Error('Unrecognized product');
          if (!wh) throw new Error('Unrecognized warehouse');
          this.createOrUpdateInventory(
            {
              productId: prod.id,
              warehouseId: wh.id,
              availableStock: Math.max(0, Number(rec.availableStock || rec.available_stock || 0)),
              reservedStock: Math.max(0, Number(rec.reservedStock || rec.reserved_stock || 0)),
              minimumStock: Math.max(0, Number(rec.minimumStock || rec.minimum_stock || 10)),
            },
            user
          );
          successCount++;
        } else if (entityType === 'shipments') {
          const sup = this.getSupplierById(rec.supplierId || rec.supplier_id || rec.supplierName);
          const prod = this.getProductById(rec.productId || rec.product_id || rec.productName);
          const wh = this.getWarehouseById(rec.destinationWarehouseId || rec.warehouseId || rec.warehouseName);
          if (!sup) throw new Error('Supplier not found');
          if (!prod) throw new Error('Product not found');
          if (!wh) throw new Error('Warehouse not found');

          this.createShipment(
            {
              supplierId: sup.id,
              productId: prod.id,
              quantity: Math.max(1, Number(rec.quantity || 100)),
              sourceLocation: rec.sourceLocation || sup.location,
              destinationWarehouseId: wh.id,
              carrierName: rec.carrierName || 'Global Express',
              expectedDeliveryDate: rec.expectedDeliveryDate || '2026-11-15',
              status: rec.status || 'In Transit',
              delayDays: Number(rec.delayDays || 0),
              trackingReference: rec.trackingReference || `TRK-${Date.now()}`,
            },
            user
          );
          successCount++;
        } else if (entityType === 'orders') {
          const wh = this.getWarehouseById(rec.destinationWarehouseId || rec.warehouseId || rec.warehouseName);
          const prod = this.getProductById(rec.productId || rec.product_id || rec.productName);
          if (!wh) throw new Error('Warehouse not found');
          if (!prod) throw new Error('Product not found');

          this.createOrder(
            {
              customerName: rec.customerName || rec.customer_name || 'Enterprise Client',
              customerContact: rec.customerContact || 'contact@client.com',
              destinationWarehouseId: wh.id,
              deliveryAddress: rec.deliveryAddress || 'Industrial Sector 4',
              orderDate: rec.orderDate || '2026-10-25',
              deliveryDeadline: rec.deliveryDeadline || '2026-11-10',
              priority: rec.priority || 'Medium',
              productId: prod.id,
              requiredQuantity: Math.max(1, Number(rec.requiredQuantity || rec.quantity || 20)),
            },
            user
          );
          successCount++;
        }
      } catch (err: any) {
        rejectedCount++;
        errors.push({ row: idx + 1, reason: err.message || 'Validation error' });
      }
    });

    this.logAudit(user.id, user.name, user.role, 'BULK_IMPORT', entityType, 'BATCH', {
      total: records.length,
      successCount,
      duplicateCount,
      rejectedCount,
    });
    this.save();

    return {
      total: records.length,
      successCount,
      duplicateCount,
      rejectedCount,
      errors,
    };
  }

  // SETTINGS
  public getSettings() {
    return this.data.settings;
  }
  public updateRiskWeights(weights: Partial<RiskScoringWeights>, user: any) {
    this.data.settings.riskWeights = {
      ...this.data.settings.riskWeights,
      ...weights,
    };
    this.logAudit(user.id, user.name, user.role, 'UPDATE_SETTINGS', 'RiskWeights', 'CONFIG', this.data.settings.riskWeights);
    this.save();
    return this.data.settings.riskWeights;
  }
  public updateSupabaseConfig(config: Partial<DatabaseSchema['settings']['supabaseConfig']>, user: any) {
    this.data.settings.supabaseConfig = {
      ...this.data.settings.supabaseConfig,
      ...config,
    };
    this.logAudit(user.id, user.name, user.role, 'UPDATE_SUPABASE_CONFIG', 'Supabase', 'CONFIG', {
      url: this.data.settings.supabaseConfig.url,
      connected: this.data.settings.supabaseConfig.connected,
    });
    this.save();
    return this.data.settings.supabaseConfig;
  }

  // =========================================================================
  // GPS LORRY TRACKING & BREAKDOWN MONITORING SYSTEM
  // =========================================================================

  private initDefaultFleet(targetData: DatabaseSchema) {
    const isoNow = new Date().toISOString();

    const sampleLorries: Lorry[] = [
      {
        id: 'lor_truck_101',
        lorryNumber: 'TRUCK-101',
        model: 'Tata Prima 5530.S Euro 6',
        capacityTons: 35,
        carrierName: 'Deccan Express Logistics',
        driverName: 'Ravi Kumar',
        driverPhone: '+91 98450 12345',
        driverContactNumber: '+91 98450 12345',
        status: 'Moving',
        movementStatus: 'Moving',
        workflowStatus: 'Normal',
        locationSource: 'GPS_DEVICE',
        currentShipmentId: 'shp_001',
        currentShipmentCode: 'SHIP-001',
        originLocation: 'Chennai Container Freight Station, Chennai, TN, India',
        currentLocationAddress: 'NH 48 High-Speed Freight Corridor, Sriperumbudur near Chennai, TN, India',
        destinationAddress: 'Tech Gateway Logistics Park, 42 Outer Ring Road, Bellandur, Bengaluru, Karnataka, 560103, India',
        destinationLocation: 'Bengaluru, Karnataka, India',
        destinationLatitude: 12.9716,
        destinationLongitude: 77.5946,
        expectedDeliveryDate: '2026-10-30',
        expectedDeliveryTime: '18:00',
        lastTelemetry: {
          latitude: 13.0827,
          longitude: 80.2707,
          speed: 64,
          speed_kmh: 64,
          heading: 260,
          engineStatus: 'Running',
          engineTemp: 86,
          fuelLevel: 74,
          batteryVoltage: 24.3,
          locationName: 'Chennai Logistics Hub (13.0827° N, 80.2707° E)',
          timestamp: isoNow,
          locationSource: 'GPS_DEVICE',
          movement_status: 'Moving',
          isSimulated: false,
        },
        recentWaypoints: [
          { latitude: 13.1001, longitude: 80.2905, timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
          { latitude: 13.0827, longitude: 80.2707, timestamp: isoNow },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: 'lor_1',
        lorryNumber: 'LOR-8492-TX',
        model: 'Volvo FH16 Globetrotter 540',
        capacityTons: 26,
        carrierName: 'SwiftLogistics Global',
        driverName: 'Robert Martinez',
        driverPhone: '+1 (312) 555-0149',
        status: 'Moving',
        movementStatus: 'Moving',
        workflowStatus: 'Normal',
        locationSource: 'GPS_DEVICE',
        currentShipmentCode: 'SHP-9021',
        originLocation: 'Chicago Industrial Gateway',
        destinationLocation: 'Indianapolis Depot (WH-IND-01)',
        destinationWarehouse: 'WH-IND-01',
        expectedDeliveryTime: new Date(Date.now() + 1000 * 60 * 190).toISOString(),
        lastTelemetry: {
          latitude: 40.4173,
          longitude: -86.8752,
          speed: 72,
          speed_kmh: 72,
          heading: 145,
          engineStatus: 'Running',
          engineTemp: 88,
          fuelLevel: 78,
          batteryVoltage: 24.2,
          locationName: 'I-65 Southbound, Mile 142 near Lafayette, IN',
          timestamp: isoNow,
          locationSource: 'GPS_DEVICE',
          movement_status: 'Moving',
          isSimulated: false,
        },
        recentWaypoints: [
          { latitude: 41.5868, longitude: -87.3468, timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
          { latitude: 40.9525, longitude: -87.1517, timestamp: new Date(Date.now() - 3600000).toISOString() },
          { latitude: 40.4173, longitude: -86.8752, timestamp: isoNow },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: 'lor_2',
        lorryNumber: 'LOR-3105-CA',
        model: 'Freightliner Cascadia 126',
        capacityTons: 32,
        carrierName: 'Apex Freight Express',
        driverName: 'Carlos Mendez',
        driverPhone: '+1 (213) 555-0821',
        status: 'Moving',
        movementStatus: 'Moving',
        workflowStatus: 'Normal',
        locationSource: 'GPS_DEVICE',
        currentShipmentCode: 'SHP-4482',
        originLocation: 'Port of Long Beach Terminal B',
        destinationLocation: 'Phoenix Regional Distribution WH-PHX-02',
        destinationWarehouse: 'WH-PHX-02',
        expectedDeliveryTime: new Date(Date.now() + 1000 * 60 * 280).toISOString(),
        lastTelemetry: {
          latitude: 33.8303,
          longitude: -116.5453,
          speed: 76,
          speed_kmh: 76,
          heading: 98,
          engineStatus: 'Running',
          engineTemp: 92,
          fuelLevel: 64,
          batteryVoltage: 24.0,
          locationName: 'I-10 Eastbound near Palm Springs, CA',
          timestamp: isoNow,
          locationSource: 'GPS_DEVICE',
          movement_status: 'Moving',
          isSimulated: false,
        },
        recentWaypoints: [
          { latitude: 33.7701, longitude: -118.1937, timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
          { latitude: 34.0633, longitude: -117.6509, timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString() },
          { latitude: 33.8303, longitude: -116.5453, timestamp: isoNow },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: 'lor_3',
        lorryNumber: 'LOR-9921-OH',
        model: 'Peterbilt 579 UltraLoft',
        capacityTons: 28,
        carrierName: 'Velocity Line Haul',
        driverName: 'Arthur Pendelton',
        driverPhone: '+1 (614) 555-0394',
        status: 'Breakdown',
        movementStatus: 'Stopped',
        workflowStatus: 'Breakdown Confirmed',
        locationSource: 'GPS_DEVICE',
        breakdownType: 'Engine Failure',
        breakdownDescription: 'Coolant hose rupture leading to sudden spike in engine temp (114°C). Vehicle immobilized.',
        currentShipmentCode: 'SHP-7719',
        originLocation: 'Detroit Automotive Logistics Hub',
        destinationLocation: 'Cincinnati Distribution Hub (WH-CIN-01)',
        destinationWarehouse: 'WH-CIN-01',
        expectedDeliveryTime: new Date(Date.now() + 1000 * 60 * 360).toISOString(),
        lastTelemetry: {
          latitude: 39.9612,
          longitude: -82.9988,
          speed: 0,
          speed_kmh: 0,
          heading: 180,
          engineStatus: 'Failure',
          engineTemp: 114,
          fuelLevel: 45,
          batteryVoltage: 23.1,
          locationName: 'I-71 Southbound Shoulder, Mile 104 near Columbus, OH',
          timestamp: isoNow,
          locationSource: 'GPS_DEVICE',
          movement_status: 'Stopped',
          isSimulated: false,
        },
        recentWaypoints: [
          { latitude: 41.6528, longitude: -83.5379, timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
          { latitude: 40.7426, longitude: -82.5154, timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString() },
          { latitude: 39.9612, longitude: -82.9988, timestamp: isoNow },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: 'lor_4',
        lorryNumber: 'LOR-5512-PA',
        model: 'Kenworth T680 Next Gen',
        capacityTons: 24,
        carrierName: 'MetroTrans Carrier',
        driverName: 'Elena Rostova',
        driverPhone: '+1 (215) 555-0912',
        status: 'Stopped',
        movementStatus: 'Stopped',
        workflowStatus: 'Possible Stoppage',
        locationSource: 'GPS_DEVICE',
        stoppageDetectedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        currentShipmentCode: 'SHP-1204',
        originLocation: 'New York Gateway Terminal',
        destinationLocation: 'Pittsburgh Freight WH-PIT-01',
        destinationWarehouse: 'WH-PIT-01',
        expectedDeliveryTime: new Date(Date.now() + 1000 * 60 * 420).toISOString(),
        lastTelemetry: {
          latitude: 40.2732,
          longitude: -76.8867,
          speed: 0,
          speed_kmh: 0,
          heading: 0,
          engineStatus: 'Idling',
          engineTemp: 78,
          fuelLevel: 82,
          batteryVoltage: 24.5,
          locationName: 'Pilot Flying J Freight Rest Stop, Harrisburg, PA',
          timestamp: isoNow,
          locationSource: 'GPS_DEVICE',
          movement_status: 'Stopped',
          isSimulated: false,
        },
        recentWaypoints: [
          { latitude: 40.7128, longitude: -74.006, timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
          { latitude: 40.6023, longitude: -75.4714, timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
          { latitude: 40.2732, longitude: -76.8867, timestamp: isoNow },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: 'lor_5',
        lorryNumber: 'LOR-7740-GA',
        model: 'Mack Anthem 70-inch Sleeper',
        capacityTons: 30,
        carrierName: 'Southeastern Fleet Corp',
        driverName: 'James Wilson',
        driverPhone: '+1 (404) 555-0673',
        status: 'Recovered',
        movementStatus: 'Moving',
        workflowStatus: 'Recovered',
        locationSource: 'GPS_DEVICE',
        currentShipmentCode: 'SHP-3310',
        originLocation: 'Atlanta Distribution Mega Center',
        destinationLocation: 'Savannah Deepwater Port Terminal',
        destinationWarehouse: 'WH-SAV-01',
        expectedDeliveryTime: new Date(Date.now() + 1000 * 60 * 150).toISOString(),
        lastTelemetry: {
          latitude: 32.8407,
          longitude: -83.6324,
          speed: 62,
          speed_kmh: 62,
          heading: 135,
          engineStatus: 'Running',
          engineTemp: 86,
          fuelLevel: 58,
          batteryVoltage: 24.1,
          locationName: 'I-75 Southbound near Macon, GA (Resumed after tire service)',
          timestamp: isoNow,
          locationSource: 'GPS_DEVICE',
          movement_status: 'Moving',
          isSimulated: false,
        },
        recentWaypoints: [
          { latitude: 33.749, longitude: -84.388, timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
          { latitude: 33.3287, longitude: -84.1485, timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString() },
          { latitude: 32.8407, longitude: -83.6324, timestamp: isoNow },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ];

    const sampleBreakdown: BreakdownAlert = {
      id: 'BRK-9921-01',
      lorryId: 'lor_3',
      lorryNumber: 'LOR-9921-OH',
      shipmentCode: 'SHP-7719',
      reportedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      severity: 'High',
      breakdownType: 'Engine Failure',
      description:
        'Coolant hose rupture leading to sudden spike in engine temp (114°C). Vehicle immobilized on shoulder of I-71 South.',
      location: {
        latitude: 39.9612,
        longitude: -82.9988,
        name: 'I-71 Southbound Shoulder, Mile 104 near Columbus, OH',
      },
      workflowStatus: 'Breakdown Confirmed',
      status: 'Assistance Dispatched',
      dispatchedAssistance: {
        serviceProvider: 'Buckeye Commercial Fleet Emergency Assistance',
        etaMinutes: 14,
        mechanicName: 'Dave Kowalski',
        contactPhone: '+1 (614) 555-9182',
      },
    };

    const stoppageAlert: BreakdownAlert = {
      id: 'STP-5512-01',
      lorryId: 'lor_4',
      lorryNumber: 'LOR-5512-PA',
      shipmentCode: 'SHP-1204',
      reportedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      severity: 'Medium',
      breakdownType: 'Other',
      description: 'Vehicle stationary (0 km/h) for >10 mins at Harrisburg rest area corridor. Possible unscheduled stoppage.',
      location: {
        latitude: 40.2732,
        longitude: -76.8867,
        name: 'Pilot Flying J Freight Rest Stop, Harrisburg, PA',
      },
      workflowStatus: 'Possible Stoppage',
      status: 'Investigating',
    };

    sampleLorries[2].activeBreakdown = sampleBreakdown;
    sampleLorries[3].activeBreakdown = stoppageAlert;
    targetData.lorries = sampleLorries;
    targetData.breakdownAlerts = [sampleBreakdown, stoppageAlert];

    // Seed initial GPS history
    targetData.gpsHistory = sampleLorries.map((l, idx) => ({
      id: `gps_init_${idx + 1}`,
      shipment_id: l.currentShipmentId || l.currentShipmentCode,
      lorry_id: l.lorryNumber,
      driver_name: l.driverName,
      latitude: l.lastTelemetry.latitude,
      longitude: l.lastTelemetry.longitude,
      speed_kmh: l.lastTelemetry.speed,
      movement_status: l.movementStatus,
      gps_timestamp: l.lastTelemetry.timestamp,
      location_source: l.locationSource,
      created_at: isoNow,
    }));
  }

  public getLorries(filters?: { status?: string; search?: string }): Lorry[] {
    const isoNow = new Date().toISOString();
    const nowMs = Date.now();

    // Map lorries and determine if offline (telemetry older than 30 mins)
    let result = this.data.lorries.map((lorry) => {
      const activeBreakdown = this.data.breakdownAlerts.find(
        (b) => b.lorryId === lorry.id && b.status !== 'Resolved'
      );

      const telTime = new Date(lorry.lastTelemetry.timestamp).getTime();
      const isOutdated = nowMs - telTime > 30 * 60 * 1000;
      let movStatus = lorry.movementStatus;
      if (isOutdated && lorry.workflowStatus === 'Normal' && lorry.status !== 'Breakdown') {
        movStatus = 'Offline';
      }

      return {
        ...lorry,
        movementStatus: movStatus,
        activeBreakdown: activeBreakdown || lorry.activeBreakdown,
      };
    });

    if (filters?.status && filters.status !== 'ALL') {
      const s = filters.status.toLowerCase();
      result = result.filter(
        (l) =>
          l.status.toLowerCase() === s ||
          l.movementStatus.toLowerCase() === s ||
          l.workflowStatus.toLowerCase() === s
      );
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.lorryNumber.toLowerCase().includes(q) ||
          l.driverName.toLowerCase().includes(q) ||
          (l.currentShipmentCode && l.currentShipmentCode.toLowerCase().includes(q)) ||
          l.carrierName.toLowerCase().includes(q) ||
          l.lastTelemetry.locationName.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public getLorryById(id: string): Lorry | undefined {
    const lorry = this.data.lorries.find((l) => l.id === id || l.lorryNumber === id);
    if (!lorry) return undefined;

    const activeBreakdown = this.data.breakdownAlerts.find(
      (b) => (b.lorryId === lorry.id || b.lorryNumber === lorry.lorryNumber) && b.status !== 'Resolved'
    );
    return {
      ...lorry,
      activeBreakdown: activeBreakdown || lorry.activeBreakdown,
    };
  }

  public createLorry(lorryData: Partial<Lorry>, user: any): Lorry {
    const isoNow = new Date().toISOString();
    const lorryNumber = lorryData.lorryNumber || `LOR-${Math.floor(1000 + Math.random() * 9000)}-FL`;
    const locSource: LocationSource = lorryData.locationSource || 'GPS_DEVICE';

    const newLorry: Lorry = {
      id: `lor_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      lorryNumber,
      model: lorryData.model || 'Heavy Haul Prime Mover',
      capacityTons: Number(lorryData.capacityTons) || 28,
      carrierName: lorryData.carrierName || 'Enterprise Logistics Partner',
      driverName: lorryData.driverName || 'Designated Driver',
      driverPhone: lorryData.driverPhone || '+1 (555) 019-2834',
      status: (lorryData.status as any) || 'Moving',
      movementStatus: (lorryData.movementStatus as any) || 'Moving',
      workflowStatus: (lorryData.workflowStatus as any) || 'Normal',
      locationSource: locSource,
      currentShipmentId: lorryData.currentShipmentId,
      currentShipmentCode: lorryData.currentShipmentCode || 'SHP-PENDING',
      originLocation: lorryData.originLocation || 'Main Hub',
      destinationLocation: lorryData.destinationLocation || undefined,
      destinationWarehouse: lorryData.destinationWarehouse || undefined,
      expectedDeliveryTime: lorryData.expectedDeliveryTime || undefined,
      lastTelemetry: {
        latitude: lorryData.lastTelemetry?.latitude ?? 39.8283,
        longitude: lorryData.lastTelemetry?.longitude ?? -98.5795,
        speed: lorryData.lastTelemetry?.speed ?? 65,
        speed_kmh: lorryData.lastTelemetry?.speed ?? 65,
        heading: lorryData.lastTelemetry?.heading ?? 90,
        engineStatus: lorryData.lastTelemetry?.engineStatus ?? 'Running',
        engineTemp: lorryData.lastTelemetry?.engineTemp ?? 88,
        fuelLevel: lorryData.lastTelemetry?.fuelLevel ?? 85,
        batteryVoltage: lorryData.lastTelemetry?.batteryVoltage ?? 24.2,
        locationName: lorryData.lastTelemetry?.locationName ?? 'National Transit Corridor',
        timestamp: isoNow,
        locationSource: locSource,
        movement_status: 'Moving',
        isSimulated: locSource === 'SIMULATED',
      },
      recentWaypoints: [
        {
          latitude: lorryData.lastTelemetry?.latitude ?? 39.8283,
          longitude: lorryData.lastTelemetry?.longitude ?? -98.5795,
          timestamp: isoNow,
        },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    this.data.lorries.unshift(newLorry);

    // Save in GPS history
    this.data.gpsHistory.unshift({
      id: `gps_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      shipment_id: newLorry.currentShipmentCode,
      lorry_id: newLorry.lorryNumber,
      driver_name: newLorry.driverName,
      latitude: newLorry.lastTelemetry.latitude,
      longitude: newLorry.lastTelemetry.longitude,
      speed_kmh: newLorry.lastTelemetry.speed,
      movement_status: 'Moving',
      gps_timestamp: isoNow,
      location_source: locSource,
      created_at: isoNow,
    });

    this.logAudit(
      user.id,
      user.name,
      user.role,
      'REGISTER_LORRY',
      'Lorry',
      newLorry.id,
      { lorryNumber: newLorry.lorryNumber, carrier: newLorry.carrierName }
    );
    this.save();
    return newLorry;
  }

  public updateLorry(id: string, lorryData: Partial<Lorry>, user: any): Lorry {
    const idx = this.data.lorries.findIndex((l) => l.id === id || l.lorryNumber === id);
    if (idx === -1) throw new Error('Lorry not found');

    const updated: Lorry = {
      ...this.data.lorries[idx],
      ...lorryData,
      updatedAt: new Date().toISOString(),
    };

    if (lorryData.destinationAddress !== undefined) {
      updated.destinationLocation = lorryData.destinationAddress;
    } else if (lorryData.destinationLocation !== undefined) {
      updated.destinationAddress = lorryData.destinationLocation;
    }

    this.data.lorries[idx] = updated;

    // Synchronize destination & journey address changes to associated shipment
    if (updated.currentShipmentId || updated.currentShipmentCode) {
      const ship = this.data.shipments.find(
        (s) => s.id === updated.currentShipmentId || s.shipmentCode === updated.currentShipmentCode
      );
      if (ship) {
        if (lorryData.destinationAddress !== undefined) ship.destinationAddress = lorryData.destinationAddress;
        if (lorryData.destinationLocation !== undefined) ship.destinationLocation = lorryData.destinationLocation || lorryData.destinationAddress;
        if (lorryData.destinationLatitude !== undefined) ship.destinationLatitude = lorryData.destinationLatitude;
        if (lorryData.destinationLongitude !== undefined) ship.destinationLongitude = lorryData.destinationLongitude;
        if (lorryData.expectedDeliveryDate !== undefined) ship.expectedDeliveryDate = lorryData.expectedDeliveryDate;
        if (lorryData.expectedDeliveryTime !== undefined) ship.expectedDeliveryTime = lorryData.expectedDeliveryTime;
        if (lorryData.originLocation !== undefined) ship.sourceLocation = lorryData.originLocation;
        if (lorryData.corridorRoute !== undefined) ship.corridorRoute = lorryData.corridorRoute;
        if (lorryData.journeyNotes !== undefined) ship.journeyNotes = lorryData.journeyNotes;
        ship.updatedAt = new Date().toISOString();
      }
    }

    this.logAudit(user.id, user.name, user.role, 'UPDATE_LORRY', 'Lorry', id, lorryData);
    this.save();
    return updated;
  }

  public deleteLorry(id: string, user: any): boolean {
    const initialLen = this.data.lorries.length;
    const lorry = this.data.lorries.find((l) => l.id === id || l.lorryNumber === id);
    this.data.lorries = this.data.lorries.filter((l) => l.id !== id && l.lorryNumber !== id);

    if (this.data.lorries.length < initialLen) {
      this.logAudit(user.id, user.name, user.role, 'DELETE_LORRY', 'Lorry', id, {
        lorryNumber: lorry?.lorryNumber,
      });
      this.save();
      return true;
    }
    return false;
  }

  public recordLorryTelemetry(
    lorryId: string,
    telemetry: Partial<LorryTelemetry>,
    user?: any
  ): Lorry {
    const idx = this.data.lorries.findIndex((l) => l.id === lorryId || l.lorryNumber === lorryId);
    if (idx === -1) throw new Error('Lorry not found');

    const lorry = this.data.lorries[idx];
    const isoNow = new Date().toISOString();

    const speed = telemetry.speed !== undefined ? Number(telemetry.speed) : (telemetry.speed_kmh !== undefined ? Number(telemetry.speed_kmh) : lorry.lastTelemetry.speed);
    const lat = telemetry.latitude !== undefined ? Number(telemetry.latitude) : lorry.lastTelemetry.latitude;
    const lng = telemetry.longitude !== undefined ? Number(telemetry.longitude) : lorry.lastTelemetry.longitude;
    const locSource: LocationSource = telemetry.locationSource || (telemetry.isSimulated ? 'SIMULATED' : lorry.locationSource || 'GPS_DEVICE');

    // Movement status determination
    let newMovementStatus: 'Moving' | 'Stopped' | 'Offline' = speed > 5 ? 'Moving' : 'Stopped';
    let newStatus = lorry.status;
    if (lorry.status !== 'Breakdown') {
      newStatus = newMovementStatus;
    }

    const newTelemetry: LorryTelemetry = {
      id: `tel_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      lorryId: lorry.id,
      shipmentId: lorry.currentShipmentId,
      latitude: lat,
      longitude: lng,
      speed,
      speed_kmh: speed,
      heading: telemetry.heading ?? lorry.lastTelemetry.heading,
      engineStatus: telemetry.engineStatus ?? (speed > 0 ? 'Running' : 'Idling'),
      engineTemp: telemetry.engineTemp ?? lorry.lastTelemetry.engineTemp,
      fuelLevel: telemetry.fuelLevel ?? lorry.lastTelemetry.fuelLevel,
      batteryVoltage: telemetry.batteryVoltage ?? lorry.lastTelemetry.batteryVoltage,
      locationName: telemetry.locationName || lorry.lastTelemetry.locationName,
      timestamp: telemetry.timestamp || isoNow,
      movement_status: newMovementStatus,
      locationSource: locSource,
      isSimulated: locSource === 'SIMULATED',
    };

    // Store in history
    this.data.lorryTelemetryHistory.unshift(newTelemetry);
    if (this.data.lorryTelemetryHistory.length > 500) {
      this.data.lorryTelemetryHistory.pop();
    }

    // Record in GPS history table
    this.data.gpsHistory.unshift({
      id: `gps_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      shipment_id: lorry.currentShipmentId || lorry.currentShipmentCode,
      lorry_id: lorry.lorryNumber,
      driver_name: lorry.driverName,
      latitude: lat,
      longitude: lng,
      speed_kmh: speed,
      movement_status: newMovementStatus,
      gps_timestamp: newTelemetry.timestamp,
      location_source: locSource,
      created_at: isoNow,
    });
    if (this.data.gpsHistory.length > 1000) {
      this.data.gpsHistory.pop();
    }

    // Update lorry waypoints
    const updatedWaypoints = [...(lorry.recentWaypoints || [])];
    updatedWaypoints.push({ latitude: lat, longitude: lng, timestamp: isoNow });
    if (updatedWaypoints.length > 20) {
      updatedWaypoints.shift();
    }

    const updatedLorry: Lorry = {
      ...lorry,
      status: newStatus,
      movementStatus: newMovementStatus,
      locationSource: locSource,
      lastTelemetry: newTelemetry,
      recentWaypoints: updatedWaypoints,
      updatedAt: isoNow,
    };

    this.data.lorries[idx] = updatedLorry;
    this.save();
    return updatedLorry;
  }

  // --- Stoppage Detection Engine ---
  public detectStoppages(thresholdMinutes?: number): { detectedCount: number; lorries: Lorry[] } {
    const threshold = thresholdMinutes || this.data.settings.stoppageThresholdMinutes || 10;
    const nowMs = Date.now();
    const isoNow = new Date().toISOString();
    let detectedCount = 0;

    for (const lorry of this.data.lorries) {
      // Only inspect if stationary and not already confirmed/handling breakdown
      if (
        lorry.lastTelemetry.speed === 0 &&
        lorry.workflowStatus !== 'Breakdown Confirmed' &&
        lorry.workflowStatus !== 'Assistance Requested' &&
        lorry.workflowStatus !== 'Repairing'
      ) {
        const lastPingMs = new Date(lorry.lastTelemetry.timestamp).getTime();
        const stationaryMinutes = Math.floor((nowMs - lastPingMs) / 60000);

        if (stationaryMinutes >= threshold || lorry.workflowStatus === 'Possible Stoppage') {
          lorry.workflowStatus = 'Possible Stoppage';
          lorry.status = 'Stopped';
          lorry.movementStatus = 'Stopped';
          if (!lorry.stoppageDetectedAt) {
            lorry.stoppageDetectedAt = isoNow;
          }

          // Ensure non-duplicate alert
          let alert = this.data.breakdownAlerts.find(
            (b) => b.lorryId === lorry.id && b.status !== 'Resolved'
          );

          if (!alert) {
            alert = {
              id: `STP-${Date.now().toString().slice(-4)}`,
              lorryId: lorry.id,
              lorryNumber: lorry.lorryNumber,
              shipmentId: lorry.currentShipmentId,
              shipmentCode: lorry.currentShipmentCode,
              reportedAt: isoNow,
              severity: 'Medium',
              breakdownType: 'Other',
              description: `Automated Stoppage Detection: Vehicle stationary (0 km/h) for >= ${threshold} minutes at ${lorry.lastTelemetry.locationName}. Unconfirmed stoppage.`,
              location: {
                latitude: lorry.lastTelemetry.latitude,
                longitude: lorry.lastTelemetry.longitude,
                name: lorry.lastTelemetry.locationName,
              },
              workflowStatus: 'Possible Stoppage',
              status: 'Investigating',
              stoppageDetectedAt: lorry.stoppageDetectedAt,
            };
            this.data.breakdownAlerts.unshift(alert);
            detectedCount++;

            this.addNotification(
              `Possible Stoppage: ${lorry.lorryNumber}`,
              `Lorry ${lorry.lorryNumber} stationary for >= ${threshold} mins at ${lorry.lastTelemetry.locationName}. Awaiting driver check.`,
              'warning',
              'ALL',
              '/lorry-gps'
            );
          }
          lorry.activeBreakdown = alert;
        }
      }
    }

    if (detectedCount > 0) {
      this.save();
    }
    return { detectedCount, lorries: this.data.lorries };
  }

  // --- Driver Breakdown Reporting ---
  public reportBreakdown(lorryId: string, alertData: any, user: any): BreakdownAlert {
    return this.reportDriverBreakdown(
      {
        lorryId,
        breakdownType: alertData.breakdownType || 'Mechanical Failure',
        description: alertData.description || 'Reported mechanical breakdown',
        latitude: alertData.latitude,
        longitude: alertData.longitude,
        breakdownTime: alertData.breakdownTime,
        shipmentId: alertData.shipmentId,
      },
      user
    );
  }

  public reportDriverBreakdown(
    data: {
      lorryId: string;
      shipmentId?: string;
      breakdownType: BreakdownType;
      description: string;
      latitude?: number;
      longitude?: number;
      breakdownTime?: string;
    },
    user: any
  ): BreakdownAlert {
    const lorry = this.data.lorries.find((l) => l.id === data.lorryId || l.lorryNumber === data.lorryId);
    if (!lorry) throw new Error('Lorry not found');

    const isoNow = new Date().toISOString();
    const lat = data.latitude !== undefined ? Number(data.latitude) : lorry.lastTelemetry.latitude;
    const lng = data.longitude !== undefined ? Number(data.longitude) : lorry.lastTelemetry.longitude;

    // Check for existing active alert for this lorry (Avoid duplicates)
    let alert = this.data.breakdownAlerts.find(
      (b) => (b.lorryId === lorry.id || b.lorryNumber === lorry.lorryNumber) && b.status !== 'Resolved'
    );

    if (alert) {
      // Transition existing alert
      alert.breakdownType = data.breakdownType;
      alert.description = data.description || alert.description;
      alert.workflowStatus = 'Breakdown Reported';
      alert.status = 'Investigating';
      alert.breakdownTime = data.breakdownTime || isoNow;
      alert.location = {
        latitude: lat,
        longitude: lng,
        name: lorry.lastTelemetry.locationName,
      };
    } else {
      alert = {
        id: `BRK-${Date.now().toString().slice(-4)}`,
        lorryId: lorry.id,
        lorryNumber: lorry.lorryNumber,
        shipmentId: data.shipmentId || lorry.currentShipmentId,
        shipmentCode: lorry.currentShipmentCode,
        reportedAt: isoNow,
        breakdownTime: data.breakdownTime || isoNow,
        severity: 'High',
        breakdownType: data.breakdownType,
        description: data.description || 'Driver reported mechanical issue. Vehicle immobilized.',
        location: {
          latitude: lat,
          longitude: lng,
          name: lorry.lastTelemetry.locationName,
        },
        workflowStatus: 'Breakdown Reported',
        status: 'Active',
      };
      this.data.breakdownAlerts.unshift(alert);
    }

    lorry.status = 'Breakdown';
    lorry.movementStatus = 'Stopped';
    lorry.workflowStatus = 'Breakdown Reported';
    lorry.breakdownType = data.breakdownType;
    lorry.breakdownDescription = data.description;
    lorry.breakdownReportedAt = isoNow;
    lorry.lastTelemetry.speed = 0;
    lorry.lastTelemetry.speed_kmh = 0;
    lorry.lastTelemetry.engineStatus = 'Failure';
    lorry.activeBreakdown = alert;
    lorry.updatedAt = isoNow;

    this.addNotification(
      `Breakdown Reported: ${lorry.lorryNumber}`,
      `Driver reported ${data.breakdownType} for Lorry ${lorry.lorryNumber}: "${data.description}". Dispatch verification required.`,
      'danger',
      'ALL',
      '/lorry-gps'
    );

    this.logAudit(user.id, user.name, user.role, 'DRIVER_REPORT_BREAKDOWN', 'Lorry', lorry.id, {
      breakdownType: data.breakdownType,
      description: data.description,
      lorryNumber: lorry.lorryNumber,
    });

    this.save();
    return alert;
  }

  // --- Confirm Breakdown & ChainPulse AI Ripple Impact Integration ---
  public confirmBreakdown(lorryId: string, user: any): { alert: BreakdownAlert; disruption?: Disruption; recoveryPlan?: RecoveryPlan } {
    const lorry = this.data.lorries.find((l) => l.id === lorryId || l.lorryNumber === lorryId);
    if (!lorry) throw new Error('Lorry not found');

    const isoNow = new Date().toISOString();

    let alert = this.data.breakdownAlerts.find(
      (b) => (b.lorryId === lorry.id || b.lorryNumber === lorry.lorryNumber) && b.status !== 'Resolved'
    );

    if (!alert) {
      alert = {
        id: `BRK-${Date.now().toString().slice(-4)}`,
        lorryId: lorry.id,
        lorryNumber: lorry.lorryNumber,
        shipmentId: lorry.currentShipmentId,
        shipmentCode: lorry.currentShipmentCode,
        reportedAt: isoNow,
        severity: 'Critical',
        breakdownType: lorry.breakdownType || 'Engine Failure',
        description: lorry.breakdownDescription || `Breakdown confirmed for ${lorry.lorryNumber}. Vehicle unable to proceed.`,
        location: {
          latitude: lorry.lastTelemetry.latitude,
          longitude: lorry.lastTelemetry.longitude,
          name: lorry.lastTelemetry.locationName,
        },
        workflowStatus: 'Breakdown Confirmed',
        status: 'Active',
      };
      this.data.breakdownAlerts.unshift(alert);
    } else {
      alert.workflowStatus = 'Breakdown Confirmed';
      alert.status = 'Active';
      alert.severity = 'Critical';
    }

    lorry.status = 'Breakdown';
    lorry.movementStatus = 'Stopped';
    lorry.workflowStatus = 'Breakdown Confirmed';
    lorry.activeBreakdown = alert;
    lorry.lastTelemetry.speed = 0;
    lorry.lastTelemetry.speed_kmh = 0;
    lorry.lastTelemetry.engineStatus = 'Failure';
    lorry.updatedAt = isoNow;

    // --- INTEGRATE WITH CHAINPULSE AI DISRUPTION & RIPPLE ENGINE ---
    let newDisruption: Disruption | undefined;
    let recoveryPlan: RecoveryPlan | undefined;

    const shipment = this.data.shipments.find(
      (s) => s.id === lorry.currentShipmentId || s.shipmentCode === lorry.currentShipmentCode
    );

    if (shipment) {
      // Update shipment delay
      shipment.status = 'Delayed';
      shipment.delayDays = Math.max(shipment.delayDays, 4);
      shipment.updatedAt = isoNow;

      const product = this.getProductById(shipment.productId);
      const whId = shipment.destinationWarehouseId || this.data.warehouses[0]?.id || 'wh-chn';

      // Create linked Disruption
      const disCode = `DIS-BRK-${Date.now().toString().slice(-4)}`;
      const createdDisruption: Disruption = {
        id: `dis-${Date.now()}`,
        disruptionCode: disCode,
        disruptionType: 'Transportation Disruption',
        relatedShipmentId: shipment.id,
        affectedWarehouseId: whId,
        affectedProductId: shipment.productId,
        expectedDelayDays: 4,
        shortageQuantity: shipment.quantity,
        severity: 'Critical',
        description: `Autonomous Breakdown Alert: Lorry ${lorry.lorryNumber} carrying ${shipment.quantity} units of ${product?.name || 'materials'} experienced confirmed ${alert.breakdownType} at ${alert.location.name}. In-transit delivery halted.`,
        reportedDate: isoNow.split('T')[0],
        status: 'Active',
        isDemo: false,
        createdAt: isoNow,
        updatedAt: isoNow,
      };
      this.data.disruptions.unshift(createdDisruption);
      alert.disruptionId = createdDisruption.id;
      newDisruption = createdDisruption;

      // Propose autonomous recovery plan
      const planCode = `REC-BRK-${Date.now().toString().slice(-4)}`;
      const createdPlan: RecoveryPlan = {
        id: `rec-${Date.now()}`,
        planCode,
        disruptionId: createdDisruption.id,
        planType: 'Expedited Shipping',
        proposedByUserId: user.id || 'usr_admin',
        proposedByName: user.name || 'ChainPulse AI Recovery Engine',
        status: 'Pending Approval',
        estimatedCost: 1450,
        estimatedDelayReductionDays: 3,
        ordersRecoveredCount: 1,
        recoveryPercentage: 85,
        feasibilityScore: 92,
        notes: `Dispatch relief tractor-trailer to ${alert.location.name} to cross-dock ${shipment.quantity} units and complete final delivery.`,
        items: [
          {
            id: `item-${Date.now()}-1`,
            recoveryPlanId: `rec-${Date.now()}`,
            itemAction: 'Dispatch Relief Hauler & Cross-Dock Cargo',
            targetEntityId: shipment.id,
            productId: shipment.productId,
            quantity: shipment.quantity,
            cost: 1450,
          },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      };
      this.data.recoveryPlans.unshift(createdPlan);
      recoveryPlan = createdPlan;
    }

    this.addNotification(
      `Breakdown Confirmed: ${lorry.lorryNumber}`,
      `Breakdown confirmed for ${lorry.lorryNumber}. Disruption logged and order risk recalculations initiated across supply chain.`,
      'danger',
      'ALL',
      '/lorry-gps'
    );

    this.logAudit(user.id, user.name, user.role, 'CONFIRM_BREAKDOWN', 'Lorry', lorry.id, {
      alertId: alert.id,
      lorryNumber: lorry.lorryNumber,
      disruptionId: newDisruption?.id,
    });

    this.save();
    return { alert, disruption: newDisruption, recoveryPlan };
  }

  // --- Breakdown Workflow Progression (8 states) ---
  public transitionBreakdownWorkflow(
    lorryId: string,
    targetStatus: BreakdownWorkflowStatus,
    payload?: any,
    user?: any
  ): { lorry: Lorry; alert?: BreakdownAlert } {
    const lorry = this.data.lorries.find((l) => l.id === lorryId || l.lorryNumber === lorryId);
    if (!lorry) throw new Error('Lorry not found');

    const isoNow = new Date().toISOString();
    let alert = this.data.breakdownAlerts.find(
      (b) => (b.lorryId === lorry.id || b.lorryNumber === lorry.lorryNumber) && b.status !== 'Resolved'
    );

    lorry.workflowStatus = targetStatus;
    lorry.updatedAt = isoNow;

    if (alert) {
      alert.workflowStatus = targetStatus;
    }

    switch (targetStatus) {
      case 'Normal':
        lorry.status = 'Moving';
        lorry.movementStatus = 'Moving';
        lorry.lastTelemetry.speed = 60;
        lorry.lastTelemetry.speed_kmh = 60;
        lorry.lastTelemetry.engineStatus = 'Running';
        if (alert) alert.status = 'Resolved';
        delete lorry.activeBreakdown;
        break;

      case 'Possible Stoppage':
        lorry.status = 'Stopped';
        lorry.movementStatus = 'Stopped';
        lorry.lastTelemetry.speed = 0;
        lorry.lastTelemetry.speed_kmh = 0;
        if (alert) alert.status = 'Investigating';
        break;

      case 'Breakdown Reported':
        lorry.status = 'Breakdown';
        lorry.movementStatus = 'Stopped';
        lorry.lastTelemetry.speed = 0;
        lorry.lastTelemetry.speed_kmh = 0;
        lorry.lastTelemetry.engineStatus = 'Failure';
        break;

      case 'Breakdown Confirmed':
        return { lorry: this.confirmBreakdown(lorry.id, user).alert ? lorry : lorry, alert };

      case 'Assistance Requested':
        lorry.status = 'Breakdown';
        if (alert) {
          alert.status = 'Assistance Dispatched';
          alert.dispatchedAssistance = {
            serviceProvider: payload?.serviceProvider || 'Highway Heavy Fleet Roadside Rescue',
            etaMinutes: Number(payload?.etaMinutes) || 25,
            mechanicName: payload?.mechanicName || 'Master Tech Team',
            contactPhone: payload?.contactPhone || '+1 (800) 555-HELP',
          };
        }
        this.addNotification(
          `Assistance Requested: ${lorry.lorryNumber}`,
          `Assistance requested for ${lorry.lorryNumber}. ETA ${alert?.dispatchedAssistance?.etaMinutes || 25} mins.`,
          'info',
          'ALL',
          '/lorry-gps'
        );
        break;

      case 'Repairing':
        lorry.status = 'Breakdown';
        if (alert) {
          alert.status = 'Investigating';
          alert.description = `${alert.description} [REPAIR IN PROGRESS: Technician on-site diagnosing vehicle.]`;
        }
        this.addNotification(
          `Repairing: ${lorry.lorryNumber}`,
          `Technician on-site. Active field repair underway for ${lorry.lorryNumber}.`,
          'info',
          'ALL',
          '/lorry-gps'
        );
        break;

      case 'Recovered':
        lorry.status = 'Recovered';
        lorry.movementStatus = 'Stopped';
        lorry.lastTelemetry.engineStatus = 'Running';
        lorry.lastTelemetry.engineTemp = 86;
        if (alert) {
          alert.status = 'Resolved';
          alert.resolvedAt = isoNow;
          alert.resolutionNotes = payload?.notes || 'Vehicle systems repaired and safety inspection passed.';
        }
        this.addNotification(
          `Lorry Recovered: ${lorry.lorryNumber}`,
          `Mechanical issue resolved for ${lorry.lorryNumber}. Ready to resume transit.`,
          'success',
          'ALL',
          '/lorry-gps'
        );
        break;

      case 'Journey Resumed':
        lorry.status = 'Moving';
        lorry.movementStatus = 'Moving';
        lorry.workflowStatus = 'Normal';
        lorry.lastTelemetry.speed = 64;
        lorry.lastTelemetry.speed_kmh = 64;
        lorry.lastTelemetry.engineStatus = 'Running';
        lorry.lastTelemetry.engineTemp = 88;
        if (alert) {
          alert.status = 'Resolved';
          delete lorry.activeBreakdown;
        }
        this.addNotification(
          `Journey Resumed: ${lorry.lorryNumber}`,
          `Lorry ${lorry.lorryNumber} has resumed transport at 64 km/h en route to destination.`,
          'success',
          'ALL',
          '/lorry-gps'
        );
        break;
    }

    this.logAudit(user?.id || 'sys', user?.name || 'Dispatcher', user?.role || 'Administrator', 'WORKFLOW_TRANSITION', 'Lorry', lorry.id, {
      fromStatus: lorry.workflowStatus,
      targetStatus,
      lorryNumber: lorry.lorryNumber,
    });

    this.save();
    return { lorry, alert };
  }

  public dispatchBreakdownAssistance(
    breakdownId: string,
    dispatchData: {
      serviceProvider: string;
      etaMinutes: number;
      mechanicName: string;
      contactPhone: string;
    },
    user: any
  ): BreakdownAlert {
    const alert = this.data.breakdownAlerts.find((b) => b.id === breakdownId);
    if (!alert) throw new Error('Breakdown alert not found');

    alert.status = 'Assistance Dispatched';
    alert.workflowStatus = 'Assistance Requested';
    alert.dispatchedAssistance = {
      serviceProvider: dispatchData.serviceProvider || 'Roadside Fleet Emergency Response',
      etaMinutes: Number(dispatchData.etaMinutes) || 20,
      mechanicName: dispatchData.mechanicName || 'Field Technician',
      contactPhone: dispatchData.contactPhone || '+1 (800) 555-HELP',
    };

    const lorry = this.data.lorries.find((l) => l.id === alert.lorryId || l.lorryNumber === alert.lorryNumber);
    if (lorry) {
      lorry.workflowStatus = 'Assistance Requested';
      lorry.activeBreakdown = alert;
    }

    this.addNotification(
      `Assistance Dispatched: ${alert.lorryNumber}`,
      `Assistance dispatched for ${alert.lorryNumber}: ETA ${alert.dispatchedAssistance.etaMinutes} mins (${alert.dispatchedAssistance.serviceProvider}).`,
      'info',
      'ALL',
      '/lorry-gps'
    );

    this.logAudit(user.id, user.name, user.role, 'DISPATCH_ASSISTANCE', 'BreakdownAlert', breakdownId, dispatchData);
    this.save();
    return alert;
  }

  public resolveBreakdown(breakdownId: string, notes: string, user: any): BreakdownAlert {
    const alert = this.data.breakdownAlerts.find((b) => b.id === breakdownId);
    if (!alert) throw new Error('Breakdown alert not found');

    const isoNow = new Date().toISOString();
    alert.status = 'Resolved';
    alert.workflowStatus = 'Recovered';
    alert.resolvedAt = isoNow;
    alert.resolutionNotes = notes || 'Field repair completed. Vehicle inspected and cleared for travel.';

    const lorry = this.data.lorries.find((l) => l.id === alert.lorryId || l.lorryNumber === alert.lorryNumber);
    if (lorry) {
      lorry.status = 'Recovered';
      lorry.movementStatus = 'Stopped';
      lorry.workflowStatus = 'Recovered';
      lorry.lastTelemetry.engineStatus = 'Running';
      lorry.lastTelemetry.engineTemp = 86;
      delete lorry.activeBreakdown;
      lorry.updatedAt = isoNow;
    }

    this.addNotification(
      `Breakdown Resolved: ${alert.lorryNumber}`,
      `Lorry ${alert.lorryNumber} breakdown has been resolved. Vehicle restored to operation.`,
      'success',
      'ALL',
      '/lorry-gps'
    );

    this.logAudit(user.id, user.name, user.role, 'RESOLVE_BREAKDOWN', 'BreakdownAlert', breakdownId, { notes });
    this.save();
    return alert;
  }

  public simulateLorryPing(lorryId: string): Lorry {
    const lorry = this.data.lorries.find((l) => l.id === lorryId || l.lorryNumber === lorryId);
    if (!lorry) throw new Error('Lorry not found');

    // If broken down, keep stationary
    if (lorry.status === 'Breakdown' || lorry.workflowStatus === 'Breakdown Confirmed' || lorry.workflowStatus === 'Breakdown Reported') {
      return this.recordLorryTelemetry(lorry.id, {
        speed: 0,
        speed_kmh: 0,
        engineStatus: 'Failure',
        engineTemp: Math.max(95, (lorry.lastTelemetry.engineTemp || 110) - 1),
        locationName: `${lorry.lastTelemetry.locationName} (Awaiting Field Assistance)`,
        isSimulated: true,
        locationSource: 'SIMULATED',
      });
    }

    const speed = lorry.status === 'Stopped' || lorry.movementStatus === 'Stopped' ? 0 : Math.round(58 + Math.random() * 22);
    const deltaLat = ((Math.random() - 0.45) * 0.025);
    const deltaLng = ((Math.random() - 0.45) * 0.025);

    const nextLat = Number((lorry.lastTelemetry.latitude + (speed > 0 ? deltaLat : 0)).toFixed(4));
    const nextLng = Number((lorry.lastTelemetry.longitude + (speed > 0 ? deltaLng : 0)).toFixed(4));

    const updated = this.recordLorryTelemetry(lorry.id, {
      latitude: nextLat,
      longitude: nextLng,
      speed,
      speed_kmh: speed,
      heading: ((lorry.lastTelemetry.heading ?? 90) + Math.floor((Math.random() - 0.5) * 10) + 360) % 360,
      engineStatus: speed > 0 ? 'Running' : 'Idling',
      engineTemp: speed > 0 ? 86 + Math.floor(Math.random() * 8) : 76,
      fuelLevel: Math.max(5, (lorry.lastTelemetry.fuelLevel || 70) - 0.2),
      batteryVoltage: 24.1 + Math.random() * 0.4,
      locationName: lorry.lastTelemetry.locationName,
      isSimulated: true,
      locationSource: 'SIMULATED',
    });

    return updated;
  }

  public getLorryGpsStats(): LorryGPSStats {
    const totalLorries = this.data.lorries.length;
    const movingLorries = this.data.lorries.filter((l) => l.movementStatus === 'Moving').length;
    const stoppedLorries = this.data.lorries.filter((l) => l.movementStatus === 'Stopped' && l.status !== 'Breakdown').length;
    const offlineLorries = this.data.lorries.filter((l) => l.movementStatus === 'Offline').length;
    const possibleStoppages = this.data.lorries.filter((l) => l.workflowStatus === 'Possible Stoppage').length;
    const confirmedBreakdowns = this.data.lorries.filter(
      (l) => l.workflowStatus === 'Breakdown Confirmed' || l.workflowStatus === 'Assistance Requested' || l.workflowStatus === 'Repairing' || l.status === 'Breakdown'
    ).length;

    const nowMs = Date.now();
    let onTimeShipments = 0;
    let atRiskShipments = 0;
    let delayedShipments = 0;

    for (const s of this.data.shipments) {
      if (s.status === 'Delayed') {
        delayedShipments++;
      } else if (s.expectedDeliveryDate) {
        const timeStr = s.expectedDeliveryTime ? `${s.expectedDeliveryDate}T${s.expectedDeliveryTime}:00` : `${s.expectedDeliveryDate}T23:59:59`;
        const targetMs = new Date(timeStr).getTime();
        const hoursDiff = (targetMs - nowMs) / (1000 * 3600);
        if (hoursDiff < 0) {
          delayedShipments++;
        } else if (hoursDiff <= 12) {
          atRiskShipments++;
        } else {
          onTimeShipments++;
        }
      } else {
        onTimeShipments++;
      }
    }

    const recoveredLorries = this.data.lorries.filter(
      (l) => l.status === 'Recovered' || l.workflowStatus === 'Recovered'
    ).length + this.data.breakdownAlerts.filter((b) => b.status === 'Resolved').length;

    return {
      totalLorries,
      movingLorries,
      stoppedLorries,
      offlineLorries,
      possibleStoppages,
      confirmedBreakdowns,
      delayedShipments,
      recoveredLorries,
      onTimeShipments,
      atRiskShipments,
    };
  }

  public getGpsHistory(lorryId?: string): GPSHistoryEntry[] {
    if (lorryId) {
      return this.data.gpsHistory.filter(
        (h) => h.lorry_id === lorryId || h.shipment_id === lorryId
      );
    }
    return this.data.gpsHistory;
  }

  public updateUserProfile(id: string, updates: Partial<UserProfile>, user?: any): UserProfile {
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('User profile not found');

    const old = { ...this.data.profiles[idx] };
    const updated = {
      ...old,
      ...updates,
    };
    this.data.profiles[idx] = updated;

    this.logAudit(
      user?.id || 'usr_admin',
      user?.name || 'Administrator',
      user?.role || 'Administrator',
      'UPDATE_USER_PROFILE',
      'UserProfile',
      id,
      { previous: old, updated }
    );
    this.save();
    return updated;
  }

  public seedExampleShipment(user?: any): { shipment: Shipment; lorry: Lorry } {
    const isoNow = new Date().toISOString();

    let sup = this.data.suppliers[0];
    if (!sup) {
      sup = {
        id: 'sup-chn-01',
        supplierCode: 'SUP-CHN-01',
        name: 'Deccan Precision Tech Components',
        contactPerson: 'K. Ramanathan',
        email: 'logistics@deccanprecision.in',
        phone: '+91 44 2855 0192',
        location: 'Chennai Port Industrial Zone, Chennai, TN, India',
        reliabilityScore: 96,
        status: 'Active',
        createdAt: isoNow,
        updatedAt: isoNow,
      };
      this.data.suppliers.unshift(sup);
    }

    let prod = this.data.products[0];
    if (!prod) {
      prod = {
        id: 'prd-ind-01',
        productCode: 'PRD-MICRO-99',
        name: 'Industrial Microcontroller Assembly',
        category: 'Semiconductors',
        description: 'Automotive and industrial electronic control modules',
        unitCost: 120,
        status: 'Active',
        createdAt: isoNow,
        updatedAt: isoNow,
      };
      this.data.products.unshift(prod);
    }

    // Clean previous test records
    this.data.shipments = this.data.shipments.filter((s) => s.shipmentCode !== 'SHIP-001' && s.id !== 'shp_001');
    this.data.lorries = this.data.lorries.filter((l) => l.lorryNumber !== 'TRUCK-101' && l.id !== 'lor_truck_101');

    const testShipment: Shipment = {
      id: 'shp_001',
      shipmentCode: 'SHIP-001',
      supplierId: sup.id,
      productId: prod.id,
      quantity: 450,
      sourceLocation: 'Chennai Container Freight Station, Chennai, TN, India',
      destinationLocation: 'Bengaluru, Karnataka, India',
      destinationAddress: 'Tech Gateway Logistics Park, 42 Outer Ring Road, Bellandur, Bengaluru, Karnataka, 560103, India',
      destinationLatitude: 12.9716,
      destinationLongitude: 77.5946,
      carrierName: 'Deccan Express Logistics',
      expectedDeliveryDate: '2026-10-30',
      expectedDeliveryTime: '18:00',
      status: 'In Transit',
      trackingReference: 'TRK-SHIP-001-BLR',
      delayDays: 0,
      lorryId: 'TRUCK-101',
      driverName: 'Ravi Kumar',
      driverContactNumber: '+91 98450 12345',
      currentLatitude: 13.0827,
      currentLongitude: 80.2707,
      gpsTrackingEnabled: true,
      isDemo: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };
    this.data.shipments.unshift(testShipment);

    const initialTelemetry: LorryTelemetry = {
      id: `tel_trk101_${Date.now()}`,
      latitude: 13.0827,
      longitude: 80.2707,
      speed: 64,
      speed_kmh: 64,
      heading: 260,
      engineStatus: 'Running',
      engineTemp: 87,
      fuelLevel: 74,
      batteryVoltage: 24.3,
      locationName: 'NH 48 High-Speed Freight Corridor, Sriperumbudur near Chennai, TN, India',
      timestamp: isoNow,
      locationSource: 'GPS_DEVICE',
      movement_status: 'Moving',
      isSimulated: false,
    };

    const testLorry: Lorry = {
      id: 'lor_truck_101',
      lorryNumber: 'TRUCK-101',
      model: 'Tata Prima 5530.S Euro 6',
      capacityTons: 35,
      carrierName: 'Deccan Express Logistics',
      driverName: 'Ravi Kumar',
      driverPhone: '+91 98450 12345',
      driverContactNumber: '+91 98450 12345',
      status: 'Moving',
      movementStatus: 'Moving',
      workflowStatus: 'Normal',
      locationSource: 'GPS_DEVICE',
      currentShipmentId: testShipment.id,
      currentShipmentCode: testShipment.shipmentCode,
      originLocation: 'Chennai Container Freight Station, Chennai, TN, India',
      currentLocationAddress: 'NH 48 High-Speed Freight Corridor, Sriperumbudur near Chennai, TN, India',
      destinationLocation: 'Bengaluru, Karnataka, India',
      destinationAddress: 'Tech Gateway Logistics Park, 42 Outer Ring Road, Bellandur, Bengaluru, Karnataka, 560103, India',
      destinationLatitude: 12.9716,
      destinationLongitude: 77.5946,
      expectedDeliveryDate: '2026-10-30',
      expectedDeliveryTime: '18:00',
      lastTelemetry: initialTelemetry,
      recentWaypoints: [
        { latitude: 13.1001, longitude: 80.2905, timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
        { latitude: 13.0827, longitude: 80.2707, timestamp: isoNow },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    };
    this.data.lorries.unshift(testLorry);

    this.data.gpsHistory.unshift({
      id: `gps_trk101_${Date.now()}`,
      shipment_id: testShipment.id,
      lorry_id: testLorry.lorryNumber,
      driver_name: testLorry.driverName,
      latitude: 13.0827,
      longitude: 80.2707,
      speed_kmh: 64,
      movement_status: 'Moving',
      gps_timestamp: isoNow,
      location_source: 'GPS_DEVICE',
      created_at: isoNow,
    });

    this.logAudit(user?.id || 'sys', user?.name || 'Dispatcher', user?.role || 'Administrator', 'SEED_EXAMPLE_SHIPMENT', 'Shipment', testShipment.id, {
      shipmentCode: 'SHIP-001',
      lorryNumber: 'TRUCK-101',
    });

    this.save();
    return { shipment: testShipment, lorry: testLorry };
  }

  public resetLorryFleet(user: any): Lorry[] {
    this.initDefaultFleet(this.data);
    this.logAudit(user.id, user.name, user.role, 'RESET_LORRY_FLEET', 'Fleet', 'ALL', {});
    this.save();
    return this.data.lorries;
  }
}

export const db = new PersistentDatabase();

