"""SQLite storage layer for ZERO-DAY SIH26145 alerts.

Provides thread-safe persistent storage and querying for detection alerts.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from zero_day.contracts import AlertV1, EvidenceItem, Severity, ThreatClass

CLASS_TO_SIH: Dict[str, str] = {
    "volumetric_ddos": "Volumetric / Protocol DDoS",
    "ddos": "Volumetric / Protocol DDoS",
    "botnet_c2_beacon": "Botnet C2 Beaconing",
    "dga_domains": "DGA / DNS Tunnelling",
    "dns_tunnelling": "DGA / DNS Tunnelling",
    "encrypted_malware": "Malicious Encrypted Sessions",
    "reconnaissance_port_scan": "Reconnaissance / Port Scanning",
    "port_scan": "Reconnaissance / Port Scanning",
    "data_exfiltration": "Data Exfiltration",
    "exfiltration": "Data Exfiltration",
    "benign": "Benign Traffic",
}


class AlertDB:
    """Thread-safe SQLite and Supabase PostgreSQL alert repository."""

    def __init__(self, db_path: str = "data/alerts.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = os.getenv("SUPABASE_KEY", "")
        self._init_schema()
        self._seed_if_empty()

    def _supabase_request(self, method: str, path_suffix: str = "", body: Optional[Any] = None, headers_extra: Optional[Dict] = None) -> Optional[Any]:
        if not self.supabase_url or not self.supabase_key:
            return None
        url = f"{self.supabase_url}/rest/v1/alerts{path_suffix}"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        if headers_extra:
            headers.update(headers_extra)
        
        data_bytes = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                res_text = resp.read().decode("utf-8")
                return json.loads(res_text) if res_text else []
        except Exception as e:
            print(f"[Supabase API Error] {e}")
            return None

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._lock, self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS alerts (
                    alert_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    flow_id TEXT,
                    src_ip TEXT,
                    dst_ip TEXT,
                    src_port INTEGER DEFAULT 443,
                    dst_port INTEGER DEFAULT 443,
                    protocol TEXT DEFAULT 'TCP',
                    threat_class TEXT NOT NULL,
                    sih_category TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'New',
                    detector TEXT,
                    evidence_json TEXT,
                    model_version TEXT DEFAULT '1.0',
                    observation_window_s REAL DEFAULT 0.0,
                    source_rate REAL,
                    created_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);
                CREATE INDEX IF NOT EXISTS idx_alerts_threat ON alerts (threat_class);
                CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
            """)

    def insert_alert(self, alert: AlertV1, status: Optional[str] = None) -> None:
        """Insert or replace an alert in the database and sync to Supabase."""
        tc_val = alert.threat_class.value if hasattr(alert.threat_class, "value") else str(alert.threat_class)
        sih_cat = CLASS_TO_SIH.get(tc_val, "Botnet C2 Beaconing")
        sev_val = alert.severity.value if hasattr(alert.severity, "value") else str(alert.severity)
        alert_status = status or alert.status or "New"
        evidence_list = [e.model_dump() if hasattr(e, "model_dump") else dict(e) for e in alert.evidence]
        ev_json = json.dumps(evidence_list)
        ts_str = alert.timestamp.isoformat() if hasattr(alert.timestamp, "isoformat") else str(alert.timestamp)

        with self._lock, self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO alerts (
                    alert_id, timestamp, flow_id, src_ip, dst_ip,
                    src_port, dst_port, protocol, threat_class, sih_category,
                    severity, confidence, status, detector, evidence_json,
                    model_version, observation_window_s, source_rate, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert.alert_id, ts_str, alert.flow_id, alert.src_ip, alert.dst_ip,
                alert.src_port, alert.dst_port, alert.protocol.upper(), tc_val, sih_cat,
                sev_val, float(alert.confidence), alert_status, alert.detector, ev_json,
                alert.model_version, float(alert.observation_window_s), alert.source_rate, time.time(),
            ))

        if self.supabase_url and self.supabase_key:
            sp_payload = {
                "alert_id": alert.alert_id,
                "timestamp": ts_str,
                "flow_id": alert.flow_id,
                "src_ip": alert.src_ip,
                "dst_ip": alert.dst_ip,
                "src_port": alert.src_port,
                "dst_port": alert.dst_port,
                "protocol": alert.protocol.upper(),
                "threat_class": tc_val,
                "sih_category": sih_cat,
                "severity": sev_val,
                "confidence": float(alert.confidence),
                "status": alert_status,
                "detector": alert.detector,
                "evidence": evidence_list,
                "model_version": alert.model_version,
                "observation_window_s": float(alert.observation_window_s),
                "source_rate": float(alert.source_rate) if alert.source_rate else None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            self._supabase_request("POST", body=[sp_payload], headers_extra={"Prefer": "resolution=merge-duplicates,return=representation"})

    def get_alerts(
        self,
        limit: int = 100,
        offset: int = 0,
        severity: Optional[str] = None,
        threat_class: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query alerts with flexible filtering, prioritizing Supabase if connected."""
        if self.supabase_url and self.supabase_key:
            params = f"?select=*&order=timestamp.desc&limit={limit}&offset={offset}"
            if severity and severity != "All":
                params += f"&severity=eq.{urllib.parse.quote(severity.upper())}"
            if status and status != "All":
                params += f"&status=eq.{urllib.parse.quote(status)}"
            if threat_class and threat_class != "All":
                params += f"&threat_class=eq.{urllib.parse.quote(threat_class)}"
            
            res = self._supabase_request("GET", path_suffix=params)
            if res is not None and isinstance(res, list) and len(res) > 0:
                for r in res:
                    r["source"] = {"ip": r.get("src_ip", "0.0.0.0"), "port": r.get("src_port", 443)}
                    r["destination"] = {"ip": r.get("dst_ip", "0.0.0.0"), "port": r.get("dst_port", 443)}
                return res

        query = "SELECT * FROM alerts WHERE 1=1"
        params_sql: List[Any] = []

        if severity and severity != "All":
            query += " AND severity = ?"
            params_sql.append(severity.upper())

        if threat_class and threat_class != "All":
            query += " AND (threat_class = ? OR sih_category = ?)"
            params_sql.extend([threat_class, threat_class])

        if status and status != "All":
            query += " AND status = ?"
            params_sql.append(status)

        if search:
            query += " AND (alert_id LIKE ? OR src_ip LIKE ? OR dst_ip LIKE ? OR threat_class LIKE ? OR sih_category LIKE ?)"
            s_param = f"%{search}%"
            params_sql.extend([s_param, s_param, s_param, s_param, s_param])

        query += " ORDER BY timestamp DESC, created_at DESC LIMIT ? OFFSET ?"
        params_sql.extend([limit, offset])

        with self._lock, self._get_connection() as conn:
            rows = conn.execute(query, params_sql).fetchall()
            return [self._row_to_dict(r) for r in rows]

    def get_alert_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single alert by ID."""
        if self.supabase_url and self.supabase_key:
            res = self._supabase_request("GET", path_suffix=f"?alert_id=eq.{alert_id}&select=*")
            if res and isinstance(res, list) and len(res) > 0:
                r = res[0]
                r["source"] = {"ip": r.get("src_ip", "0.0.0.0"), "port": r.get("src_port", 443)}
                r["destination"] = {"ip": r.get("dst_ip", "0.0.0.0"), "port": r.get("dst_port", 443)}
                return r

        with self._lock, self._get_connection() as conn:
            row = conn.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,)).fetchone()
            return self._row_to_dict(row) if row else None

    def update_status(self, alert_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        """Update lifecycle status of an alert."""
        valid_statuses = {"New", "Investigating", "Acknowledged", "Resolved", "Dismissed"}
        if new_status not in valid_statuses:
            return None

        with self._lock, self._get_connection() as conn:
            conn.execute("UPDATE alerts SET status = ? WHERE alert_id = ?", (new_status, alert_id))
            conn.commit()

        if self.supabase_url and self.supabase_key:
            self._supabase_request("PATCH", path_suffix=f"?alert_id=eq.{alert_id}", body={"status": new_status})

        return self.get_alert_by_id(alert_id)

    def count(self) -> int:
        """Total number of alerts stored."""
        with self._lock, self._get_connection() as conn:
            return conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]

    def get_metrics(self) -> Dict[str, Any]:
        """Aggregate summary metrics from database."""
        with self._lock, self._get_connection() as conn:
            total = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
            sev_rows = conn.execute("SELECT severity, COUNT(*) FROM alerts GROUP BY severity").fetchall()
            cat_rows = conn.execute("SELECT sih_category, COUNT(*) FROM alerts GROUP BY sih_category").fetchall()
            stat_rows = conn.execute("SELECT status, COUNT(*) FROM alerts GROUP BY status").fetchall()

            return {
                "total_alerts": total,
                "severity_distribution": {r[0]: r[1] for r in sev_rows},
                "category_distribution": {r[0]: r[1] for r in cat_rows},
                "status_distribution": {r[0]: r[1] for r in stat_rows},
            }

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        ev_raw = d.pop("evidence_json", "[]")
        try:
            d["evidence"] = json.loads(ev_raw)
        except Exception:
            d["evidence"] = []
        d["source"] = {"ip": d.get("src_ip", "0.0.0.0"), "port": d.get("src_port", 443)}
        d["destination"] = {"ip": d.get("dst_ip", "0.0.0.0"), "port": d.get("dst_port", 443)}
        return d

    def _seed_if_empty(self) -> None:
        """Seed high-quality initial SIH alerts across all 6 threat categories if DB is brand new."""
        if self.count() > 0:
            return

        now = datetime.now(timezone.utc)
        seeds = [
            AlertV1(
                alert_id="alt-ddos-001",
                timestamp=now,
                flow_id="flood-9821",
                src_ip="198.51.100.42",
                dst_ip="192.168.1.100",
                src_port=53210,
                dst_port=443,
                protocol="TCP",
                threat_class=ThreatClass.DDOS,
                severity=Severity.HIGH,
                confidence=0.92,
                status="New",
                detector="volumetric_ddos",
                evidence=[
                    EvidenceItem(feature="syn_rate", value=1840.0, reason="SYN packet rate of 1,840 pkts/s exceeds threshold 500 pkts/s"),
                    EvidenceItem(feature="src_entropy", value=4.82, reason="Source IP entropy 4.82 indicates multi-source spoofed flood"),
                ],
                observation_window_s=10.0,
            ),
            AlertV1(
                alert_id="alt-beacon-002",
                timestamp=now,
                flow_id="beacon-mixed",
                src_ip="10.0.0.50",
                dst_ip="185.234.72.10",
                src_port=49214,
                dst_port=443,
                protocol="TCP",
                threat_class=ThreatClass.BEACON,
                severity=Severity.CRITICAL,
                confidence=0.98,
                status="New",
                detector="botnet_c2_beacon",
                evidence=[
                    EvidenceItem(feature="inter_arrival_cv", value=0.0074, reason="IAT CV = 0.0074 (< 0.15 threshold) — strict automated periodicity"),
                    EvidenceItem(feature="beacon_count", value=14.0, reason="14 periodic heartbeat connections to 185.234.72.10:443 in 60s"),
                ],
                observation_window_s=60.0,
            ),
            AlertV1(
                alert_id="alt-dga-003",
                timestamp=now,
                flow_id="dns-dga-419",
                src_ip="10.0.1.12",
                dst_ip="1.1.1.1",
                src_port=58211,
                dst_port=53,
                protocol="DNS",
                threat_class=ThreatClass.DGA,
                severity=Severity.CRITICAL,
                confidence=0.95,
                status="New",
                detector="dga_domains",
                evidence=[
                    EvidenceItem(feature="domain_entropy", value=4.18, reason="Domain 'x9k3b8q2v1.ru' Shannon entropy 4.18 exceeds 3.8 threshold"),
                    EvidenceItem(feature="vowel_ratio", value=0.10, reason="Abnormally low vowel ratio indicates pseudo-random generation"),
                ],
                observation_window_s=30.0,
            ),
            AlertV1(
                alert_id="alt-tunnel-004",
                timestamp=now,
                flow_id="dns-tun-771",
                src_ip="10.0.2.88",
                dst_ip="8.8.8.8",
                src_port=61042,
                dst_port=53,
                protocol="DNS",
                threat_class=ThreatClass.DNS_TUNNEL,
                severity=Severity.HIGH,
                confidence=0.88,
                status="Investigating",
                detector="dns_tunnelling",
                evidence=[
                    EvidenceItem(feature="query_length", value=84.0, reason="DNS query length 84 characters exceeds 45 char anomaly limit"),
                    EvidenceItem(feature="txt_record_ratio", value=0.85, reason="85% TXT query payload ratio indicates data staging over DNS"),
                ],
                observation_window_s=30.0,
            ),
            AlertV1(
                alert_id="alt-mal-tls-005",
                timestamp=now,
                flow_id="tls-c2-901",
                src_ip="10.0.0.105",
                dst_ip="91.215.85.17",
                src_port=50123,
                dst_port=443,
                protocol="TLS",
                threat_class=ThreatClass.ENCRYPTED_MALWARE,
                severity=Severity.CRITICAL,
                confidence=0.94,
                status="Acknowledged",
                detector="encrypted_malware",
                evidence=[
                    EvidenceItem(feature="ja3_known_malware", value=1.0, reason="JA3 fingerprint matches Cobalt Strike HTTPS beaconing profile"),
                    EvidenceItem(feature="sni_entropy", value=3.92, reason="High-entropy SNI host with uniform record length sequence"),
                ],
                observation_window_s=30.0,
            ),
            AlertV1(
                alert_id="alt-scan-006",
                timestamp=now,
                flow_id="scan-h-003",
                src_ip="192.168.1.15",
                dst_ip="10.0.0.1",
                src_port=41902,
                dst_port=80,
                protocol="TCP",
                threat_class=ThreatClass.PORT_SCAN,
                severity=Severity.HIGH,
                confidence=0.91,
                status="New",
                detector="reconnaissance_port_scan",
                evidence=[
                    EvidenceItem(feature="port_fanout", value=42.0, reason="42 unique destination ports probed in 10s window"),
                    EvidenceItem(feature="syn_only_ratio", value=1.0, reason="100% SYN-only probes with 0 completed handshakes"),
                ],
                observation_window_s=10.0,
            ),
            AlertV1(
                alert_id="alt-exfil-007",
                timestamp=now,
                flow_id="exfil-out-802",
                src_ip="10.0.3.52",
                dst_ip="198.51.100.8",
                src_port=54001,
                dst_port=443,
                protocol="TCP",
                threat_class=ThreatClass.EXFILTRATION,
                severity=Severity.CRITICAL,
                confidence=0.97,
                status="New",
                detector="data_exfiltration",
                evidence=[
                    EvidenceItem(feature="byte_ratio", value=14.8, reason="Outbound-to-inbound byte ratio 14.8:1 exceeds threshold 8.0:1"),
                    EvidenceItem(feature="burst_volume_mb", value=85.4, reason="85.4 MB transferred in 30s asymmetric burst"),
                ],
                observation_window_s=30.0,
            ),
        ]

        for s in seeds:
            self.insert_alert(s)
