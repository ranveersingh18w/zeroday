import { isSupabaseConfigured } from '../services/supabaseClient';

/** Small tag used atop stats/charts — shows "LIVE SUPABASE" when connected. */
export function DemoTag() {
  if (isSupabaseConfigured()) {
    return (
      <span className="demo-tag" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
        <span className="dot" style={{ background: '#22c55e' }} />LIVE SUPABASE
      </span>
    );
  }
  return (
    <span className="demo-tag"><span className="dot" />Demo data</span>
  );
}