'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const NAV = ['Dashboard', 'Online Store', 'My Subscriptions', 'Genealogy', 'Financial', 'Business Builder', 'My Profile', 'Help Center', 'Income Report'];
const RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Ruby', 'Emerald', 'Sapphire', 'Diamond', 'Blue Diamond', 'Imperial Diamond'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Donut({ income, payout }) {
  const total = income + payout || 1;
  const r = 52, c = 2 * Math.PI * r;
  const incFrac = income / total;
  return (
    <svg viewBox="0 0 140 140" className="donut">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e8efff" strokeWidth="16" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="#3b6ef5" strokeWidth="16"
        strokeDasharray={`${c * incFrac} ${c}`} strokeLinecap="round" transform="rotate(-90 70 70)" />
      <text x="70" y="64" textAnchor="middle" className="donut-label">Total</text>
      <text x="70" y="84" textAnchor="middle" className="donut-num">R{(income + payout).toLocaleString()}</text>
    </svg>
  );
}

function LineChart({ points }) {
  const w = 560, h = 170, pad = 28;
  const max = Math.max(...points.map(p => p.v), 1);
  const step = (w - pad * 2) / Math.max(points.length - 1, 1);
  const xy = points.map((p, i) => [pad + i * step, h - pad - (p.v / max) * (h - pad * 2)]);
  const path = xy.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  const area = path + ` L${xy[xy.length - 1][0]},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="linechart" preserveAspectRatio="none">
      <path d={area} fill="#e8efff" />
      <path d={path} fill="none" stroke="#3b6ef5" strokeWidth="2.5" />
      {xy.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke="#3b6ef5" strokeWidth="2" />)}
      {points.map((p, i) => (
        <text key={i} x={pad + i * step} y={h - 8} textAnchor="middle" className="axis">{p.label}</text>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [refSales, setRefSales] = useState([]);
  const [subs, setSubs] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      const [m, n, l, r, s] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('network_nodes').select('*'),
        supabase.from('commission_ledger').select('*'),
        supabase.from('referral_sales').select('*'),
        supabase.from('subscriptions').select('*'),
      ]);
      const mem = m.data || [];
      setMembers(mem); setNodes(n.data || []); setLedger(l.data || []);
      setRefSales(r.data || []); setSubs(s.data || []);
      setMe(mem.find(x => x.email === 'brandon@ohmicoffee.co.za') || mem[0] || null);
    })();
  }, []);

  // ---- derived, all scoped to the logged-in member's downline ----
  const downlineIds = useMemo(() => {
    if (!me) return new Set();
    const myNode = nodes.find(n => n.member_id === me.id);
    if (!myNode) return new Set();
    const kids = {};
    nodes.forEach(n => { if (n.parent_id) (kids[n.parent_id] = kids[n.parent_id] || []).push(n); });
    const out = new Set(); const q = [myNode.id];
    while (q.length) {
      const id = q.pop();
      (kids[id] || []).forEach(k => { out.add(k.member_id); q.push(k.id); });
    }
    return out;
  }, [me, nodes]);

  const myLedger = ledger.filter(l => me && l.member_id === me.id);
  const income = myLedger.filter(l => l.entry_type !== 'payout').reduce((s, l) => s + Number(l.cash_amount), 0);
  const payout = myLedger.filter(l => l.entry_type === 'payout').reduce((s, l) => s + Number(l.cash_amount), 0);
  const balance = income - payout;
  const myRefSales = refSales.filter(r => me && r.rep_id === me.id);
  const commissions = myRefSales.reduce((s, r) => s + Number(r.commission_amount), 0);
  const directReferrals = members.filter(m => me && m.referred_by === me.id);
  const activeDownline = [...downlineIds].filter(id => subs.find(s => s.member_id === id && s.active)).length;
  const rankIdx = Math.min(Math.floor(activeDownline / 2), RANKS.length - 1);
  const nextRankNeed = (rankIdx + 1) * 2 - activeDownline;

  const joinSeries = useMemo(() => {
    const now = new Date(); const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const v = members.filter(m => downlineIds.has(m.id) && m.enrolled_at &&
        new Date(m.enrolled_at).getMonth() === d.getMonth() &&
        new Date(m.enrolled_at).getFullYear() === d.getFullYear()).length;
      out.push({ label: MONTHS[d.getMonth()], v });
    }
    return out;
  }, [members, downlineIds]);

  const teamPerf = [...downlineIds].map(id => {
    const m = members.find(x => x.id === id); if (!m) return null;
    const refs = members.filter(x => x.referred_by === id).length;
    const earn = ledger.filter(l => l.member_id === id && l.entry_type !== 'payout')
      .reduce((s, l) => s + Number(l.cash_amount), 0);
    return { name: m.full_name, refs, earn };
  }).filter(Boolean).sort((a, b) => b.earn - a.earn).slice(0, 6);

  const refLink = me ? `https://ohmi-coffee-co.vercel.app/join?ref=${me.id.slice(0, 8)}` : '';
  const copyLink = () => { navigator.clipboard?.writeText(refLink); setToast('Referral link copied'); setTimeout(() => setToast(''), 2500); };
  const fmtR = n => 'R' + Number(n || 0).toLocaleString();
  const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="bo">
      <aside className="bo-side">
        <div className="bo-logo">OHMI<b>COFFEE</b></div>
        <div className="bo-user"><span className="bo-avatar">{me?.full_name?.[0] || '·'}</span>{me?.full_name || '…'}</div>
        <nav className="bo-nav">
          {NAV.map((n, i) => <button key={n} className={i === 0 ? 'on' : ''}>{n}</button>)}
        </nav>
      </aside>

      <div className="bo-body">
        <header className="bo-top">
          <div>
            <h1>Dashboard</h1>
            <div className="bo-crumb">Home › Dashboard</div>
          </div>
          <div className="bo-top-right">
            <span className="bo-bell">🔔<i>3</i></span>
            <span className="bo-avatar">{me?.full_name?.[0] || '·'}</span>
          </div>
        </header>

        <div className="bo-grid3">
          <div className="bo-card bo-stat">
            <span className="bo-ico">💰</span>
            <div><div className="bo-stat-label">Income</div><div className="bo-stat-num">{fmtR(income)}</div>
            <div className="bo-delta up">All time</div></div>
          </div>
          <div className="bo-card bo-stat">
            <span className="bo-ico">📤</span>
            <div><div className="bo-stat-label">Total Payout</div><div className="bo-stat-num">{fmtR(payout)}</div>
            <div className="bo-delta up">Paid to date</div></div>
          </div>
          <div className="bo-card bo-stat">
            <span className="bo-ico">👛</span>
            <div><div className="bo-stat-label">Total Balance</div><div className="bo-stat-num">{fmtR(balance)}</div>
            <div className="bo-delta">Available</div></div>
          </div>
          <div className="bo-card bo-donut">
            <Donut income={income || 1} payout={payout} />
            <div className="bo-donut-side">
              <div className="bo-donut-title">Income Payout Overview</div>
              <div className="bo-legend"><i style={{background:'#3b6ef5'}}></i>{fmtR(income)} Income</div>
              <div className="bo-legend"><i style={{background:'#e8efff'}}></i>{fmtR(payout)} Payout</div>
            </div>
          </div>
          <div className="bo-card bo-idcard">
            <div className="bo-id-name">{me?.full_name || '…'}</div>
            <div className="bo-id-role">Active Member</div>
            <div className="bo-id-link">{refLink.replace('https://', '')}</div>
            <div className="bo-id-actions">
              <button onClick={copyLink}>Copy</button>
              <a href={`https://wa.me/?text=${encodeURIComponent('Join me at OHMI Coffee Co: ' + refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>
        </div>

        <div className="bo-grid2">
          <div className="bo-card">
            <div className="bo-card-title">Network <span className="dim2">Overview of team joins</span></div>
            <LineChart points={joinSeries} />
          </div>
          <div className="bo-metrics">
            {[
              ['👥', 'Total Referrals', directReferrals.length],
              ['🌐', 'Downline Team Count', downlineIds.size],
              ['🎁', 'Total Bonus', fmtR(0)],
              ['💳', 'Commissions', fmtR(commissions)],
            ].map(([ico, label, val]) => (
              <div className="bo-card bo-metric" key={label}>
                <span className="bo-ico sm">{ico}</span>
                <span className="bo-metric-label">{label}</span>
                <span className="bo-metric-val">{val}</span>
              </div>
            ))}
            <div className="bo-card bo-rank">
              <div className="bo-donut-title">The next level is yours to achieve!</div>
              <div className="bo-rank-row"><span>Current Rank</span><b>🥉 {RANKS[rankIdx]}</b></div>
              <div className="bo-rank-row"><span>Next Rank</span><b>🥈 {RANKS[Math.min(rankIdx + 1, RANKS.length - 1)]}</b></div>
              <div className="bo-bar"><i style={{ width: `${Math.min(100, (activeDownline / ((rankIdx + 1) * 2)) * 100)}%` }}></i></div>
              <div className="dim2" style={{ fontSize: 11, marginTop: 6 }}>{nextRankNeed > 0 ? `${nextRankNeed} more active subscription${nextRankNeed > 1 ? 's' : ''} in your team to rank up` : 'Rank up ready!'}</div>
            </div>
          </div>
        </div>

        <div className="bo-grid2b">
          <div className="bo-card">
            <div className="bo-card-title">Referrals</div>
            <table className="bo-table">
              <thead><tr><th>User</th><th>Joined Date</th><th>Status</th></tr></thead>
              <tbody>
                {directReferrals.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.full_name}</b><div className="dim2">{r.email}</div></td>
                    <td>{fmtD(r.enrolled_at || r.created_at)}</td>
                    <td>{subs.find(s => s.member_id === r.id && s.active) ? <span className="pill on2">Active</span> : <span className="pill">Inactive</span>}</td>
                  </tr>
                ))}
                {directReferrals.length === 0 && <tr><td colSpan="3" className="dim2">No direct referrals yet — share your link above.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="bo-card">
            <div className="bo-card-title">Team performance</div>
            <table className="bo-table">
              <thead><tr><th>User</th><th>Referrals</th><th>Earnings</th></tr></thead>
              <tbody>
                {teamPerf.map(t => (
                  <tr key={t.name}><td><b>{t.name}</b></td><td>{t.refs}</td><td className="blue">{fmtR(t.earn)}</td></tr>
                ))}
                {teamPerf.length === 0 && <tr><td colSpan="3" className="dim2">Team earnings appear after the first billing run.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="bo-card">
            <div className="bo-card-title">Events</div>
            {[['Tue', 'Roast day — orders ship within 48h'], ['Thu', 'Team call — 19:00 SAST'], ['Sat', 'Waterstone tasting pop-up']].map(([d, t]) => (
              <div className="bo-event" key={t}><span className="bo-event-day">{d}</span>{t}</div>
            ))}
          </div>
        </div>

        <div className="dim2" style={{ padding: '18px 4px' }}>
          <Link href="/">← Back to storefront</Link> · Commissions trace to real product sales only (CPA s43).
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
