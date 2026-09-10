# How to Insert Data into Your Supabase Table

Ab aapka frontend seedha Supabase se connected hai (without Python backend API), isliye ab kisi ko bhi UI par naya alert dikhana ho toh use direct **Supabase table (`alerts`)** mein data insert karna hoga. 

Neeche alag-alag tareeke (languages) diye gaye hain jisse koi bhi aasaani se aapki table me naya data (alert) daal sakta hai:

## 1. Using Python (The way your simulation Engine does it)

Agar aap kisi Python script (jaise aapka `zero-day` simulation) se data bhejna chahte hain, toh aap `urllib` ya `requests` library use kar sakte hain.

```python
import urllib.request
import json
import os

# Aapke Supabase credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://<YOUR_PROJECT_REF>.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "<YOUR_ANON_OR_SERVICE_KEY>")

# Aapka naya Alert data
new_alert = {
    "id": "alert-12345",
    "threat_class": "botnet_c2_beacon",
    "sih_category": "Malware",
    "severity": "HIGH",
    "confidence": 0.95,
    "timestamp": "2026-09-10T12:00:00Z",
    "src_ip": "10.0.0.50",
    "src_port": 12345,
    "dst_ip": "185.234.72.10",
    "dst_port": 80,
    "protocol": "TCP",
    "status": "New",
    "summary": "Suspicious C2 beaconing detected",
    "detection_method": "Rules + ML hybrid",
    "evidence": ["High frequency connection attempts", "Known bad IP"],
    "flow_id": "flow-999"
}

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/alerts",
    data=json.dumps(new_alert).encode("utf-8"),
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as response:
        print("✅ Alert successfully inserted in Supabase!")
except Exception as e:
    print(f"❌ Failed to insert: {e}")
```

## 2. Using cURL (Command Line or Postman)

Agar aap terminal/CMD se jaldi se ek test record push karna chahte hain, toh aap seedha ek HTTP POST request bhej sakte hain. Postman me bhi same format use hoga.

```bash
curl -X POST "https://<YOUR_PROJECT_REF>.supabase.co/rest/v1/alerts" \
-H "apikey: <YOUR_ANON_OR_SERVICE_KEY>" \
-H "Authorization: Bearer <YOUR_ANON_OR_SERVICE_KEY>" \
-H "Content-Type: application/json" \
-d '{
  "id": "alert-test-curl",
  "threat_class": "reconnaissance_port_scan",
  "sih_category": "Recon",
  "severity": "MEDIUM",
  "confidence": 0.88,
  "timestamp": "2026-09-10T12:10:00Z",
  "src_ip": "192.168.1.5",
  "src_port": 54321,
  "dst_ip": "10.0.0.1",
  "dst_port": 22,
  "protocol": "TCP",
  "status": "New",
  "summary": "Port scan detected via cURL",
  "detection_method": "Manual Test",
  "evidence": ["Test data from command line"],
  "flow_id": "test-flow-001"
}'
```

## 3. Using JavaScript / TypeScript (Node.js or React)

Agar aapke paas koi dusri web service ya dashboard hai aur aap JS use karke insert karna chahte hain, toh `@supabase/supabase-js` best tareeka hai.

```javascript
import { createClient } from '@supabase/supabase-js';

// Initialize the client
const supabase = createClient(
  'https://<YOUR_PROJECT_REF>.supabase.co',
  '<YOUR_ANON_OR_SERVICE_KEY>'
);

async function insertAlert() {
  const { data, error } = await supabase
    .from('alerts')
    .insert([
      {
        id: 'alert-js-test',
        threat_class: 'dns_tunnelling',
        sih_category: "Tunneling",
        severity: 'HIGH',
        confidence: 0.99,
        timestamp: new Date().toISOString(),
        src_ip: '10.0.0.100',
        src_port: 5353,
        dst_ip: '8.8.8.8',
        dst_port: 53,
        protocol: 'UDP',
        status: 'New',
        summary: 'Possible DNS Tunneling',
        detection_method: 'Heuristics',
        evidence: ['Large DNS query size'],
        flow_id: 'flow-dns-01'
      }
    ]);

  if (error) {
    console.error('❌ Error inserting data:', error);
  } else {
    console.log('✅ Data inserted successfully!', data);
  }
}

insertAlert();
```

### 💡 Note: Real-time UI Updates
Jab bhi inme se kisi bhi tareeke se data aapke Supabase table me aayega, aapka React UI **automatic real-time me update** ho jayega!
