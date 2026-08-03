-- Migration Name: 20260801000002_production_ready_security
-- Description: Implement strict profiles, secure tenant identification from table state, R1-R7 schema alignment, and atomic close work order RPC.

-- 1. Ensure tenant_id column exists on all relevant tables
ALTER TABLE public.cae_budget_metrics ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001';

-- 2. Create Profiles Table (True identity source of truth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'TNT-NEXTR-001',
    role VARCHAR(32) NOT NULL DEFAULT 'DRIVER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Profiles Trigger to automatically provision profiles upon Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, tenant_id, role, is_active)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'tenant_id', 'TNT-NEXTR-001'),
        COALESCE(new.raw_user_meta_data->>'role', 'DRIVER'),
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure profiles are populated for any existing Auth users
INSERT INTO public.profiles (id, tenant_id, role, is_active)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'tenant_id', 'TNT-NEXTR-001'),
    COALESCE(raw_user_meta_data->>'role', 'DRIVER'),
    TRUE
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Re-implement Tenant & Role Identifiers (Now referencing the secure Profiles table)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS VARCHAR(64) AS $$
DECLARE
    v_tenant_id VARCHAR(64);
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(v_tenant_id, 'TNT-NEXTR-001');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR(32) AS $$
DECLARE
    v_role VARCHAR(32);
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(v_role, 'DRIVER');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Profiles RLS Policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin and Fleet Manager can manage profiles" ON public.profiles;
CREATE POLICY "Admin and Fleet Manager can manage profiles" ON public.profiles
    FOR ALL USING (
        auth.uid() = id OR 
        (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() IN ('DIRECTOR', 'FLEET_MANAGER'))
    );

-- 6. Rewrite Multi-tenant RLS Policies for Core Operational Tables
-- No more "OR auth.role() = 'anon'" loopholes!

-- tenant_configs
DROP POLICY IF EXISTS "Tenant Isolation for tenant_configs" ON public.tenant_configs;
CREATE POLICY "Tenant Isolation for tenant_configs" ON public.tenant_configs
    FOR SELECT USING (id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation write for tenant_configs" ON public.tenant_configs
    FOR ALL USING (id = public.get_current_tenant_id() AND auth.role() = 'authenticated' AND public.get_current_user_role() IN ('DIRECTOR', 'FLEET_MANAGER', 'MGMT_CONTROLLER'));

-- vehicles
DROP POLICY IF EXISTS "Tenant Isolation for vehicles" ON public.vehicles;
CREATE POLICY "Tenant Isolation SELECT for vehicles" ON public.vehicles
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation ALL for vehicles" ON public.vehicles
    FOR ALL USING (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated');

-- inventory_items
DROP POLICY IF EXISTS "Tenant Isolation for inventory_items" ON public.inventory_items;
CREATE POLICY "Tenant Isolation SELECT for inventory_items" ON public.inventory_items
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation ALL for inventory_items" ON public.inventory_items
    FOR ALL USING (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated');

-- work_orders
DROP POLICY IF EXISTS "Tenant Isolation for work_orders" ON public.work_orders;
CREATE POLICY "Tenant Isolation SELECT for work_orders" ON public.work_orders
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation ALL for work_orders" ON public.work_orders
    FOR ALL USING (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated');

-- driver_incidents
DROP POLICY IF EXISTS "Tenant Isolation for driver_incidents" ON public.driver_incidents;
CREATE POLICY "Tenant Isolation SELECT for driver_incidents" ON public.driver_incidents
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation ALL for driver_incidents" ON public.driver_incidents
    FOR ALL USING (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated');

-- cost_records
DROP POLICY IF EXISTS "Tenant Isolation for cost_records" ON public.cost_records;
CREATE POLICY "Tenant Isolation SELECT for cost_records" ON public.cost_records
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation ALL for cost_records" ON public.cost_records
    FOR ALL USING (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated');

-- fleet_alerts
DROP POLICY IF EXISTS "Tenant Isolation for fleet_alerts" ON public.fleet_alerts;
CREATE POLICY "Tenant Isolation SELECT for fleet_alerts" ON public.fleet_alerts
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation ALL for fleet_alerts" ON public.fleet_alerts
    FOR ALL USING (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated');

-- cae_budget_metrics (Strict Tenant + Role scoping for financial priority mapping)
DROP POLICY IF EXISTS "Allow public read and write access to cae_budget_metrics" ON public.cae_budget_metrics;
CREATE POLICY "Tenant SELECT for cae_budget_metrics" ON public.cae_budget_metrics
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant ALL for cae_budget_metrics" ON public.cae_budget_metrics
    FOR ALL USING (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated' AND public.get_current_user_role() IN ('DIRECTOR', 'MGMT_CONTROLLER'));

-- translations (Global dictionary - read by all authenticated; write by DIRECTOR/FLEET_MANAGER)
DROP POLICY IF EXISTS "Allow public read and write access to translations" ON public.translations;
CREATE POLICY "Select translations" ON public.translations
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modify translations" ON public.translations
    FOR ALL USING (auth.role() = 'authenticated' AND public.get_current_user_role() IN ('DIRECTOR', 'FLEET_MANAGER'));

-- translation_memory
DROP POLICY IF EXISTS "Allow public read and write access to translation_memory" ON public.translation_memory;
CREATE POLICY "Select translation_memory" ON public.translation_memory
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modify translation_memory" ON public.translation_memory
    FOR ALL USING (auth.role() = 'authenticated' AND public.get_current_user_role() IN ('DIRECTOR', 'FLEET_MANAGER'));

-- business_glossary
DROP POLICY IF EXISTS "Allow public read and write access to business_glossary" ON public.business_glossary;
CREATE POLICY "Select business_glossary" ON public.business_glossary
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modify business_glossary" ON public.business_glossary
    FOR ALL USING (auth.role() = 'authenticated' AND public.get_current_user_role() IN ('DIRECTOR', 'FLEET_MANAGER'));

-- audit_logs
DROP POLICY IF EXISTS "Allow public read and write access to audit_logs" ON public.audit_logs;
CREATE POLICY "Select audit_logs" ON public.audit_logs
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Insert audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id() AND auth.role() = 'authenticated');

-- 7. Atomic RPC for Work Order Completion (R1-R7 state transition orchestration)
CREATE OR REPLACE FUNCTION public.close_work_order_atomic(
    p_work_order_id UUID,
    p_after_notes TEXT,
    p_closed_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_vehicle_id UUID;
    v_vehicle_plate VARCHAR(32);
    v_related_fault_code VARCHAR(64);
    v_parts_used JSONB;
    v_labor_cost NUMERIC(10,2);
    v_type VARCHAR(32);
    v_tenant_id VARCHAR(64);
    v_part RECORD;
    v_parts_cost NUMERIC(10,2) := 0.00;
    v_total_cost NUMERIC(12,2);
    v_new_status VARCHAR(32) := 'Healthy';
    v_new_reason TEXT;
    v_remaining_faults JSONB := '[]'::jsonb;
    v_new_history JSONB;
    v_cost_category VARCHAR(64);
    v_cost_id UUID := gen_random_uuid();
    v_alert_id UUID := gen_random_uuid();
BEGIN
    -- 1. Fetch details from the work order
    SELECT vehicle_id, vehicle_plate, type, parts_used, labor_cost, related_fault_code, tenant_id
    INTO v_vehicle_id, v_vehicle_plate, v_type, v_parts_used, v_labor_cost, v_related_fault_code, v_tenant_id
    FROM public.work_orders
    WHERE id = p_work_order_id AND status <> 'Closed';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 2. Update Work Order status
    UPDATE public.work_orders
    SET status = 'Closed',
        after_notes = p_after_notes,
        closed_date = p_closed_date,
        updated_at = NOW()
    WHERE id = p_work_order_id;

    -- 3. Consume Inventory Items (Deduct stock) and calculate parts cost
    FOR v_part IN SELECT * FROM jsonb_to_recordset(v_parts_used) AS x(part_id UUID, name VARCHAR, quantity INT, unit_cost NUMERIC) LOOP
        -- Deduct stock
        UPDATE public.inventory_items
        SET quantity = GREATEST(0, quantity - v_part.quantity),
            updated_at = NOW()
        WHERE id = v_part.part_id;

        -- Accumulate parts cost
        v_parts_cost := v_parts_cost + (v_part.quantity * v_part.unit_cost);

        -- Low Stock Alert checks (Rule R3 threshold evaluation)
        INSERT INTO public.fleet_alerts (rule_id, title, description, severity, part_id, read, tenant_id)
        SELECT 'R3', 'R3 Inventory Alert: Low Stock for ' || name,
               'Stock for ' || sku || ' dropped to ' || quantity || ' unit(s) after Work Order ' || p_work_order_id::text || ' (Threshold: ' || reorder_threshold || ').',
               'warning', id, FALSE, tenant_id
        FROM public.inventory_items
        WHERE id = v_part.part_id AND quantity <= reorder_threshold;
    END LOOP;

    -- Update work order costs
    v_total_cost := v_labor_cost + v_parts_cost;
    UPDATE public.work_orders
    SET parts_cost = v_parts_cost,
        total_cost = v_total_cost
    WHERE id = p_work_order_id;

    -- 4. Calculate new vehicle status and update vehicle
    SELECT 
        COALESCE(jsonb_agg(elem), '[]'::jsonb)
    INTO v_remaining_faults
    FROM public.vehicles v,
         LATERAL jsonb_array_elements(v.active_fault_codes) elem
    WHERE v.id = v_vehicle_id AND elem->>'code' <> COALESCE(v_related_fault_code, '');

    IF v_remaining_faults IS NULL THEN
        v_remaining_faults := '[]'::jsonb;
    END IF;

    IF jsonb_array_length(v_remaining_faults) > 0 THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_remaining_faults) x WHERE x->>'severity' = 'Critical') THEN
            v_new_status := 'Critical';
        ELSE
            v_new_status := 'Attention';
        END IF;
        v_new_reason := 'Remaining ' || jsonb_array_length(v_remaining_faults)::text || ' active fault(s)';
    ELSE
        v_new_status := 'Healthy';
        v_new_reason := 'All faults cleared via Work Order ' || p_work_order_id::text;
    END IF;

    -- Build new maintenance history item
    v_new_history := jsonb_build_object(
        'id', 'MH-' || extract(epoch from NOW())::bigint::text,
        'date', CURRENT_DATE::text,
        'type', CASE WHEN v_type = 'Corrective' THEN 'Corrective' ELSE 'Preventive' END,
        'summary', 'Completed ' || v_type || ': ' || p_work_order_id::text || ' - ' || p_after_notes,
        'work_order_id', p_work_order_id::text,
        'labor_cost', v_labor_cost,
        'parts_cost', v_parts_cost,
        'total_cost', v_total_cost
    );

    UPDATE public.vehicles
    SET status = v_new_status,
        status_reason = v_new_reason,
        active_fault_codes = v_remaining_faults,
        maintenance_history = jsonb_insert(maintenance_history, '{0}', v_new_history, true),
        updated_at = NOW()
    WHERE id = v_vehicle_id;

    -- 5. Record new CostRecord for Variance tracking (Rule R4 / R7)
    v_cost_category := CASE WHEN v_type = 'Corrective' THEN 'Corrective Repair' ELSE 'Preventive Maintenance' END;
    INSERT INTO public.cost_records (id, vehicle_id, vehicle_plate, category, amount, budget_for_category, period, work_order_id, related_fault_code, tenant_id)
    VALUES (v_cost_id, v_vehicle_id, v_vehicle_plate, v_cost_category, v_total_cost, 15000.00, 'Q3 2026', p_work_order_id, v_related_fault_code, v_tenant_id);

    -- 6. Insert alert/notification of completion
    INSERT INTO public.fleet_alerts (id, rule_id, title, description, severity, vehicle_id, read, tenant_id)
    VALUES (v_alert_id, 'R1', 'Work Order Completed: ' || p_work_order_id::text, 
            'Mechanic completed repair on ' || v_vehicle_plate || '. Vehicle health restored.', 
            'info', v_vehicle_id, FALSE, v_tenant_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
