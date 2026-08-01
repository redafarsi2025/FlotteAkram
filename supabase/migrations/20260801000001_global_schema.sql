-- ==============================================================================
-- NextTransit Enterprise Fleet Operations, Telemetry Reconciliation,
-- Maintenance Decision Engine & Localization - Global Schema Migration
-- Migration Script: 20260801000001_global_schema.sql
-- Database: Supabase (PostgreSQL 15+)
-- Description: Complete production schema covering tenant configs, vehicles, 
--              work orders, inventory items, driver incidents, cost records,
--              alerts, CAE metrics, translations, translation memory, 
--              glossary, audit logs, procedures, triggers, and RLS policies.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TENANT CONFIGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_configs (
    id VARCHAR(64) PRIMARY KEY,
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

COMMENT ON TABLE public.tenant_configs IS 'Multi-tenant organization configurations and budget allocations.';

-- ------------------------------------------------------------------------------
-- 2. VEHICLES TABLE (Fleet Health Grid)
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
    active_fault_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
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

COMMENT ON TABLE public.vehicles IS 'Fleet vehicles with real-time OBD-II telemetry and status.';

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles (plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_classification ON public.vehicles (classification);

-- ------------------------------------------------------------------------------
-- 3. INVENTORY ITEMS TABLE (Rule R3 - Inventory Reservation System)
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

COMMENT ON TABLE public.inventory_items IS 'Warehouse parts stock and reservation buffers.';

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items (sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items (category);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON public.inventory_items (quantity);

-- ------------------------------------------------------------------------------
-- 4. WORK ORDERS TABLE (Rule R4 - Total Cost Formula)
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
    parts_used JSONB NOT NULL DEFAULT '[]'::jsonb,
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

COMMENT ON TABLE public.work_orders IS 'Automated work order lifecycle engine enforcing Total Cost Rule R4.';

CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON public.work_orders (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders (status);

-- ------------------------------------------------------------------------------
-- 5. DRIVER INCIDENTS TABLE (Rule R6 - Incident Audit)
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

COMMENT ON TABLE public.driver_incidents IS 'Driver incident audit logs for Rule R6.';

CREATE INDEX IF NOT EXISTS idx_incidents_vehicle_id ON public.driver_incidents (vehicle_id);

-- ------------------------------------------------------------------------------
-- 6. COST RECORDS TABLE (Rule R7 - Variance Analysis)
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

COMMENT ON TABLE public.cost_records IS 'Financial records for Rule R7 budget variance modeling.';

CREATE INDEX IF NOT EXISTS idx_cost_records_vehicle ON public.cost_records (vehicle_id);

-- ------------------------------------------------------------------------------
-- 7. FLEET ALERTS TABLE (Rules R1 - R7 Dispatch)
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

COMMENT ON TABLE public.fleet_alerts IS 'Alert log for R1-R7 rules.';

-- ------------------------------------------------------------------------------
-- 8. CAE BUDGET METRICS TABLE (Rule R5)
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

COMMENT ON TABLE public.cae_budget_metrics IS 'CAE priority rank table for Rule R5.';

-- ------------------------------------------------------------------------------
-- 9. TRANSLATIONS TABLE (Enterprise Localization)
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

COMMENT ON TABLE public.translations IS 'Enterprise localization dictionary entries.';

-- ------------------------------------------------------------------------------
-- 10. TRANSLATION MEMORY TABLE
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

-- ------------------------------------------------------------------------------
-- 11. BUSINESS GLOSSARY TABLE
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

-- ------------------------------------------------------------------------------
-- 12. AUDIT LOGS TABLE
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

-- ------------------------------------------------------------------------------
-- 13. TRIGGERS & PROCEDURES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_tenant_configs_updated_at ON public.tenant_configs;
CREATE TRIGGER trg_tenant_configs_updated_at BEFORE UPDATE ON public.tenant_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_translations_updated_at ON public.translations;
CREATE TRIGGER trg_translations_updated_at BEFORE UPDATE ON public.translations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_business_glossary_updated_at ON public.business_glossary;
CREATE TRIGGER trg_business_glossary_updated_at BEFORE UPDATE ON public.business_glossary FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Rule R4 Total Cost Calculation Trigger
CREATE OR REPLACE FUNCTION public.calculate_work_order_total_cost()
RETURNS TRIGGER AS $$
DECLARE
    parts_sum NUMERIC(10,2) := 0.00;
    elem JSONB;
BEGIN
    NEW.labor_cost := COALESCE(NEW.labor_hours, 0) * COALESCE(NEW.hourly_rate, 85.00);
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
CREATE TRIGGER trg_work_order_total_cost BEFORE INSERT OR UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.calculate_work_order_total_cost();

-- Rule R1 Emergency Red Alert Trigger
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
CREATE TRIGGER trg_rule_r1_vehicle BEFORE INSERT OR UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.enforce_rule_r1_emergency_stop();

-- ------------------------------------------------------------------------------
-- 14. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Allow public read and write access to tenant_configs" ON public.tenant_configs;
CREATE POLICY "Allow public read and write access to tenant_configs" ON public.tenant_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to vehicles" ON public.vehicles;
CREATE POLICY "Allow public read and write access to vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to inventory_items" ON public.inventory_items;
CREATE POLICY "Allow public read and write access to inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to work_orders" ON public.work_orders;
CREATE POLICY "Allow public read and write access to work_orders" ON public.work_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to driver_incidents" ON public.driver_incidents;
CREATE POLICY "Allow public read and write access to driver_incidents" ON public.driver_incidents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to cost_records" ON public.cost_records;
CREATE POLICY "Allow public read and write access to cost_records" ON public.cost_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write access to fleet_alerts" ON public.fleet_alerts;
CREATE POLICY "Allow public read and write access to fleet_alerts" ON public.fleet_alerts FOR ALL USING (true) WITH CHECK (true);

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
