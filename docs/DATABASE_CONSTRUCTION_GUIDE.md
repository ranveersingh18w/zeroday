# Zero-Day SIH26145 — Database Construction Guide

This guide provides step-by-step technical instructions for constructing a Supabase PostgreSQL database fully compatible with the **ZERO-DAY** threat detection architecture.

---

## 1. Overview & Architectural Compatibility

The **ZERO-DAY** platform operates on a decoupled architecture where both the Python AI Simulation Engine and the React/TypeScript Frontend dashboard communicate asynchronously via a central **Supabase (PostgreSQL)** database.

To guarantee zero latency, real-time sync, and schema compatibility across all components, the database schema enforces:
- Strict column data types and JSONB evidence structure.
- Pre-built B-Tree and GIN indexes for sub-millisecond filtering.
- Permissive Row Level Security (RLS) policies allowing direct REST & WebSocket access.
- Supabase Realtime publication setup.

---

## 2. Step-by-Step Database Construction (SQL)

Copy and execute the following SQL script inside your **Supabase SQL Editor** (`https://supabase.com/dashboard/project/<PROJECT_ID>/sql`):

```sql
-- ============================================================================
-- ZERO-DAY SIH26145 — PostgreSQL Table Construction Script
-- ============================================================================

-- Step 1: Create the alerts table with schema constraints
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
    detector VARCHAR(64) DEFAULT 'zero_day',
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_version VARCHAR(16) DEFAULT '1.0',
    observation_window_s DOUBLE PRECISION DEFAULT 0.0,
    source_rate DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Performance Indexes for rapid querying and filtering
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON public.alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_threat_class ON public.alerts (threat_class);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_evidence_gin ON public.alerts USING GIN (evidence);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Step 4: Configure Security Policies for Public Anon & Authenticated Roles

-- 4a. Allow public read access (Required for Dashboard queries)
CREATE POLICY "Allow public read access to alerts" 
    ON public.alerts FOR SELECT 
    USING (true);

-- 4b. Allow public insert access (Required for Frontend Simulation Page & Direct Engine Inserts)
CREATE POLICY "Allow public insert access to alerts" 
    ON public.alerts FOR INSERT 
    WITH CHECK (true);

-- 4c. Allow public update access (Required for updating alert status)
CREATE POLICY "Allow public update access to alerts" 
    ON public.alerts FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- 4d. Allow public delete access (Required for Clear All button functionality)
CREATE POLICY "Allow public delete access to alerts" 
    ON public.alerts FOR DELETE 
    USING (true);

-- Step 5: Enable Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
```

---

## 3. Database Schema Field Specifications

| Column Name | PostgreSQL Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `alert_id` | `VARCHAR(64)` | ❌ No | *Primary Key* | Unique identifier for the alert (e.g. `al-c2_beacon-9x2f`) |
| `timestamp` | `TIMESTAMPTZ` | ❌ No | `NOW()` | ISO 8601 UTC timestamp of threat detection |
| `flow_id` | `VARCHAR(128)` | ✅ Yes | `NULL` | Associated network flow identifier |
| `src_ip` | `VARCHAR(45)` | ❌ No | - | Source IPv4/IPv6 address |
| `dst_ip` | `VARCHAR(45)` | ❌ No | - | Destination IPv4/IPv6 address |
| `src_port` | `INTEGER` | ✅ Yes | `443` | Transport layer source port |
| `dst_port` | `INTEGER` | ✅ Yes | `443` | Transport layer destination port |
| `protocol` | `VARCHAR(16)` | ✅ Yes | `'TCP'` | Network protocol (`TCP`, `UDP`, `DNS`, `TLS`, `ICMP`) |
| `threat_class` | `VARCHAR(64)` | ❌ No | - | Raw threat class identifier (e.g., `botnet_c2_beacon`) |
| `sih_category` | `VARCHAR(128)` | ❌ No | - | SIH 26145 Category Name (e.g., `Botnet C2 Beaconing`) |
| `severity` | `VARCHAR(16)` | ❌ No | - | Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `confidence` | `DOUBLE PRECISION`| ❌ No | - | Machine Learning confidence score (`0.0` to `1.0`) |
| `status` | `VARCHAR(32)` | ❌ No | `'New'` | Enum: `New`, `Investigating`, `Acknowledged`, `Resolved`, `Dismissed` |
| `detector` | `VARCHAR(64)` | ✅ Yes | `'zero_day'` | Name of detector algorithm (e.g., `njode_unsupervised`, `rules`) |
| `evidence` | `JSONB` | ❌ No | `'[]'::jsonb` | Array of key-value feature explanations |
| `created_at` | `TIMESTAMPTZ` | ❌ No | `NOW()` | Database record insertion timestamp |

---

## 4. Verification & Testing

After running the SQL construction script in Supabase, verify your setup using these test SQL queries:

### 1. Test Insert:
```sql
INSERT INTO public.alerts (
    alert_id, src_ip, dst_ip, threat_class, sih_category, severity, confidence
) VALUES (
    'test-construction-01', '10.0.0.1', '185.234.72.10', 'botnet_c2_beacon', 'Botnet C2 Beaconing', 'HIGH', 0.95
);
```

### 2. Test Select:
```sql
SELECT * FROM public.alerts WHERE alert_id = 'test-construction-01';
```

### 3. Test Delete:
```sql
DELETE FROM public.alerts WHERE alert_id = 'test-construction-01';
```

---

## 5. Frontend `.env` Configuration

Once your database is constructed, place your project credentials into `frontend/.env`:

```env
VITE_SUPABASE_URL="https://<YOUR_PROJECT_ID>.supabase.co"
VITE_SUPABASE_ANON_KEY="<YOUR_ANON_PUBLIC_KEY>"
```

Your React application will now operate directly against your project database with live real-time synchronization!
