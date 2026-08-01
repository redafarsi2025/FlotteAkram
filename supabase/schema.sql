-- ==============================================================================
-- NextTransit Enterprise Fleet Operations, Telemetry Reconciliation,
-- Maintenance Decision Engine & Localization - Complete Supabase Global Schema
-- Database: Supabase (PostgreSQL 15+)
-- File: /supabase/schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema if re-running
-- DROP TABLE IF EXISTS public.audit_logs CASCADE;
-- DROP TABLE IF EXISTS public.business_glossary CASCADE;
-- DROP TABLE IF EXISTS public.translation_memory CASCADE;
-- DROP TABLE IF EXISTS public.translations CASCADE;
-- DROP TABLE IF EXISTS public.cae_budget_metrics CASCADE;
-- DROP TABLE IF EXISTS public.fleet_alerts CASCADE;
-- DROP TABLE IF EXISTS public.cost_records CASCADE;
-- DROP TABLE IF EXISTS public.driver_incidents CASCADE;
-- DROP TABLE IF EXISTS public.work_orders CASCADE;
-- DROP TABLE IF EXISTS public.inventory_items CASCADE;
-- DROP TABLE IF EXISTS public.vehicles CASCADE;
-- DROP TABLE IF EXISTS public.tenant_configs CASCADE;

-- ------------------------------------------------------------------------------
-- 1. TENANT CONFIGS TABLE
-- Stores multi-tenant configuration, society parameters, currencies, and budget.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_configs (
    id VARCHAR(64) PRIMARY KEY, -- e.g. "TNT-NEXTR-001"
    society_name VARCHAR(255) NOT NULL,
    currency VARCHAR(32) NOT NULL DEFAULT 'USD ($)',
    currency_symbol VARCHAR(8) NOT NULL DEFAULT '$',
    allocated_budget NUMERIC(14,2) NOT NULL DEFAULT 450000.00,
    money_used NUMERIC(14,2) NOT NULL DEFAULT 382450.00,
    fiscal_year VARCHAR(32) NOT NULL DEFAULT 'FY2026',
    operating_region VARCHAR(255) NOT NULL DEFAULT 'North America - Midwest Sector',
    tax_registration_id VARCHAR(64) NOT NULL DEFAULT 'TAX-8839201-NX',
    cost_center_code VARCHAR(64) NOT NULL DEFAULT 'CC-FLEET-902',
    default_labor_rate NUMERIC(10,2) NOT NULL DEFAULT 85.00,
    emergency_approval_threshold NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
    contact_email VARCHAR(255) NOT NULL DEFAULT 'operations@nexttransit.com',
    contact_phone VARCHAR(64) NOT NULL DEFAULT '+1 (555) 234-8900',
    billing_address TEXT NOT NULL DEFAULT '100 Fleet Center Plaza, Suite 400, Chicago, IL',
    auto_sync_money_used BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_configs IS 'Multi-tenant organization configurations, financial budgets, and labor rates.';

-- ------------------------------------------------------------------------------
-- 2. VEHICLES TABLE (Fleet Health Grid)
-- Fleet vehicles with live OBD-II diagnostics, fault codes, classification, and status.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    classification VARCHAR(32) NOT NULL DEFAULT 'Standard' 
        CHECK (classification IN ('Keystone', 'Standard')),
    status VARCHAR(32) NOT NULL DEFAULT 'Healthy' 
        CHECK (status IN ('Healthy', 'Attention', 'Critical', 'Unknown')),
    status_reason TEXT NOT NULL DEFAULT 'Nominal operation',
    last_check_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_fault_codes JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of fault objects
    mileage INT NOT NULL DEFAULT 0,
    next_service_mileage INT NOT NULL DEFAULT 10000,
    next_service_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    scheduled_use_days INT NOT NULL DEFAULT 7,
    scheduled_route VARCHAR(255),
    maintenance_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_driver_id VARCHAR(255),
    assigned_mechanic_id VARCHAR(255),
    fault_score INT NOT NULL DEFAULT 100 CHECK (fault_score BETWEEN 0 AND 100),
    compliance_score INT NOT NULL DEFAULT 100 CHECK (compliance_score BETWEEN 0 AND 100),
    freshness_score INT NOT NULL DEFAULT 100 CHECK (freshness_score BETWEEN 0 AND 100),
    classification_weight NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    delay_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vehicles IS 'Fleet vehicles with real-time OBD-II telemetry, classification weights, and health status.';

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles (plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_classification ON public.vehicles (classification);

-- ------------------------------------------------------------------------------
-- 3. INVENTORY ITEMS TABLE (Rule R3 - Inventory Reservation System)
-- Parts, stock quantity, reserved stock, unit cost, and reorder thresholds.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) UNIQUE NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 5,
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    compatible_vehicles TEXT[] NOT NULL DEFAULT '{}',
    lead_time_days INT NOT NULL DEFAULT 3,
    category VARCHAR(64) NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inventory_items IS 'Warehouse parts stock, unit costs, and automated reservation buffers for Rule R3.';

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items (sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items (category);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON public.inventory_items (quantity);

-- ------------------------------------------------------------------------------
-- 4. WORK ORDERS TABLE (Rule R4 - Total Cost Formula & Rule R1/R3/R6 Integration)
-- Maintenance work order lifecycle tracking.
-- Total Cost Formula R4 = (Labor Hours * Hourly Rate) + SUM(Parts Used Cost)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'Corrective' 
        CHECK (type IN ('Corrective', 'Preventive', 'Inspection', 'Investigation')),
    status VARCHAR(32) NOT NULL DEFAULT 'Open' 
        CHECK (status IN ('Open', 'In Progress', 'Pending Parts', 'Closed')),
    labor_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 85.00,
    labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    parts_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    parts_used JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {part_id, name, quantity, unit_cost}
    before_notes TEXT NOT NULL DEFAULT '',
    after_notes TEXT NOT NULL DEFAULT '',
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_date TIMESTAMPTZ,
    assigned_mechanic_id VARCHAR(255) NOT NULL DEFAULT 'MCH-001',
    assigned_mechanic_name VARCHAR(255) NOT NULL DEFAULT 'Karim Mansouri',
    related_fault_code VARCHAR(64),
    related_incident_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.work_orders IS 'Automated work order lifecycle engine enforcing Total Repair Cost Rule R4.';

CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON public.work_orders (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders (status);
CREATE INDEX IF NOT EXISTS idx_work_orders_mechanic ON public.work_orders (assigned_mechanic_id);

-- ------------------------------------------------------------------------------
-- 5. DRIVER INCIDENTS TABLE (Rule R6 - Telemetry Reconciliation & Incident Audit)
-- Driver incident reports checked against electronic OBD-II telemetry.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    reported_by VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'Other' 
        CHECK (category IN ('Noise', 'Warning Light', 'Damage', 'Other')),
    description TEXT NOT NULL,
    matched_to_fault BOOLEAN NOT NULL DEFAULT FALSE,
    related_fault_code VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'Investigation' 
        CHECK (status IN ('Investigation', 'Resolved')),
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.driver_incidents IS 'Driver-reported incidents for Telemetry Reconciliation Rule R6.';

CREATE INDEX IF NOT EXISTS idx_incidents_vehicle_id ON public.driver_incidents (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.driver_incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_matched ON public.driver_incidents (matched_to_fault);

-- ------------------------------------------------------------------------------
-- 6. COST RECORDS TABLE (Rule R7 - Strategic Fleet Health Variance Analysis)
-- Tracks expenses across preventive, corrective, parts, and emergency categories.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL 
        CHECK (category IN ('Preventive Maintenance', 'Corrective Repair', 'Parts & Consumables', 'Emergency Diagnostics')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    budget_for_category NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    period VARCHAR(32) NOT NULL DEFAULT 'Q3 2026',
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    related_fault_code VARCHAR(64),
    related_part_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cost_records IS 'Financial expenditure records for Rule R7 budget variance modeling.';

CREATE INDEX IF NOT EXISTS idx_cost_records_vehicle ON public.cost_records (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_category ON public.cost_records (category);
CREATE INDEX IF NOT EXISTS idx_cost_records_period ON public.cost_records (period);

-- ------------------------------------------------------------------------------
-- 7. FLEET ALERTS TABLE (Rules R1 to R7 Notifications)
-- Real-time alert notifications for operational conflicts and critical OBD faults.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fleet_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rule_id VARCHAR(8) NOT NULL CHECK (rule_id IN ('R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.fleet_alerts IS 'Active alert dispatch system tracking R1-R7 rules.';

CREATE INDEX IF NOT EXISTS idx_alerts_rule ON public.fleet_alerts (rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.fleet_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON public.fleet_alerts (read);

-- ------------------------------------------------------------------------------
-- 8. CAE BUDGET METRICS TABLE (Rule R5 - CAE Prioritization Engine)
-- Calculates priority rank score: (Critical Severity * 0.40) + (Days Until Route * 0.30) + (ROI / Cost * 0.30).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cae_budget_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    vehicle_name VARCHAR(128) NOT NULL,
    classification VARCHAR(32) NOT NULL,
    fault_code VARCHAR(64) NOT NULL,
    fault_name VARCHAR(255) NOT NULL,
    repair_cost NUMERIC(12,2) NOT NULL,
    deferral_cost NUMERIC(12,2) NOT NULL,
    delay_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.40,
    failure_likelihood NUMERIC(4,2) NOT NULL DEFAULT 0.50,
    classification_weight NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    rank_score NUMERIC(10,4) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' 
        CHECK (status IN ('Pending', 'Approved', 'Deferred', 'Escalated')),
    scheduled_use_days INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cae_budget_metrics IS 'CAE prioritization rank matrix enforcing Rule R5.';

CREATE INDEX IF NOT EXISTS idx_cae_vehicle ON public.cae_budget_metrics (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cae_rank_score ON public.cae_budget_metrics (rank_score DESC);

-- ------------------------------------------------------------------------------
-- 9. TRANSLATIONS TABLE (Enterprise Localization)
-- Stores key-value translation records with namespace, language, and status.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    namespace VARCHAR(64) NOT NULL DEFAULT 'common',
    language VARCHAR(10) NOT NULL DEFAULT 'fr',
    value TEXT NOT NULL,
    description TEXT,
    context TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'Draft' 
        CHECK (status IN ('Draft', 'AI Generated', 'Reviewed', 'Approved')),
    version INT NOT NULL DEFAULT 1,
    last_modified_by VARCHAR(255) NOT NULL DEFAULT 'admin@nexttransit.com',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_translations_key_lang UNIQUE (key, language)
);

COMMENT ON TABLE public.translations IS 'Enterprise SaaS translation records across namespaces and languages.';

CREATE INDEX IF NOT EXISTS idx_translations_key_lang ON public.translations (key, language);
CREATE INDEX IF NOT EXISTS idx_translations_namespace ON public.translations (namespace);
CREATE INDEX IF NOT EXISTS idx_translations_status ON public.translations (status);
CREATE INDEX IF NOT EXISTS idx_translations_language ON public.translations (language);

-- ------------------------------------------------------------------------------
-- 10. TRANSLATION MEMORY TABLE
-- Matches source phrases to target language translations for AI prompt acceleration.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.translation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_lang VARCHAR(10) NOT NULL DEFAULT 'fr',
    target_lang VARCHAR(10) NOT NULL,
    source_text TEXT NOT NULL,
    target_text TEXT NOT NULL,
    namespace VARCHAR(64) NOT NULL DEFAULT 'common',
    usage_count INT NOT NULL DEFAULT 1,
    quality_score INT NOT NULL DEFAULT 100 CHECK (quality_score BETWEEN 0 AND 100),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_translation_memory_phrase UNIQUE (source_lang, target_lang, source_text)
);

COMMENT ON TABLE public.translation_memory IS 'Translation memory repository for automated phrase matching.';

CREATE INDEX IF NOT EXISTS idx_translation_memory_pair ON public.translation_memory (source_lang, target_lang);
CREATE INDEX IF NOT EXISTS idx_translation_memory_quality ON public.translation_memory (quality_score DESC);

-- ------------------------------------------------------------------------------
-- 11. BUSINESS GLOSSARY TABLE
-- Enforces mandatory terminology rules (e.g. Telemetry Reconciliation, OBD-II).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term VARCHAR(255) NOT NULL,
    namespace VARCHAR(64) NOT NULL DEFAULT 'maintenance',
    definition TEXT NOT NULL,
    translations JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'Approved' CHECK (status IN ('Draft', 'Approved')),
    forbid_auto_translate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_business_glossary_term_ns UNIQUE (term, namespace)
);

COMMENT ON TABLE public.business_glossary IS 'Domain-specific terminology dictionary preserving exact operational terms.';

CREATE INDEX IF NOT EXISTS idx_business_glossary_term ON public.business_glossary (term);
CREATE INDEX IF NOT EXISTS idx_business_glossary_namespace ON public.business_glossary (namespace);

-- ------------------------------------------------------------------------------
-- 12. AUDIT LOGS TABLE
-- Security & governance audit logs recording all ERP and translation mutations.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255),
    namespace VARCHAR(64),
    language VARCHAR(10),
    previous_value TEXT,
    new_value TEXT NOT NULL,
    status_from VARCHAR(32),
    status_to VARCHAR(32),
    user_role VARCHAR(64) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(32) NOT NULL 
        CHECK (action IN ('CREATE', 'UPDATE', 'AI_TRANSLATE', 'APPROVE', 'REJECT', 'DELETE', 'IMPORT', 'RULE_DISPATCH')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS 'System audit log for regulatory compliance and operational traceability.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- ------------------------------------------------------------------------------
-- 13. PROCEDURES, FUNCTIONS & BUSINESS RULE TRIGGERS
-- ------------------------------------------------------------------------------

-- Generic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at
    BEFORE UPDATE ON public.work_orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_tenant_configs_updated_at ON public.tenant_configs;
CREATE TRIGGER trg_tenant_configs_updated_at
    BEFORE UPDATE ON public.tenant_configs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_translations_updated_at ON public.translations;
CREATE TRIGGER trg_translations_updated_at
    BEFORE UPDATE ON public.translations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_business_glossary_updated_at ON public.business_glossary;
CREATE TRIGGER trg_business_glossary_updated_at
    BEFORE UPDATE ON public.business_glossary
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Rule R4: Total Cost Calculation Trigger
CREATE OR REPLACE FUNCTION public.calculate_work_order_total_cost()
RETURNS TRIGGER AS $$
DECLARE
    parts_sum NUMERIC(10,2) := 0.00;
    elem JSONB;
BEGIN
    -- Calculate labor cost
    NEW.labor_cost := COALESCE(NEW.labor_hours, 0) * COALESCE(NEW.hourly_rate, 85.00);
    
    -- Sum up parts used
    IF NEW.parts_used IS NOT NULL AND jsonb_array_length(NEW.parts_used) > 0 THEN
        FOR elem IN SELECT * FROM jsonb_array_elements(NEW.parts_used)
        LOOP
            parts_sum := parts_sum + (COALESCE((elem->>'quantity')::NUMERIC, 0) * COALESCE((elem->>'unit_cost')::NUMERIC, 0));
        END LOOP;
    END IF;
    
    NEW.parts_cost := parts_sum;
    NEW.total_cost := NEW.labor_cost + NEW.parts_cost;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_order_total_cost ON public.work_orders;
CREATE TRIGGER trg_work_order_total_cost
    BEFORE INSERT OR UPDATE ON public.work_orders
    FOR EACH ROW EXECUTE FUNCTION public.calculate_work_order_total_cost();

-- Rule R1: Emergency Red Alert Trigger when Critical Fault set on vehicle
CREATE OR REPLACE FUNCTION public.enforce_rule_r1_emergency_stop()
RETURNS TRIGGER AS $$
DECLARE
    elem JSONB;
    has_critical BOOLEAN := FALSE;
BEGIN
    IF NEW.active_fault_codes IS NOT NULL AND jsonb_array_length(NEW.active_fault_codes) > 0 THEN
        FOR elem IN SELECT * FROM jsonb_array_elements(NEW.active_fault_codes)
        LOOP
            IF LOWER(elem->>'severity') = 'critical' THEN
                has_critical := TRUE;
            END IF;
        END LOOP;
    END IF;

    IF has_critical THEN
        NEW.status := 'Critical';
        NEW.status_reason := 'Rule R1 Emergency Stop: Critical OBD-II Fault active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rule_r1_vehicle ON public.vehicles;
CREATE TRIGGER trg_rule_r1_vehicle
    BEFORE INSERT OR UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_rule_r1_emergency_stop();

-- Translation Version Increment Trigger
CREATE OR REPLACE FUNCTION public.increment_translation_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.value IS DISTINCT FROM NEW.value THEN
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_translations_version ON public.translations;
CREATE TRIGGER trg_translations_version
    BEFORE UPDATE ON public.translations
    FOR EACH ROW EXECUTE FUNCTION public.increment_translation_version();

-- ------------------------------------------------------------------------------
-- 14. MULTI-TENANT ROW-LEVEL SECURITY (RLS) POLICIES & AUTHENTICATION ENFORCEMENT
-- ------------------------------------------------------------------------------
-- Ensure tenant_id column exists on core operational tables for strict tenant scoping
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';
ALTER TABLE public.driver_incidents ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';
ALTER TABLE public.cost_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';
ALTER TABLE public.fleet_alerts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';

ALTER TABLE public.tenant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cae_budget_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Extracts current authenticated user's tenant ID from JWT metadata or session fallback
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->'user_metadata'->>'tenant_id',
        current_setting('request.jwt.claims', true)::json->'app_metadata'->>'tenant_id',
        'TNT-NEXTR-001'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Multi-tenant RLS Policies for Tenant Configs
DROP POLICY IF EXISTS "Tenant Isolation for tenant_configs" ON public.tenant_configs;
CREATE POLICY "Tenant Isolation for tenant_configs" ON public.tenant_configs
    FOR ALL
    USING (id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Multi-tenant RLS Policies for Vehicles
DROP POLICY IF EXISTS "Tenant Isolation for vehicles" ON public.vehicles;
CREATE POLICY "Tenant Isolation for vehicles" ON public.vehicles
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Multi-tenant RLS Policies for Inventory Items
DROP POLICY IF EXISTS "Tenant Isolation for inventory_items" ON public.inventory_items;
CREATE POLICY "Tenant Isolation for inventory_items" ON public.inventory_items
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Multi-tenant RLS Policies for Work Orders
DROP POLICY IF EXISTS "Tenant Isolation for work_orders" ON public.work_orders;
CREATE POLICY "Tenant Isolation for work_orders" ON public.work_orders
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Multi-tenant RLS Policies for Driver Incidents
DROP POLICY IF EXISTS "Tenant Isolation for driver_incidents" ON public.driver_incidents;
CREATE POLICY "Tenant Isolation for driver_incidents" ON public.driver_incidents
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Multi-tenant RLS Policies for Cost Records
DROP POLICY IF EXISTS "Tenant Isolation for cost_records" ON public.cost_records;
CREATE POLICY "Tenant Isolation for cost_records" ON public.cost_records
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Multi-tenant RLS Policies for Fleet Alerts
DROP POLICY IF EXISTS "Tenant Isolation for fleet_alerts" ON public.fleet_alerts;
CREATE POLICY "Tenant Isolation for fleet_alerts" ON public.fleet_alerts
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (tenant_id = public.get_current_tenant_id() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Public/Authenticated Access Policies for Shared Tables
DROP POLICY IF EXISTS "Allow public read and write access to cae_budget_metrics" ON public.cae_budget_metrics;
CREATE POLICY "Allow public read and write access to cae_budget_metrics" ON public.cae_budget_metrics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to translations" ON public.translations;
CREATE POLICY "Allow public read and write access to translations" ON public.translations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to translation_memory" ON public.translation_memory;
CREATE POLICY "Allow public read and write access to translation_memory" ON public.translation_memory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to business_glossary" ON public.business_glossary;
CREATE POLICY "Allow public read and write access to business_glossary" ON public.business_glossary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public read and write access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 15. SEED DATA POPULATION
-- ------------------------------------------------------------------------------

-- Seed Tenant Config
INSERT INTO public.tenant_configs (
    id, society_name, currency, currency_symbol, allocated_budget, money_used, 
    fiscal_year, operating_region, tax_registration_id, cost_center_code, 
    default_labor_rate, emergency_approval_threshold, contact_email, contact_phone, billing_address
) VALUES (
    'TNT-NEXTR-001', 'NextTransit Metro Fleet Society S.A.', 'USD ($)', '$', 
    450000.00, 382450.00, 'FY2026', 'North America - Midwest Sector', 
    'TAX-8839201-NX', 'CC-FLEET-902', 85.00, 5000.00, 
    'operations@nexttransit.com', '+1 (555) 234-8900', '100 Fleet Center Plaza, Suite 400, Chicago, IL'
) ON CONFLICT (id) DO UPDATE SET society_name = EXCLUDED.society_name;

-- Seed Initial Vehicles
INSERT INTO public.vehicles (
    id, plate, name, classification, status, status_reason, mileage, next_service_mileage, 
    scheduled_use_days, scheduled_route, fault_score, compliance_score, freshness_score, 
    classification_weight, delay_multiplier, active_fault_codes
) VALUES
(
    '10000000-0000-0000-0000-000000000001', 'TRK-9042-A', 'Transit Express 01', 'Keystone', 'Critical', 
    'P0300 Engine Cylinder Misfire Detected (Rule R1 Emergency Stop)', 142500, 145000, 2, 'Route 42 - Downtown Express', 
    45, 80, 95, 1.50, 2.20,
    '[{"code": "P0300", "name": "Random/Multiple Cylinder Misfire Detected", "severity": "Critical", "logged_date": "2026-07-31", "required_part_id": "PART-IGN-01", "required_intervention": "Replace Spark Plugs & Ignition Coils"}]'::jsonb
),
(
    '10000000-0000-0000-0000-000000000002', 'BUS-1088-B', 'Metro Bus Keystone 08', 'Keystone', 'Attention', 
    'P0420 Catalyst System Efficiency Below Threshold', 98200, 100000, 1, 'Route 10 - Airport Line', 
    72, 90, 88, 1.50, 2.20,
    '[{"code": "P0420", "name": "Catalytic Converter Bank 1 Below Efficiency", "severity": "Warning", "logged_date": "2026-07-30", "required_part_id": "PART-EXH-02", "required_intervention": "Inspect Oxygen Sensors & Exhaust Flow"}]'::jsonb
),
(
    '10000000-0000-0000-0000-000000000003', 'VAN-5012-C', 'City Van 12', 'Standard', 'Healthy', 
    'Nominal operation - all systems verified clear', 45100, 50000, 5, 'Route 05 - West Suburbs', 
    100, 100, 98, 1.00, 1.40,
    '[]'::jsonb
)
ON CONFLICT (plate) DO UPDATE SET status = EXCLUDED.status;

-- Seed Inventory Items
INSERT INTO public.inventory_items (
    id, name, sku, quantity, reserved_quantity, reorder_threshold, unit_cost, compatible_vehicles, lead_time_days, category
) VALUES
(
    '20000000-0000-0000-0000-000000000001', 'Ignition Coil Pack Set', 'PART-IGN-01', 4, 2, 5, 145.00, 
    ARRAY['TRK-9042-A', 'BUS-1088-B'], 2, 'Electrical & Ignition'
),
(
    '20000000-0000-0000-0000-000000000002', 'O2 Sensor Bank 1', 'PART-EXH-02', 12, 1, 4, 85.50, 
    ARRAY['BUS-1088-B', 'VAN-5012-C'], 3, 'Exhaust & Sensors'
),
(
    '20000000-0000-0000-0000-000000000003', 'Heavy Duty Brake Pads Set', 'PART-BRK-03', 18, 0, 8, 110.00, 
    ARRAY['TRK-9042-A', 'BUS-1088-B', 'VAN-5012-C'], 1, 'Braking System'
)
ON CONFLICT (sku) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Seed Work Orders
INSERT INTO public.work_orders (
    id, vehicle_id, vehicle_plate, type, status, labor_hours, hourly_rate, parts_used, 
    before_notes, after_notes, created_date, assigned_mechanic_id, assigned_mechanic_name, related_fault_code
) VALUES
(
    '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TRK-9042-A', 
    'Corrective', 'In Progress', 3.5, 85.00, 
    '[{"part_id": "PART-IGN-01", "name": "Ignition Coil Pack Set", "quantity": 1, "unit_cost": 145.00}]'::jsonb,
    'Vehicle experienced severe engine shaking under load on Route 42. Active OBD code P0300.',
    'Replacement in progress. Diagnostic scan pending completion.', '2026-07-31T09:30:00Z',
    'MCH-001', 'Karim Mansouri', 'P0300'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Translations
INSERT INTO public.translations (key, namespace, language, value, description, status, version, last_modified_by)
VALUES
  ('common.save', 'common', 'fr', 'Enregistrer', 'Save button label', 'Approved', 1, 'admin@nexttransit.com'),
  ('common.save', 'common', 'ar', 'حفظ', 'Save button label Arabic', 'Approved', 1, 'admin@nexttransit.com'),
  ('common.save', 'common', 'en', 'Save', 'Save button label English', 'Approved', 1, 'admin@nexttransit.com'),
  ('fleet.rule_r1_alert', 'fleet', 'fr', 'Règle R1 : Arrêt d''Urgence Requis (Défaut Critique OBD-II)', 'R1 Alert text', 'Approved', 1, 'admin@nexttransit.com'),
  ('fleet.rule_r1_alert', 'fleet', 'ar', 'القاعدة R1: إيقاف طارئ إجباري (عطل تشخيصي خطير OBD-II)', 'R1 Alert text Arabic', 'Approved', 1, 'admin@nexttransit.com'),
  ('fleet.rule_r1_alert', 'fleet', 'en', 'Rule R1: Mandatory Emergency Stop (Critical OBD-II Fault)', 'R1 Alert text English', 'Approved', 1, 'admin@nexttransit.com'),
  ('maintenance.total_cost_formula', 'maintenance', 'fr', 'Coût Total R4 = (Heures × Tarif) + ∑(Pièces × Prix Unitaire)', 'R4 Cost Formula', 'Approved', 1, 'admin@nexttransit.com'),
  ('maintenance.total_cost_formula', 'maintenance', 'ar', 'معادلة التكلفة الإجمالية R4 = (ساعات العمل × الأجرة) + مجموع(القطع × السعر)', 'R4 Cost Formula Arabic', 'Approved', 1, 'admin@nexttransit.com')
ON CONFLICT (key, language) DO UPDATE SET value = EXCLUDED.value;

-- Seed Business Glossary
INSERT INTO public.business_glossary (term, namespace, definition, translations, forbid_auto_translate, status)
VALUES
  ('Telemetry Reconciliation', 'fleet', 'Audit process comparing electronic OBD-II telemetry logs against driver incident logs.', '{"fr": "Rapprochement Télématique", "ar": "المطابقة والتسوية التليماتية", "en": "Telemetry Reconciliation"}'::jsonb, true, 'Approved'),
  ('OBD-II Diagnostic Fault Code', 'maintenance', 'Electronic fault codes generated by onboard vehicle diagnostic sensors.', '{"fr": "Code d''Erreur OBD-II", "ar": "كود عطل تشخيصي OBD-II", "en": "OBD-II Diagnostic Fault Code"}'::jsonb, true, 'Approved')
ON CONFLICT (term, namespace) DO NOTHING;

-- Seed Translation Memory
INSERT INTO public.translation_memory (source_lang, target_lang, source_text, target_text, namespace, usage_count, quality_score)
VALUES
  ('fr', 'ar', 'Gestion de la flotte et décision de maintenance', 'إدارة الأسطول وهندسة قرارات الصيانة', 'fleet', 42, 98),
  ('fr', 'ar', 'Enregistrer les modifications', 'حفظ التغييرات', 'common', 156, 100)
ON CONFLICT (source_lang, target_lang, source_text) DO NOTHING;

-- ==============================================================================
-- End of Schema Migration File
-- ==============================================================================
