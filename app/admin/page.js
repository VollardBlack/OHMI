'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const TABS = ['Dashboard', 'Orders', 'Members', 'Commissions'];

export default function Admin() {
  const [tab, setTab] = useState('Dashboard');
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subs, setSubs] = useState([]);
  const [refSales, setRefSales] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState('');

  async function loadAll() {
    const [m, o, s, r, l, ps] = await Promise.all([
      supabase.from('members').select('*').order('created_at'),
      supabase.from('retail_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, subscription_tiers(name, price)'),
      supabase.from('referral_sales').select('*').order('created_at', { ascending: false }),
      supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
      supabase.rpc('pool_stats'),
    ]);
    setMembers(m.data || []); setOrders(o.data || []); setSubs(s.data || []);
    setRefSales(r.data || []); setLedger(l.data || []); setStats(ps.data?.[0] || null);
  }
  useEffect(() => { loadAll(); }, []);

  const memberName = useMemo(() => Object.fromEntries(members.map(m => [m.id, m.full_name])), [members]);
  const retailRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.price), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  async function setOrderStatus(id, status) {
    const { error } = await supabase.from('retail_orders').update({ status }).eq('id', id);
    if (error) { setToast('Update failed'); } else { setToast(`Order ${status}`); loadAll(); }
    setTimeout(() => setToast(''), 2500);
  }

  const fmtR = n => 'R' + Number(n || 0).toLocaleString();
  const fmtD = d => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="wordmark" style={{ padding: '22px 20px' }}>OHMI<span>.</span></div>
        <nav className="admin-nav">
          {TABS.map(t => (
            <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
        <div className="admin-side-foot">
          <Link href="/">← Storefront</Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-top">
          <h1>{tab}</h1>
          <span className="admin-badge">Backoffice · Demo data</span>
        </header>

        {tab === 'Dashboard' && (
          <>
            <div className="stat-row">
              <div className="stat"><div className="stat-num">{members.length}</div><div className="stat-label">Members</div></div>
              <div className="stat"><div className="stat-num">{stats?.active_members ?? '—'}</div><div className="stat-label">Active subscriptions</div></div>
              <div className="stat"><div className="stat-num">{stats ? fmtR(stats.pool_total) : '—'}</div><div className="stat-label">Pool this period</div></div>
              <div className="stat"><div className="stat-num">{stats ? fmtR(stats.rep_share) : '—'}</div><div className="stat-label">Rep share (30%)</div></div>
              <div className="stat"><div className="stat-num">{fmtR(retailRevenue)}</div><div className="stat-label">Retail revenue</div></div>
              <div className="stat"><div className="stat-num">{pendingOrders}</div><div className="stat-label">Pending orders</div></div>
            </div>

            <div className="admin-grid">
              <div className="panel">
                <h3>Latest orders</h3>
                {orders.slice(0, 6).map(o => (
                  <div className="row" key={o.id}>
                    <span>{o.item_name}</span>
                    <span className={`chip ${o.status}`}>{o.status}</span>
                    <span className="num">{fmtR(o.price)}</span>
                  </div>
                ))}
                {orders.length === 0 && <p className="empty">No orders yet.</p>}
              </div>
              <div className="panel">
                <h3>Referral sales</h3>
                {refSales.map(r => (
                  <div className="row" key={r.id}>
                    <span>{memberName[r.rep_id] || 'Rep'} → {r.customer_name}</span>
                    <span className="num">{fmtR(r.commission_amount)}</span>
                  </div>
                ))}
                {refSales.length === 0 && <p className="empty">No referral sales yet.</p>}
              </div>
            </div>
          </>
        )}

        {tab === 'Orders' && (
          <div className="panel">
            <h3>All retail orders</h3>
            {orders.map(o => (
              <div className="row" key={o.id}>
                <span style={{ flex: 2 }}>{o.item_name}</span>
                <span className="dim">{fmtD(o.created_at)}</span>
                <span className={`chip ${o.status}`}>{o.status}</span>
                <span className="num">{fmtR(o.price)}</span>
                {o.status === 'pending' && (
                  <span className="row-actions">
                    <button onClick={() => setOrderStatus(o.id, 'fulfilled')}>Fulfil</button>
                    <button onClick={() => setOrderStatus(o.id, 'cancelled')} className="danger">Cancel</button>
                  </span>
                )}
              </div>
            ))}
            {orders.length === 0 && <p className="empty">No orders yet — share the shop link.</p>}
          </div>
        )}

        {tab === 'Members' && (
          <div className="panel">
            <h3>Members</h3>
            {members.map(m => {
              const sub = subs.find(s => s.member_id === m.id);
              return (
                <div className="row" key={m.id}>
                  <span style={{ flex: 2 }}>{m.full_name}<span className="dim"> · {m.email}</span></span>
                  <span className="dim">Joined {fmtD(m.created_at)}</span>
                  <span className={`chip ${sub?.active ? 'fulfilled' : 'cancelled'}`}>
                    {sub?.active ? (sub.subscription_tiers?.name || 'Subscribed') : 'No subscription'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'Commissions' && (
          <div className="panel">
            <h3>Commission ledger</h3>
            <p className="dim" style={{ marginBottom: 14 }}>
              Every entry traces to a real product sale — CPA s43 audit trail.
            </p>
            {ledger.map(l => (
              <div className="row" key={l.id}>
                <span style={{ flex: 2 }}>{memberName[l.member_id] || '—'}</span>
                <span className="dim">{l.entry_type.replaceAll('_', ' ')}</span>
                <span className="num">{Number(l.cash_amount) > 0 ? fmtR(l.cash_amount) : `${Number(l.points_amount)} pts`}</span>
              </div>
            ))}
            {ledger.length === 0 && <p className="empty">Ledger is empty — it fills when the first billing run executes.</p>}
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
