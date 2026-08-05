import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchVehicles,
  fetchInventory,
  fetchWorkOrders,
  fetchIncidents,
  fetchCostRecords,
  fetchAlerts,
  syncLogOBDFaultToSupabase,
  syncCreateWorkOrderToSupabase,
  syncSubmitDriverIncidentToSupabase,
  syncCloseWorkOrderAtomic,
} from '../services/fleetData';
import {
  Vehicle,
  InventoryItem,
  WorkOrder,
  Incident,
  CostRecord,
  FleetAlert,
  CAEItem,
  VehicleClassification,
  FuelLog,
  ActiveFaultCode,
  PMSchedule,
  EdiSupplierPurchaseOrder,
} from '../types';
import { fuelService } from '../services/fuelService';
import {
  INITIAL_VEHICLES,
  INITIAL_INVENTORY,
  INITIAL_WORK_ORDERS,
  INITIAL_INCIDENTS,
  INITIAL_COST_RECORDS,
  INITIAL_ALERTS,
  INITIAL_PM_SCHEDULES,
  INITIAL_EDI_ORDERS,
} from '../data/seedData';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { recordAudit } from '../services/auditService';

interface FleetContextType {
  vehicles: Vehicle[];
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  incidents: Incident[];
  costRecords: CostRecord[];
  alerts: FleetAlert[];
  fuelLogs: FuelLog[];
  pmSchedules: PMSchedule[];
  ediOrders: EdiSupplierPurchaseOrder[];
  caeAvailableBudget: number;
  caeDelayMultipliers: Record<VehicleClassification, number>;
  selectedVehicleId: string | null;
  goldenPathAStatus: { active: boolean; currentStep: number };
  goldenPathBStatus: { active: boolean; currentStep: number };
  setSelectedVehicleId: (id: string | null) => void;
  setCaeAvailableBudget: (amount: number) => void;
  updateCaeDelayMultiplier: (classification: VehicleClassification, mult: number) => void;
  addEdiPurchaseOrder: (poInput: Omit<EdiSupplierPurchaseOrder, 'id' | 'created_at'>) => void;
  transmitEdiOrder: (poId: string) => void;
  addPMSchedule: (schedule: Omit<PMSchedule, 'id'>) => void;
  logOBDFault: (
    vehicleId: string,
    fault: {
      code: string;
      name: string;
      severity: 'Critical' | 'Warning' | 'Info';
      required_part_id?: string;
      required_intervention: string;
    }
  ) => Promise<void>;
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
  }) => Promise<void>;
  closeWorkOrder: (orderId: string, afterNotes: string) => void;
  submitDriverIncident: (
    vehicleId: string,
    category: Incident['category'],
    description: string,
    reportedBy?: string
  ) => void;
  resolveConflict: (vehicleId: string, action: 'assign_alternate' | 'expedite' | 'defer', notes: string) => void;
  markAlertRead: (alertId: string) => void;
  addFuelLog: (logInput: {
    vehicle_id: string;
    liters: number;
    cost: number;
    odometer_km: number;
    logged_at?: string;
  }) => Promise<FuelLog>;
  resetSeedData: () => void;
  triggerGoldenPathAStep: (step: number) => void;
  triggerGoldenPathBStep: (step: number) => void;
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
  const { currentRole, currentUser, changeRole, changeScreen, setSyncStatus } = useAuth();
  const { activeTenantId } = useTenant();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [costRecords, setCostRecords] = useState<CostRecord[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [pmSchedules, setPmSchedules] = useState<PMSchedule[]>(INITIAL_PM_SCHEDULES);
  const [ediOrders, setEdiOrders] = useState<EdiSupplierPurchaseOrder[]>(INITIAL_EDI_ORDERS);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const addEdiPurchaseOrder = useCallback((poInput: Omit<EdiSupplierPurchaseOrder, 'id' | 'created_at'>) => {
    const newPo: EdiSupplierPurchaseOrder = {
      ...poInput,
      id: `EDI-PO-${Date.now()}`,
      created_at: new Date().toLocaleString(),
    };
    setEdiOrders((prev) => [newPo, ...prev]);
    recordAudit(
      'inventory_item',
      newPo.id,
      'CREATE',
      {},
      { po_number: newPo.po_number, supplier: newPo.supplier_name, total: newPo.total_amount },
      currentUser?.id || 'sys',
      currentRole,
      activeTenantId
    );
  }, [currentUser, currentRole, activeTenantId]);

  const transmitEdiOrder = useCallback((poId: string) => {
    setEdiOrders((prev) =>
      prev.map((po) => {
        if (po.id === poId) {
          return {
            ...po,
            status: 'Transmitted EDI',
            transmitted_at: new Date().toLocaleString(),
            ack_payload: `EDIFACT_ACK_200: Order #${po.po_number} successfully accepted by ${po.supplier_name} EDI gateway.`,
          };
        }
        return po;
      })
    );
  }, []);

  const addPMSchedule = useCallback((scheduleInput: Omit<PMSchedule, 'id'>) => {
    const newSch: PMSchedule = {
      ...scheduleInput,
      id: `PM-SCH-${Date.now()}`,
    };
    setPmSchedules((prev) => [...prev, newSch]);
  }, []);

  useEffect(() => {
    fuelService.getFuelLogs().then((logs) => {
      if (logs && logs.length > 0) {
        setFuelLogs(logs);
      }
    }).catch(() => {
      setSyncStatus('error');
    });
  }, [setSyncStatus]);

  const addAlert = useCallback((alert: Omit<FleetAlert, 'id' | 'timestamp' | 'read' | 'tenant_id'>) => {
    const newAlert: FleetAlert = {
      ...alert,
      id: `ALRT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setAlerts(prev => [newAlert, ...prev]);
  }, []);

  const markAlertRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
  };

  const addFuelLog = async (logInput: {
    vehicle_id: string;
    liters: number;
    cost: number;
    odometer_km: number;
    logged_at?: string;
  }) => {
    recordAudit(
      'fuel_log',
      logInput.vehicle_id,
      'CREATE',
      {},
      { liters: logInput.liters, cost: logInput.cost, odometer: logInput.odometer_km },
      currentUser?.id || 'sys',
      currentRole,
      activeTenantId
    );
    const newLog = await fuelService.addFuelLog({
      ...logInput,
      tenant_id: activeTenantId,
    });
    setFuelLogs((prev) => [...prev, newLog]);

    if (newLog.anomaly_flag) {
      const vehicle = vehicles.find((v) => v.id === newLog.vehicle_id);
      addAlert({
        rule_id: 'R7',
        title: `Fuel Anomaly Detected: ${vehicle?.plate || newLog.vehicle_id}`,
        description: `High fuel consumption spike logged (${newLog.liters}L, ${newLog.cost} DA / $). Exceeds 90-day trailing baseline by >20%.`,
        severity: 'warning',
        vehicle_id: newLog.vehicle_id,
      });
    }

    const vehicle = vehicles.find((v) => v.id === newLog.vehicle_id);
    const costRecord: CostRecord = {
      id: `CR-FUEL-${Date.now()}`,
      vehicle_id: newLog.vehicle_id,
      vehicle_plate: vehicle?.plate || 'UNKNOWN',
      category: 'Fuel',
      amount: newLog.cost,
      budget_for_category: Math.round(newLog.cost * 0.9),
      period: 'Q3 2026',
    };
    setCostRecords((prev) => [...prev, costRecord]);
    return newLog;
  };

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setSyncStatus('syncing');
    try {
      const [dbVehicles, dbInventory, dbWO, dbIncidents, dbCosts, dbAlerts] = await Promise.all([
        fetchVehicles(),
        fetchInventory(),
        fetchWorkOrders(),
        fetchIncidents(),
        fetchCostRecords(),
        fetchAlerts()
      ]);
      setVehicles(dbVehicles.length ? dbVehicles : INITIAL_VEHICLES);
      setInventory(dbInventory.length ? dbInventory : INITIAL_INVENTORY);
      setWorkOrders(dbWO.length ? dbWO : INITIAL_WORK_ORDERS);
      setIncidents(dbIncidents.length ? dbIncidents : INITIAL_INCIDENTS);
      setCostRecords(dbCosts.length ? dbCosts : INITIAL_COST_RECORDS);
      setAlerts(dbAlerts.length ? dbAlerts : INITIAL_ALERTS);
      setSyncStatus('online');
    } catch (e) {
      console.warn('DB load failed, using seed data fallback.', e);
      setVehicles(INITIAL_VEHICLES);
      setInventory(INITIAL_INVENTORY);
      setWorkOrders(INITIAL_WORK_ORDERS);
      setIncidents(INITIAL_INCIDENTS);
      setCostRecords(INITIAL_COST_RECORDS);
      setAlerts(INITIAL_ALERTS);
      setSyncStatus('offline');
    }
  }, [currentUser, setSyncStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!currentUser) return;

    const channels = [
      supabase.channel('public:fleet_alerts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fleet_alerts' }, payload => {
        setAlerts(prev => [payload.new as FleetAlert, ...prev]);
      }).subscribe(),
      supabase.channel('public:vehicles').on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchVehicles().then(setVehicles);
      }).subscribe(),
      supabase.channel('public:work_orders').on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
        fetchWorkOrders().then(setWorkOrders);
      }).subscribe(),
      supabase.channel('public:inventory_items').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        fetchInventory().then(setInventory);
      }).subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [currentUser]);

  const [caeAvailableBudget, setCaeAvailableBudget] = useState(12000);
  const [caeDelayMultipliers, setCaeDelayMultipliers] = useState<Record<VehicleClassification, number>>({
    'Keystone': 2.2,
    'Standard': 1.4,
    
  });

  const [goldenPathAStatus, setGoldenPathAStatus] = useState({ active: false, currentStep: 0 });
  const [goldenPathBStatus, setGoldenPathBStatus] = useState({ active: false, currentStep: 0 });

  const resolveConflict = (vehicleId: string, action: 'assign_alternate' | 'expedite' | 'defer', notes: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    
    // Record audit log for alert / rule override decision
    recordAudit(
      'alert',
      `R4-ALT-${vehicleId}`,
      'OVERRIDE',
      { vehicle_id: vehicleId, scheduled_use_days: vehicle.scheduled_use_days, status_reason: vehicle.status_reason },
      { action, notes, resolved_by: currentUser?.id || 'usr-fm-01' },
      currentUser?.id || 'usr-fm-01',
      currentRole,
      activeTenantId
    );
    
    if (action === 'assign_alternate') {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                scheduled_use_days: 30,
                status_reason: `${v.status_reason} — [Resolved by Fleet Manager: Reassigned Route to backup coach]`,
              }
            : v
        )
      );
    } else if (action === 'expedite') {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                status_reason: `${v.status_reason} — [Resolved by FM: Expediting repair via overtime]`,
              }
            : v
        )
      );
    }

    addAlert({
      rule_id: 'R2',
      title: `Schedule Conflict Resolved`,
      description: `Conflict on vehicle ${vehicleId} resolved via: ${action}. Notes: ${notes}`,
      severity: 'info',
      vehicle_id: vehicleId,
    });
  };

  const logOBDFault = async (
    vehicleId: string,
    fault: {
      code: string;
      name: string;
      severity: 'Critical' | 'Warning' | 'Info';
      required_part_id?: string;
      required_intervention: string;
    }
  ) => {
    const vehicleBefore = vehicles.find((v) => v.id === vehicleId);
    try {
      const activeFault: ActiveFaultCode = {
        ...fault,
        logged_date: new Date().toISOString()
      };
      await syncLogOBDFaultToSupabase(vehicleId, fault);
      const newStatus = fault.severity === 'Critical' ? 'Critical' : fault.severity === 'Warning' ? 'Attention' : (vehicleBefore?.status || 'Unknown');
      
      if (vehicleBefore) {
        recordAudit(
          'vehicle',
          vehicleId,
          'STATUS_CHANGE',
          { status: vehicleBefore.status, active_faults: vehicleBefore.active_fault_codes },
          { status: newStatus, added_fault: fault },
          currentUser?.id || 'sys',
          currentRole,
          activeTenantId
        );
      }
      
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === vehicleId) {
            const newStatus = fault.severity === 'Critical' ? 'Critical' : fault.severity === 'Warning' ? 'Attention' : v.status;
            return {
              ...v,
              status: newStatus,
              active_fault_codes: [activeFault, ...(v.active_fault_codes || [])],
            };
          }
          return v;
        })
      );

      if (fault.severity === 'Critical') {
        addAlert({
          rule_id: 'R1',
          title: `R1 Emergency Stop: Critical Fault on ${vehicleId}`,
          description: `Fault ${fault.code} logged. Vehicle status set to Critical. Dispatch immediate maintenance.`,
          severity: 'critical',
          vehicle_id: vehicleId,
          part_id: fault.required_part_id,
        });
      }
    } catch (e) {
      console.error('Failed to log OBD fault to DB:', e);
    }
  };

  const createWorkOrder = async (order: {
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

    const total_cost = (order.labor_hours * order.hourly_rate) +
      order.parts_used.reduce((sum, part) => sum + (part.quantity * part.unit_cost), 0);

    const newWO: Omit<WorkOrder, 'id'> = {
      vehicle_id: order.vehicle_id,
      vehicle_plate: vehicle.plate,
      type: order.type,
      status: 'Open',
      parts_used: order.parts_used,
      labor_hours: order.labor_hours,
      hourly_rate: order.hourly_rate,
      before_after_notes: { before: order.before_notes, after: '' },
      assigned_mechanic_id: order.assigned_mechanic_id,
      assigned_mechanic_name: order.assigned_mechanic_name,
      related_fault_code: order.related_fault_code,
      created_date: new Date().toISOString(),
      labor_cost: order.labor_hours * order.hourly_rate
    };

    try {
      const insertedWO = await syncCreateWorkOrderToSupabase(newWO);
      
      recordAudit(
        'work_order',
        insertedWO?.id || 'WO-NEW',
        'CREATE',
        {},
        { type: order.type, labor_hours: order.labor_hours, vehicle_id: order.vehicle_id },
        currentUser?.id || 'sys',
        currentRole,
        activeTenantId
      );
      if (insertedWO) {
        setWorkOrders(prev => [insertedWO, ...prev]);
      }

      setInventory(prev => prev.map(item => {
        const used = order.parts_used.find(p => p.part_id === item.id);
        if (used) {
          const newQuantity = item.quantity - used.quantity;
          if (newQuantity <= item.reorder_threshold) {
            addAlert({
              rule_id: 'R3',
              title: `R3 Inventory Alert: Low Stock for ${item.name}`,
              description: `Stock dropped to ${newQuantity}. (Threshold: ${item.reorder_threshold}).`,
              severity: 'warning',
              part_id: item.id,
            });
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }));

      setVehicles(prev => prev.map(v => {
        if (v.id === order.vehicle_id) {
          if (v.scheduled_use_days !== undefined && v.scheduled_use_days <= 3) {
            addAlert({
              rule_id: 'R2',
              title: `R2 Conflict: Vehicle scheduled in ${v.scheduled_use_days} days`,
              description: `A new work order was opened for a vehicle scheduled for imminent deployment.`,
              severity: 'warning',
              vehicle_id: v.id,
            });
            return {
              ...v,
              status: 'Attention',
              status_reason: 'Open WO conflicts with scheduled dispatch.',
            };
          }
          return { ...v, status: 'Attention', status_reason: 'In Maintenance' };
        }
        return v;
      }));
    } catch (e) {
      console.error('Failed to create Work Order:', e);
    }
  };

  const closeWorkOrder = async (orderId: string, afterNotes: string) => {
    const woBefore = workOrders.find(w => w.id === orderId);
    const wo = workOrders.find(w => w.id === orderId);
    if (!wo) return;
    try {
      await syncCloseWorkOrderAtomic(orderId, afterNotes);
      
      if (woBefore) {
        recordAudit(
          'work_order',
          orderId,
          'STATUS_CHANGE',
          { status: woBefore.status, after_notes: woBefore.before_after_notes.after },
          { status: 'Closed', after_notes: afterNotes },
          currentUser?.id || 'sys',
          currentRole,
          activeTenantId
        );
      }
      
      setWorkOrders(prev => prev.map(w =>
        w.id === orderId ? { ...w, status: 'Closed', closed_date: new Date().toISOString(), before_after_notes: { ...w.before_after_notes, after: afterNotes } } : w
      ));

      setVehicles(prev => prev.map(v => {
        if (v.id === wo.vehicle_id) {
          return {
            ...v,
            status: 'Healthy',
            active_fault_codes: v.active_fault_codes.filter(f => f.code !== wo.related_fault_code),
            status_reason: 'Cleared',
          };
        }
        return v;
      }));

      addAlert({
        rule_id: 'R1',
        title: `Work Order Completed`,
        description: `Work Order ${orderId} completed successfully. Vehicle health restored.`,
        severity: 'info',
        vehicle_id: wo.vehicle_id,
      });
    } catch (e) {
      console.error('Error closing WO:', e);
    }
  };

  const submitDriverIncident = async (vehicleId: string, category: Incident['category'], description: string, reportedBy?: string) => {
    try {
      const newIncident: Omit<Incident, 'id'> = {
        vehicle_id: vehicleId,
        vehicle_plate: vehicles.find(v => v.id === vehicleId)?.plate || '',
        category,
        description,
        reported_by: reportedBy || 'Driver',
        status: 'Investigation',
        matched_to_fault: false,
        created_date: new Date().toISOString(),
      };
      const success = await syncSubmitDriverIncidentToSupabase(newIncident);

      if (success) {
        setIncidents(prev => [{ ...newIncident, id: `INC-${Date.now()}` } as Incident, ...prev]);
      }

      addAlert({
        rule_id: 'R6',
        title: `R6 Driver Incident Reported: ${vehicleId}`,
        description: `New incident reported: ${category}. No matching OBD fault detected yet. Investigation required.`,
        severity: 'warning',
        vehicle_id: vehicleId,
      });

    } catch (e) {
      console.error('Failed to submit driver incident', e);
    }
  };

  const resetSeedData = () => {
    setVehicles(INITIAL_VEHICLES);
    setInventory(INITIAL_INVENTORY);
    setWorkOrders(INITIAL_WORK_ORDERS);
    setIncidents(INITIAL_INCIDENTS);
    setCostRecords(INITIAL_COST_RECORDS);
    setAlerts(INITIAL_ALERTS);
    setGoldenPathAStatus({ active: false, currentStep: 0 });
    setGoldenPathBStatus({ active: false, currentStep: 0 });
  };

  const updateCaeDelayMultiplier = (classification: VehicleClassification, mult: number) => {
    setCaeDelayMultipliers(prev => ({ ...prev, [classification]: mult }));
  };

  const projectedShortfallParts = useMemo(() => {
    const shortfalls: any[] = [];
    inventory.forEach((part) => {
      let demand = 0;
      const affectedPlates: string[] = [];
      vehicles.forEach((v) => {
        const partNeeded = v.active_fault_codes?.some(f => f.required_part_id === part.id);
        if (partNeeded) {
          demand += 1;
          affectedPlates.push(v.plate);
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

  const caeItems: CAEItem[] = useMemo(() => {
    const items: CAEItem[] = [];
    vehicles.forEach((v) => {
      if (v.status === 'Critical' || v.status === 'Attention') {
        const fault = v.active_fault_codes[0] || {
          code: 'GEN-01',
          name: 'Scheduled Threshold Intervention Required',
          severity: v.status === 'Critical' ? 'Critical' : 'Warning',
        };
        let partsCost = 450;
        const reqPartId = (fault as any).required_part_id;
        if (reqPartId) {
          const p = inventory.find((item) => item.id === reqPartId);
          if (p) partsCost = p.unit_cost;
        }
        const repairCost = partsCost + 1400; 
        const delayMult = caeDelayMultipliers[v.classification] || (v.classification === 'Keystone' ? 2.2 : 1.4);
        const deferralCost = Math.round(repairCost * delayMult); 
        const failureLikelihood = fault.severity === 'Critical' ? 0.85 : fault.severity === 'Warning' ? 0.45 : 0.25; 
        const classWeight = v.classification === 'Keystone' ? 1.5 : 1.0; 
        const rankScore = Number(((deferralCost / repairCost) * classWeight * failureLikelihood).toFixed(3));
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
    return items.sort((a, b) => b.rank_score - a.rank_score);
  }, [vehicles, inventory, caeDelayMultipliers]);

  const triggerGoldenPathAStep = (step: number) => {
    setGoldenPathAStatus({ active: true, currentStep: step });
    if (step === 1) {
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
      changeRole('FLEET_MANAGER', 'CONFLICT_ALERTS');
      setSelectedVehicleId('V-024');
    } else if (step === 3) {
      changeRole('MAINTENANCE_MANAGER', 'WORK_ORDER_QUEUE');
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
      changeRole('OPERATIONS', 'INVENTORY_DASHBOARD');
    } else if (step === 5) {
      changeRole('FINANCE', 'VARIANCE_DASHBOARD');
    } else if (step === 6) {
      changeRole('DIRECTOR', 'STRATEGIC_DASHBOARD');
    }
  };

  const triggerGoldenPathBStep = (step: number) => {
    setGoldenPathBStatus({ active: true, currentStep: step });
    if (step === 1) {
      changeRole('DRIVER', 'DRIVER_MOBILE_VIEW');
      submitDriverIncident(
        'V-018',
        'Noise',
        'Metallic clicking noise from front left wheel area when turning at highway speeds. No dashboard warning light.',
        'Mohamed Farsi (Driver)'
      );
    } else if (step === 2) {
      changeRole('MAINTENANCE_MANAGER', 'INCIDENT_REPORTS');
    } else if (step === 3) {
      changeRole('MECHANIC', 'MECHANIC_MOBILE_QUEUE');
      logOBDFault('V-018', {
        code: 'C0035',
        name: 'Front Left Wheel Speed Sensor Signal Erratic',
        severity: 'Warning',
        required_part_id: 'WHL-SENS-05',
        required_intervention: 'Inspect sensor reluctor ring and replace wheel speed sensor.',
      });
      setIncidents((prev) =>
        prev.map((i) => (i.vehicle_id === 'V-018' ? { ...i, matched_to_fault: true, related_fault_code: 'C0035' } : i))
      );
    } else if (step === 4) {
      changeRole('MAINTENANCE_MANAGER', 'WORK_ORDER_QUEUE');
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
        vehicles,
        inventory,
        workOrders,
        incidents,
        costRecords,
        alerts,
        fuelLogs,
        pmSchedules,
        ediOrders,
        caeAvailableBudget,
        caeDelayMultipliers,
        selectedVehicleId,
        goldenPathAStatus,
        goldenPathBStatus,
        setCaeAvailableBudget,
        updateCaeDelayMultiplier,
        addEdiPurchaseOrder,
        transmitEdiOrder,
        addPMSchedule,
        logOBDFault,
        createWorkOrder,
        closeWorkOrder,
        submitDriverIncident,
        resolveConflict,
        markAlertRead,
        addFuelLog,
        resetSeedData,
        triggerGoldenPathAStep,
        triggerGoldenPathBStep,
        caeItems,
        projectedShortfallParts,
        setSelectedVehicleId,
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
