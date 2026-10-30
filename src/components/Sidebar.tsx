import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Building2,
  Package,
  Warehouse,
  Boxes,
  Truck,
  ShoppingCart,
  AlertOctagon,
  GitBranch,
  ShieldAlert,
  Cpu,
  FileCheck,
  CheckSquare,
  Bell,
  BarChart3,
  UploadCloud,
  FileText,
  Users,
  Settings,
  ChevronRight,
  Navigation,
  LocateFixed,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  pendingApprovalsCount?: number;
  activeDisruptionsCount?: number;
}

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
    highlight?: boolean;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  pendingApprovalsCount = 0,
  activeDisruptionsCount = 0,
}) => {
  const sections: NavSection[] = [
    {
      title: 'CORE & MONITORING',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'lorry-gps',
          label: 'GPS Tracking',
          icon: LocateFixed,
          badge: 'Live GPS',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        },
        {
          id: 'disruptions',
          label: 'Disruption Monitoring',
          icon: AlertOctagon,
          badge: activeDisruptionsCount > 0 ? activeDisruptionsCount : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
        },
        { id: 'ripple-impact', label: 'Ripple Impact Analysis', icon: GitBranch },
        { id: 'risk-analysis', label: 'Risk Analysis', icon: ShieldAlert },
      ],
    },
    {
      title: 'DATA INPUT & OPERATIONS',
      items: [
        {
          id: 'add-data',
          label: 'Add New Data',
          icon: PlusCircle,
          highlight: true,
          badge: 'Mandatory',
          badgeColor: 'bg-blue-500 text-white font-bold',
        },
        { id: 'suppliers', label: 'Suppliers', icon: Building2 },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'shipments', label: 'Shipments', icon: Truck },
        { id: 'orders', label: 'Customer Orders', icon: ShoppingCart },
      ],
    },
    {
      title: 'DECISION & RECOVERY',
      items: [
        { id: 'recovery-simulator', label: 'Recovery Simulator', icon: Cpu },
        { id: 'recovery-plans', label: 'Recovery Plans', icon: FileCheck },
        {
          id: 'approvals',
          label: 'Approvals',
          icon: CheckSquare,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        },
      ],
    },
    {
      title: 'SYSTEM & TOOLS',
      items: [
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'data-import', label: 'Data Import (CSV/JSON)', icon: UploadCloud },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
        { id: 'user-management', label: 'User Management', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 select-none overflow-y-auto">
      <div className="py-4 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              {section.title}
            </p>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                        : item.highlight
                        ? 'bg-blue-950/50 hover:bg-blue-900/40 text-blue-300 border border-blue-800/40'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive
                            ? 'text-white'
                            : item.highlight
                            ? 'text-blue-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            item.badgeColor || 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-auto p-4 border-t border-slate-800 text-[11px] text-slate-500 bg-slate-950/40">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-400">Database Engine</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Persistent
          </span>
        </div>
        <p className="text-[10px] text-slate-500">PostgreSQL Schema & ACID Engine</p>
      </div>
    </aside>
  );
};
