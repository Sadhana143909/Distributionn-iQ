import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AICopilotModal } from './components/AICopilotModal';
import { DashboardView } from './components/views/DashboardView';
import { AddNewDataView } from './components/views/AddNewDataView';
import { SuppliersView } from './components/views/SuppliersView';
import { ProductsView } from './components/views/ProductsView';
import { WarehousesView } from './components/views/WarehousesView';
import { InventoryView } from './components/views/InventoryView';
import { ShipmentsView } from './components/views/ShipmentsView';
import { OrdersView } from './components/views/OrdersView';
import { DisruptionsView } from './components/views/DisruptionsView';
import { RippleImpactView } from './components/views/RippleImpactView';
import { RiskAnalysisView } from './components/views/RiskAnalysisView';
import { RecoverySimulatorView } from './components/views/RecoverySimulatorView';
import { RecoveryPlansView } from './components/views/RecoveryPlansView';
import { ApprovalsView } from './components/views/ApprovalsView';
import { NotificationsView } from './components/views/NotificationsView';
import { ReportsAnalyticsView } from './components/views/ReportsAnalyticsView';
import { DataImportView } from './components/views/DataImportView';
import { AuditLogsView } from './components/views/AuditLogsView';
import { UserManagementView } from './components/views/UserManagementView';
import { SettingsView } from './components/views/SettingsView';
import { LorryGpsTrackingView } from './components/views/LorryGpsTrackingView';
import { api } from './api';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [activeDisruptionsCount, setActiveDisruptionsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    loadTelemetryCounts();
    const interval = setInterval(loadTelemetryCounts, 20000);
    return () => clearInterval(interval);
  }, []);

  const loadTelemetryCounts = async () => {
    try {
      const kpis = await api.getDashboardKpis();
      setActiveDisruptionsCount(kpis.activeDisruptions || 0);
      setPendingApprovalsCount(kpis.pendingApprovals || 0);
    } catch (err) {
      console.error('Failed to update telemetry counts:', err);
    }
  };

  const handleNavigate = (viewId: string) => {
    setCurrentView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadTelemetryCounts();
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={handleNavigate}
            onOpenAssistant={() => setIsCopilotOpen(true)}
          />
        );
      case 'lorry-gps':
        return <LorryGpsTrackingView onNavigate={handleNavigate} />;
      case 'add-data':
        return <AddNewDataView onNavigate={handleNavigate} />;
      case 'suppliers':
        return <SuppliersView onNavigate={handleNavigate} />;
      case 'products':
        return <ProductsView onNavigate={handleNavigate} />;
      case 'warehouses':
        return <WarehousesView onNavigate={handleNavigate} />;
      case 'inventory':
        return <InventoryView onNavigate={handleNavigate} />;
      case 'shipments':
        return <ShipmentsView onNavigate={handleNavigate} />;
      case 'orders':
        return <OrdersView onNavigate={handleNavigate} />;
      case 'disruptions':
        return <DisruptionsView onNavigate={handleNavigate} />;
      case 'ripple-impact':
        return <RippleImpactView onNavigate={handleNavigate} />;
      case 'risk-analysis':
        return <RiskAnalysisView onNavigate={handleNavigate} />;
      case 'recovery-simulator':
        return <RecoverySimulatorView onNavigate={handleNavigate} />;
      case 'recovery-plans':
        return <RecoveryPlansView onNavigate={handleNavigate} />;
      case 'approvals':
        return <ApprovalsView onNavigate={handleNavigate} />;
      case 'notifications':
        return <NotificationsView onNavigate={handleNavigate} />;
      case 'reports':
        return <ReportsAnalyticsView onNavigate={handleNavigate} />;
      case 'data-import':
        return <DataImportView onNavigate={handleNavigate} />;
      case 'audit-logs':
        return <AuditLogsView onNavigate={handleNavigate} />;
      case 'user-management':
        return <UserManagementView onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsView onNavigate={handleNavigate} />;
      default:
        return (
          <DashboardView
            onNavigate={handleNavigate}
            onOpenAssistant={() => setIsCopilotOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        onNavigate={handleNavigate}
        onOpenAssistant={() => setIsCopilotOpen(true)}
        activeDisruptionCount={activeDisruptionsCount}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Enterprise Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          pendingApprovalsCount={pendingApprovalsCount}
          activeDisruptionsCount={activeDisruptionsCount}
        />

        {/* Dynamic Content Main View */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950/95">
          <div className="max-w-7xl mx-auto">{renderCurrentView()}</div>
        </main>
      </div>

      {/* Interactive AI Copilot Modal */}
      <AICopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
