import { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Zap } from 'lucide-react';
import { insertSupabaseAlert } from '../services/supabaseClient';
import { useToast } from '../components/Toast';
import { DemoTag } from '../components/DemoTag';
import type { Severity, ThreatCategory } from '../types';

interface ScenarioDef {
  id: string;
  name: string;
  threatClass: string;
  sihCategory: ThreatCategory;
  description: string;
  severity: Severity;
  defaultSrc: string;
  defaultDst: string;
  protocol: 'TCP' | 'UDP' | 'DNS' | 'TLS' | 'ICMP';
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'c2_beacon',
    name: 'c2_beacon',
    threatClass: 'botnet_c2_beacon',
    sihCategory: 'Botnet C2 Beaconing',
    description: 'Botnet C2 Beaconing — periodic outbound heartbeat connections',
    severity: 'HIGH',
    defaultSrc: '10.0.0.50',
    defaultDst: '185.234.72.10',
    protocol: 'TCP',
  },
  {
    id: 'data_exfil',
    name: 'data_exfil',
    threatClass: 'data_exfiltration',
    sihCategory: 'Data Exfiltration',
    description: 'Data Exfiltration — asymmetric high-volume outbound data transfer',
    severity: 'CRITICAL',
    defaultSrc: '10.0.4.102',
    defaultDst: '93.184.216.34',
    protocol: 'TCP',
  },
  {
    id: 'dga_domains',
    name: 'dga_domains',
    threatClass: 'dga_domains',
    sihCategory: 'DGA / DNS Tunnelling',
    description: 'DGA — algorithmically generated DNS queries with high entropy',
    severity: 'MEDIUM',
    defaultSrc: '10.0.1.15',
    defaultDst: '8.8.8.8',
    protocol: 'DNS',
  },
  {
    id: 'dns_tunnel',
    name: 'dns_tunnel',
    threatClass: 'dns_tunnelling',
    sihCategory: 'DGA / DNS Tunnelling',
    description: 'DNS Tunnelling — payload exfiltration via TXT records',
    severity: 'HIGH',
    defaultSrc: '10.0.1.20',
    defaultDst: '1.1.1.1',
    protocol: 'DNS',
  },
  {
    id: 'encrypted_c2',
    name: 'encrypted_c2',
    threatClass: 'encrypted_malware',
    sihCategory: 'Malicious Encrypted Sessions',
    description: 'Malicious Encrypted Session — TLS metadata JA3/JA4 fingerprint anomaly',
    severity: 'HIGH',
    defaultSrc: '10.0.3.44',
    defaultDst: '104.21.55.2',
    protocol: 'TLS',
  },
  {
    id: 'full_scenario',
    name: 'full_scenario',
    threatClass: 'volumetric_ddos',
    sihCategory: 'Volumetric / Protocol DDoS',
    description: 'Full Multi-Vector Attack — combined DDoS, PortScan, and Exfil',
    severity: 'CRITICAL',
    defaultSrc: '192.168.1.105',
    defaultDst: '10.0.0.1',
    protocol: 'TCP',
  },
  {
    id: 'port_scan',
    name: 'port_scan',
    threatClass: 'reconnaissance_port_scan',
    sihCategory: 'Reconnaissance / Port Scanning',
    description: 'Reconnaissance — horizontal port scan from single origin',
    severity: 'MEDIUM',
    defaultSrc: '45.33.32.156',
    defaultDst: '10.0.0.5',
    protocol: 'TCP',
  },
  {
    id: 'syn_flood',
    name: 'syn_flood',
    threatClass: 'volumetric_ddos',
    sihCategory: 'Volumetric / Protocol DDoS',
    description: 'Volumetric SYN Flood — high packet rate SYN flood',
    severity: 'CRITICAL',
    defaultSrc: '198.51.100.42',
    defaultDst: '10.0.0.2',
    protocol: 'TCP',
  },
];

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export function SimulationPage() {
  const toast = useToast();
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [eventsProcessed, setEventsProcessed] = useState(743);
  const [alertsEmitted, setAlertsEmitted] = useState(67);
  const [eventsPerSec, setEventsPerSec] = useState(198.2);
  const [uptimeSeconds, setUptimeSeconds] = useState(180);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Form states for Custom Alert
  const [customCategory, setCustomCategory] = useState<ThreatCategory>('Botnet C2 Beaconing');
  const [customSrcIp, setCustomSrcIp] = useState('10.0.8.88');
  const [customDstIp, setCustomDstIp] = useState('185.220.101.5');
  const [customSev, setCustomSev] = useState<Severity>('HIGH');
  const [customConf, setCustomConf] = useState(0.92);
  const [isInserting, setIsInserting] = useState(false);

  const timerRef = useRef<any>(null);
  const uptimeRef = useRef<any>(null);

  // Uptime counter
  useEffect(() => {
    uptimeRef.current = setInterval(() => {
      setUptimeSeconds((u) => u + 1);
    }, 1000);
    return () => {
      if (uptimeRef.current) clearInterval(uptimeRef.current);
    };
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        message,
        type,
      },
      ...prev.slice(0, 49),
    ]);
  };

  const generateAlertPayload = (sc: ScenarioDef) => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const alertId = `al-${sc.id}-${randomHex}`;
    const randSrcPort = Math.floor(Math.random() * 50000) + 1024;
    const randDstPort = sc.protocol === 'DNS' ? 53 : sc.protocol === 'TLS' ? 443 : 80;

    return {
      alert_id: alertId,
      timestamp: new Date().toISOString(),
      flow_id: `fl-${randomHex}`,
      src_ip: sc.defaultSrc,
      dst_ip: sc.defaultDst,
      src_port: randSrcPort,
      dst_port: randDstPort,
      protocol: sc.protocol,
      threat_class: sc.threatClass,
      sih_category: sc.sihCategory,
      severity: sc.severity,
      confidence: Number((0.85 + Math.random() * 0.14).toFixed(3)),
      status: 'New',
      detector: 'zero_day_simulator',
      evidence: [
        { feature: 'packet_rate', value: 1450, reason: `High rate detected during ${sc.name}` },
        { feature: 'entropy_score', value: 0.91, reason: `Anomaly score spike in ${sc.sihCategory}` },
      ],
      model_version: '1.0',
      observation_window_s: 1.0,
      source_rate: 1450.0,
    };
  };

  const runReplayScenario = async (sc: ScenarioDef) => {
    setActiveScenario(sc.name);
    addLog(`▶ Running scenario replay: ${sc.name}...`, 'info');

    const payload = generateAlertPayload(sc);
    const ok = await insertSupabaseAlert(payload);

    if (ok) {
      setAlertsEmitted((a) => a + 1);
      setEventsProcessed((e) => e + 12);
      addLog(`✅ Supabase Insert Success: alert_id="${payload.alert_id}" (${sc.sihCategory})`, 'success');
      toast('success', `Inserted alert ${payload.alert_id} directly into Supabase!`);
    } else {
      addLog(`❌ Failed to insert alert to Supabase`, 'error');
      toast('error', `Failed to insert alert into Supabase.`);
    }

    setTimeout(() => setActiveScenario(null), 800);
  };

  const toggleLiveStreaming = (sc: ScenarioDef) => {
    if (isStreaming && activeScenario === sc.name) {
      // Stop
      if (timerRef.current) clearInterval(timerRef.current);
      setIsStreaming(false);
      setActiveScenario(null);
      addLog(`⏹ Stopped streaming ${sc.name}`, 'info');
      toast('info', `Stopped live streaming ${sc.name}`);
    } else {
      // Start
      if (timerRef.current) clearInterval(timerRef.current);
      setIsStreaming(true);
      setActiveScenario(sc.name);
      addLog(`⚡ Live Streaming started for scenario: ${sc.name} (1 alert/2s)`, 'success');
      toast('success', `Live Streaming started for ${sc.name}`);

      timerRef.current = setInterval(async () => {
        const payload = generateAlertPayload(sc);
        const ok = await insertSupabaseAlert(payload);
        if (ok) {
          setAlertsEmitted((a) => a + 1);
          setEventsProcessed((e) => e + 15);
          setEventsPerSec(Number((180 + Math.random() * 40).toFixed(1)));
          addLog(`⚡ Stream Alert -> Supabase: alert_id="${payload.alert_id}"`, 'success');
        } else {
          addLog(`❌ Stream Alert failed`, 'error');
        }
      }, 2000);
    }
  };

  const stopAllStreaming = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsStreaming(false);
    setActiveScenario(null);
    addLog('⏹ All simulation streams stopped', 'info');
    toast('info', 'Simulation stopped.');
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInserting(true);

    const randomHex = Math.random().toString(36).substring(2, 10);
    const alertId = `al-custom-${randomHex}`;

    const payload = {
      alert_id: alertId,
      timestamp: new Date().toISOString(),
      flow_id: `fl-custom-${randomHex}`,
      src_ip: customSrcIp,
      dst_ip: customDstIp,
      src_port: Math.floor(Math.random() * 50000) + 1024,
      dst_port: 443,
      protocol: 'TCP',
      threat_class: customCategory.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      sih_category: customCategory,
      severity: customSev,
      confidence: customConf,
      status: 'New',
      detector: 'manual_custom_generator',
      evidence: [{ feature: 'custom_trigger', value: 1.0, reason: 'Manually inserted alert from Simulator' }],
      model_version: '1.0',
    };

    const ok = await insertSupabaseAlert(payload);
    setIsInserting(false);

    if (ok) {
      setAlertsEmitted((a) => a + 1);
      setEventsProcessed((ev) => ev + 1);
      addLog(`✅ Custom Alert Inserted: alert_id="${alertId}" (${customCategory})`, 'success');
      toast('success', `Custom alert ${alertId} inserted into Supabase!`);
    } else {
      addLog(`❌ Custom Alert Insert Failed`, 'error');
      toast('error', `Failed to insert custom alert into Supabase.`);
    }
  };

  const formatUptime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Scenarios & Simulation</h1>
            <DemoTag />
          </div>
          <div className="sub">
            Generate and stream real threat alerts directly into Supabase DB table <code style={{ color: 'var(--cyan-400)' }}>alerts</code>.
          </div>
        </div>
        <div className="page-head-actions">
          {isStreaming && (
            <button className="btn" onClick={stopAllStreaming} style={{ backgroundColor: 'var(--red-600)', color: '#fff', borderColor: 'var(--red-700)' }}>
              <Square size={15} /> Stop Stream
            </button>
          )}
        </div>
      </div>

      {/* Runner Status Banner */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px', background: isStreaming ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)', borderColor: isStreaming ? 'rgba(34,197,94,0.3)' : 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: isStreaming ? '#22c55e' : '#64748b', boxShadow: isStreaming ? '0 0 10px #22c55e' : 'none' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: isStreaming ? '#4ade80' : 'var(--muted)' }}>
              {isStreaming ? `Streaming Scenario: ${activeScenario} -> Supabase (Active)` : 'Status: Stopped / Ready'}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--faint)' }}>
            SCENARIO RUNNER · DIRECT SUPABASE ENGINE
          </span>
        </div>
      </div>

      {/* Scenario Grid */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <h3>Available Attack Scenarios</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Click Replay to push single batch or Stream to continuously push to Supabase</span>
        </div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {SCENARIOS.map((sc) => {
            const isActive = activeScenario === sc.name;
            return (
              <div
                key={sc.id}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: isActive ? 'rgba(34, 211, 238, 0.08)' : 'var(--bg-card)',
                  borderColor: isActive ? 'var(--cyan-500)' : 'var(--border)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{sc.name}</span>
                    <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>{sc.protocol}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, minHeight: 36 }}>{sc.description}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => runReplayScenario(sc)}
                    disabled={isStreaming}
                    style={{ flex: 1, backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' }}
                  >
                    <Play size={13} /> Replay
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => toggleLiveStreaming(sc)}
                    style={{
                      flex: 1,
                      backgroundColor: isActive && isStreaming ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.12)',
                      color: isActive && isStreaming ? '#f87171' : '#38bdf8',
                      borderColor: isActive && isStreaming ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.3)',
                    }}
                  >
                    {isActive && isStreaming ? <Square size={13} /> : <Zap size={13} />} {isActive && isStreaming ? 'Stop' : 'Stream'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Alert Generator Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <h3>Custom Alert Generator</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Insert a custom schema-compliant alert row into Supabase</span>
        </div>
        <form onSubmit={handleCustomSubmit} style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>SIH Threat Category</label>
              <select className="select" style={{ width: '100%' }} value={customCategory} onChange={(e) => setCustomCategory(e.target.value as ThreatCategory)}>
                <option>Volumetric / Protocol DDoS</option>
                <option>Botnet C2 Beaconing</option>
                <option>DGA / DNS Tunnelling</option>
                <option>Malicious Encrypted Sessions</option>
                <option>Reconnaissance / Port Scanning</option>
                <option>Data Exfiltration</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>Source IP Address</label>
              <input className="input" style={{ width: '100%' }} value={customSrcIp} onChange={(e) => setCustomSrcIp(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>Destination IP Address</label>
              <input className="input" style={{ width: '100%' }} value={customDstIp} onChange={(e) => setCustomDstIp(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>Severity Level</label>
              <select className="select" style={{ width: '100%' }} value={customSev} onChange={(e) => setCustomSev(e.target.value as Severity)}>
                <option>CRITICAL</option>
                <option>HIGH</option>
                <option>MEDIUM</option>
                <option>LOW</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Confidence: <b>{Math.round(customConf * 100)}%</b></span>
              <input type="range" min="0.5" max="1.0" step="0.01" value={customConf} onChange={(e) => setCustomConf(parseFloat(e.target.value))} />
            </div>
            <button className="btn" type="submit" disabled={isInserting} style={{ backgroundColor: 'var(--cyan-600)', color: '#fff', borderColor: 'var(--cyan-700)' }}>
              <Plus size={15} /> {isInserting ? 'Inserting to Supabase...' : 'Insert Custom Alert to Supabase'}
            </button>
          </div>
        </form>
      </div>

      {/* System Metrics Bar matching user screenshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>EVENTS PROCESSED</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--cyan-400)', fontFamily: 'var(--font-mono)' }}>{eventsProcessed.toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>ALERTS EMITTED</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-mono)' }}>{alertsEmitted}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>EVENTS / SEC</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#facc15', fontFamily: 'var(--font-mono)' }}>{eventsPerSec}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>UPTIME</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>{formatUptime(uptimeSeconds)}</div>
        </div>
      </div>

      {/* Live Simulation Audit Logs */}
      <div className="card">
        <div className="card-head">
          <h3>Simulation Live Supabase Audit Log</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Real-time terminal output of inserted Supabase rows</span>
        </div>
        <div style={{ padding: 16, background: '#090d16', fontFamily: 'var(--font-mono)', fontSize: 12, borderRadius: '0 0 10px 10px', minHeight: 160, maxHeight: 260, overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--faint)', textAlign: 'center', padding: 20 }}>No simulation actions performed yet. Click "Replay" or "Stream" on any scenario.</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} style={{ marginBottom: 6, color: l.type === 'success' ? '#4ade80' : l.type === 'error' ? '#f87171' : 'var(--cyan-400)' }}>
                <span style={{ color: 'var(--faint)', marginRight: 10 }}>[{l.time}]</span>
                {l.message}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
