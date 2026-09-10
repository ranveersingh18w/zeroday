# How to Read Data from `alerts` Table in Supabase

Simple and direct instructions to fetch data from the Supabase **`alerts`** table using **Python**, **JavaScript**, or **cURL**.

---

## 🔑 Your Project Credentials

- **Table Name:** `alerts`
- **Supabase URL:** `https://czvjvwtvmyvajhlbwrud.supabase.co`
- **Anon Public Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI`

---

## 1. Simple Python Script

Read all rows from the `alerts` table:

```python
import urllib.request
import json

URL = "https://czvjvwtvmyvajhlbwrud.supabase.co/rest/v1/alerts?select=*"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI"

req = urllib.request.Request(
    URL,
    headers={
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}"
    }
)

with urllib.request.urlopen(req) as response:
    alerts = json.loads(response.read().decode("utf-8"))
    print(f"Total Alerts in Table: {len(alerts)}")
    print(json.dumps(alerts, indent=2))
```

---

## 2. Simple JavaScript Script

Read all rows from the `alerts` table in Browser or Node.js:

```javascript
const URL = "https://czvjvwtvmyvajhlbwrud.supabase.co/rest/v1/alerts?select=*";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI";

async function readAlerts() {
  const response = await fetch(URL, {
    headers: {
      "apikey": KEY,
      "Authorization": `Bearer ${KEY}`
    }
  });

  const alerts = await response.json();
  console.log("Alerts from Supabase:", alerts);
}

readAlerts();
```

---

## 3. Simple cURL Command

Run this in your command prompt or terminal:

```bash
curl "https://czvjvwtvmyvajhlbwrud.supabase.co/rest/v1/alerts?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmp2d3R2bXl2YWpobGJ3cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDgxNzMsImV4cCI6MjEwNDU4NDE3M30.xNtvspUnHzaUGwD2DgHybHc64Xz52Ahd_dK3tcBvmjI"
```
