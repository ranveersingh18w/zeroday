# Zero-Day SIH26145 - Setup & Run Guide

Welcome to the **Zero-Day** threat detection system! This project consists of a Python-based AI simulation engine and a React/TypeScript real-time dashboard. They both communicate via a centralized **Supabase** database.

Follow these instructions to set up the project on your local machine.

---

## 1. Prerequisites

Before you start, make sure you have the following installed:
- **Python 3.11+**
- **Node.js 18+** (and npm)
- A [Supabase](https://supabase.com/) account (Free tier is fine)

---

## 2. Supabase Database Setup

Since the frontend and backend are completely decoupled, they both rely on Supabase to pass data.

1. Create a new project in Supabase.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of the [`tools/supabase_schema.sql`](../tools/supabase_schema.sql) file and run it. This will create the `alerts` table and enable real-time subscriptions.
4. Go to **Project Settings > API** and copy your `Project URL` and `anon/public` key.

---

## 3. Environment Variables

You need to provide your Supabase credentials to both the frontend and the backend.

### Frontend Configuration
Create a `.env` file inside the `frontend/` directory:
```bash
# File: frontend/.env
VITE_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co"
VITE_SUPABASE_ANON_KEY="<YOUR_ANON_KEY>"
```

### Backend Configuration (Windows/Linux)
When running the Python engine, set these environment variables in your terminal:
```bash
# Linux/macOS
export SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co"
export SUPABASE_KEY="<YOUR_ANON_KEY>"

# Windows (PowerShell)
$env:SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co"
$env:SUPABASE_KEY="<YOUR_ANON_KEY>"
```

---

## 4. Run the React Frontend (Dashboard)

The frontend is a Vite + React application.

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`. You should see the dashboard (it will be empty until the simulation runs).

---

## 5. Run the Python Backend (Simulation Engine)

The Python engine will read network traffic (PCAP or JSONL) and push detected threats directly to your Supabase table.

1. Open a new terminal in the root of the project.
2. Install the Python package in editable mode (this will install all dependencies like PyTorch, Scikit-learn, etc. from `pyproject.toml`):
   ```bash
   pip install -e .
   ```
3. Start generating traffic by running the replay script with one of the sample datasets. 
   *(Note: Set `--speed 1.0` to see alerts stream into your dashboard in real-time!)*
   ```bash
   python -m zero_day.cli replay data/fixtures/full_scenario.jsonl --speed 1.0
   ```

### Alternatively: Run the FastAPI Server
If you want to run the API server to serve metrics or other endpoints:
```bash
python -m zero_day.cli api --port 8000
```

---

## 🎉 That's it!
As the Python simulation runs, it will insert threats into Supabase. Because your React app is subscribed to Supabase in real-time, the dashboard will automatically light up with new alerts!
