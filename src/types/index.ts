export type Role =
  | 'DIRECTOR'
  | 'MGMT_CONTROLLER'
  | 'TECHNICAL_CONTROLLER'
  | 'LOGISTICS_CONTROLLER'
  | 'FLEET_MANAGER'
  | 'MECHANIC'
  | 'DRIVER'
  | 'UNASSIGNED';

export interface RoleInfo {
  id: Role;
  name: string;
  title: string;
  description: string;
  badgeColor: string;
  avatar: string;
}

export type ScreenId =
  | 'LANDING_PAGE'
  | 'STRATEGIC_DASHBOARD'
  | 'VARIANCE_DASHBOARD'
  | 'FLEET_HEALTH_GRID'
  | 'INVENTORY_DASHBOARD'
  | 'WORK_ORDER_QUEUE'
  | 'CONFLICT_ALERTS'
  | 'CAE_BUDGET_PRIORITIZATION'
  | 'INCIDENT_REPORTS'
  | 'MECHANIC_MOBILE_QUEUE'
  | 'DRIVER_MOBILE_VIEW'
  | 'TENANT_CONFIG'
  | 'TRANSLATION_CENTER'
  | 'SAFETY_PERFORMANCE'
  | 'FUEL_LOGS'
  | 'TELEMETRY_STREAM'
  | 'AUDIT_LOG';

export type PermissionLevel = 'full' | 'view' | 'none' | 'resolve' | 'parts_status' | 'assigned_only' | 'own_only' | 'submit';

export const DEFAULT_ROLE_SCREENS: Record<Role, ScreenId> = {
  DIRECTOR: 'STRATEGIC_DASHBOARD',
  FLEET_MANAGER: 'FLEET_HEALTH_GRID',
  TECHNICAL_CONTROLLER: 'WORK_ORDER_QUEUE',
  MGMT_CONTROLLER: 'VARIANCE_DASHBOARD',
  LOGISTICS_CONTROLLER: 'INVENTORY_DASHBOARD',
  MECHANIC: 'MECHANIC_MOBILE_QUEUE',
  DRIVER: 'DRIVER_MOBILE_VIEW',
  UNASSIGNED: 'LANDING_PAGE',
};

export type VehicleStatus = 'Healthy' | 'Attention' | 'Critical' | 'Unknown';
export type VehicleClassification = 'Keystone' | 'Standard';

export interface ActiveFaultCode {
  code: string;
  name: string;
  severity: 'Critical' | 'Warning' | 'Info';
  logged_date: string;
  required_part_id?: string;
  required_intervention: string;
}

export interface MaintenanceHistoryItem {
  id: string;
  date: string;
  type: 'Preventive' | 'Corrective' | 'Inspection' | 'OBD Scan';
  summary: string;
  work_order_id?: string;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  name: string; // e.g. "Transit-024"
  classification: VehicleClassification;
  status: VehicleStatus;
  status_reason: string; // One-line plain-language reason
  last_check_date: string;
  active_fault_codes: ActiveFaultCode[];
  mileage: number;
  next_service_mileage: number;
  next_service_date: string;
  scheduled_use_days: number; // Scheduled for use in next N days
  scheduled_route?: string;
  maintenance_history: MaintenanceHistoryItem[];
  assigned_driver_id?: string;
  assigned_mechanic_id?: string;
  // Sub-scores (secondary / collapsible)
  fault_score: number; // 0-100 (100 = clean)
  compliance_score: number; // 0-100
  freshness_score: number; // days since last check score
  // CAE configuration tags
  classification_weight: number; // 1.5 for Keystone, 1.0 for Standard
  delay_multiplier: number; // 2.2 for Keystone, 1.4 for Standard
}

export interface WorkOrderPartUsed {
  part_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

export interface WorkOrder {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  type: 'Corrective' | 'Preventive' | 'Inspection' | 'Investigation';
  status: 'Open' | 'In Progress' | 'Pending Parts' | 'Closed';
  labor_cost: number;
  parts_used: WorkOrderPartUsed[];
  labor_hours: number;
  hourly_rate: number;
  before_after_notes: {
    before: string;
    after: string;
  };
  created_date: string;
  closed_date?: string;
  assigned_mechanic_id: string;
  assigned_mechanic_name: string;
  related_fault_code?: string;
  related_incident_id?: string;
  warranty_risk?: boolean;
}

export interface Warranty {
  id: string;
  tenant_id?: string;
  vehicle_id: string;
  manufacturer: string;
  expiry_date: string | null;
  expiry_mileage: number | null;
  covered_systems: string[];
  status: 'active' | 'expiring_soon' | 'expired';
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorder_threshold: number;
  unit_cost: number;
  compatible_vehicles: string[]; // plates or ids
  lead_time_days: number;
  category: string;
}

export interface Incident {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  reported_by: string; // Driver name
  category: 'Noise' | 'Warning Light' | 'Damage' | 'Other';
  description: string;
  matched_to_fault: boolean;
  related_fault_code?: string;
  status: 'Investigation' | 'Resolved';
  created_date: string;
}

export interface CostRecord {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  category: 'Preventive Maintenance' | 'Corrective Repair' | 'Parts & Consumables' | 'Emergency Diagnostics' | 'Fuel' | 'Engine' | 'Electrical' | 'Brakes' | 'Chassis';
  amount: number;
  budget_for_category: number;
  period: string; // e.g. "Q3 2026"
  work_order_id?: string;
  related_fault_code?: string;
  related_part_id?: string;
}

export interface FleetAlert {
  id: string;
  timestamp: string;
  rule_id: 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  vehicle_id?: string;
  part_id?: string;
  read: boolean;
}

export interface CAEItem {
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_name: string;
  classification: VehicleClassification;
  fault_code: string;
  fault_name: string;
  repair_cost: number; // [Calculated] sum of parts + labor
  deferral_cost: number; // [Statistical estimate] repair_cost * delay_multiplier
  delay_multiplier: number; // [Statistical estimate] configurable by classification
  failure_likelihood: number; // [Statistical estimate] lookup from fault severity tier
  classification_weight: number; // [Configured] manual tag
  rank_score: number; // (deferral_cost / repair_cost) * classification_weight * failure_likelihood
  status: 'Pending' | 'Approved' | 'Deferred' | 'Escalated';
  scheduled_use_days: number;
}

export type KPILabelType = 'Calculated' | 'Statistical estimate' | 'Configured';

export interface TenantConfig {
  id: string; // Tenant ID e.g. "TNT-NEXTR-001"
  societyName: string; // "NextTransit Fleet Operations Society Ltd."
  currency: string; // "USD ($)" | "DZD (DA)" | "EUR (€)"
  currencySymbol: string; // "$" | "DA" | "€"
  defaultLanguage?: 'fr' | 'en' | 'ar'; // Langue par défaut de l'espace tenant
  timezone?: string; // e.g. "Africa/Algiers" or "Europe/Paris"
  notificationsEnabled?: boolean; // Alertes emails/SMS activées
  customDomain?: string; // e.g. "fleet.nexttransit.dz"
  allocatedBudget: number; // e.g. 450000
  moneyUsed: number; // e.g. 382450
  fiscalYear: string; // "FY2026"
  operatingRegion: string; // "North America - Midwest Sector"
  taxRegistrationId: string; // "TAX-9948201-NX"
  costCenterCode: string; // "CC-FLEET-902"
  defaultLaborRate: number; // 85
  emergencyApprovalThreshold: number; // 5000
  contactEmail: string; // "operations@nexttransit.com"
  contactPhone: string; // "+1 (555) 019-2834"
  billingAddress: string; // "100 Fleet Center Plaza, Suite 400, Chicago, IL"
  autoSyncMoneyUsed: boolean; // Sync automatically with cost records sum
  logoUrl?: string; // Custom logo image URL or SVG identifier
  primaryColor?: string; // Custom hex or tailwind class for brand primary theme (e.g. "#4f46e5")
  accentColor?: string; // Custom accent color (e.g. "#059669")
  brandTagline?: string; // Custom tagline (e.g. "Excellence in Regional Transport")
  lastUpdated: string; // e.g. "2026-08-01"
}


export interface FuelLog {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  liters: number;
  cost: number;
  odometer_km: number;
  logged_at: string;
  anomaly_flag: boolean;
  created_at?: string;
  updated_at?: string;
  // Compatibility aliases
  odometer?: number;
  date?: string;
  route_id?: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  entity_name?: string;
  entity_id?: string;
  actor_id?: string;
  action: string;
  previous_value?: string;
  new_value: string;
  timestamp: string;
  user_email: string;
  user_role: string;
}

// ==========================================
// VENDOR-AGNOSTIC TELEMATICS INGESTION LAYER
// ==========================================

export type TelematicsProviderType = 'teltonika' | 'flespi_wialon' | 'manual';

export interface DeviceMapping {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  provider: TelematicsProviderType;
  external_device_id: string;
  created_at?: string;
}

export interface Position {
  latitude: number;
  longitude: number;
  altitude_m?: number;
  speed_kmh?: number;
  heading_deg?: number;
  timestamp: string;
}

export type Unsubscribe = () => void;

/**
 * Stable internal contract for vendor-agnostic telematics ingestion.
 * Decouples R1-R7 Decision Engine rules from hardware/vendor-specific payload formats.
 */
export interface TelematicsProvider {
  providerName: TelematicsProviderType;
  isConnected: boolean;
  getFaultCodes(vehicleId: string): Promise<ActiveFaultCode[]>;
  getPosition(vehicleId: string): Promise<Position | null>;
  subscribe(
    vehicleId: string,
    onUpdate: (data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void
  ): Unsubscribe;
}

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  actor_id: string;
  actor_role?: string;
  entity_type: 'vehicle' | 'work_order' | 'alert' | 'cae_budget' | string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'OVERRIDE' | 'APPROVAL' | string;
  before: Record<string, any>;
  after: Record<string, any>;
  created_at: string;
}


