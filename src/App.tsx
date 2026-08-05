import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FleetProvider, useFleet } from './context/FleetContext';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { TopBar } from './components/common/TopBar';
import { Sidebar } from './components/common/Sidebar';
import { VehicleDetailModal } from './components/vehicle/VehicleDetailModal';
import { routeToScreenMap } from './routes/routeMap';

// LandingPage loaded statically as default route
import { LandingPage } from './components/screens/LandingPage';

// Lazy loaded screen components for route-based bundle splitting
const StrategicDashboard = lazy(() => import('./components/screens/StrategicDashboard').then(m => ({ default: m.StrategicDashboard })));
const VarianceDashboard = lazy(() => import('./components/screens/VarianceDashboard').then(m => ({ default: m.VarianceDashboard })));
const FleetHealthGrid = lazy(() => import('./components/screens/FleetHealthGrid').then(m => ({ default: m.FleetHealthGrid })));
const InventoryDashboard = lazy(() => import('./components/screens/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const WorkOrderQueue = lazy(() => import('./components/screens/WorkOrderQueue').then(m => ({ default: m.WorkOrderQueue })));
const ConflictAlerts = lazy(() => import('./components/screens/ConflictAlerts').then(m => ({ default: m.ConflictAlerts })));
const CaeBudgetPrioritization = lazy(() => import('./components/screens/CaeBudgetPrioritization').then(m => ({ default: m.CaeBudgetPrioritization })));
const IncidentReports = lazy(() => import('./components/screens/IncidentReports').then(m => ({ default: m.IncidentReports })));
const MechanicMobileQueue = lazy(() => import('./components/screens/MechanicMobileQueue').then(m => ({ default: m.MechanicMobileQueue })));
const DriverMobileView = lazy(() => import('./components/screens/DriverMobileView').then(m => ({ default: m.DriverMobileView })));
const TenantConfig = lazy(() => import('./components/screens/TenantConfig').then(m => ({ default: m.TenantConfig })));
const TranslationCenter = lazy(() => import('./components/screens/TranslationCenter').then(m => ({ default: m.TranslationCenter })));
const SafetyPerformance = lazy(() => import('./components/screens/SafetyPerformance').then(m => ({ default: m.SafetyPerformance })));
const FuelModule = lazy(() => import('./components/screens/FuelModule').then(m => ({ default: m.FuelModule })));
const TelemetryStream = lazy(() => import('./components/screens/TelemetryStream').then(m => ({ default: m.TelemetryStream })));
const AuditLog = lazy(() => import('./components/screens/AuditLog').then(m => ({ default: m.AuditLog })));
const InvitationsScreen = lazy(() => import('./components/screens/InvitationsScreen').then(m => ({ default: m.InvitationsScreen })));
const BillingScreen = lazy(() => import('./components/screens/BillingScreen').then(m => ({ default: m.BillingScreen })));
const ForbiddenScreen = lazy(() => import('./components/screens/ForbiddenScreen').then(m => ({ default: m.ForbiddenScreen })));

const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full w-full py-24">
    <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
  </div>
);

const AppLayout: React.FC = () => {
  const { currentScreen, changeScreen, selectedVehicleId, setSelectedVehicleId } = useFleet();
  const { dir } = useLocalization();
  const location = useLocation();

  // Synchronize location path with context screen state ONCE when location changes
  useEffect(() => {
    const matchedScreen = routeToScreenMap[location.pathname];
    if (matchedScreen && matchedScreen !== currentScreen) {
      changeScreen(matchedScreen, false);
    }
  }, [location.pathname, currentScreen, changeScreen]);

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
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/safety" element={<SafetyPerformance />} />
              <Route path="/fuel" element={<FuelModule />} />
              <Route path="/telemetry" element={<TelemetryStream />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/invitations" element={<InvitationsScreen />} />
              <Route path="/billing" element={<BillingScreen />} />
              <Route path="/forbidden" element={<ForbiddenScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
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
