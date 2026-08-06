'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'members', label: 'Members' },
  { id: 'network', label: 'Binary Tree' },
  { id: 'orders', label: 'Retail Orders' },
  { id: 'billing', label: 'Run Billing' },
  { id: 'ledger', label: 'Commission Ledger' },
  { id: 'foundation', label: 'Foundation' },
];

const fmtR = n => 'R' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function TreeNode({ node, allNodes, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const children = allNodes.filter(n => n.parent_id === node.node_id);
  const left = children.find(n => n.leg === 'L');
  const right = children.find(n => n.leg === 'R');
  const hasChildren = left || right;
  const statusColor = node.status === 'active' ? 'var(--gold)' : '#444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div onClick={() => hasChildren && setExpanded(e => !e)} style={{
        background: 'var(--dark2)', border: `1px solid ${statusColor}`,
        padding: '10px 16px', minWidth: 140, textAlign: 'center',
        cursor: hasChildren ? 'pointer' : 'default',
      }}>
        {!node.parent_id && <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Root</div>}
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)' }}>{node.full_name}</div>
        <div style={{ fontSize: 10, color: statusColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>{node.status}</div>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>L:{node.left_count} · R:{node.right_count}</div>
        {hasChildren && <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{expanded ? '▲' : '▼'}</div>}
      </div>
      {hasChildren && expanded && (
        <div style={{ display: 'flex', gap: 32, marginTop: 24, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, left: '25%', right: '25%', borderTop: '1px solid #333' }} />
          {[left, right].map((child, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -14, height: 14, borderLeft: '1px solid #333' }} />
              <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{i === 0 ? 'L' : 'R'}</div>
              {child
                ? <TreeNode node={child} allNodes={allNodes} depth={depth + 1} />
                : <div style={{ border: '1px dashed #333', color: 'var(--dim)', padding: '8px 14px', fontSize: 10, minWidth: 110, textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Open</div>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subs, setSubs] = useState([]);
  const [activations, setActivations] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [foundation, setFoundation] = useState([]);
  const [balances, setBalances] = useState([]);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [billingResult, setBillingResult] = useState(null);
  const [memberFilter, setMemberFilter] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState({ member: '', type: '' });

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    const [m, n, o, s, a, l, f, b] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('tree_view').select('*'),
      supabase.from('retail_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('activations').select('*'),
      supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('foundation_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('member_balances').select('*'),
    ]);
    setMembers(m.data || []);
    setNodes(n.data || []);
    setOrders(o.data || []);
    setSubs(s.data || []);
    setActivations(a.data || []);
    setLedger(l.data || []);
    setFoundation(f.data || []);
    setBalances(b.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingActivations = activations.filter(a => a.status === 'pending');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const poolTotal = activeMembers.length * 500;
  const repShare = poolTotal * 0.30;
  const ohmiRetention = poolTotal * 0.70;
  const totalRevenue = orders.filter(o => o.status === 'fulfilled').reduce((s, o) => s + Number(o.total), 0);
  const foundationTotal = foundation.reduce((s, f) => s + Number(f.amount), 0);
  const memberById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m.full_name])), [members]);
  const rootNode = nodes.find(n => !n.parent_id);

  async function approveActivation(activationId, memberId) {
    setBusy(activationId);
    await supabase.from('activations').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', activationId);
    await supabase.from('members').update({ status: 'active' }).eq('id', memberId);
    const hasSub = subs.find(s => s.member_id === memberId);
    if (!hasSub) {
      await supabase.from('subscriptions').insert({ member_id: memberId, amount: 1500, pool_contribution: 500, status: 'active', next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) });
    }
    flash('✓ Activation approved — member is now active');
    setBusy(''); load();
  }

  async function runBilling() {
    setBusy('billing');
    setBillingResult(null);
    const period = new Date().toISOString().slice(0, 7) + '-01';
    const { data, error } = await supabase.rpc('run_billing', { p_period: period });
    if (error) { flash('Billing error: ' + error.message); setBusy(''); return; }
    setBillingResult(data);
    flash(`✓ Billing complete — ${data.length} members processed`);
    setBusy(''); load();
  }

  const filteredMembers = members.filter(m =>
    !memberFilter || m.full_name.toLowerCase().includes(memberFilter.toLowerCase()) ||
    m.email.toLowerCase().includes(memberFilter.toLowerCase())
  );
  const filteredLedger = ledger.filter(l => {
    if (ledgerFilter.member && !memberById[l.member_id]?.toLowerCase().includes(ledgerFilter.member.toLowerCase())) return false;
    if (ledgerFilter.type && l.entry_type !== ledgerFilter.type) return false;
    return true;
  });

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-logo">
          <div className="ohmi-logo" style={{ fontSize: 20 }}>OHMI<span>.</span></div>
          <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>CRM Admin</div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n => (
            <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => setTab(n.id)}>
              {n.label}
              {n.id === 'members' && pendingActivations.length > 0 && (
                <span style={{ marginLeft: 8, background: 'var(--gold)', color: 'var(--black)', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{pendingActivations.length}</span>
              )}
              {n.id === 'orders' && pendingOrders.length > 0 && (
                <span style={{ marginLeft: 8, background: '#9c3a3a', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{pendingOrders.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-foot">
          <Link href="/">← Storefront</Link><br /><br />
          <Link href="/dashboard" style={{ color: 'var(--dim)' }}>Member view</Link>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1>{NAV.find(n => n.id === tab)?.label}</h1>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>OHMI Coffee Co. — Company Admin</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="admin-badge">{activeMembers.length} Active</div>
            <div className="admin-badge">{fmtR(poolTotal)} Pool</div>
          </div>
        </div>

        {/* DASHBOARD */}
        {tab === 'dashboard' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[
              ['Total Members', members.length], ['Active', activeMembers.length],
              ['Pool This Month', fmtR(poolTotal)], ['Rep Share 30%', fmtR(repShare)],
              ['OHMI Retention 70%', fmtR(ohmiRetention)], ['Pending Activations', pendingActivations.length],
              ['Pending Orders', pendingOrders.length], ['Retail Revenue', fmtR(totalRevenue)],
            ].map(([label, val]) => (
              <div key={label} className="stat-box">
                <div className="stat-val" style={{ fontSize: 28 }}>{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
          {pendingActivations.length > 0 && (
            <div className="card card-gold" style={{ marginBottom: 20 }}>
              <div className="kicker" style={{ marginBottom: 12 }}>⚠ Pending Activations — Action Required</div>
              <table className="ohmi-table">
                <thead><tr><th>Member</th><th>Email</th><th>Registered</th><th>Amount</th><th>Action</th></tr></thead>
                <tbody>
                  {pendingActivations.map(a => {
                    const m = members.find(x => x.id === a.member_id);
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 700 }}>{m?.full_name}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{m?.email}</td>
                        <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(a.created_at)}</td>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmtR(a.amount)}</td>
                        <td><button className="btn btn-gold btn-sm" disabled={busy === a.id} onClick={() => approveActivation(a.id, a.member_id)}>{busy === a.id ? '…' : 'Approve Payment'}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Pool Breakdown — {new Date().toISOString().slice(0, 7)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[['Active × R500', fmtR(poolTotal), 'Total pool'],['30% to Reps', fmtR(repShare), 'Commission pool'],['70% OHMI', fmtR(ohmiRetention), 'Ops + Foundation']].map(([l, v, s]) => (
                <div key={l} style={{ padding: 16, background: 'var(--dark3)', border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--gold)', fontWeight: 700 }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* MEMBERS */}
        {tab === 'members' && <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <input className="form-input" placeholder="Search name or email…" value={memberFilter} onChange={e => setMemberFilter(e.target.value)} style={{ maxWidth: 320, padding: '10px 14px' }} />
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>{filteredMembers.length} of {members.length}</div>
          </div>
          <div className="card">
            <table className="ohmi-table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Activation</th><th>Subscription</th><th>Balance</th><th>Sponsor</th><th>Joined</th><th>Action</th></tr></thead>
              <tbody>
                {filteredMembers.map(m => {
                  const act = activations.find(a => a.member_id === m.id);
                  const sub = subs.find(s => s.member_id === m.id);
                  const bal = balances.find(b => b.member_id === m.id);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700 }}>{m.full_name}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{m.email}</td>
                      <td><span className={`pill ${m.status === 'active' ? 'pill-green' : m.status === 'pending' ? 'pill-gold' : 'pill-red'}`}>{m.status}</span></td>
                      <td>
                        {act ? (act.status === 'paid'
                          ? <span className="pill pill-green">Paid</span>
                          : <div style={{ display: 'flex', gap: 8 }}><span className="pill pill-gold">Pending</span><button className="btn btn-gold btn-sm" disabled={busy === act.id} onClick={() => approveActivation(act.id, m.id)}>{busy === act.id ? '…' : 'Approve'}</button></div>
                        ) : <span style={{ color: 'var(--dim)', fontSize: 12 }}>—</span>}
                      </td>
                      <td><span className={`pill ${sub?.status === 'active' ? 'pill-green' : 'pill-grey'}`}>{sub ? `R${sub.amount}/mo` : 'None'}</span></td>
                      <td style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--display)', fontSize: 18 }}>{bal?.balance > 0 ? fmtR(bal.balance) : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{m.sponsor_id ? (memberById[m.sponsor_id] || '…') : 'Root'}</td>
                      <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(m.created_at)}</td>
                      <td>
                        {m.status === 'active' && (
                          <button className="btn btn-dark btn-sm" onClick={async () => { await supabase.from('members').update({ status: 'suspended' }).eq('id', m.id); flash('Suspended'); load(); }}>Suspend</button>
                        )}
                        {m.status === 'suspended' && (
                          <button className="btn btn-gold btn-sm" onClick={async () => { await supabase.from('members').update({ status: 'active' }).eq('id', m.id); flash('Reinstated'); load(); }}>Reinstate</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {/* BINARY TREE */}
        {tab === 'network' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[
              ['Total Nodes', nodes.length],
              ['Left Leg (Root)', nodes.find(n => !n.parent_id)?.left_count || 0],
              ['Right Leg (Root)', nodes.find(n => !n.parent_id)?.right_count || 0],
              ['Max Depth', Math.max(0, ...nodes.map(n => n.depth || 0))],
            ].map(([l, v]) => (
              <div key={l} className="stat-box"><div className="stat-val" style={{ fontSize: 28 }}>{v}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
          <div className="card" style={{ marginBottom: 16, overflowX: 'auto' }}>
            <div className="kicker" style={{ marginBottom: 20 }}>Binary Network — BFS placement · Click nodes to expand/collapse</div>
            <div style={{ minWidth: 600, padding: '10px 0 30px' }}>
              {rootNode ? <TreeNode node={rootNode} allNodes={nodes} depth={0} /> : <p style={{ color: 'var(--dim)' }}>No network yet.</p>}
            </div>
          </div>
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Node Registry</div>
            <table className="ohmi-table">
              <thead><tr><th>Name</th><th>Status</th><th>Leg</th><th>Depth</th><th>L Count</th><th>R Count</th><th>Sub</th></tr></thead>
              <tbody>
                {[...nodes].sort((a, b) => a.depth - b.depth || (a.leg || '').localeCompare(b.leg || '')).map(n => (
                  <tr key={n.node_id}>
                    <td style={{ fontWeight: 600 }}>{n.full_name}</td>
                    <td><span className={`pill ${n.status === 'active' ? 'pill-green' : 'pill-grey'}`}>{n.status}</span></td>
                    <td style={{ color: n.leg === 'L' ? '#7ec8e3' : n.leg === 'R' ? '#e3a87e' : 'var(--gold)', fontWeight: 700 }}>{n.leg || 'Root'}</td>
                    <td style={{ color: 'var(--dim)' }}>{n.depth}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{n.left_count}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{n.right_count}</td>
                    <td><span className={`pill ${n.subscribed ? 'pill-green' : 'pill-red'}`}>{n.subscribed ? 'Yes' : 'No'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* ORDERS */}
        {tab === 'orders' && <>
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            {[['Total', orders.length],['Pending', pendingOrders.length],['Fulfilled', orders.filter(o=>o.status==='fulfilled').length],['Revenue', fmtR(totalRevenue)]].map(([l,v]) => (
              <div key={l} className="stat-box"><div className="stat-val" style={{ fontSize: 28 }}>{v}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
          <div className="card">
            <table className="ohmi-table">
              <thead><tr><th>Customer</th><th>Email</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{o.customer_email}</td>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{Array.isArray(o.items) ? o.items.map(i => `${i.size}×${i.qty}`).join(', ') : '—'}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmtR(o.total)}</td>
                    <td><span className={`pill ${o.status==='fulfilled'?'pill-green':o.status==='pending'?'pill-gold':'pill-red'}`}>{o.status}</span></td>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(o.created_at)}</td>
                    <td>
                      {o.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-gold btn-sm" disabled={busy===o.id} onClick={async()=>{setBusy(o.id);await supabase.from('retail_orders').update({status:'fulfilled'}).eq('id',o.id);flash('✓ Fulfilled');setBusy('');load();}}>Fulfil</button>
                          <button className="btn btn-dark btn-sm" disabled={busy===o.id} onClick={async()=>{setBusy(o.id);await supabase.from('retail_orders').update({status:'cancelled'}).eq('id',o.id);flash('Cancelled');setBusy('');load();}}>Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan="7" style={{ color: 'var(--dim)', textAlign: 'center', padding: 24 }}>No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {/* BILLING */}
        {tab === 'billing' && <>
          <div className="card card-gold" style={{ marginBottom: 20 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>Monthly Billing Run — {new Date().toISOString().slice(0, 7)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
              {[['Active Members',activeMembers.length],['Pool Total',fmtR(poolTotal)],['Rep Share (30%)',fmtR(repShare)],['OHMI Retention (70%)',fmtR(ohmiRetention)],['Foundation Est.',fmtR(activeMembers.length*2*15)],['Period',new Date().toISOString().slice(0,7)]].map(([l,v]) => (
                <div key={l} style={{ padding: 14, background: 'var(--dark3)', border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--gold)', fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-gold" disabled={busy==='billing'} onClick={runBilling}>
              {busy === 'billing' ? 'Running…' : `Run Billing — ${new Date().toISOString().slice(0,7)}`}
            </button>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 12 }}>
              Records pool contributions, pro-rates payout by rank, allocates foundation funds. Idempotent — safe to re-run.
            </p>
          </div>
          {billingResult && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="kicker" style={{ marginBottom: 14 }}>Billing Results</div>
              <table className="ohmi-table">
                <thead><tr><th>Member</th><th>Rank</th><th>Pool Share</th><th>Note</th></tr></thead>
                <tbody>
                  {billingResult.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.out_member_name}</td>
                      <td><span className={`pill ${r.out_rank_name !== 'Unranked' ? 'pill-gold' : 'pill-grey'}`}>{r.out_rank_name}</span></td>
                      <td style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)', fontWeight: 700 }}>{fmtR(r.out_pool_share)}</td>
                      <td style={{ fontSize: 12, color: 'var(--dim)' }}>{r.out_message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ledger.filter(l => l.entry_type === 'payout').length > 0 && (
            <div className="card">
              <div className="kicker" style={{ marginBottom: 14 }}>Payout Queue</div>
              <table className="ohmi-table">
                <thead><tr><th>Member</th><th>Amount</th><th>Date</th><th>Note</th></tr></thead>
                <tbody>
                  {ledger.filter(l => l.entry_type === 'payout').map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{memberById[p.member_id]}</td>
                      <td style={{ fontFamily: 'var(--display)', fontSize: 18, color: '#e07070', fontWeight: 700 }}>{fmtR(p.amount)}</td>
                      <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(p.created_at)}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>}

        {/* LEDGER */}
        {tab === 'ledger' && <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="kicker" style={{ marginBottom: 14 }}>Member Balances</div>
            <table className="ohmi-table">
              <thead><tr><th>Member</th><th>Status</th><th>Total Earned</th><th>Paid Out</th><th>Balance</th></tr></thead>
              <tbody>
                {balances.filter(b => Number(b.total_earned) > 0 || Number(b.balance) > 0).map(b => (
                  <tr key={b.member_id}>
                    <td style={{ fontWeight: 600 }}>{b.full_name}</td>
                    <td><span className={`pill ${b.status==='active'?'pill-green':'pill-grey'}`}>{b.status}</span></td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmtR(b.total_earned)}</td>
                    <td style={{ color: '#e07070' }}>{fmtR(b.total_paid)}</td>
                    <td style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--gold)', fontWeight: 700 }}>{fmtR(b.balance)}</td>
                  </tr>
                ))}
                {balances.every(b => Number(b.total_earned) === 0) && (
                  <tr><td colSpan="5" style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>Run billing first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <input className="form-input" placeholder="Filter by member…" value={ledgerFilter.member} onChange={e => setLedgerFilter(f => ({ ...f, member: e.target.value }))} style={{ maxWidth: 220, padding: '9px 14px', fontSize: 13 }} />
            <select className="form-input" value={ledgerFilter.type} onChange={e => setLedgerFilter(f => ({ ...f, type: e.target.value }))} style={{ maxWidth: 200, padding: '9px 14px', fontSize: 13 }}>
              <option value="">All types</option>
              <option value="pool_share">Pool share</option>
              <option value="disc_bonus">Disc. bonus</option>
              <option value="payout">Payout</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <div style={{ fontSize: 12, color: 'var(--dim)', alignSelf: 'center' }}>{filteredLedger.length} entries</div>
          </div>
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>CPA s43 Audit Trail</div>
            <table className="ohmi-table">
              <thead><tr><th>Date</th><th>Member</th><th>Type</th><th>Period</th><th>Note</th><th>Amount</th></tr></thead>
              <tbody>
                {filteredLedger.map(l => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(l.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{memberById[l.member_id] || '—'}</td>
                    <td><span className={`pill ${l.entry_type==='payout'?'pill-red':l.entry_type==='pool_share'?'pill-gold':'pill-grey'}`}>{l.entry_type.replace('_',' ')}</span></td>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{l.period?.slice(0,7) || '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.note}</td>
                    <td style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: l.entry_type==='payout'?'#e07070':'var(--gold)' }}>{fmtR(l.amount)}</td>
                  </tr>
                ))}
                {filteredLedger.length === 0 && <tr><td colSpan="6" style={{ color: 'var(--dim)', textAlign: 'center', padding: 24 }}>No ledger entries. Run billing to populate.</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {/* FOUNDATION */}
        {tab === 'foundation' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[['Total Allocated',fmtR(foundationTotal)],['Kg Equivalent',foundation.reduce((s,f)=>s+Number(f.kg_equivalent),0).toFixed(1)+' kg'],['Billing Runs',foundation.length],['Rate','R15/kg']].map(([l,v]) => (
              <div key={l} className="stat-box"><div className="stat-val" style={{ fontSize: 26 }}>{v}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
          <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--gold)', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--gold)', marginBottom: 8 }}>Every kilogram feeds a child in Bitou.</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>R15 per kilogram is a fixed cost in the OHMI structure — not a discretionary donation. Allocated automatically with every billing run.</p>
          </div>
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Foundation Ledger</div>
            <table className="ohmi-table">
              <thead><tr><th>Period</th><th>Kg Equivalent</th><th>Amount</th><th>Note</th><th>Date</th></tr></thead>
              <tbody>
                {foundation.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.period?.slice(0,7) || '—'}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{Number(f.kg_equivalent).toFixed(1)} kg</td>
                    <td style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)', fontWeight: 700 }}>{fmtR(f.amount)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{f.note}</td>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(f.created_at)}</td>
                  </tr>
                ))}
                {foundation.length === 0 && <tr><td colSpan="5" style={{ color: 'var(--dim)', textAlign: 'center', padding: 24 }}>Run billing to allocate foundation funds.</td></tr>}
              </tbody>
            </table>
          </div>
        </>}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
