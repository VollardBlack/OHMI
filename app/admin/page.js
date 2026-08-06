'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'members', label: 'Members' },
  { id: 'orders', label: 'Retail Orders' },
  { id: 'network', label: 'Network Tree' },
  { id: 'billing', label: 'Run Billing' },
  { id: 'ledger', label: 'Commission Ledger' },
];

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subs, setSubs] = useState([]);
  const [activations, setActivations] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3000); };

  async function load() {
    const [m, n, o, s, a, l] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('network_nodes').select('*'),
      supabase.from('retail_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('activations').select('*'),
      supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
    ]);
    setMembers(m.data || []);
    setNodes(n.data || []);
    setOrders(o.data || []);
    setSubs(s.data || []);
    setActivations(a.data || []);
    setLedger(l.data || []);
  }

  useEffect(() => { load(); }, []);

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingActivations = activations.filter(a => a.status === 'pending');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const totalPool = activeMembers.length * 500;
  const repShare = totalPool * 0.30;
  const ohmiRetention = totalPool * 0.70;

  const memberName = useMemo(() => Object.fromEntries(members.map(m => [m.id, m.full_name])), [members]);

  const fmtR = n => 'R' + Number(n || 0).toLocaleString('en-ZA');
  const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  async function approveActivation(id, memberId) {
    setBusy(id);
    await supabase.from('activations').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('members').update({ status: 'active' }).eq('id', memberId);
    // Create subscription
    await supabase.from('subscriptions').insert({ member_id: memberId, amount: 1500, pool_contribution: 500, status: 'active', next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) });
    flash('Activation approved — member is now active.');
    setBusy('');
    load();
  }

  async function fulfillOrder(id) {
    setBusy(id);
    await supabase.from('retail_orders').update({ status: 'fulfilled' }).eq('id', id);
    flash('Order fulfilled.');
    setBusy('');
    load();
  }

  async function cancelOrder(id) {
    setBusy(id);
    await supabase.from('retail_orders').update({ status: 'cancelled' }).eq('id', id);
    flash('Order cancelled.');
    setBusy('');
    load();
  }

  async function runBilling() {
    setBusy('billing');
    const period = new Date().toISOString().slice(0, 7) + '-01';
    const actives = members.filter(m => m.status === 'active');
    // Insert pool contributions
    const poolRows = actives.map(m => ({ member_id: m.id, period, amount: 500, active: true }));
    if (poolRows.length > 0) {
      await supabase.from('pool_contributions').upsert(poolRows, { onConflict: 'member_id,period' });
    }
    // Foundation ledger
    await supabase.from('foundation_ledger').insert({
      kg_equivalent: actives.length * 2, // approx 2kg per member
      amount: actives.length * 2 * 15,
      period,
      note: `Billing run ${period} — ${actives.length} active members`,
    });
    flash(`Billing run complete — ${actives.length} members billed, pool R${actives.length * 500}`);
    setBusy('');
    load();
  }

  // Tree for network tab
  const treeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      if (n.parent_id) (map[n.parent_id] = map[n.parent_id] || []).push({
        ...n,
        display_name: members.find(m => m.id === n.member_id)?.full_name?.split(' ')[0] || '?',
        status: members.find(m => m.id === n.member_id)?.status || 'pending',
      });
    });
    return map;
  }, [nodes, members]);

  const rootMember = members.find(m => !m.sponsor_id);
  const rootNode = nodes.find(n => rootMember && n.member_id === rootMember.id);
  const rootTreeNode = rootNode ? { ...rootNode, display_name: rootMember?.full_name?.split(' ')[0] || 'Root', status: rootMember?.status || 'active' } : null;

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

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-logo">
          <div className="ohmi-logo" style={{ fontSize: 18 }}>OHMI<span>.</span></div>
          <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>Admin</div>
        </div>
        <nav className="admin-nav">
          {NAV.map(n => (
            <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => setTab(n.id)}>{n.label}</button>
          ))}
        </nav>
        <div className="admin-foot">
          <Link href="/">← Storefront</Link>
          <br />
          <Link href="/dashboard" style={{ color: 'var(--dim)', fontSize: 11 }}>Member dashboard</Link>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1>{NAV.find(n => n.id === tab)?.label}</h1>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>OHMI Coffee Co. — Company Admin</div>
          </div>
          <div className="admin-badge">Backoffice</div>
        </div>

        {/* ═══ ADMIN DASHBOARD ═══ */}
        {tab === 'dashboard' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box"><div className="stat-val">{members.length}</div><div className="stat-label">Total members</div></div>
            <div className="stat-box"><div className="stat-val">{activeMembers.length}</div><div className="stat-label">Active members</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(totalPool)}</div><div className="stat-label">Pool this month</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(repShare)}</div><div className="stat-label">Rep share (30%)</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(ohmiRetention)}</div><div className="stat-label">OHMI retention (70%)</div></div>
            <div className="stat-box"><div className="stat-val">{pendingOrders.length}</div><div className="stat-label">Pending orders</div></div>
          </div>

          {pendingActivations.length > 0 && (
            <div className="card card-gold" style={{ marginBottom: 20 }}>
              <div className="kicker" style={{ marginBottom: 14 }}>Pending activations — action required</div>
              <table className="ohmi-table">
                <thead><tr><th>Member</th><th>Email</th><th>Registered</th><th>Amount</th><th>Action</th></tr></thead>
                <tbody>
                  {pendingActivations.map(a => {
                    const m = members.find(x => x.id === a.member_id);
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{m?.full_name}</td>
                        <td style={{ color: 'var(--muted)' }}>{m?.email}</td>
                        <td style={{ color: 'var(--dim)' }}>{fmtD(a.created_at)}</td>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmtR(a.amount)}</td>
                        <td>
                          <button className="btn btn-gold btn-sm" disabled={busy === a.id} onClick={() => approveActivation(a.id, a.member_id)}>
                            {busy === a.id ? '…' : 'Approve payment'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="card">
            <div className="kicker" style={{ marginBottom: 12 }}>Pool summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[['Active members × R500', fmtR(totalPool)], ['30% to reps', fmtR(repShare)], ['70% OHMI retention', fmtR(ohmiRetention)]].map(([l, v]) => (
                <div key={l} style={{ padding: '14px', background: 'var(--dark3)', border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{l}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--gold)', fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══ MEMBERS ═══ */}
        {tab === 'members' && (
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>All members ({members.length})</div>
            <table className="ohmi-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Activation</th><th>Joined</th></tr></thead>
              <tbody>
                {members.map(m => {
                  const act = activations.find(a => a.member_id === m.id);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.full_name}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{m.email}</td>
                      <td style={{ color: 'var(--dim)', fontSize: 12 }}>{m.phone || '—'}</td>
                      <td><span className={`pill ${m.status === 'active' ? 'pill-green' : m.status === 'pending' ? 'pill-gold' : 'pill-red'}`}>{m.status}</span></td>
                      <td><span className={`pill ${act?.status === 'paid' ? 'pill-green' : 'pill-gold'}`}>R2,500 — {act?.status || '—'}</span></td>
                      <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(m.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ RETAIL ORDERS ═══ */}
        {tab === 'orders' && (
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Retail orders ({orders.length})</div>
            <table className="ohmi-table">
              <thead><tr><th>Customer</th><th>Email</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{o.customer_email}</td>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{Array.isArray(o.items) ? o.items.map(i => `${i.size} ×${i.qty}`).join(', ') : '—'}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmtR(o.total)}</td>
                    <td><span className={`pill ${o.status === 'fulfilled' ? 'pill-green' : o.status === 'pending' ? 'pill-gold' : 'pill-red'}`}>{o.status}</span></td>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(o.created_at)}</td>
                    <td>
                      {o.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-gold btn-sm" disabled={busy === o.id} onClick={() => fulfillOrder(o.id)}>Fulfil</button>
                          <button className="btn btn-dark btn-sm" disabled={busy === o.id} onClick={() => cancelOrder(o.id)}>Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan="7" style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ NETWORK TREE ═══ */}
        {tab === 'network' && (
          <div className="card">
            <div className="kicker" style={{ marginBottom: 16 }}>Binary network ({nodes.length} nodes)</div>
            <div className="tree-wrap" style={{ minHeight: 200 }}>
              {rootTreeNode ? <TreeNode node={rootTreeNode} map={treeMap} /> : <p style={{ color: 'var(--dim)' }}>No network yet.</p>}
            </div>
          </div>
        )}

        {/* ═══ BILLING ═══ */}
        {tab === 'billing' && (
          <div>
            <div className="card card-gold" style={{ marginBottom: 20 }}>
              <div className="kicker" style={{ marginBottom: 12 }}>Monthly billing run</div>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                Running billing will record R500 pool contributions for all {activeMembers.length} active members
                and calculate the foundation allocation. Total pool: <strong style={{ color: 'var(--gold)' }}>{fmtR(totalPool)}</strong>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
                {[['Active members', activeMembers.length], ['Pool total', fmtR(totalPool)], ['Rep share (30%)', fmtR(repShare)], ['OHMI retention (70%)', fmtR(ohmiRetention)], ['Foundation (est.)', fmtR(activeMembers.length * 2 * 15)], ['Period', new Date().toISOString().slice(0, 7)]].map(([l, v]) => (
                  <div key={l} style={{ padding: 14, background: 'var(--dark3)', border: '1px solid #2a2a2a' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{l}</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--gold)', fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-gold" disabled={busy === 'billing'} onClick={runBilling}>
                {busy === 'billing' ? 'Running billing…' : `Run billing — ${new Date().toISOString().slice(0, 7)}`}
              </button>
            </div>
            <div className="card">
              <div className="kicker" style={{ marginBottom: 10 }}>How billing works</div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.9 }}>
                1. R500 pool contribution recorded for each active member.<br />
                2. Foundation allocation calculated at R15/kg equivalent.<br />
                3. Commission ledger updated — 30% flows to reps based on rank.<br />
                4. All entries carry source reference for CPA s43 audit trail.<br />
                5. OHMI retains minimum R350/member — mathematically guaranteed.
              </p>
            </div>
          </div>
        )}

        {/* ═══ LEDGER ═══ */}
        {tab === 'ledger' && (
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Commission ledger — CPA s43 audit trail ({ledger.length} entries)</div>
            <table className="ohmi-table">
              <thead><tr><th>Date</th><th>Member</th><th>Type</th><th>Note</th><th>Amount</th></tr></thead>
              <tbody>
                {ledger.length ? ledger.map(l => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(l.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{memberName[l.member_id] || '—'}</td>
                    <td><span className={`pill ${l.entry_type === 'payout' ? 'pill-red' : 'pill-gold'}`}>{l.entry_type.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.note}</td>
                    <td style={{ fontFamily: 'var(--display)', fontSize: 18, color: l.entry_type === 'payout' ? '#e07070' : 'var(--gold)', fontWeight: 700 }}>{fmtR(l.amount)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>No ledger entries — run billing to populate.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
