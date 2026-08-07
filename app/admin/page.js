'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BinaryTree from '@/app/components/BinaryTree';

const TABS = [
  { id: 'dashboard', icon: 'ti-layout-dashboard', tip: 'Dashboard' },
  { id: 'members',   icon: 'ti-users',            tip: 'Members' },
  { id: 'network',   icon: 'ti-binary-tree-2',    tip: 'Binary Tree' },
  { id: 'orders',    icon: 'ti-shopping-bag',     tip: 'Orders' },
  { id: 'billing',   icon: 'ti-coin',             tip: 'Billing' },
  { id: 'ledger',    icon: 'ti-file-invoice',     tip: 'Ledger' },
  { id: 'calc',      icon: 'ti-calculator',       tip: 'Profit Calc' },
  { id: 'foundation',icon: 'ti-heart',            tip: 'Foundation' },
];

const MN = n => n ? String(n).padStart(5,'0') : '—';
const fmtR = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';



// ── Profit Calculator ────────────────────────────────────────────────────────
function ProfitCalc() {
  const PKGS = [
    { id: 'starter', name: 'Starter Pack', kg: 0.25, retail: 1500, pool: 500 },
    { id: 'builder', name: 'Builder Pack', kg: 1,    retail: 1500, pool: 500 },
    { id: 'legacy',  name: 'Legacy Pack',  kg: 2,    retail: 2500, pool: 1000 },
    { id: 'empire',  name: 'Empire Pack',  kg: 5,    retail: 5000, pool: 1500 },
  ];

  const [sel, setSel] = useState('builder');
  const [costs, setCosts] = useState({
    greenBeans:  153.50,
    roasting:     27.50,
    packaging:     8.00,
    delivery:     15.00,
    foundation:   15.00,
  });
  const [overrides, setOverrides] = useState({});

  const pkg = PKGS.find(p => p.id === sel);
  const c = { ...costs, ...overrides };

  const costPerKg = c.greenBeans + c.roasting;
  const coffeeCost = costPerKg * pkg.kg;
  const packCost   = c.packaging * (pkg.kg >= 1 ? pkg.kg : 1);
  const foundCost  = c.foundation * pkg.kg;
  const delivCost  = c.delivery;
  const totalCost  = coffeeCost + packCost + foundCost + delivCost;
  const repPool    = pkg.pool * 0.30;
  const ohmiPool   = pkg.pool * 0.70;
  const netRevenue = pkg.retail - pkg.pool;
  const grossProfit = netRevenue - totalCost;
  const marginPct  = ((grossProfit / pkg.retail) * 100);
  const ohmiTotal  = grossProfit + ohmiPool;

  const row = (label, val, editable, key) => (
    <div className="calc-row" key={label}>
      <span className="calc-row-label">{label}</span>
      {editable ? (
        <input className="calc-row-input" type="number" step="0.01"
          value={overrides[key] ?? costs[key]}
          onChange={e => setOverrides(o => ({ ...o, [key]: parseFloat(e.target.value)||0 }))}
        />
      ) : (
        <span className="calc-row-val">{val}</span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Package selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PKGS.map(p => (
          <button key={p.id}
            className={`btn btn-sm ${sel===p.id ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => { setSel(p.id); setOverrides({}); }}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="calc-grid">
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Cost inputs — editable</div>
          <div className="calc-inputs">
            {row('Green beans (Uganda Bugisu AA)', null, true, 'greenBeans')}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>per kg · from Green Coffee Supply</div>
            {row('Roasting cost', null, true, 'roasting')}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>per kg · Wiara Coffee (under 100kg rate)</div>
            {row('Packaging (per bag)', null, true, 'packaging')}
            {row('Foundation allocation', null, true, 'foundation')}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>per kg · Bitou region</div>
            {row('Delivery estimate', null, true, 'delivery')}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            {row(`Coffee cost (${pkg.kg}kg × R${c.greenBeans+c.roasting})`, `R${coffeeCost.toFixed(2)}`, false)}
            {row('Packaging total', `R${packCost.toFixed(2)}`, false)}
            {row('Foundation total', `R${foundCost.toFixed(2)}`, false)}
            {row('Delivery', `R${delivCost.toFixed(2)}`, false)}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            {row('Total cost of goods', `R${totalCost.toFixed(2)}`, false)}
            {row('Retail price', fmtR(pkg.retail), false)}
            {row('Pool contribution (total)', fmtR(pkg.pool), false)}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>
              → Rep share (30%): {fmtR(repPool)} · OHMI retention (70%): {fmtR(ohmiPool)}
            </div>
            {row('Net revenue (retail − pool)', `R${netRevenue.toFixed(2)}`, false)}
          </div>
        </div>

        <div className="calc-result">
          <div style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            {pkg.name}
          </div>

          <div className="calc-result-item">
            <span className="calc-result-label">Gross profit</span>
            <span className="calc-result-val" style={{ color: grossProfit > 0 ? 'var(--amber)' : 'var(--red)' }}>
              {fmtR(Math.round(grossProfit))}
            </span>
            <span className="calc-result-sub">per unit after COGS</span>
          </div>

          <div className="calc-divider" />

          <div className="calc-result-item">
            <span className="calc-result-label">Margin %</span>
            <span className="calc-result-val" style={{ color: marginPct > 0 ? 'var(--amber)' : 'var(--red)', fontSize: 32 }}>
              {Math.round(marginPct)}%
            </span>
            <span className="calc-result-sub">of retail price</span>
          </div>

          <div className="calc-divider" />

          <div className="calc-result-item">
            <span className="calc-result-label">OHMI total take</span>
            <span className="calc-result-val" style={{ fontSize: 22 }}>{fmtR(Math.round(ohmiTotal))}</span>
            <span className="calc-result-sub">gross profit + 70% pool retention</span>
          </div>

          <div className="calc-divider" />

          <div className="calc-result-item">
            <span className="calc-result-label">OHMI min. guaranteed</span>
            <span className="calc-result-val" style={{ fontSize: 22, color: 'var(--green)' }}>{fmtR(Math.round(ohmiPool))}</span>
            <span className="calc-result-sub">from pool retention alone</span>
          </div>

          <div className="calc-divider" />

          <div style={{ padding: '10px 0' }}>
            <div className="calc-result-label" style={{ marginBottom: 6 }}>Breakeven (units)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[10,50,100].map(u => (
                <div key={u} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{u} units</span>
                  <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{fmtR(Math.round(ohmiTotal * u))}</span>
                </div>
              ))}
            </div>
          </div>

          {grossProfit > 0 && (
            <div className="calc-alert">
              <div className="calc-alert-text">
                OHMI retains minimum {fmtR(Math.round(ohmiPool))} per unit sold — mathematically guaranteed per OHMI-ACT-2026-002.
              </div>
            </div>
          )}
          {grossProfit <= 0 && (
            <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(192,80,58,0.2)' }}>
              <div style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>
                ⚠ COGS exceeds net revenue. Adjust pricing or reduce costs.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Admin ───────────────────────────────────────────────────────────────
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
  const [packages, setPackages] = useState([]);
  const [pkgOrders, setPkgOrders] = useState([]);
  const [toast, setToast] = useState('');
  const [travelBookings, setTravelBookings] = useState([]);
  const [busy, setBusy] = useState('');
  const [billingResult, setBillingResult] = useState(null);
  const [memberFilter, setMemberFilter] = useState('');

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    const [m, n, o, s, a, l, f, b, p, po, tb] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('tree_view').select('*'),
      supabase.from('retail_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('activations').select('*'),
      supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('foundation_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('member_balances').select('*'),
      supabase.from('packages').select('*').order('sort_order'),
      supabase.from('package_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('travel_bookings').select('*').order('created_at', { ascending: false }),
    ]);
    setMembers(m.data||[]);
    setNodes(n.data||[]);
    setOrders(o.data||[]);
    setSubs(s.data||[]);
    setActivations(a.data||[]);
    setLedger(l.data||[]);
    setFoundation(f.data||[]);
    setBalances(b.data||[]);
    setPackages(p.data||[]);
    setPkgOrders(po.data||[]);
    setTravelBookings(tb.data||[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeMembers      = members.filter(m => m.status === 'active');
  const pendingActivations = activations.filter(a => a.status === 'pending');
  const pendingOrders      = [...orders.filter(o=>o.status==='pending'), ...pkgOrders.filter(o=>o.status==='pending')];
  const poolTotal          = activeMembers.length * 500;
  const totalRevenue       = orders.filter(o=>o.status==='fulfilled').reduce((s,o)=>s+Number(o.total),0);
  const foundationTotal    = foundation.reduce((s,f)=>s+Number(f.amount),0);
  const memberById         = useMemo(() => Object.fromEntries(members.map(m=>[m.id,m.full_name])), [members]);

  const treeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      if (n.parent_id) {
        (map[n.parent_id] = map[n.parent_id]||[]).push({
          ...n, name: (members.find(m=>m.id===n.member_id)?.full_name||'?').split(' ')[0],
          status: members.find(m=>m.id===n.member_id)?.status||'pending',
          lc: n.left_count, rc: n.right_count,
        });
      }
    });
    return map;
  }, [nodes, members]);
  const rootNode = nodes.find(n => !n.parent_id);
  const rootTreeNode = rootNode ? { ...rootNode, name: (members.find(m=>m.id===rootNode.member_id)?.full_name||'Root').split(' ')[0], status: members.find(m=>m.id===rootNode.member_id)?.status||'active', lc: rootNode.left_count, rc: rootNode.right_count } : null;

  async function approveActivation(actId, memberId) {
    setBusy(actId);
    await supabase.from('activations').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', actId);
    await supabase.from('members').update({ status: 'active' }).eq('id', memberId);
    if (!subs.find(s=>s.member_id===memberId)) {
      await supabase.from('subscriptions').insert({ member_id: memberId, amount: 1500, pool_contribution: 500, status: 'active', next_billing_date: new Date(Date.now()+30*86400000).toISOString().slice(0,10) });
    }
    flash('✓ Activation approved');
    setBusy(''); load();
  }

  async function runBilling() {
    setBusy('billing');
    setBillingResult(null);
    const period = new Date().toISOString().slice(0,7) + '-01';
    const { data, error } = await supabase.rpc('run_billing', { p_period: period });
    if (error) { flash('Billing error: ' + error.message); setBusy(''); return; }
    setBillingResult(data);
    flash(`✓ Billing complete — ${data.length} members processed`);
    setBusy(''); load();
  }

  const filteredMembers = members.filter(m =>
    !memberFilter || m.full_name?.toLowerCase().includes(memberFilter.toLowerCase()) || m.email?.toLowerCase().includes(memberFilter.toLowerCase())
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <span className="mobile-topbar-logo">Admin</span>
        <div style={{ display:'flex', gap:8 }}>
          <span className="topbar-badge topbar-badge-gold" style={{ fontSize:9 }}>{activeMembers.length} active</span>
        </div>
      </div>

      <div className="app-shell">

        {/* Rail */}
        <aside className="rail">
          <div className="rail-logo">O</div>
          <nav className="rail-nav">
            {TABS.map(t => (
              <button key={t.id} className={`rail-item${tab===t.id?' on':''}`}
                data-tip={t.tip} onClick={() => setTab(t.id)} aria-label={t.tip}>
                <i className={`ti ${t.icon}`} aria-hidden="true" />
                {t.id==='members' && pendingActivations.length>0 && <span className="badge">{pendingActivations.length}</span>}
                {t.id==='orders'  && pendingOrders.length>0     && <span className="badge" style={{ background:'var(--red)' }}>{pendingOrders.length}</span>}
              </button>
            ))}
          </nav>
          <div className="rail-divider" />
          <div className="rail-bottom">
            <Link href="/dashboard">
              <button className="rail-item" data-tip="Member view" aria-label="Member view">
                <i className="ti ti-user" aria-hidden="true" />
              </button>
            </Link>
            <Link href="/">
              <button className="rail-item" data-tip="Storefront" aria-label="Storefront">
                <i className="ti ti-home" aria-hidden="true" />
              </button>
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="app-main">
          <div className="app-topbar">
            <span className="app-topbar-title">{TABS.find(t=>t.id===tab)?.tip}</span>
            <span className="app-topbar-sub">· OHMI Admin</span>
            <div className="app-topbar-right">
              <span className="topbar-badge topbar-badge-gold">{activeMembers.length} active</span>
              <span className="topbar-badge topbar-badge-green">{fmtR(poolTotal)} pool</span>
            </div>
          </div>

          <div className="app-content">

            {/* ── DASHBOARD ── */}
            {tab === 'dashboard' && <>
              <div className="metric-grid">
                {[
                  ['Total members', members.length, ''],
                  ['Active', activeMembers.length, 'green'],
                  ['Pool this month', fmtR(poolTotal), 'gold'],
                  ['Rep share 30%', fmtR(poolTotal*0.3), ''],
                  ['OHMI retention 70%', fmtR(poolTotal*0.7), ''],
                  ['Pending activations', pendingActivations.length, pendingActivations.length>0?'gold':''],
                  ['Pending orders', pendingOrders.length, pendingOrders.length>0?'gold':''],
                  ['Retail revenue', fmtR(totalRevenue), 'gold'],
                ].map(([l,v,c]) => (
                  <div key={l} className="metric">
                    <div className={`metric-val ${c}`}>{v}</div>
                    <div className="metric-label">{l}</div>
                  </div>
                ))}
              </div>

              {pendingActivations.length > 0 && (
                <div className="card card-gold card-flush">
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="ti ti-alert-circle" style={{ color: 'var(--amber)', fontSize: 16 }} aria-hidden="true" />
                    <span className="section-label">Pending activations — action required</span>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Email</th><th>Registered</th><th>Amount</th><th>Action</th></tr></thead>
                    <tbody>
                      {pendingActivations.map(a => {
                        const m = members.find(x => x.id === a.member_id);
                        return (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 500 }}>{m?.full_name}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m?.email}</td>
                            <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{fmtD(a.created_at)}</td>
                            <td style={{ color: 'var(--amber)', fontWeight: 500 }}>{fmtR(a.amount)}</td>
                            <td>
                              <button className="btn btn-gold btn-xs" disabled={busy===a.id}
                                onClick={() => approveActivation(a.id, a.member_id)}>
                                {busy===a.id ? '…' : 'Approve payment'}
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
                <div className="section-label" style={{ marginBottom: 14 }}>Pool breakdown · {new Date().toISOString().slice(0,7)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {[
                    ['Active × R500', fmtR(poolTotal), 'Total pool'],
                    ['30% to reps', fmtR(poolTotal*0.3), 'Commission pool'],
                    ['70% OHMI', fmtR(poolTotal*0.7), 'Ops + Foundation'],
                  ].map(([l,v,s]) => (
                    <div key={l} style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--amber)', fontWeight: 600 }}>{v}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>}

            {/* ── MEMBERS ── */}
            {tab === 'members' && <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="field-input" style={{ maxWidth: 300 }} placeholder="Search members…"
                  value={memberFilter} onChange={e => setMemberFilter(e.target.value)} />
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{filteredMembers.length} of {members.length}</span>
              </div>
              <div className="card card-flush">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Activation</th><th>Subscription</th><th>Balance</th><th>Joined</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredMembers.map(m => {
                      const act = activations.find(a => a.member_id === m.id);
                      const sub = subs.find(s => s.member_id === m.id);
                      const bal = balances.find(b => b.member_id === m.id);
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 500 }}>{m.full_name}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.email}</td>
                          <td><span className={`pill pill-${m.status==='active'?'green':m.status==='pending'?'gold':'red'}`}>{m.status}</span></td>
                          <td>
                            {act ? (act.status==='paid'
                              ? <span className="pill pill-green">Paid</span>
                              : <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                                  <span className="pill pill-gold">Pending</span>
                                  <button className="btn btn-gold btn-xs" disabled={busy===act.id} onClick={() => approveActivation(act.id,m.id)}>
                                    {busy===act.id?'…':'Approve'}
                                  </button>
                                </div>
                            ) : <span style={{ color:'var(--text-dim)',fontSize:12 }}>—</span>}
                          </td>
                          <td><span className={`pill pill-${sub?.status==='active'?'green':'grey'}`}>{sub?`R${sub.amount}/mo`:'None'}</span></td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{Number(bal?.balance)>0?fmtR(bal.balance):'—'}</td>
                          <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(m.created_at)}</td>
                          <td>
                            {m.status==='active' && (
                              <button className="btn btn-ghost btn-xs"
                                onClick={async()=>{await supabase.from('members').update({status:'suspended'}).eq('id',m.id);flash('Suspended');load();}}>
                                Suspend
                              </button>
                            )}
                            {m.status==='suspended' && (
                              <button className="btn btn-gold btn-xs"
                                onClick={async()=>{await supabase.from('members').update({status:'active'}).eq('id',m.id);flash('Reinstated');load();}}>
                                Reinstate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── BINARY TREE ── */}
            {tab === 'network' && <>
              <div className="metric-grid">
                {[['Total nodes',nodes.length,''],['Left leg',nodes.find(n=>!n.parent_id)?.left_count||0,'gold'],['Right leg',nodes.find(n=>!n.parent_id)?.right_count||0,'gold'],['Max depth',Math.max(0,...nodes.map(n=>n.depth||0)),'']].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card card-flush" style={{ overflow:'auto' }}>
                <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)' }}>
                  <span className="section-label">Binary network · click to expand/collapse</span>
                </div>
                <div className="tree-wrap" style={{ padding:24,minWidth:500 }}>
                  {rootTreeNode ? <TreeNode node={rootTreeNode} map={treeMap} /> : <p style={{ color:'var(--text-dim)' }}>No network yet.</p>}
                </div>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)' }}>
                  <span className="section-label">Node registry</span>
                </div>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Status</th><th>Leg</th><th>Depth</th><th>Left count</th><th>Right count</th><th>Subscribed</th></tr></thead>
                  <tbody>
                    {[...nodes].sort((a,b)=>a.depth-b.depth||(a.leg||'').localeCompare(b.leg||'')).map(n=>{
                      const m=members.find(x=>x.id===n.member_id);
                      return (
                        <tr key={n.node_id||n.id}>
                          <td style={{ fontWeight:500 }}>{m?.full_name||'?'}</td>
                          <td><span className={`pill pill-${m?.status==='active'?'green':'grey'}`}>{m?.status||'?'}</span></td>
                          <td style={{ color:n.leg==='L'?'var(--blue)':n.leg==='R'?'var(--amber)':'var(--text-muted)', fontWeight:500 }}>{n.leg||'Root'}</td>
                          <td style={{ color:'var(--text-dim)' }}>{n.depth}</td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{n.left_count}</td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{n.right_count}</td>
                          <td><span className={`pill pill-${n.subscribed?'green':'red'}`}>{n.subscribed?'Yes':'No'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── ORDERS ── */}
            {tab === 'orders' && <>
              <div className="metric-grid">
                {[['Retail orders',orders.length,''],['Pending retail',orders.filter(o=>o.status==='pending').length,'gold'],['Package orders',pkgOrders.length,''],['Revenue',fmtR(totalRevenue),'gold']].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Retail orders</span></div>
                <table className="data-table">
                  <thead><tr><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {orders.map(o=>(
                      <tr key={o.id}>
                        <td style={{ fontWeight:500 }}>{o.customer_name}<div style={{ fontSize:11,color:'var(--text-dim)' }}>{o.customer_email}</div></td>
                        <td style={{ color:'var(--text-muted)',fontSize:12 }}>{Array.isArray(o.items)?o.items.map(i=>`${i.size}×${i.qty}`).join(', '):'—'}</td>
                        <td style={{ color:'var(--amber)',fontWeight:500 }}>{fmtR(o.total)}</td>
                        <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'gold':'red'}`}>{o.status}</span></td>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(o.created_at)}</td>
                        <td>
                          {o.status==='pending'&&(
                            <div style={{ display:'flex',gap:6 }}>
                              <button className="btn btn-gold btn-xs" disabled={busy===o.id}
                                onClick={async()=>{setBusy(o.id);await supabase.from('retail_orders').update({status:'fulfilled'}).eq('id',o.id);flash('Fulfilled');setBusy('');load();}}>
                                Fulfil
                              </button>
                              <button className="btn btn-ghost btn-xs" disabled={busy===o.id}
                                onClick={async()=>{setBusy(o.id);await supabase.from('retail_orders').update({status:'cancelled'}).eq('id',o.id);flash('Cancelled');setBusy('');load();}}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {orders.length===0&&<tr><td colSpan="6" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>No retail orders.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Package orders</span></div>
                <table className="data-table">
                  <thead><tr><th>Member</th><th>Package</th><th>Qty</th><th>Total</th><th>Pool</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {pkgOrders.map(o=>{
                      const pkg=packages.find(p=>p.id===o.package_id);
                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight:500 }}>{memberById[o.member_id]||'?'}</td>
                          <td style={{ color:'var(--text-muted)',fontSize:12 }}>{pkg?.name||'?'}</td>
                          <td>{o.quantity}</td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{fmtR(o.total)}</td>
                          <td style={{ color:'var(--text-muted)' }}>{fmtR(o.pool_contribution)}</td>
                          <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'gold':'red'}`}>{o.status}</span></td>
                          <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(o.created_at)}</td>
                          <td>
                            {o.status==='pending'&&(
                              <button className="btn btn-gold btn-xs" disabled={busy===o.id}
                                onClick={async()=>{setBusy(o.id);await supabase.from('package_orders').update({status:'fulfilled'}).eq('id',o.id);flash('Fulfilled');setBusy('');load();}}>
                                Fulfil
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {pkgOrders.length===0&&<tr><td colSpan="8" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>No package orders.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── BILLING ── */}
            {tab === 'billing' && <>
              <div className="card card-gold">
                <div className="section-label" style={{ marginBottom: 12 }}>Monthly billing run · {new Date().toISOString().slice(0,7)}</div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18 }}>
                  {[['Active members',activeMembers.length],['Pool total',fmtR(poolTotal)],['Rep share 30%',fmtR(poolTotal*0.3)],['OHMI retention 70%',fmtR(poolTotal*0.7)],['Foundation est.',fmtR(activeMembers.length*2*15)],['Period',new Date().toISOString().slice(0,7)]].map(([l,v])=>(
                    <div key={l} style={{ padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'var(--r-md)' }}>
                      <div style={{ fontSize:10,color:'var(--text-dim)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4 }}>{l}</div>
                      <div style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--amber)',fontWeight:600 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-gold" disabled={busy==='billing'} onClick={runBilling}>
                  {busy==='billing' ? 'Running billing…' : `Run billing · ${new Date().toISOString().slice(0,7)}`}
                </button>
                <p style={{ fontSize:11,color:'var(--text-dim)',marginTop:10,lineHeight:1.6 }}>
                  Records pool contributions, distributes 30% to ranked reps pro-rata, allocates foundation funds. Idempotent — safe to re-run.
                </p>
              </div>
              {billingResult && (
                <div className="card card-flush">
                  <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Billing results</span></div>
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Rank</th><th>Pool share</th><th>Note</th></tr></thead>
                    <tbody>
                      {billingResult.map((r,i)=>(
                        <tr key={i}>
                          <td style={{ fontWeight:500 }}>{r.out_member_name}</td>
                          <td><span className={`pill pill-${r.out_rank_name!=='Unranked'?'gold':'grey'}`}>{r.out_rank_name}</span></td>
                          <td style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--amber)',fontWeight:600 }}>{fmtR(r.out_pool_share)}</td>
                          <td style={{ fontSize:12,color:'var(--text-dim)' }}>{r.out_message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Payout queue */}
              {ledger.filter(l=>l.entry_type==='payout').length>0&&(
                <div className="card card-flush">
                  <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Payout queue</span></div>
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Amount</th><th>Date</th><th>Note</th></tr></thead>
                    <tbody>
                      {ledger.filter(l=>l.entry_type==='payout').map(p=>(
                        <tr key={p.id}>
                          <td style={{ fontWeight:500 }}>{memberById[p.member_id]}</td>
                          <td style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--red)',fontWeight:600 }}>{fmtR(p.amount)}</td>
                          <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(p.created_at)}</td>
                          <td style={{ color:'var(--text-muted)',fontSize:12 }}>{p.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>}

            {/* ── LEDGER ── */}
            {tab === 'ledger' && <>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Member balances</span></div>
                <table className="data-table">
                  <thead><tr><th>Member</th><th>Status</th><th>Earned</th><th>Paid out</th><th>Balance</th></tr></thead>
                  <tbody>
                    {balances.filter(b=>Number(b.total_earned)>0||Number(b.balance)>0).map(b=>(
                      <tr key={b.member_id}>
                        <td style={{ fontWeight:500 }}>{b.full_name}</td>
                        <td><span className={`pill pill-${b.status==='active'?'green':'grey'}`}>{b.status}</span></td>
                        <td style={{ color:'var(--amber)',fontWeight:500 }}>{fmtR(b.total_earned)}</td>
                        <td style={{ color:'var(--red)' }}>{fmtR(b.total_paid)}</td>
                        <td style={{ fontFamily:'var(--display)',fontSize:20,color:'var(--amber)',fontWeight:600 }}>{fmtR(b.balance)}</td>
                      </tr>
                    ))}
                    {balances.every(b=>Number(b.total_earned)===0)&&<tr><td colSpan="5" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>Run billing to populate balances.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">CPA s43 audit trail · all commission entries</span></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Member</th><th>Type</th><th>Period</th><th>Note</th><th style={{ textAlign:'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {ledger.map(l=>(
                      <tr key={l.id}>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(l.created_at)}</td>
                        <td style={{ fontWeight:500 }}>{memberById[l.member_id]||'?'}</td>
                        <td><span className={`pill pill-${l.entry_type==='payout'?'red':l.entry_type==='pool_share'?'gold':'grey'}`}>{l.entry_type.replace('_',' ')}</span></td>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{l.period?.slice(0,7)||'—'}</td>
                        <td style={{ color:'var(--text-muted)',fontSize:12 }}>{l.note}</td>
                        <td style={{ textAlign:'right',fontFamily:'var(--display)',fontSize:18,fontWeight:600,color:l.entry_type==='payout'?'var(--red)':'var(--amber)' }}>{fmtR(l.amount)}</td>
                      </tr>
                    ))}
                    {ledger.length===0&&<tr><td colSpan="6" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>No ledger entries.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── PROFIT CALC ── */}
            {tab === 'calc' && <ProfitCalc />}

            {/* ── FOUNDATION ── */}
            {tab === 'foundation' && <>
              <div className="metric-grid">
                {[['Total allocated',fmtR(foundationTotal),'gold'],['Kg equivalent',(foundation.reduce((s,f)=>s+Number(f.kg_equivalent),0)).toFixed(1)+' kg',''],['Billing runs',foundation.length,''],['Rate','R15/kg','']].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card" style={{ borderLeft:'3px solid var(--gold)',paddingLeft:20 }}>
                <div style={{ fontFamily:'var(--display)',fontSize:20,color:'var(--amber)',marginBottom:8 }}>Every kilogram feeds a child in Bitou.</div>
                <p style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.8 }}>
                  R15 per kilogram is a fixed structural cost — not a discretionary donation. Allocated automatically on every billing run and tracked here for full transparency.
                </p>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Foundation ledger</span></div>
                <table className="data-table">
                  <thead><tr><th>Period</th><th>Kg equivalent</th><th>Amount</th><th>Note</th><th>Date</th></tr></thead>
                  <tbody>
                    {foundation.map(f=>(
                      <tr key={f.id}>
                        <td style={{ fontWeight:500 }}>{f.period?.slice(0,7)||'—'}</td>
                        <td style={{ color:'var(--amber)',fontWeight:500 }}>{Number(f.kg_equivalent).toFixed(1)} kg</td>
                        <td style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--amber)',fontWeight:600 }}>{fmtR(f.amount)}</td>
                        <td style={{ color:'var(--text-muted)',fontSize:12 }}>{f.note}</td>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(f.created_at)}</td>
                      </tr>
                    ))}
                    {foundation.length===0&&<tr><td colSpan="5" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>Run billing to allocate foundation funds.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── TRAVEL BOOKINGS ── */}
            {tab==='travel'&&<>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
                {[
                  ['Total bookings',travelBookings.length,''],
                  ['Confirmed',travelBookings.filter(b=>b.status==='confirmed').length,'green'],
                  ['Pending',travelBookings.filter(b=>b.status==='pending').length,'primary'],
                  ['Revenue',`R ${travelBookings.reduce((s,b)=>s+Number(b.total_cost),0).toLocaleString('en-ZA',{maximumFractionDigits:0})}`, 'teal'],
                  ['Points used',travelBookings.reduce((s,b)=>s+Number(b.points_used),0).toLocaleString(),''],
                  ['Cash due',`R ${travelBookings.reduce((s,b)=>s+Number(b.cash_due),0).toLocaleString('en-ZA',{maximumFractionDigits:0})}`,'amber'],
                ].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className="section-label">All travel bookings · {travelBookings.length} total</span>
                  <div style={{display:'flex',gap:6}}>
                    {['all','pending','confirmed','cancelled'].map(s=>(
                      <span key={s} style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:'var(--r-full)',background:s==='all'?'var(--primary)':'var(--surface-2)',color:s==='all'?'#fff':'var(--text-muted)',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.06em'}}>{s}</span>
                    ))}
                  </div>
                </div>
                <table className="data-table">
                  <thead><tr><th>Ref</th><th>Member</th><th>Booking</th><th>Dates</th><th>Total</th><th>Points</th><th>Cash due</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {travelBookings.length?travelBookings.map(b=>{
                      const m=members.find(x=>x.id===b.member_id);
                      return(
                        <tr key={b.id}>
                          <td style={{fontWeight:700,color:'var(--primary)',fontSize:11,fontFamily:'monospace'}}>{b.booking_ref}</td>
                          <td>
                            <div style={{fontWeight:600,fontSize:13}}>{m?.full_name||'?'}</div>
                            <div style={{fontSize:10,color:'var(--text-muted)'}}>#{MN(m?.member_number)}</div>
                          </td>
                          <td>
                            <div style={{fontWeight:500,fontSize:12,maxWidth:180}}>{b.hotel_name}</div>
                            <div style={{fontSize:10,color:'var(--text-muted)'}}>{b.hotel_location} · {b.room_name}</div>
                          </td>
                          <td style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>
                            {b.check_in} → {b.check_out}
                            <div style={{fontSize:10,color:'var(--text-dim)'}}>{b.nights} {b.nights===1?'night':'nights'} · {b.guests} guests</div>
                          </td>
                          <td style={{fontWeight:700,fontSize:13}}>R {Number(b.total_cost).toLocaleString('en-ZA',{maximumFractionDigits:0})}</td>
                          <td style={{color:'var(--purple)',fontWeight:600}}>{Number(b.points_used)>0?`${Number(b.points_used).toLocaleString()} pts`:'—'}</td>
                          <td style={{fontWeight:700,color:Number(b.cash_due)>0?'var(--amber)':'var(--green-text)'}}>
                            {Number(b.cash_due)>0?`R ${Number(b.cash_due).toLocaleString('en-ZA',{maximumFractionDigits:0})}`:'Covered'}
                          </td>
                          <td><span className={`pill pill-${b.status==='confirmed'?'green':b.status==='pending'?'amber':b.status==='completed'?'primary':'red'}`}>{b.status}</span></td>
                          <td>
                            <div style={{display:'flex',gap:6}}>
                              {b.status==='pending'&&(
                                <>
                                  <button className="btn btn-xs" style={{background:'var(--green-bg)',color:'var(--green-text)',border:'1px solid rgba(16,185,129,0.2)'}}
                                    onClick={async()=>{await supabase.from('travel_bookings').update({status:'confirmed'}).eq('id',b.id);flash('✓ Booking confirmed');const {data}=await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});setTravelBookings(data||[]);}}>
                                    Confirm
                                  </button>
                                  <button className="btn btn-xs" style={{background:'var(--red-bg)',color:'var(--red-text)',border:'1px solid rgba(239,68,68,0.2)'}}
                                    onClick={async()=>{await supabase.from('travel_bookings').update({status:'cancelled'}).eq('id',b.id);flash('Booking cancelled');const {data}=await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});setTravelBookings(data||[]);}}>
                                    Cancel
                                  </button>
                                </>
                              )}
                              {b.status==='confirmed'&&(
                                <button className="btn btn-xs" style={{background:'var(--primary-bg)',color:'var(--primary)',border:'1px solid var(--primary-border)'}}
                                  onClick={async()=>{await supabase.from('travel_bookings').update({status:'completed'}).eq('id',b.id);flash('Marked as completed');const {data}=await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});setTravelBookings(data||[]);}}>
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }):(
                      <tr><td colSpan="9" style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No travel bookings yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>}

          </div>
        </div>
      </div>
      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          <button className={`mobile-nav-item${tab==='dashboard'?' on':''}`} onClick={()=>setTab('dashboard')} aria-label="Home">
            <i className="ti ti-layout-dashboard" aria-hidden="true"/><span>Home</span>
          </button>
          <button className={`mobile-nav-item${tab==='members'?' on':''}`} onClick={()=>setTab('members')} aria-label="Members">
            <i className="ti ti-users" aria-hidden="true"/><span>Members</span>
            {pendingActivations.length>0&&<span className="m-badge">{pendingActivations.length}</span>}
          </button>
          <button className={`mobile-nav-item${tab==='network'?' on':''}`} onClick={()=>setTab('network')} aria-label="Tree">
            <i className="ti ti-binary-tree-2" aria-hidden="true"/><span>Tree</span>
          </button>
          <button className={`mobile-nav-item${tab==='orders'?' on':''}`} onClick={()=>setTab('orders')} aria-label="Orders">
            <i className="ti ti-shopping-bag" aria-hidden="true"/><span>Orders</span>
            {pendingOrders.length>0&&<span className="m-badge" style={{background:'var(--red)'}}>{pendingOrders.length}</span>}
          </button>
          <button className={`mobile-nav-item${tab==='billing'?' on':''}`} onClick={()=>setTab('billing')} aria-label="Billing">
            <i className="ti ti-coin" aria-hidden="true"/><span>Billing</span>
          </button>
          <button className={`mobile-nav-item${['ledger','calc','foundation'].includes(tab)?' on':''}`} onClick={()=>setTab(tab==='ledger'?'calc':tab==='calc'?'foundation':'ledger')} aria-label="More">
            <i className="ti ti-dots" aria-hidden="true"/><span>More</span>
          </button>
        </div>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
