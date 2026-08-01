import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  Role,
  ScreenId,
  Vehicle,
  InventoryItem,
  WorkOrder,
  Incident,
  CostRecord,
  FleetAlert,
  CAEItem,
  VehicleClassification,
  TenantConfig,
} from '../types';
import {
  INITIAL_VEHICLES,
  INITIAL_INVENTORY,
  INITIAL_WORK_ORDERS,
  INITIAL_INCIDENTS,
  INITIAL_COST_RECORDS,
  INITIAL_ALERTS,
  INITIAL_TENANT_CONFIGS,
  RBAC_MATRIX,
  ROLES_CONFIG,
} from '../data/seedData';

interface FleetContextType {
  currentRole: Role;
  currentScreen: ScreenId;
  vehicles: Vehicle[];
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  incidents: Incident[];
  costRecords: CostRecord[];
  alerts: FleetAlert[];
  caeAvailableBudget: number;
  caeDelayMultipliers: Record<VehicleClassification, number>;
  selectedVehicleId: string | null;
  isRoleSelectorOpen: boolean;
  goldenPathAStatus: { active: boolean; currentStep: number };
  goldenPathBStatus: { active: boolean; currentStep: number };

  // Tenant Configuration State & Actions
  tenantConfigs: TenantConfig[];
  activeTenantId: string;
  activeTenant: TenantConfig;
  updateTenantConfig: (id: string, updated: Partial<TenantConfig>) => void;
  setActiveTenantId: (id: string) => void;
  addTenantConfig: (newTenant: Omit<TenantConfig, 'id' | 'lastUpdated'>) => string;

  // Actions
  changeRole: (role: Role) => void;
  changeScreen: (screen: ScreenId) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setIsRoleSelectorOpen: (open: boolean) => void;
  setCaeAvailableBudget: (amount: number) => void;
  updateCaeDelayMultiplier: (classification: VehicleClassification, mult: number) => void;
  
  // Rule triggers & updates
  logOBDFault: (
    vehicleId: string,
    fault: {
      code: string;
      name: string;
      severity: 'Critical' | 'Warning' | 'Info';
      required_part_id?: string;
      required_intervention: string;
    }
  ) => void;
  createWorkOrder: (order: {
    vehicle_id: string;
    type: WorkOrder['type'];
    parts_used: { part_id: string; name: string; quantity: number; unit_cost: number }[];
    labor_hours: number;
    hourly_rate: number;
    before_notes: string;
    assigned_mechanic_id: string;
    assigned_mechanic_name: string;
    related_fault_code?: string;
  }) => void;
  closeWorkOrder: (orderId: string, afterNotes: string) => void;
  submitDriverIncident: (
    vehicleId: string,
    category: Incident['category'],
    description: string,
    reportedBy?: string
  ) => void;
  resolveConflict: (vehicleId: string, action: 'assign_alternate' | 'expedite' | 'defer', notes: string) => void;
  markAlertRead: (alertId: string) => void;
  resetSeedData: () => void;
  
  // Golden path demo handlers
  triggerGoldenPathAStep: (step: number) => void;
  triggerGoldenPathBStep: (step: number) => void;

  // Computed data
  caeItems: CAEItem[];
  projectedShortfallParts: {
    part: InventoryItem;
    projectedDemand: number;
    shortfallUnits: number;
    shortfallDays: number;
    affectedVehicles: string[];
  }[];
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<Role>('DIRECTOR');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('STRATEGIC_DASHBOARD');
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = useState<boolean>(true); // Open on first load per prompt
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => INITIAL_VEHICLES);
  const [inventory, setInventory] = useState<InventoryItem[]>(() => INITIAL_INVENTORY);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => INITIAL_WORK_ORDERS);
  const [incidents, setIncidents] = useState<Incident[]>(() => INITIAL_INCIDENTS);
  const [costRecords, setCostRecords] = useState<CostRecord[]>(() => INITIAL_COST_RECORDS);
  const [alerts, setAlerts] = useState<FleetAlert[]>(() => INITIAL_ALERTS);

  const [caeAvailableBudget, setCaeAvailableBudget] = useState<number>(5500);
  const [caeDelayMultipliers, setCaeDelayMultipliers] = useState<Record<VehicleClassification, number>>({
    Keystone: 2.2,
    Standard: 1.4,
  });

  // Tenant Configuration State with LocalStorage Persistence
  const [tenantConfigs, setTenantConfigs] = useState<TenantConfig[]>(() => {
    try {
      const stored = localStorage.getItem('nexttransit_tenant_configs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load tenant configs from localStorage', e);
    }
    return INITIAL_TENANT_CONFIGS;
  });

  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('nexttransit_active_tenant_id');
      if (stored) return stored;
    } catch (e) {
      console.warn('Failed to load active tenant ID', e);
    }
    return 'TNT-NEXTR-001';
  });

  // Sync tenant configs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexttransit_tenant_configs', JSON.stringify(tenantConfigs));
    } catch (e) {
      console.warn('Failed to persist tenant configs', e);
    }
  }, [tenantConfigs]);

  useEffect(() => {
    try {
      localStorage.setItem('nexttransit_active_tenant_id', activeTenantId);
    } catch (e) {
      console.warn('Failed to persist active tenant ID', e);
    }
  }, [activeTenantId]);

  // Derived Active Tenant
  const activeTenant = useMemo(() => {
    const found = tenantConfigs.find((t) => t.id === activeTenantId) || tenantConfigs[0] || INITIAL_TENANT_CONFIGS[0];
    
    // If autoSyncMoneyUsed is enabled, derive moneyUsed from costRecords sum
    if (found.autoSyncMoneyUsed && costRecords.length > 0) {
      const totalCost = costRecords.reduce((sum, c) => sum + c.amount, 0);
      return {
        ...found,
        moneyUsed: totalCost,
      };
    }
    return found;
  }, [tenantConfigs, activeTenantId, costRecords]);

  const updateTenantConfig = (id: string, updated: Partial<TenantConfig>) => {
    setTenantConfigs((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...updated,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          : t
      )
    );
  };

  const setActiveTenantId = (id: string) => {
    if (tenantConfigs.some((t) => t.id === id)) {
      setActiveTenantIdState(id);
    }
  };

  const addTenantConfig = (newTenant: Omit<TenantConfig, 'id' | 'lastUpdated'>): string => {
    const newId = `TNT-${Date.now().toString().slice(-6)}`;
    const fullTenant: TenantConfig = {
      ...newTenant,
      id: newId,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setTenantConfigs((prev) => [...prev, fullTenant]);
    setActiveTenantIdState(newId);
    return newId;
  };

  const [goldenPathAStatus, setGoldenPathAStatus] = useState({ active: false, currentStep: 0 });
  const [goldenPathBStatus, setGoldenPathBStatus] = useState({ active: false, currentStep: 0 });

  // When switching roles, ensure current screen is accessible by new role
  const changeRole = (newRole: Role) => {
    setCurrentRole(newRole);
    setIsRoleSelectorOpen(false);
    const availableScreens = Object.entries(RBAC_MATRIX)
      .filter(([_, perms]) => perms[newRole] !== 'none')
      .map(([id]) => id as ScreenId);

    if (!availableScreens.includes(currentScreen) && availableScreens.length > 0) {
      setCurrentScreen(availableScreens[0]);
    }
  };

  const changeScreen = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  const updateCaeDelayMultiplier = (classification: VehicleClassification, mult: number) => {
    setCaeDelayMultipliers((prev) => ({ ...prev, [classification]: mult }));
  };

  // Reset to initial clean seed data
  const resetSeedData = () => {
    setVehicles(INITIAL_VEHICLES);
    setInventory(INITIAL_INVENTORY);
    setWorkOrders(INITIAL_WORK_ORDERS);
    setIncidents(INITIAL_INCIDENTS);
    setCostRecords(INITIAL_COST_RECORDS);
    setAlerts(INITIAL_ALERTS);
    setTenantConfigs(INITIAL_TENANT_CONFIGS);
    setActiveTenantIdState('TNT-NEXTR-001');
    try {
      localStorage.removeItem('nexttransit_tenant_configs');
      localStorage.removeItem('nexttransit_active_tenant_id');
    } catch (e) {}
    setCaeAvailableBudget(5500);
    setCaeDelayMultipliers({ Keystone: 2.2, Standard: 1.4 });
    setGoldenPathAStatus({ active: false, currentStep: 0 });
    setGoldenPathBStatus({ active: false, currentStep: 0 });
  };

  // Helper to add new alerts
  const addAlert = (newAlert: Omit<FleetAlert, 'id' | 'timestamp' | 'read'>) => {
    const alertObj: FleetAlert = {
      ...newAlert,
      id: `ALT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      read: false,
    };
    setAlerts((prev) => [alertObj, ...prev]);
  };

  // Rule R1, R3, R4 Implementation: Log an OBD Fault
  const logOBDFault = (
    vehicleId: string,
    fault: {
      code: string;
      name: string;
      severity: 'Critical' | 'Warning' | 'Info';
      required_part_id?: string;
      required_intervention: string;
    }
  ) => {
    setVehicles((prevVehicles) =>
      prevVehicles.map((v) => {
        if (v.id !== vehicleId) return v;

        const updatedFaults = [
          ...v.active_fault_codes,
          {
            ...fault,
            logged_date: new Date().toISOString().split('T')[0],
          },
        ];

        const newStatus =
          fault.severity === 'Critical' ? 'Critical' : fault.severity === 'Warning' ? 'Attention' : v.status;
        const newReason = `Active ${fault.severity.toLowerCase()} fault code ${fault.code} (${fault.name}), logged just now`;

        // Check R3 Parts Linkage
        let partInfo = 'No specific part required.';
        let partObj: InventoryItem | undefined;
        if (fault.required_part_id) {
          partObj = inventory.find((item) => item.id === fault.required_part_id);
          if (partObj) {
            const isLow = partObj.quantity <= partObj.reorder_threshold;
            partInfo = `Linked Part [${partObj.name}]: Stock ${partObj.quantity} units ${
              isLow ? `(⚠️ LOW STOCK - threshold ${partObj.reorder_threshold})` : ''
            }`;
          }
        }

        // R1 + R3 Alert
        addAlert({
          rule_id: 'R3',
          title: `R1+R3 Alert: ${fault.severity} Fault Logged on ${v.plate}`,
          description: `Vehicle ${v.name} reported fault ${fault.code}. ${partInfo}`,
          severity: fault.severity === 'Critical' ? 'critical' : 'warning',
          vehicle_id: v.id,
          part_id: fault.required_part_id,
        });

        // R4 Conflict Detection check
        if ((newStatus === 'Critical' || newStatus === 'Attention') && v.scheduled_use_days <= 7) {
          addAlert({
            rule_id: 'R4',
            title: `R4 Conflict Detection: ${v.plate} Scheduled in ${v.scheduled_use_days} Days`,
            description: `Vehicle ${v.name} is ${newStatus.toUpperCase()} (${fault.code}) but scheduled for departure on ${v.scheduled_route || 'Route #100'}. Action required by Fleet Manager.`,
            severity: 'critical',
            vehicle_id: v.id,
          });
        }

        return {
          ...v,
          status: newStatus,
          status_reason: newReason,
          active_fault_codes: updatedFaults,
        };
      })
    );
  };

  // Rule R6: Submit Driver Incident / Investigation Report
  const submitDriverIncident = (
    vehicleId: string,
    category: Incident['category'],
    description: string,
    reportedBy: string = 'Mohamed Farsi (Driver)'
  ) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    // Check if matching fault exists
    const hasMatchingFault = vehicle.active_fault_codes.some(
      (f) =>
        f.name.toLowerCase().includes(category.toLowerCase()) ||
        description.toLowerCase().includes(f.name.toLowerCase())
    );

    const newIncident: Incident = {
      id: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
      vehicle_id: vehicleId,
      vehicle_plate: vehicle.plate,
      reported_by: reportedBy,
      category,
      description,
      matched_to_fault: hasMatchingFault,
      status: 'Investigation',
      created_date: new Date().toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    };

    setIncidents((prev) => [newIncident, ...prev]);

    // R6 Alert: No matching fault -> Investigation alert for Technical Controller + Fleet Manager
    if (!hasMatchingFault) {
      addAlert({
        rule_id: 'R6',
        title: `R6 Investigation Required: ${vehicle.plate}`,
        description: `Driver ${reportedBy} reported "${category}" issue ("${description.slice(
          0,
          60
        )}...") with NO matching OBD fault code. Technical Controller / Mechanic check needed.`,
        severity: 'warning',
        vehicle_id: vehicleId,
      });
    }
  };

  // Create Work Order
  const createWorkOrder = (order: {
    vehicle_id: string;
    type: WorkOrder['type'];
    parts_used: { part_id: string; name: string; quantity: number; unit_cost: number }[];
    labor_hours: number;
    hourly_rate: number;
    before_notes: string;
    assigned_mechanic_id: string;
    assigned_mechanic_name: string;
    related_fault_code?: string;
  }) => {
    const vehicle = vehicles.find((v) => v.id === order.vehicle_id);
    if (!vehicle) return;

    const laborCost = order.labor_hours * order.hourly_rate;
    const newWorkOrder: WorkOrder = {
      id: `WO-${Math.floor(4100 + Math.random() * 900)}`,
      vehicle_id: order.vehicle_id,
      vehicle_plate: vehicle.plate,
      type: order.type,
      status: 'Open',
      labor_cost: laborCost,
      parts_used: order.parts_used,
      labor_hours: order.labor_hours,
      hourly_rate: order.hourly_rate,
      before_after_notes: {
        before: order.before_notes,
        after: 'Pending repair completion.',
      },
      created_date: new Date().toISOString().split('T')[0],
      assigned_mechanic_id: order.assigned_mechanic_id,
      assigned_mechanic_name: order.assigned_mechanic_name,
      related_fault_code: order.related_fault_code,
    };

    setWorkOrders((prev) => [newWorkOrder, ...prev]);

    addAlert({
      rule_id: 'R1',
      title: `Work Order Created: ${newWorkOrder.id}`,
      description: `Technical Controller created Work Order for ${vehicle.plate} (${order.type}). Assigned to ${order.assigned_mechanic_name}.`,
      severity: 'info',
      vehicle_id: vehicle.id,
    });
  };

  // Close Work Order -> Deducts Inventory, Updates Vehicle Status & Cost Records
  const closeWorkOrder = (orderId: string, afterNotes: string) => {
    const targetOrder = workOrders.find((w) => w.id === orderId);
    if (!targetOrder || targetOrder.status === 'Closed') return;

    // 1. Update Work Order
    setWorkOrders((prev) =>
      prev.map((w) =>
        w.id === orderId
          ? {
              ...w,
              status: 'Closed',
              closed_date: new Date().toISOString().split('T')[0],
              before_after_notes: {
                ...w.before_after_notes,
                after: afterNotes || 'Work completed successfully and tested.',
              },
            }
          : w
      )
    );

    // 2. Consume inventory parts
    if (targetOrder.parts_used.length > 0) {
      setInventory((prevInv) =>
        prevInv.map((item) => {
          const used = targetOrder.parts_used.find((p) => p.part_id === item.id);
          if (!used) return item;
          const newQty = Math.max(0, item.quantity - used.quantity);

          if (newQty <= item.reorder_threshold) {
            addAlert({
              rule_id: 'R3',
              title: `R3 Inventory Alert: Low Stock for ${item.name}`,
              description: `Stock for ${item.sku} dropped to ${newQty} unit(s) after Work Order ${orderId} (Reorder Threshold: ${item.reorder_threshold}).`,
              severity: 'warning',
              part_id: item.id,
            });
          }
          return { ...item, quantity: newQty };
        })
      );
    }

    // 3. Update Vehicle status to Healthy if fault was repaired
    setVehicles((prevVehicles) =>
      prevVehicles.map((v) => {
        if (v.id !== targetOrder.vehicle_id) return v;

        const remainingFaults = v.active_fault_codes.filter((f) => f.code !== targetOrder.related_fault_code);
        const hasCritical = remainingFaults.some((f) => f.severity === 'Critical');
        const hasWarning = remainingFaults.some((f) => f.severity === 'Warning');
        const newStatus = hasCritical ? 'Critical' : hasWarning ? 'Attention' : 'Healthy';
        const newReason =
          newStatus === 'Healthy'
            ? `All faults cleared via Work Order ${orderId} (${new Date().toLocaleDateString()})`
            : `Remaining ${remainingFaults.length} active fault(s)`;

        const partsCost = targetOrder.parts_used.reduce((sum, p) => sum + p.quantity * p.unit_cost, 0);

        return {
          ...v,
          status: newStatus,
          status_reason: newReason,
          active_fault_codes: remainingFaults,
          maintenance_history: [
            {
              id: `MH-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: targetOrder.type === 'Corrective' ? 'Corrective' : 'Preventive',
              summary: `Completed ${targetOrder.type}: ${targetOrder.id} - ${afterNotes}`,
              work_order_id: targetOrder.id,
              labor_cost: targetOrder.labor_cost,
              parts_cost: partsCost,
              total_cost: targetOrder.labor_cost + partsCost,
            },
            ...v.maintenance_history,
          ],
        };
      })
    );

    // 4. Record new CostRecord for Variance tracking
    const totalPartsCost = targetOrder.parts_used.reduce((sum, p) => sum + p.quantity * p.unit_cost, 0);
    const newCostRecord: CostRecord = {
      id: `CR-${Date.now()}`,
      vehicle_id: targetOrder.vehicle_id,
      vehicle_plate: targetOrder.vehicle_plate,
      category: targetOrder.type === 'Corrective' ? 'Corrective Repair' : 'Preventive Maintenance',
      amount: targetOrder.labor_cost + totalPartsCost,
      budget_for_category: 15000,
      period: 'Q3 2026',
      work_order_id: targetOrder.id,
      related_fault_code: targetOrder.related_fault_code,
    };
    setCostRecords((prev) => [newCostRecord, ...prev]);

    addAlert({
      rule_id: 'R1',
      title: `Work Order Completed: ${orderId}`,
      description: `Mechanic completed repair on ${targetOrder.vehicle_plate}. Vehicle health restored and inventory updated.`,
      severity: 'info',
      vehicle_id: targetOrder.vehicle_id,
    });
  };

  // R4 Conflict Resolution by Fleet Manager
  const resolveConflict = (
    vehicleId: string,
    action: 'assign_alternate' | 'expedite' | 'defer',
    notes: string
  ) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    if (action === 'assign_alternate') {
      // Reassign route to a healthy vehicle
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                scheduled_use_days: 30, // Route covered
                status_reason: `${v.status_reason} — [Resolved by Fleet Manager: Reassigned Route to backup coach]`,
              }
            : v
        )
      );
      addAlert({
        rule_id: 'R4',
        title: `Conflict Resolved: ${vehicle.plate}`,
        description: `Fleet Manager reassigned route for ${vehicle.plate}. Notes: ${notes}`,
        severity: 'info',
        vehicle_id: vehicle.id,
      });
    } else if (action === 'expedite') {
      addAlert({
        rule_id: 'R4',
        title: `Repair Expedited: ${vehicle.plate}`,
        description: `Fleet Manager marked repair as top priority for departure in ${vehicle.scheduled_use_days} days. Notes: ${notes}`,
        severity: 'warning',
        vehicle_id: vehicle.id,
      });
    } else {
      addAlert({
        rule_id: 'R4',
        title: `Service Deferred: ${vehicle.plate}`,
        description: `Fleet Manager deferred non-critical service for ${vehicle.plate}. Notes: ${notes}`,
        severity: 'info',
        vehicle_id: vehicle.id,
      });
    }
  };

  const markAlertRead = (alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  };

  // Computed: R5 Shortfall Projection
  // Count vehicles crossing service thresholds in next N days (e.g. 14 days) -> sum implied parts demand -> compare to stock
  const projectedShortfallParts = useMemo(() => {
    const shortfalls: {
      part: InventoryItem;
      projectedDemand: number;
      shortfallUnits: number;
      shortfallDays: number;
      affectedVehicles: string[];
    }[] = [];

    inventory.forEach((part) => {
      // Find all vehicles needing this part based on active faults or upcoming service threshold
      const affectedPlates: string[] = [];
      let demand = 0;

      vehicles.forEach((v) => {
        const hasFaultNeed = v.active_fault_codes.some((f) => f.required_part_id === part.id);
        const serviceDueSoon = v.next_service_mileage - v.mileage <= 1500 || v.scheduled_use_days <= 10;
        const compatible = part.compatible_vehicles.includes(v.plate) || part.compatible_vehicles.includes(v.id);

        if (hasFaultNeed) {
          demand += 1;
          if (!affectedPlates.includes(v.plate)) affectedPlates.push(v.plate);
        } else if (serviceDueSoon && compatible) {
          demand += 1;
          if (!affectedPlates.includes(v.plate)) affectedPlates.push(v.plate);
        }
      });

      if (demand > 0 && part.quantity <= demand) {
        const shortfallUnits = demand - part.quantity + 1;
        shortfalls.push({
          part,
          projectedDemand: demand,
          shortfallUnits,
          shortfallDays: part.lead_time_days || 4,
          affectedVehicles: affectedPlates,
        });
      }
    });

    return shortfalls;
  }, [inventory, vehicles]);

  // Computed: CAE Items (Ranked list for CAE Budget Prioritization)
  const caeItems: CAEItem[] = useMemo(() => {
    const items: CAEItem[] = [];

    vehicles.forEach((v) => {
      // Build CAE items for vehicles in Attention or Critical status
      if (v.status === 'Critical' || v.status === 'Attention') {
        const fault = v.active_fault_codes[0] || {
          code: 'GEN-01',
          name: 'Scheduled Threshold Intervention Required',
          severity: v.status === 'Critical' ? 'Critical' : 'Warning',
        };

        // Repair cost = sum of required part cost + standard labor ($140/hr * 10 hrs = $1400)
        let partsCost = 450;
        const reqPartId = (fault as any).required_part_id;
        if (reqPartId) {
          const p = inventory.find((item) => item.id === reqPartId);
          if (p) partsCost = p.unit_cost;
        }
        const repairCost = partsCost + 1400; // [Calculated]

        const delayMult = caeDelayMultipliers[v.classification] || (v.classification === 'Keystone' ? 2.2 : 1.4);
        const deferralCost = Math.round(repairCost * delayMult); // [Statistical estimate]
        const failureLikelihood =
          fault.severity === 'Critical' ? 0.85 : fault.severity === 'Warning' ? 0.45 : 0.25; // [Statistical estimate]
        const classWeight = v.classification === 'Keystone' ? 1.5 : 1.0; // [Configured]

        const rankScore = Number(
          ((deferralCost / repairCost) * classWeight * failureLikelihood).toFixed(3)
        );

        items.push({
          vehicle_id: v.id,
          vehicle_plate: v.plate,
          vehicle_name: v.name,
          classification: v.classification,
          fault_code: fault.code,
          fault_name: fault.name,
          repair_cost: repairCost,
          deferral_cost: deferralCost,
          delay_multiplier: delayMult,
          failure_likelihood: failureLikelihood,
          classification_weight: classWeight,
          rank_score: rankScore,
          status: 'Pending',
          scheduled_use_days: v.scheduled_use_days,
        });
      }
    });

    // Sort descending by rank score!
    return items.sort((a, b) => b.rank_score - a.rank_score);
  }, [vehicles, inventory, caeDelayMultipliers]);

  // Interactive Golden Path A Step trigger
  const triggerGoldenPathAStep = (step: number) => {
    setGoldenPathAStatus({ active: true, currentStep: step });
    if (step === 1) {
      // Mechanic logs OBD fault P0299 on V-024
      logOBDFault('V-024', {
        code: 'P0299',
        name: 'Turbocharger Boost Sensor A Circuit Low',
        severity: 'Critical',
        required_part_id: 'TURBO-SENS-01',
        required_intervention: 'Replace OEM Turbo Boost Sensor and recalibrate ECU boost parameters.',
      });
      addAlert({
        rule_id: 'R1',
        title: 'Golden Path A [Step 1/7]: OBD Fault Logged by Mechanic',
        description: 'Mechanic connected OBD tool to Vehicle NX-024-TR and logged Critical Fault P0299.',
        severity: 'critical',
        vehicle_id: 'V-024',
        part_id: 'TURBO-SENS-01',
      });
    } else if (step === 2) {
      // R1 + R3 Fired -> Fleet Manager sees Conflict
      changeRole('FLEET_MANAGER');
      changeScreen('CONFLICT_ALERTS');
      setSelectedVehicleId('V-024');
    } else if (step === 3) {
      // Technical Controller creates Work Order #WO-4091
      changeRole('TECHNICAL_CONTROLLER');
      changeScreen('WORK_ORDER_QUEUE');
      createWorkOrder({
        vehicle_id: 'V-024',
        type: 'Corrective',
        parts_used: [
          {
            part_id: 'TURBO-SENS-01',
            name: 'Turbo Boost Pressure Sensor (OEM)',
            quantity: 1,
            unit_cost: 850,
          },
        ],
        labor_hours: 10,
        hourly_rate: 140,
        before_notes: 'OBD P0299 confirmed. Sensor swap required.',
        assigned_mechanic_id: 'M-01',
        assigned_mechanic_name: 'David Thorne (Workshop Technician)',
        related_fault_code: 'P0299',
      });
    } else if (step === 4) {
      // Logistics Controller sees stock consumed
      changeRole('LOGISTICS_CONTROLLER');
      changeScreen('INVENTORY_DASHBOARD');
    } else if (step === 5) {
      // Management Controller sees it in variance
      changeRole('MGMT_CONTROLLER');
      changeScreen('VARIANCE_DASHBOARD');
    } else if (step === 6) {
      // Director sees it in aggregate
      changeRole('DIRECTOR');
      changeScreen('STRATEGIC_DASHBOARD');
    }
  };

  // Interactive Golden Path B Step trigger
  const triggerGoldenPathBStep = (step: number) => {
    setGoldenPathBStatus({ active: true, currentStep: step });
    if (step === 1) {
      // Driver reports incident with no matching fault code -> R6 creates Investigation
      changeRole('DRIVER');
      changeScreen('DRIVER_MOBILE_VIEW');
      submitDriverIncident(
        'V-018',
        'Noise',
        'Metallic clicking noise from front left wheel area when turning at highway speeds. No dashboard warning light.',
        'Mohamed Farsi (Driver)'
      );
    } else if (step === 2) {
      // Technical Controller & Fleet Manager notified
      changeRole('TECHNICAL_CONTROLLER');
      changeScreen('INCIDENT_REPORTS');
    } else if (step === 3) {
      // Mechanic performs on-site OBD check -> discovers fault -> continues into Golden Path A
      changeRole('MECHANIC');
      changeScreen('MECHANIC_MOBILE_QUEUE');
      logOBDFault('V-018', {
        code: 'C0035',
        name: 'Front Left Wheel Speed Sensor Signal Erratic',
        severity: 'Warning',
        required_part_id: 'WHL-SENS-05',
        required_intervention: 'Inspect sensor reluctor ring and replace wheel speed sensor.',
      });
      // Link incident to resolved investigation
      setIncidents((prev) =>
        prev.map((i) => (i.vehicle_id === 'V-018' ? { ...i, matched_to_fault: true, related_fault_code: 'C0035' } : i))
      );
    } else if (step === 4) {
      // Switch to Tech Controller to create work order
      changeRole('TECHNICAL_CONTROLLER');
      changeScreen('WORK_ORDER_QUEUE');
      createWorkOrder({
        vehicle_id: 'V-018',
        type: 'Corrective',
        parts_used: [
          {
            part_id: 'WHL-SENS-05',
            name: 'Front Wheel Speed & ABS Sensor Assembly',
            quantity: 1,
            unit_cost: 195,
          },
        ],
        labor_hours: 3,
        hourly_rate: 140,
        before_notes: 'Driver reported clicking noise; OBD confirmed C0035 sensor error.',
        assigned_mechanic_id: 'M-01',
        assigned_mechanic_name: 'David Thorne (Workshop Technician)',
        related_fault_code: 'C0035',
      });
    }
  };

  return (
    <FleetContext.Provider
      value={{
        currentRole,
        currentScreen,
        vehicles,
        inventory,
        workOrders,
        incidents,
        costRecords,
        alerts,
        caeAvailableBudget,
        caeDelayMultipliers,
        selectedVehicleId,
        isRoleSelectorOpen,
        goldenPathAStatus,
        goldenPathBStatus,

        tenantConfigs,
        activeTenantId,
        activeTenant,
        updateTenantConfig,
        setActiveTenantId,
        addTenantConfig,

        changeRole,
        changeScreen,
        setSelectedVehicleId,
        setIsRoleSelectorOpen,
        setCaeAvailableBudget,
        updateCaeDelayMultiplier,
        logOBDFault,
        createWorkOrder,
        closeWorkOrder,
        submitDriverIncident,
        resolveConflict,
        markAlertRead,
        resetSeedData,
        triggerGoldenPathAStep,
        triggerGoldenPathBStep,

        caeItems,
        projectedShortfallParts,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
