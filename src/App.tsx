import React from 'react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { TopBar } from './components/common/TopBar';
import { Sidebar } from './components/common/Sidebar';
import { VehicleDetailModal } from './components/vehicle/VehicleDetailModal';

// Import all 10 screen components
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

const MainAppContent: React.FC = () => {
  const { currentScreen, selectedVehicleId, setSelectedVehicleId } = useFleet();

  const renderScreen = () => {
    switch (currentScreen) {
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
      default:
        return <StrategicDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto min-w-0 pb-12">
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
    <FleetProvider>
      <MainAppContent />
    </FleetProvider>
  );
}
