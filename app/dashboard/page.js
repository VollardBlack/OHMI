'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const RANKS = [
  { name: 'Bronze',          left: 2,    right: 2,    pool: 750,     bonus: 0 },
  { name: 'Silver',          left: 5,    right: 5,    pool: 2000,    bonus: 0 },
  { name: 'Gold',            left: 20,   right: 20,   pool: 6000,    bonus: 4000 },
  { name: 'Platinum',        left: 50,   right: 50,   pool: 15000,   bonus: 10000 },
  { name: 'Emerald',         left: 100,  right: 100,  pool: 30000,   bonus: 15000 },
  { name: 'Sapphire',        left: 200,  right: 200,  pool: 60000,   bonus: 25000 },
  { name: 'Diamond',         left: 500,  right: 500,  pool: 150000,  bonus: 35000 },
  { name: 'Crowned Diamond', left: 1000, right: 1000, pool: 300000,  bonus: 100000 },
  { name: 'Royal Diamond',   left: 2500, right: 2500, pool: 750000,  bonus: 250000 },
  { name: 'Imperial Diamond',left: 5000, right: 5000, pool: 1500000, bonus: 0 },
];

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'network', label: 'My Network' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'subscriptions', label: 'Subscription' },
  { id: 'ranks', label: 'Rank Journey' },
  { id: 'profile', label: 'My Profile' },
];

function TreeNode({ node, map }) {
  const kids = map[node.id] || [];
  const L = kids.find(k => k.leg === 'L');
  const R = kids.find(k => k.leg === 'R');
  return (
    <div className="tree-node">
      <div className={`tree-card ${node.status === 'active' ? 'active' : ''}`}>
        <div className="tree-name">{node.display_name}</div>
        <div className="tree-rank">{node.status}</div>
      </div>
      {(L || R) && (
        <div className="tree-legs">
          {['L', 'R'].map(leg => {
            const child = leg === 'L' ? L : R;
            return (
              <div key={leg} className="tree-leg">
                <div className="tree-leg-label">{leg}</div>
                {child ? <TreeNode node={child} map={map} /> : <div className="tree-open">Open</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState('dashboard');
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [sub, setSub] = useState(null);
  const [activation, setActivation] = useState(null);
  const [toast, setToast] = useState('');

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    (async () => {
      const [m, n, l, s, a] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('network_nodes').select('*'),
        supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*'),
        supabase.from('activations').select('*'),
      ]);
      const mem = m.data || [];
      setMembers(mem);
      setNodes(n.data || []);
      setLedger(l.data || []);
      const root = mem.find(x => x.email === 'brandon@ohmicoffee.co.za') || mem[0];
      setMe(root || null);
      setSub(s.data?.find(x => x.member_id === root?.id) || null);
      setActivation(a.data?.find(x => x.member_id === root?.id) || null);
    })();
  }, []);

  // Binary tree map
  const treeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      if (n.parent_id) (map[n.parent_id] = map[n.parent_id] || []).push({
        ...n,
        display_name: members.find(m => m.id === n.member_id)?.full_name?.split(' ')[0] || '—',
        status: members.find(m => m.id === n.member_id)?.status || 'pending',
      });
    });
    return map;
  }, [nodes, members]);

  const myNode = nodes.find(n => me && n.member_id === me.id);
  const rootTreeNode = myNode ? {
    ...myNode,
    display_name: me?.full_name?.split(' ')[0] || 'You',
    status: me?.status || 'active',
  } : null;

  // Downline counts per leg
  const leftCount = myNode ? (treeMap[myNode.id] || []).filter(n => n.leg === 'L').length : 0;
  const rightCount = myNode ? (treeMap[myNode.id] || []).filter(n => n.leg === 'R').length : 0;

  // Current rank
  const currentRank = RANKS.filter(r => leftCount >= r.left && rightCount >= r.right).pop();
  const nextRank = RANKS.find(r => leftCount < r.left || rightCount < r.right);

  // Earnings
  const myLedger = ledger.filter(l => me && l.member_id === me.id);
  const totalEarned = myLedger.filter(l => l.entry_type !== 'payout').reduce((s, l) => s + Number(l.amount), 0);
  const totalPaid = myLedger.filter(l => l.entry_type === 'payout').reduce((s, l) => s + Number(l.amount), 0);
  const balance = totalEarned - totalPaid;

  const fmtR = n => 'R' + Number(n || 0).toLocaleString('en-ZA');
  const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const refLink = me ? `https://ohmi-coffee-co.vercel.app/join?ref=${me.id}` : '';

  return (
    <div className="dash-shell">
      <aside className="dash-side">
        <div className="dash-logo">
          <div className="ohmi-logo" style={{ fontSize: 20 }}>OHMI<span>.</span></div>
        </div>
        <div className="dash-member">
          <div className="dash-avatar">{me?.full_name?.[0] || '?'}</div>
          <div>
            <div className="dash-member-name">{me?.full_name || '…'}</div>
            <div className="dash-member-rank">{currentRank?.name || 'Unranked'}</div>
          </div>
        </div>
        <nav className="dash-nav">
          {NAV.map(n => (
            <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => setTab(n.id)}>{n.label}</button>
          ))}
        </nav>
        <div className="dash-foot">
          <Link href="/">← Shop</Link>
          <span style={{ margin: '0 10px', color: '#333' }}>·</span>
          <Link href="/admin" style={{ color: 'var(--dim)' }}>Admin</Link>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-topbar">
          <div>
            <h1>{NAV.find(n => n.id === tab)?.label}</h1>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              OHMI Coffee Co. · {me?.email}
            </div>
          </div>
          <div className="rank-badge">{currentRank?.name || 'Unranked'}</div>
        </div>

        {/* ═══ DASHBOARD ═══ */}
        {tab === 'dashboard' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box"><div className="stat-val">{fmtR(totalEarned)}</div><div className="stat-label">Total earned</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(balance)}</div><div className="stat-label">Available balance</div></div>
            <div className="stat-box"><div className="stat-val">{members.length - 1}</div><div className="stat-label">Network members</div></div>
            <div className="stat-box"><div className="stat-val">{currentRank?.name || '—'}</div><div className="stat-label">Current rank</div></div>
          </div>

          {/* Rank progress */}
          {nextRank && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="kicker" style={{ marginBottom: 10 }}>Next rank — {nextRank.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Left leg</div>
                  <div style={{ height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--gold)', width: `${Math.min(100, (leftCount / nextRank.left) * 100)}%`, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 5 }}>{leftCount} / {nextRank.left}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Right leg</div>
                  <div style={{ height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--gold)', width: `${Math.min(100, (rightCount / nextRank.right) * 100)}%`, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 5 }}>{rightCount} / {nextRank.right}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
                Achieving {nextRank.name} unlocks <strong style={{ color: 'var(--gold)' }}>{fmtR(nextRank.pool)}/month</strong>
                {nextRank.bonus > 0 && <> + <strong style={{ color: 'var(--gold)' }}>{fmtR(nextRank.bonus)} discretionary bonus</strong></>}
              </div>
            </div>
          )}

          {/* Referral link */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>Your referral link</div>
            <div style={{ background: 'var(--dark3)', padding: '12px 14px', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 12, border: '1px solid #2a2a2a' }}>{refLink}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-gold btn-sm" onClick={() => { navigator.clipboard?.writeText(refLink); flash('Link copied!'); }}>Copy link</button>
              <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join me on OHMI Coffee Co — One Team. One Dream. One Legacy.\n' + refLink)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
            </div>
          </div>

          {/* Subscription status */}
          <div className="card">
            <div className="kicker" style={{ marginBottom: 10 }}>Subscription status</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Monthly</div>
                <div style={{ fontSize: 18, fontFamily: 'var(--display)', color: 'var(--gold)' }}>R{sub?.amount || 1500}/month</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Pool contribution</div>
                <div style={{ fontSize: 18, fontFamily: 'var(--display)', color: 'var(--gold)' }}>R{sub?.pool_contribution || 500}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Status</div>
                <div style={{ marginTop: 4 }}><span className={`pill ${sub?.status === 'active' ? 'pill-green' : 'pill-red'}`}>{sub?.status || 'inactive'}</span></div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Activation</div>
                <div style={{ marginTop: 4 }}><span className={`pill ${activation?.status === 'paid' ? 'pill-green' : 'pill-gold'}`}>R2,500 — {activation?.status || 'pending'}</span></div>
              </div>
            </div>
          </div>
        </>}

        {/* ═══ NETWORK ═══ */}
        {tab === 'network' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box"><div className="stat-val">{leftCount}</div><div className="stat-label">Left leg</div></div>
            <div className="stat-box"><div className="stat-val">{rightCount}</div><div className="stat-label">Right leg</div></div>
            <div className="stat-box"><div className="stat-val">{members.length - 1}</div><div className="stat-label">Total downline</div></div>
          </div>
          <div className="card">
            <div className="kicker" style={{ marginBottom: 16 }}>Binary tree</div>
            <div className="tree-wrap">
              {rootTreeNode ? <TreeNode node={rootTreeNode} map={treeMap} /> : <p style={{ color: 'var(--dim)' }}>Loading…</p>}
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="kicker" style={{ marginBottom: 14 }}>All network members</div>
            <table className="ohmi-table">
              <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>
                {members.filter(m => m.id !== me?.id).map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.full_name}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.email}</td>
                    <td style={{ color: 'var(--dim)' }}>{fmtD(m.created_at)}</td>
                    <td><span className={`pill ${m.status === 'active' ? 'pill-green' : 'pill-grey'}`}>{m.status}</span></td>
                  </tr>
                ))}
                {members.length <= 1 && <tr><td colSpan="4" style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>No network members yet — share your referral link.</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {/* ═══ EARNINGS ═══ */}
        {tab === 'earnings' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box"><div className="stat-val">{fmtR(totalEarned)}</div><div className="stat-label">Total earned</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(totalPaid)}</div><div className="stat-label">Paid out</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(balance)}</div><div className="stat-label">Available</div></div>
          </div>
          {balance >= 500 && (
            <div className="card card-gold" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Request payout — {fmtR(balance)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Processed within 3 business days</div>
              </div>
              <button className="btn btn-gold" onClick={async () => {
                const { error } = await supabase.from('commission_ledger').insert({ member_id: me.id, entry_type: 'payout', amount: balance, note: 'Manual payout request', period: new Date().toISOString().slice(0, 7) + '-01' });
                if (error) flash('Payout request failed'); else flash('Payout request submitted ✓');
              }}>Request payout</button>
            </div>
          )}
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Commission ledger — CPA s43 audit trail</div>
            <table className="ohmi-table">
              <thead><tr><th>Date</th><th>Type</th><th>Note</th><th>Amount</th></tr></thead>
              <tbody>
                {myLedger.length ? myLedger.map(l => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--dim)' }}>{fmtD(l.created_at)}</td>
                    <td><span className={`pill ${l.entry_type === 'payout' ? 'pill-red' : 'pill-gold'}`}>{l.entry_type.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.note}</td>
                    <td style={{ fontFamily: 'var(--display)', fontSize: 18, color: l.entry_type === 'payout' ? '#e07070' : 'var(--gold)', fontWeight: 700 }}>{fmtR(l.amount)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>Ledger fills after the first billing run.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>}

        {/* ═══ SUBSCRIPTION ═══ */}
        {tab === 'subscriptions' && <>
          <div className="card card-gold" style={{ marginBottom: 20 }}>
            <div className="kicker" style={{ marginBottom: 10 }}>Current plan</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
              {[
                ['Monthly', `R${sub?.amount || 1500}`],
                ['Pool contribution', `R${sub?.pool_contribution || 500}`],
                ['OHMI retention', `R${(sub?.amount || 1500) - (sub?.pool_contribution || 500)}`],
                ['Status', sub?.status || 'active'],
                ['Activation', `R2,500 — ${activation?.status || 'pending'}`],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
                  <div style={{ fontSize: 18, fontFamily: 'var(--display)', color: 'var(--gold)', fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="kicker" style={{ marginBottom: 12 }}>How your R1,500 works</div>
            {[
              ['R500', 'Binary commission pool', 'Funds 30% rep payouts across the entire network'],
              ['R1,000', 'OHMI retention', 'Covers roasting, packaging, Foundation, and discretionary bonuses'],
            ].map(([amt, label, desc]) => (
              <div key={label} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #1e1e1e', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--gold)', fontWeight: 700, minWidth: 60 }}>{amt}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{desc}</div>
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 14, lineHeight: 1.7 }}>
              Actuarially proven solvent at all network sizes. OHMI retains minimum R350/member at all times.
              Ref: OHMI-ACT-2026-002.
            </p>
          </div>
        </>}

        {/* ═══ RANK JOURNEY ═══ */}
        {tab === 'ranks' && (
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Your journey — 10 ranks</div>
            <table className="ohmi-table">
              <thead><tr><th>Rank</th><th>Left leg</th><th>Right leg</th><th>Pool PM</th><th>Disc. bonus</th><th>Status</th></tr></thead>
              <tbody>
                {RANKS.map((r, i) => {
                  const achieved = leftCount >= r.left && rightCount >= r.right;
                  const isCurrent = r.name === currentRank?.name;
                  return (
                    <tr key={r.name} style={{ background: isCurrent ? 'rgba(201,168,76,.05)' : undefined }}>
                      <td style={{ fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--white)' }}>{r.name}</td>
                      <td>{r.left.toLocaleString()}</td>
                      <td>{r.right.toLocaleString()}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 700 }}>R{r.pool.toLocaleString()}</td>
                      <td style={{ color: r.bonus > 0 ? 'var(--gold2)' : 'var(--dim)' }}>{r.bonus > 0 ? `R${r.bonus.toLocaleString()}` : '—'}</td>
                      <td>
                        {isCurrent ? <span className="pill pill-gold">Current</span>
                          : achieved ? <span className="pill pill-green">Achieved</span>
                          : <span className="pill pill-grey">Locked</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 14, lineHeight: 1.7 }}>
              Pool PM = your 30% share of the binary pool based on active members in your network.
              Disc. bonus = discretionary amount paid from OHMI 70% retention — not contractually guaranteed.
              OHMI-ACT-2026-002.
            </p>
          </div>
        )}

        {/* ═══ PROFILE ═══ */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold2))', color: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, margin: '0 auto 12px' }}>{me?.full_name?.[0]}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600 }}>{me?.full_name}</div>
                <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>{currentRank?.name || 'Unranked'}</div>
              </div>
              {[['Email', me?.email], ['Phone', me?.phone || '—'], ['Status', me?.status], ['Joined', fmtD(me?.created_at)], ['Member ID', me?.id?.slice(0, 8) + '…']].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e1e1e', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)', minWidth: 90 }}>{l}</span>
                  <span style={{ wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="kicker" style={{ marginBottom: 14 }}>Referral link</div>
              <div style={{ background: 'var(--dark3)', padding: '12px 14px', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 14, border: '1px solid #2a2a2a' }}>{refLink}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-gold btn-sm" onClick={() => { navigator.clipboard?.writeText(refLink); flash('Copied!'); }}>Copy</button>
                <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join OHMI: ' + refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
              <div style={{ marginTop: 20 }}>
                <div className="kicker" style={{ marginBottom: 10 }}>Foundation</div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
                  R15 from every kilogram of coffee in your subscription goes toward feeding children in the Bitou region. You are part of the legacy.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
