# How to Read Data Directly from Supabase (Python & JavaScript)

This guide provides copy-paste ready code examples for fetching, filtering, and subscribing to real-time data directly from our **Supabase `alerts` table** across different environments (Python, Node.js/React, cURL).

---

## 1. Using Python

### Option A: Pure Python Standard Library (`urllib` — No external dependencies required)

```python
import urllib.request
import json
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://czvjvwtvmyvajhlbwrud.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI")

# Fetch latest 50 CRITICAL or HIGH alerts sorted by timestamp
query_params = "select=*&severity=in.(CRITICAL,HIGH)&order=timestamp.desc&limit=50"
req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/alerts?{query_params}",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    },
    method="GET"
)

try:
    with urllib.request.urlopen(req) as response:
        alerts = json.loads(response.read().decode("utf-8"))
        print(f"✅ Fetched {len(alerts)} alerts from Supabase:")
        for alert in alerts[:5]:
            print(f"  - [{alert['timestamp']}] {alert['alert_id']} | {alert['severity']} | {alert['sih_category']} ({alert['src_ip']} -> {alert['dst_ip']})")
except Exception as e:
    print(f"❌ Failed to fetch alerts: {e}")
```

### Option B: Official Supabase Python Client (`supabase-py`)

First install the library:
```bash
pip install supabase
```

Then query the database:
```python
from supabase import create_client, Client

url = "https://czvjvwtvmyvajhlbwrud.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI"

supabase: Client = create_client(url, key)

# Read alerts with filtering
response = (
    supabase.table("alerts")
    .select("*")
    .order("timestamp", desc=True)
    .limit(20)
    .execute()
)

alerts = response.data
print(f"✅ Retrieved {len(alerts)} alerts:")
for a in alerts:
    print(f"ID: {a['alert_id']} | Severity: {a['severity']} | Category: {a['sih_category']}")
```

---

## 2. Using JavaScript / TypeScript

### Option A: Standard `fetch` (Browser / Node.js 18+ — Zero dependencies)

```javascript
const SUPABASE_URL = "https://czvjvwtvmyvajhlbwrud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI";

async function getAlerts() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/alerts?select=*&order=timestamp.desc&limit=50`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const alerts = await response.json();
  console.log(`✅ Loaded ${alerts.length} alerts directly from Supabase:`, alerts);
  return alerts;
}

getAlerts();
```

### Option B: Official Supabase JS Client (`@supabase/supabase-js`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://czvjvwtvmyvajhlbwrud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI'
);

// 1. One-time Fetch
async function fetchLatestAlerts() {
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Error reading alerts:', error);
    return;
  }

  console.log('✅ Supabase Alerts:', alerts);
}

// 2. Real-Time WebSocket Listener (Streams new alerts live as they are inserted)
function subscribeToLiveAlerts(onNewAlert) {
  const channel = supabase
    .channel('public:alerts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alerts' },
      (payload) => {
        console.log('⚡ Live New Alert Received from Supabase:', payload.new);
        onNewAlert(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

fetchLatestAlerts();
```

---

## 3. Using cURL / Command Line

### Fetch All Alerts:
```bash
curl -X GET "https://czvjvwtvmyvajhlbwrud.supabase.co/rest/v1/alerts?select=*&order=timestamp.desc&limit=20" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI"
```

### Filter by Specific Category & Severity:
```bash
curl -X GET "https://czvjvwtvmyvajhlbwrud.supabase.co/rest/v1/alerts?severity=eq.CRITICAL&sih_category=eq.Botnet%20C2%20Beaconing" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI"
```

---

## 4. Query Reference & Filters

| Filter Goal | Query Syntax Example |
| :--- | :--- |
| **Limit Rows** | `?limit=50` |
| **Order by Column** | `?order=timestamp.desc` or `?order=confidence.asc` |
| **Filter by Severity** | `?severity=eq.CRITICAL` |
| **Multiple Severities** | `?severity=in.(HIGH,CRITICAL)` |
| **Filter by Source IP** | `?src_ip=eq.10.0.0.50` |
| **Filter by Confidence Range** | `?confidence=gte.0.8` (Greater than or equal to 0.8) |
| **Select Specific Columns** | `?select=alert_id,timestamp,severity,sih_category,src_ip,dst_ip` |
