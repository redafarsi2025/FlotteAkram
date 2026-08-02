import React from 'react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { TopBar } from './components/common/TopBar';
import { Sidebar } from './components/common/Sidebar';
import { VehicleDetailModal } from './components/vehicle/VehicleDetailModal';

// Import all 12 screen components
import { LandingPage } from './components/screens/LandingPage';
import { StrategicDashboard } from './components/screens/StrategicDashboard';
import { VarianceDashboard } from './components/screens/VarianceDashboard';
import { FleetHealthGrid } from './components/screens/FleetHealthGrid';
import { InventoryDashboard } from './components/screens/InventoryDashboard';
import { WorkOrderQueue } from './components/screens/WorkOrderQueue';
import { ConflictAlerts } from './components/screens/ConflictAlerts';
import { CaeBudgetPrioritization } from './components/screens/CaeBudgetPrioritization';
import { IncidentReports } from './components/screens/IncidentReports';
import { MechanicMobileQueue } from './components/screens/MechanicMobileQueue';
import { DriverMobileView } from './components/screens/DriverMobileView';
import { TenantConfig } from './components/screens/TenantConfig';
import { TranslationCenter } from './components/screens/TranslationCenter';

const MainAppContent: React.FC = () => {
  const { currentScreen, selectedVehicleId, setSelectedVehicleId } = useFleet();
  const { dir } = useLocalization();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'LANDING_PAGE':
        return <LandingPage />;
      case 'STRATEGIC_DASHBOARD':
        return <StrategicDashboard />;
      case 'VARIANCE_DASHBOARD':
        return <VarianceDashboard />;
      case 'FLEET_HEALTH_GRID':
        return <FleetHealthGrid />;
      case 'INVENTORY_DASHBOARD':
        return <InventoryDashboard />;
      case 'WORK_ORDER_QUEUE':
        return <WorkOrderQueue />;
      case 'CONFLICT_ALERTS':
        return <ConflictAlerts />;
      case 'CAE_BUDGET_PRIORITIZATION':
        return <CaeBudgetPrioritization />;
      case 'INCIDENT_REPORTS':
        return <IncidentReports />;
      case 'MECHANIC_MOBILE_QUEUE':
        return <MechanicMobileQueue />;
      case 'DRIVER_MOBILE_VIEW':
        return <DriverMobileView />;
      case 'TENANT_CONFIG':
        return <TenantConfig />;
      case 'TRANSLATION_CENTER':
        return <TranslationCenter />;
      default:
        return <StrategicDashboard />;
    }
  };

  return (
    <div
      dir={dir}
      className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 transition-all duration-200"
    >
      {currentScreen !== 'LANDING_PAGE' && <TopBar />}

      <div className="flex flex-1 overflow-hidden">
        {currentScreen !== 'LANDING_PAGE' && <Sidebar />}

        <main className="flex-1 overflow-y-auto min-w-0 p-4 lg:p-6 pb-12">
          {renderScreen()}
        </main>
      </div>

      {selectedVehicleId && (
        <VehicleDetailModal
          vehicleId={selectedVehicleId}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <LocalizationProvider>
      <FleetProvider>
        <MainAppContent />
      </FleetProvider>
    </LocalizationProvider>
  );
}
