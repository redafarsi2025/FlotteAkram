import React from 'react';
import { useFleet } from '../../context/FleetContext';
import { RBAC_MATRIX, ROLES_CONFIG } from '../../data/seedData';
import { ScreenId, PermissionLevel } from '../../types';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Package,
  Wrench,
  AlertTriangle,
  Calculator,
  FileText,
  Truck,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentRole, currentScreen, changeScreen, alerts } = useFleet();

  const activeRoleInfo = ROLES_CONFIG.find((r) => r.id === currentRole);

  const screenConfigs: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badgeCount?: number;
  }[] = [
    {
      id: 'STRATEGIC_DASHBOARD',
      label: 'Strategic Dashboard',
      icon: TrendingUp,
      description: 'Director KPI cards & fleet availability',
    },
    {
      id: 'VARIANCE_DASHBOARD',
      label: 'Variance & Budget',
      icon: BarChart3,
      description: 'Drill-down: fleet → category → vehicle → WO',
    },
    {
      id: 'FLEET_HEALTH_GRID',
      label: 'Fleet Health Grid',
      icon: Activity,
      description: 'Status filter counts & diagnostic snapshots',
    },
    {
      id: 'INVENTORY_DASHBOARD',
      label: 'Inventory Dashboard',
      icon: Package,
      description: 'Stock values & R5 projected shortfalls',
    },
    {
      id: 'WORK_ORDER_QUEUE',
      label: 'Work Order Queue',
      icon: Wrench,
      description: 'Create & approve maintenance interventions',
    },
    {
      id: 'CONFLICT_ALERTS',
      label: 'Conflict Alerts (R4)',
      icon: AlertTriangle,
      description: 'Critical vehicles scheduled for use',
      badgeCount: alerts.filter((a) => a.rule_id === 'R4' && !a.read).length,
    },
    {
      id: 'CAE_BUDGET_PRIORITIZATION',
      label: 'CAE Prioritization',
      icon: Calculator,
      description: 'Ranked repair vs. statistical deferral cost',
    },
    {
      id: 'INCIDENT_REPORTS',
      label: 'Incident Investigation',
      icon: FileText,
      description: 'R6 driver reports & OBD fault linkage',
    },
    {
      id: 'MECHANIC_MOBILE_QUEUE',
      label: 'Mechanic Task Queue',
      icon: Smartphone,
      description: 'Mobile task execution & OBD fault scan',
    },
    {
      id: 'DRIVER_MOBILE_VIEW',
      label: 'Driver Mobile View',
      icon: Truck,
      description: 'Status indicator & instant issue report',
    },
  ];

  const renderPermissionBadge = (perm: PermissionLevel) => {
    switch (perm) {
      case 'full':
        return (
          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-800">
            Full
          </span>
        );
      case 'view':
        return (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-600">
            View
          </span>
        );
      case 'resolve':
        return (
          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-800">
            Resolve
          </span>
        );
      case 'parts_status':
        return (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            Parts
          </span>
        );
      case 'assigned_only':
        return (
          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-800">
            Assigned
          </span>
        );
      case 'submit':
        return (
          <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-800">
            Submit
          </span>
        );
      default:
        return null;
    }
  };

  // Filter screens based on RBAC matrix for currentRole
  const availableScreens = screenConfigs.filter((s) => {
    const perm = RBAC_MATRIX[s.id][currentRole];
    return perm !== 'none';
  });

  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Role Profile Info */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold text-sm shadow-sm ${
              activeRoleInfo?.badgeColor || 'bg-indigo-600'
            }`}
          >
            {activeRoleInfo?.avatar || 'NX'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">
              {activeRoleInfo?.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {activeRoleInfo?.title}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded-md border border-slate-800">
          <span>RBAC Views Allowed:</span>
          <span className="font-bold text-indigo-400">{availableScreens.length}</span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Role-Authorized Views
        </div>
        {availableScreens.map((item) => {
          const perm = RBAC_MATRIX[item.id][currentRole];
          const isSelected = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => changeScreen(item.id)}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition cursor-pointer group ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{item.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {item.badgeCount ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {item.badgeCount}
                  </span>
                ) : null}
                {renderPermissionBadge(perm)}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
          <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
          <span>RBAC Matrix Verified</span>
        </div>
        <p className="leading-tight text-[10px]">
          Left sidebar shows only screens authorized for {activeRoleInfo?.name}.
        </p>
      </div>
    </aside>
  );
};
