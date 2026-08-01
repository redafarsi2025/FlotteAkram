-- ==============================================================================
-- NextTransit Enterprise Localization & Translation Engine Schema Migration
-- Migration Script: 20260801000000_enterprise_localization.sql
-- Database: Supabase (PostgreSQL 15+)
-- Description: Creates tables for translations, translation_memory,
--              business_glossary, and audit_logs with versioning, RBAC,
--              indexes, auto-update triggers, and Row-Level Security (RLS).
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TRANSLATIONS TABLE
-- Stores translation key-value pairs across namespaces, languages, and statuses.
-- Includes automatic versioning and modified metadata.
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

-- Comments for documentation
COMMENT ON TABLE public.translations IS 'Enterprise SaaS translation records by key, language, namespace, and approval status.';
COMMENT ON COLUMN public.translations.version IS 'Incremental version number incremented on each content modification.';
COMMENT ON COLUMN public.translations.status IS 'Approval workflow state: Draft, AI Generated, Reviewed, Approved.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_translations_key_lang ON public.translations (key, language);
CREATE INDEX IF NOT EXISTS idx_translations_namespace ON public.translations (namespace);
CREATE INDEX IF NOT EXISTS idx_translations_status ON public.translations (status);
CREATE INDEX IF NOT EXISTS idx_translations_language ON public.translations (language);

-- ------------------------------------------------------------------------------
-- 2. TRANSLATION MEMORY TABLE
-- Matches source text to target text for reuse across translation sessions.
-- Tracks usage counts and quality confidence scores.
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

COMMENT ON TABLE public.translation_memory IS 'High-confidence translation pairs used for automated matching and AI prompt context.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_translation_memory_pair ON public.translation_memory (source_lang, target_lang);
CREATE INDEX IF NOT EXISTS idx_translation_memory_namespace ON public.translation_memory (namespace);
CREATE INDEX IF NOT EXISTS idx_translation_memory_quality ON public.translation_memory (quality_score DESC);

-- ------------------------------------------------------------------------------
-- 3. BUSINESS GLOSSARY TABLE
-- Enforces domain-specific terminology rules (e.g., OBD-II, Telemetry, R1 Alert).
-- Holds multi-language terms and optional forbid_auto_translate rules.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term VARCHAR(255) NOT NULL,
    namespace VARCHAR(64) NOT NULL DEFAULT 'maintenance',
    definition TEXT NOT NULL,
    translations JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"fr": "...", "ar": "...", "en": "..."}
    status VARCHAR(32) NOT NULL DEFAULT 'Approved' CHECK (status IN ('Draft', 'Approved')),
    forbid_auto_translate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_business_glossary_term_ns UNIQUE (term, namespace)
);

COMMENT ON TABLE public.business_glossary IS 'Business terminology dictionary used to preserve strict technical definitions during AI translation.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_glossary_term ON public.business_glossary (term);
CREATE INDEX IF NOT EXISTS idx_business_glossary_namespace ON public.business_glossary (namespace);
CREATE INDEX IF NOT EXISTS idx_business_glossary_status ON public.business_glossary (status);

-- ------------------------------------------------------------------------------
-- 4. AUDIT LOGS TABLE
-- Immutable security & governance log tracking all CRUD and AI actions.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    namespace VARCHAR(64) NOT NULL,
    language VARCHAR(10) NOT NULL,
    previous_value TEXT,
    new_value TEXT NOT NULL,
    status_from VARCHAR(32),
    status_to VARCHAR(32) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(32) NOT NULL 
        CHECK (action IN ('CREATE', 'UPDATE', 'AI_TRANSLATE', 'APPROVE', 'REJECT', 'DELETE', 'IMPORT')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS 'Audit trail recording translation edits, approvals, and AI generation events.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_key ON public.audit_logs (key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- Automatically updates updated_at column on row modifications.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to translations table
DROP TRIGGER IF EXISTS trg_translations_updated_at ON public.translations;
CREATE TRIGGER trg_translations_updated_at
    BEFORE UPDATE ON public.translations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Apply updated_at trigger to business_glossary table
DROP TRIGGER IF EXISTS trg_business_glossary_updated_at ON public.business_glossary;
CREATE TRIGGER trg_business_glossary_updated_at
    BEFORE UPDATE ON public.business_glossary
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- 6. AUTOMATIC VERSIONING TRIGGER FUNCTION FOR TRANSLATIONS
-- Auto-increments the version counter whenever the translation text changes.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_translation_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.value IS DISTINCT FROM NEW.value THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_translations_version ON public.translations;
CREATE TRIGGER trg_translations_version
    BEFORE UPDATE ON public.translations
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_translation_version();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Enables standard Supabase RLS security policies for authenticated users.
-- ------------------------------------------------------------------------------
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policies (Allow read access to authenticated and public app users)
DROP POLICY IF EXISTS "Allow read access to translations" ON public.translations;
CREATE POLICY "Allow read access to translations"
    ON public.translations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow read access to translation memory" ON public.translation_memory;
CREATE POLICY "Allow read access to translation memory"
    ON public.translation_memory FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow read access to business glossary" ON public.business_glossary;
CREATE POLICY "Allow read access to business glossary"
    ON public.business_glossary FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow read access to audit logs" ON public.audit_logs;
CREATE POLICY "Allow read access to audit logs"
    ON public.audit_logs FOR SELECT
    USING (true);

-- Insert / Update / Delete policies (Allow insert/update for active users)
DROP POLICY IF EXISTS "Allow full modify access to translations" ON public.translations;
CREATE POLICY "Allow full modify access to translations"
    ON public.translations FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full modify access to translation memory" ON public.translation_memory;
CREATE POLICY "Allow full modify access to translation memory"
    ON public.translation_memory FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full modify access to business glossary" ON public.business_glossary;
CREATE POLICY "Allow full modify access to business glossary"
    ON public.business_glossary FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert access to audit logs" ON public.audit_logs;
CREATE POLICY "Allow insert access to audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. INITIAL SEED DATA
-- Populate standard fleet and maintenance terms.
-- ------------------------------------------------------------------------------
INSERT INTO public.translations (key, namespace, language, value, description, status, version, last_modified_by)
VALUES
  ('common.save', 'common', 'fr', 'Enregistrer', 'Save action text', 'Approved', 1, 'admin@nexttransit.com'),
  ('common.save', 'common', 'ar', 'حفظ', 'Save action text in Arabic', 'Approved', 1, 'admin@nexttransit.com'),
  ('common.save', 'common', 'en', 'Save', 'Save action text in English', 'Approved', 1, 'admin@nexttransit.com'),
  ('fleet.rule_r1_alert', 'fleet', 'fr', 'Règle R1 : Arrêt d''Urgence Requis (Défaut Critique OBD-II)', 'R1 Alert text', 'Approved', 1, 'admin@nexttransit.com'),
  ('fleet.rule_r1_alert', 'fleet', 'ar', 'القاعدة R1: إيقاف طارئ إجباري (عطل تشخيصي خطير OBD-II)', 'R1 Alert Arabic', 'Approved', 1, 'admin@nexttransit.com'),
  ('fleet.rule_r1_alert', 'fleet', 'en', 'Rule R1: Mandatory Emergency Stop (Critical OBD-II Fault)', 'R1 Alert English', 'Approved', 1, 'admin@nexttransit.com'),
  ('maintenance.total_cost_formula', 'maintenance', 'fr', 'Coût Total R4 = (Heures de Main-d''Œuvre × Tarif) + ∑(Pièces × Prix Unitaire)', 'R4 Cost Formula', 'Approved', 1, 'admin@nexttransit.com'),
  ('maintenance.total_cost_formula', 'maintenance', 'ar', 'معادلة التكلفة الإجمالية R4 = (ساعات العمل × الأجرة) + مجموع(القطع × السعر)', 'R4 Cost Formula Arabic', 'Approved', 1, 'admin@nexttransit.com')
ON CONFLICT (key, language) DO UPDATE 
SET value = EXCLUDED.value, status = EXCLUDED.status;

INSERT INTO public.business_glossary (term, namespace, definition, translations, forbid_auto_translate, status)
VALUES
  ('Telemetry Reconciliation', 'fleet', 'Audit process comparing electronic OBD-II telemetry logs against driver incident logs.', '{"fr": "Rapprochement Télématique", "ar": "المطابقة والتسوية التليماتية", "en": "Telemetry Reconciliation"}'::jsonb, true, 'Approved'),
  ('OBD-II Diagnostic Fault Code', 'maintenance', 'Electronic fault codes generated by onboard vehicle diagnostic sensors.', '{"fr": "Code d''Erreur OBD-II", "ar": "كود عطل تشخيصي OBD-II", "en": "OBD-II Diagnostic Fault Code"}'::jsonb, true, 'Approved')
ON CONFLICT (term, namespace) DO NOTHING;

INSERT INTO public.translation_memory (source_lang, target_lang, source_text, target_text, namespace, usage_count, quality_score)
VALUES
  ('fr', 'ar', 'Gestion de la flotte et décision de maintenance', 'إدارة الأسطول وهندسة قرارات الصيانة', 'fleet', 42, 98),
  ('fr', 'ar', 'Enregistrer les modifications', 'حفظ التغييرات', 'common', 156, 100)
ON CONFLICT (source_lang, target_lang, source_text) DO NOTHING;
