import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FleetProvider, useFleet } from './context/FleetContext';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { TopBar } from './components/common/TopBar';
import { Sidebar } from './components/common/Sidebar';
import { VehicleDetailModal } from './components/vehicle/VehicleDetailModal';
import { ScreenId } from './types';

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

const routeToScreenMap: Record<string, ScreenId> = {
  '/': 'LANDING_PAGE',
  '/dashboard': 'STRATEGIC_DASHBOARD',
  '/variance': 'VARIANCE_DASHBOARD',
  '/vehicles': 'FLEET_HEALTH_GRID',
  '/inventory': 'INVENTORY_DASHBOARD',
  '/work-orders': 'WORK_ORDER_QUEUE',
  '/conflicts': 'CONFLICT_ALERTS',
  '/cae': 'CAE_BUDGET_PRIORITIZATION',
  '/incidents': 'INCIDENT_REPORTS',
  '/mechanic': 'MECHANIC_MOBILE_QUEUE',
  '/driver': 'DRIVER_MOBILE_VIEW',
  '/tenant-config': 'TENANT_CONFIG',
  '/translation': 'TRANSLATION_CENTER',
};

const screenToRouteMap: Record<ScreenId, string> = {
  LANDING_PAGE: '/',
  STRATEGIC_DASHBOARD: '/dashboard',
  VARIANCE_DASHBOARD: '/variance',
  FLEET_HEALTH_GRID: '/vehicles',
  INVENTORY_DASHBOARD: '/inventory',
  WORK_ORDER_QUEUE: '/work-orders',
  CONFLICT_ALERTS: '/conflicts',
  CAE_BUDGET_PRIORITIZATION: '/cae',
  INCIDENT_REPORTS: '/incidents',
  MECHANIC_MOBILE_QUEUE: '/mechanic',
  DRIVER_MOBILE_VIEW: '/driver',
  TENANT_CONFIG: '/tenant-config',
  TRANSLATION_CENTER: '/translation',
};

const AppLayout: React.FC = () => {
  const { currentScreen, changeScreen, selectedVehicleId, setSelectedVehicleId } = useFleet();
  const { dir } = useLocalization();
  const location = useLocation();
  const navigate = useNavigate();

  // Synchronize location path with context screen state
  useEffect(() => {
    const matchedScreen = routeToScreenMap[location.pathname];
    if (matchedScreen && matchedScreen !== currentScreen) {
      changeScreen(matchedScreen);
    }
  }, [location.pathname, currentScreen, changeScreen]);

  // Synchronize context screen state with route
  useEffect(() => {
    const matchedRoute = screenToRouteMap[currentScreen];
    if (matchedRoute && matchedRoute !== location.pathname) {
      navigate(matchedRoute);
    }
  }, [currentScreen, navigate, location.pathname]);

  const showNavigation = location.pathname !== '/';

  return (
    <div
      dir={dir}
      className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 transition-all duration-200"
    >
      {showNavigation && <TopBar />}

      <div className="flex flex-1 overflow-hidden">
        {showNavigation && <Sidebar />}

        <main className="flex-1 overflow-y-auto min-w-0 p-4 lg:p-6 pb-12">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<StrategicDashboard />} />
            <Route path="/variance" element={<VarianceDashboard />} />
            <Route path="/vehicles" element={<FleetHealthGrid />} />
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route path="/work-orders" element={<WorkOrderQueue />} />
            <Route path="/conflicts" element={<ConflictAlerts />} />
            <Route path="/cae" element={<CaeBudgetPrioritization />} />
            <Route path="/incidents" element={<IncidentReports />} />
            <Route path="/mechanic" element={<MechanicMobileQueue />} />
            <Route path="/driver" element={<DriverMobileView />} />
            <Route path="/tenant-config" element={<TenantConfig />} />
            <Route path="/translation" element={<TranslationCenter />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
    <BrowserRouter>
      <LocalizationProvider>
        <FleetProvider>
          <AppLayout />
        </FleetProvider>
      </LocalizationProvider>
    </BrowserRouter>
  );
}
