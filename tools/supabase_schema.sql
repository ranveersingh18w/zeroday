-- ============================================================================
-- ZERO-DAY SIH26145 — Supabase (PostgreSQL) Schema Definition
-- ============================================================================
-- Run this SQL script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- 1. Create the alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    flow_id VARCHAR(128),
    src_ip VARCHAR(45) NOT NULL,
    dst_ip VARCHAR(45) NOT NULL,
    src_port INTEGER DEFAULT 443,
    dst_port INTEGER DEFAULT 443,
    protocol VARCHAR(16) DEFAULT 'TCP',
    threat_class VARCHAR(64) NOT NULL,
    sih_category VARCHAR(128) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    status VARCHAR(32) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Investigating', 'Acknowledged', 'Resolved', 'Dismissed')),
    detector VARCHAR(64),
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_version VARCHAR(16) DEFAULT '1.0',
    observation_window_s DOUBLE PRECISION DEFAULT 0.0,
    source_rate DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON public.alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_threat_class ON public.alerts (threat_class);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_evidence_gin ON public.alerts USING GIN (evidence);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for React Dashboard)
CREATE POLICY "Allow public read access to alerts" 
    ON public.alerts FOR SELECT 
    USING (true);

-- Allow public delete access (for clearing alerts from dashboard)
CREATE POLICY "Allow public delete access to alerts" 
    ON public.alerts FOR DELETE 
    USING (true);

-- Allow authenticated or service key insert/update access
CREATE POLICY "Allow write access for authenticated users / backend" 
    ON public.alerts FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 4. Enable Realtime (optional: for live WebSocket updates directly from Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
