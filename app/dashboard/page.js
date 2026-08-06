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
  { id: 'shop', label: 'Shop' },
  { id: 'orders', label: 'My Orders' },
  { id: 'network', label: 'My Network' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'ranks', label: 'Rank Journey' },
  { id: 'profile', label: 'Profile' },
];

const fmtR = n => 'R' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

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
          {['L','R'].map(leg => {
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
  const [packages, setPackages] = useState([]);
  const [pkgOrders, setPkgOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('browse'); // browse | cart | confirm | done

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    (async () => {
      const [m, n, l, s, a, p, po] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('network_nodes').select('*'),
        supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*'),
        supabase.from('activations').select('*'),
        supabase.from('packages').select('*').eq('active', true).order('sort_order'),
        supabase.from('package_orders').select('*').order('created_at', { ascending: false }),
      ]);
      const mem = m.data || [];
      setMembers(mem);
      setNodes(n.data || []);
      setLedger(l.data || []);
      setPackages(p.data || []);
      setPkgOrders(po.data || []);
      const root = mem.find(x => x.email === 'brandon@ohmicoffee.co.za') || mem[0];
      setMe(root || null);
      setSub(s.data?.find(x => x.member_id === root?.id) || null);
      setActivation(a.data?.find(x => x.member_id === root?.id) || null);
    })();
  }, []);

  const treeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      if (n.parent_id) {
        (map[n.parent_id] = map[n.parent_id] || []).push({
          ...n,
          display_name: members.find(m => m.id === n.member_id)?.full_name?.split(' ')[0] || '—',
          status: members.find(m => m.id === n.member_id)?.status || 'pending',
        });
      }
    });
    return map;
  }, [nodes, members]);

  const myNode = nodes.find(n => me && n.member_id === me.id);
  const rootTreeNode = myNode ? { ...myNode, display_name: me?.full_name?.split(' ')[0] || 'You', status: me?.status || 'active' } : null;
  const leftCount = myNode?.left_count || 0;
  const rightCount = myNode?.right_count || 0;
  // Rank is determined by the WEAKER leg — both legs must meet the threshold
  const qualifyingLeg = Math.min(leftCount, rightCount);
  const currentRank = RANKS.filter(r => r.left <= qualifyingLeg && r.right <= qualifyingLeg).pop();
  const nextRank = RANKS.find(r => r.left > qualifyingLeg || r.right > qualifyingLeg);
  const weakerLeg = leftCount <= rightCount ? 'left' : 'right';
  const strongerLeg = leftCount > rightCount ? 'left' : 'right';
  const myLedger = ledger.filter(l => me && l.member_id === me.id);
  const totalEarned = myLedger.filter(l => l.entry_type !== 'payout').reduce((s, l) => s + Number(l.amount), 0);
  const totalPaid = myLedger.filter(l => l.entry_type === 'payout').reduce((s, l) => s + Number(l.amount), 0);
  const balance = totalEarned - totalPaid;
  const myPkgOrders = pkgOrders.filter(o => me && o.member_id === me.id);
  const refLink = me ? `${typeof window !== 'undefined' ? window.location.origin : 'https://ohmi-coffee-co.vercel.app'}/join?ref=${me.id}` : '';

  // Cart helpers
  const cartItems = packages.filter(p => cart[p.id] > 0).map(p => ({ ...p, qty: cart[p.id] }));
  const cartTotal = cartItems.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const cartPool = cartItems.reduce((s, i) => s + Number(i.pool_contribution) * i.qty, 0);
  const addToCart = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));
  const clearCart = () => setCart({});

  async function placeOrder() {
    if (!me || cartItems.length === 0) return;
    setBusy('order');
    const period = new Date().toISOString().slice(0, 7) + '-01';
    const orders = cartItems.map(i => ({
      member_id: me.id,
      package_id: i.id,
      quantity: i.qty,
      total: Number(i.price) * i.qty,
      pool_contribution: Number(i.pool_contribution) * i.qty,
      status: 'pending',
      billing_period: period,
    }));
    const { error } = await supabase.from('package_orders').insert(orders);
    if (error) { flash('Order failed — ' + error.message); setBusy(''); return; }
    // Update pool contributions
    const poolInsert = cartItems.map(i => ({
      member_id: me.id,
      period: period,
      amount: Number(i.pool_contribution) * i.qty,
      active: true,
    }));
    await supabase.from('pool_contributions').insert(poolInsert);
    clearCart();
    setBusy('');
    setCheckoutStep('done');
    // Refresh orders
    const { data } = await supabase.from('package_orders').select('*').order('created_at', { ascending: false });
    setPkgOrders(data || []);
  }

  return (
    <div className="dash-shell">
      {/* Sidebar */}
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
            <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => { setTab(n.id); if (n.id === 'shop') setCheckoutStep('browse'); }}>
              {n.label}
              {n.id === 'shop' && Object.values(cart).some(v => v > 0) && (
                <span style={{ marginLeft: 8, background: 'var(--gold)', color: 'var(--black)', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>
                  {Object.values(cart).reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="dash-foot">
          <Link href="/">← Shop</Link>
          <span style={{ margin: '0 8px', color: '#333' }}>·</span>
          <Link href="/admin" style={{ color: 'var(--dim)' }}>Admin</Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        <div className="dash-topbar">
          <div>
            <h1>{NAV.find(n => n.id === tab)?.label}</h1>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              OHMI Coffee Co. · {me?.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {balance > 0 && <div className="admin-badge">{fmtR(balance)} available</div>}
            <div className="rank-badge">{currentRank?.name || 'Unranked'}</div>
          </div>
        </div>

        {/* ═══ DASHBOARD ══════════════════════════════════ */}
        {tab === 'dashboard' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box"><div className="stat-val">{fmtR(totalEarned)}</div><div className="stat-label">Total Earned</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(balance)}</div><div className="stat-label">Available Balance</div></div>
            <div className="stat-box"><div className="stat-val">{members.length - 1}</div><div className="stat-label">Network Members</div></div>
            <div className="stat-box"><div className="stat-val">{currentRank?.name || '—'}</div><div className="stat-label">Current Rank</div></div>
          </div>

          {nextRank && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div className="kicker" style={{ margin: 0 }}>Progress to {nextRank.name}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Qualifying leg: <span style={{ color: leftCount <= rightCount ? '#7ec8e3' : '#e3a87e', fontWeight: 700 }}>{qualifyingLeg}</span> / {nextRank.left}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                {[['Left', leftCount, nextRank.left], ['Right', rightCount, nextRank.right]].map(([label, cur, needed]) => {
                  const isWeaker = (label === 'Left' && leftCount <= rightCount) || (label === 'Right' && rightCount < leftCount);
                  const pct = Math.min(100, (cur / needed) * 100);
                  return (
                    <div key={label} style={{ padding: '14px 16px', background: 'var(--dark3)', border: `1px solid ${isWeaker ? 'rgba(126,200,227,0.3)' : '#2a2a2a'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                          {label} leg {isWeaker && <span style={{ color: '#7ec8e3', fontWeight: 700 }}>← focus here</span>}
                        </div>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: cur >= needed ? '#4caf7a' : 'var(--gold)', fontWeight: 700 }}>
                          {cur} <span style={{ fontSize: 13, color: 'var(--dim)' }}>/ {needed}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: cur >= needed ? '#2d7a4f' : 'var(--gold)', width: `${pct}%`, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
                        {cur >= needed
                          ? '✓ Threshold met'
                          : `${needed - cur} more needed`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: 'var(--dark3)', borderLeft: '3px solid var(--gold)', padding: '12px 16px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--white)' }}>Both legs must qualify.</strong>{' '}
                Rank is set by your weaker leg — 9L / 10R = Silver, not Gold.
                Achieving {nextRank.name} unlocks{' '}
                <strong style={{ color: 'var(--gold)' }}>{fmtR(nextRank.pool)}/month pool earnings</strong>
                {nextRank.bonus > 0 && <> + <strong style={{ color: 'var(--gold2)' }}>{fmtR(nextRank.bonus)} discretionary bonus</strong></>}.
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>Your referral link</div>
            <div style={{ background: 'var(--dark3)', padding: '11px 14px', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 12, border: '1px solid #2a2a2a' }}>{refLink}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-gold btn-sm" onClick={() => { navigator.clipboard?.writeText(refLink); flash('Link copied!'); }}>Copy link</button>
              <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join OHMI Coffee Co. — One Team. One Dream. One Legacy.\n' + refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>

          <div className="card">
            <div className="kicker" style={{ marginBottom: 10 }}>Subscription</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                ['Monthly', `R${sub?.amount || 1500}/month`],
                ['Pool contribution', `R${sub?.pool_contribution || 500}`],
                ['Status', sub?.status || 'inactive'],
                ['Activation', `R2,500 — ${activation?.status || 'pending'}`],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 16, fontFamily: 'var(--display)', color: 'var(--gold)', fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══ SHOP ═══════════════════════════════════════ */}
        {tab === 'shop' && <>

          {/* Browse */}
          {checkoutStep === 'browse' && <>
            <div style={{ marginBottom: 24 }}>
              <div className="kicker" style={{ marginBottom: 6 }}>Uganda Bugisu AA · Contract roasted by Wiara Coffee</div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, maxWidth: '60ch' }}>
                Every package includes real coffee and feeds R15/kg into the OHMI Foundation.
                Every purchase contributes to the binary pool — growing your network's earning power.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              {packages.map(pkg => {
                const qty = cart[pkg.id] || 0;
                const includes = Array.isArray(pkg.includes) ? pkg.includes : JSON.parse(pkg.includes || '[]');
                return (
                  <div key={pkg.id} style={{ background: 'var(--dark2)', border: `1px solid ${qty > 0 ? 'var(--gold)' : '#2a2a2a'}`, display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}>
                    {/* Header visual */}
                    <div style={{ background: '#0d0d0d', padding: '32px 24px', borderBottom: '1px solid #1e1e1e', position: 'relative' }}>
                      {pkg.badge && (
                        <div style={{ position: 'absolute', top: 14, right: 14, background: 'var(--gold)', color: 'var(--black)', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 10px' }}>
                          {pkg.badge}
                        </div>
                      )}
                      <div style={{ fontFamily: 'var(--display)', fontSize: 44, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
                        {pkg.coffee_kg < 1 ? `${pkg.coffee_kg * 1000}g` : `${pkg.coffee_kg}kg`}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6 }}>
                        Uganda Bugisu AA
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{pkg.name}</h3>
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontStyle: 'italic', marginBottom: 12 }}>{pkg.tagline}</div>
                      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 16 }}>{pkg.description}</p>

                      {/* Includes */}
                      <div style={{ marginBottom: 20, flex: 1 }}>
                        {includes.map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{ color: 'var(--gold)', fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item}</span>
                          </div>
                        ))}
                      </div>

                      {/* Pool callout */}
                      <div style={{ background: 'var(--dark3)', border: '1px solid #2a2a2a', padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pool contribution</span>
                        <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)', fontWeight: 700 }}>{fmtR(pkg.pool_contribution)}</span>
                      </div>

                      {/* Price + cart */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, color: 'var(--gold)' }}>
                          {fmtR(pkg.price)}
                        </div>
                        {qty > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button onClick={() => addToCart(pkg.id, -1)} style={{ width: 34, height: 34, background: 'var(--dark3)', border: '1px solid #333', color: 'var(--white)', fontSize: 18, cursor: 'pointer' }}>−</button>
                            <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                            <button onClick={() => addToCart(pkg.id, 1)} style={{ width: 34, height: 34, background: 'var(--dark3)', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 18, cursor: 'pointer' }}>+</button>
                          </div>
                        ) : (
                          <button className="btn btn-gold btn-sm" onClick={() => addToCart(pkg.id, 1)}>Add to order</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart summary bar */}
            {cartItems.length > 0 && (
              <div style={{ position: 'sticky', bottom: 24, background: 'var(--dark)', border: '1px solid var(--gold)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Order total</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--gold)', fontWeight: 700 }}>{fmtR(cartTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Pool contribution</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--gold2)', fontWeight: 700 }}>{fmtR(cartPool)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Items</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--white)', fontWeight: 700 }}>
                      {cartItems.reduce((a, i) => a + i.qty, 0)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-dark btn-sm" onClick={clearCart}>Clear</button>
                  <button className="btn btn-gold" onClick={() => setCheckoutStep('cart')}>Review order →</button>
                </div>
              </div>
            )}
          </>}

          {/* Cart review */}
          {checkoutStep === 'cart' && (
            <div style={{ maxWidth: 580 }}>
              <div className="kicker" style={{ marginBottom: 16 }}>Review your order</div>
              <div className="card" style={{ marginBottom: 16 }}>
                {cartItems.map(i => {
                  const includes = Array.isArray(i.includes) ? i.includes : JSON.parse(i.includes || '[]');
                  return (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #1e1e1e' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{i.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{includes[0]} · Qty: {i.qty}</div>
                        <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4 }}>Pool contribution: {fmtR(Number(i.pool_contribution) * i.qty)}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--gold)', fontWeight: 700, marginLeft: 20 }}>
                        {fmtR(Number(i.price) * i.qty)}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', marginTop: 4 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700 }}>Total</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Incl. {fmtR(cartPool)} pool contribution</div>
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--gold)', fontWeight: 700 }}>{fmtR(cartTotal)}</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #2a2a2a', padding: '16px 20px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
                  <strong style={{ color: 'var(--white)' }}>Payment via EFT</strong><br />
                  Bank: FNB · OHMI Coffee Co. (Pty) Ltd<br />
                  Amount: <strong style={{ color: 'var(--gold)' }}>{fmtR(cartTotal)}</strong><br />
                  Reference: <strong style={{ color: 'var(--gold)' }}>{me?.id?.slice(0, 8)?.toUpperCase()}-ORDER</strong><br />
                  <span style={{ color: 'var(--dim)' }}>Send proof of payment to orders@ohmicoffee.co.za</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-dark" onClick={() => setCheckoutStep('browse')}>← Back</button>
                <button className="btn btn-gold" style={{ flex: 1 }} disabled={busy === 'order'} onClick={placeOrder}>
                  {busy === 'order' ? 'Placing order…' : 'Confirm order — Payment on EFT'}
                </button>
              </div>
            </div>
          )}

          {/* Done */}
          {checkoutStep === 'done' && (
            <div style={{ maxWidth: 520 }}>
              <div className="card card-gold">
                <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>☕</div>
                  <div className="kicker" style={{ marginBottom: 10 }}>Order placed</div>
                  <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, marginBottom: 16 }}>We roast on Tuesdays.</h2>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                    Your order is confirmed. Complete your EFT payment using the reference below and
                    we'll fulfil within 48 hours of roasting. Your pool contribution is live.
                  </p>
                </div>
                <div style={{ background: 'var(--dark3)', padding: 16, marginBottom: 20, borderLeft: '3px solid var(--gold)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
                    <strong style={{ color: 'var(--white)' }}>Payment reference</strong><br />
                    <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)' }}>
                      {me?.id?.slice(0, 8)?.toUpperCase()}-ORDER
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setTab('orders'); setCheckoutStep('browse'); }}>View my orders</button>
                  <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => setCheckoutStep('browse')}>Order more</button>
                </div>
              </div>
            </div>
          )}
        </>}

        {/* ═══ MY ORDERS ══════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Package Orders</div>
            <table className="ohmi-table">
              <thead><tr><th>Package</th><th>Qty</th><th>Total</th><th>Pool</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {myPkgOrders.length ? myPkgOrders.map(o => {
                  const pkg = packages.find(p => p.id === o.package_id);
                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{pkg?.name || '—'}</td>
                      <td>{o.quantity}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmtR(o.total)}</td>
                      <td style={{ color: 'var(--gold2)' }}>{fmtR(o.pool_contribution)}</td>
                      <td><span className={`pill ${o.status==='fulfilled'?'pill-green':o.status==='pending'?'pill-gold':'pill-red'}`}>{o.status}</span></td>
                      <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(o.created_at)}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="6" style={{ color: 'var(--dim)', textAlign: 'center', padding: 24 }}>
                    No orders yet — <button className="btn btn-gold btn-sm" style={{ marginLeft: 8 }} onClick={() => { setTab('shop'); setCheckoutStep('browse'); }}>browse packages</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ NETWORK ════════════════════════════════════ */}
        {tab === 'network' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box"><div className="stat-val">{leftCount}</div><div className="stat-label">Left Leg</div></div>
            <div className="stat-box"><div className="stat-val">{rightCount}</div><div className="stat-label">Right Leg</div></div>
            <div className="stat-box"><div className="stat-val">{members.length - 1}</div><div className="stat-label">Total Downline</div></div>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="kicker" style={{ marginBottom: 16 }}>Binary tree</div>
            <div className="tree-wrap">
              {rootTreeNode ? <TreeNode node={rootTreeNode} map={treeMap} /> : <p style={{ color: 'var(--dim)' }}>Loading…</p>}
            </div>
          </div>
          <div className="card">
            <div className="kicker" style={{ marginBottom: 14 }}>Network members</div>
            <table className="ohmi-table">
              <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>
                {members.filter(m => m.id !== me?.id).map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.full_name}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.email}</td>
                    <td style={{ color: 'var(--dim)' }}>{fmtD(m.created_at)}</td>
                    <td><span className={`pill ${m.status==='active'?'pill-green':'pill-grey'}`}>{m.status}</span></td>
                  </tr>
                ))}
                {members.length <= 1 && <tr><td colSpan="4" style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>No network members yet — share your referral link.</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {/* ═══ EARNINGS ═══════════════════════════════════ */}
        {tab === 'earnings' && <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box"><div className="stat-val">{fmtR(totalEarned)}</div><div className="stat-label">Total Earned</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(totalPaid)}</div><div className="stat-label">Paid Out</div></div>
            <div className="stat-box"><div className="stat-val">{fmtR(balance)}</div><div className="stat-label">Available</div></div>
          </div>
          {balance >= 500 && (
            <div className="card card-gold" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Request payout — {fmtR(balance)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Processed within 3 business days via EFT</div>
              </div>
              <button className="btn btn-gold" onClick={async () => {
                const { error } = await supabase.from('commission_ledger').insert({ member_id: me.id, entry_type: 'payout', amount: balance, note: 'Member payout request', period: new Date().toISOString().slice(0, 7) + '-01' });
                if (error) flash('Request failed'); else flash('✓ Payout request submitted');
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
                    <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(l.created_at)}</td>
                    <td><span className={`pill ${l.entry_type==='payout'?'pill-red':'pill-gold'}`}>{l.entry_type.replace('_',' ')}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.note}</td>
                    <td style={{ fontFamily: 'var(--display)', fontSize: 18, color: l.entry_type==='payout'?'#e07070':'var(--gold)', fontWeight: 700 }}>{fmtR(l.amount)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>Ledger fills after the first billing run.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>}

        {/* ═══ RANKS ══════════════════════════════════════ */}
        {tab === 'ranks' && (
          <div>
            {/* Weaker leg explainer */}
            <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--gold)', padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)', marginBottom: 6 }}>
                Rank is set by your weaker leg.
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
                Both legs must independently hit the threshold. 9L / 10R qualifies as Silver (5/5), not Gold (20/20).
                Your current qualifying leg is <strong style={{ color: 'var(--white)' }}>{qualifyingLeg}</strong> — 
                focus on your <strong style={{ color: '#7ec8e3' }}>{weakerLeg} leg</strong> to advance.
              </p>
            </div>

            <div className="card">
              <div className="kicker" style={{ marginBottom: 14 }}>Your journey — 10 ranks</div>
              <table className="ohmi-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Each leg needs</th>
                    <th>Your left</th>
                    <th>Your right</th>
                    <th>Pool PM</th>
                    <th>Disc. Bonus</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RANKS.map(r => {
                    const achieved = qualifyingLeg >= r.left;
                    const isCurrent = r.name === currentRank?.name;
                    const leftMet = leftCount >= r.left;
                    const rightMet = rightCount >= r.right;
                    return (
                      <tr key={r.name} style={{ background: isCurrent ? 'rgba(201,168,76,.06)' : undefined }}>
                        <td style={{ fontWeight: 700, color: isCurrent ? 'var(--gold)' : achieved ? 'var(--white)' : 'var(--dim)' }}>
                          {r.name}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--muted)' }}>
                          {r.left.toLocaleString()} / {r.right.toLocaleString()}
                        </td>
                        <td style={{ color: leftMet ? '#4caf7a' : 'var(--dim)', fontWeight: leftMet ? 700 : 400 }}>
                          {leftCount} {leftMet ? '✓' : ''}
                        </td>
                        <td style={{ color: rightMet ? '#4caf7a' : 'var(--dim)', fontWeight: rightMet ? 700 : 400 }}>
                          {rightCount} {rightMet ? '✓' : ''}
                        </td>
                        <td style={{ color: isCurrent || achieved ? 'var(--gold)' : 'var(--dim)', fontWeight: 700 }}>
                          R{r.pool.toLocaleString()}
                        </td>
                        <td style={{ color: r.bonus > 0 ? (isCurrent || achieved ? 'var(--gold2)' : 'var(--dim)') : 'var(--dim)' }}>
                          {r.bonus > 0 ? `R${r.bonus.toLocaleString()}` : '—'}
                        </td>
                        <td>
                          {isCurrent
                            ? <span className="pill pill-gold">Current</span>
                            : achieved
                            ? <span className="pill pill-green">Achieved</span>
                            : <span className="pill pill-grey">Locked</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 14, lineHeight: 1.7 }}>
                Pool PM = your pro-rated share of the 30% binary pool based on your rank. Disc. bonus = paid from OHMI 70% retention at admin discretion. Ref: OHMI-ACT-2026-002.
              </p>
            </div>
          </div>
        )}

        {/* ═══ PROFILE ════════════════════════════════════ */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold2))', color: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, margin: '0 auto 12px' }}>
                  {me?.full_name?.[0]}
                </div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600 }}>{me?.full_name}</div>
                <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>{currentRank?.name || 'Unranked'}</div>
              </div>
              {[['Email', me?.email],['Phone', me?.phone || '—'],['Status', me?.status],['Joined', fmtD(me?.created_at)],['Member ID', me?.id?.slice(0,8)?.toUpperCase() + '…']].map(([l,v]) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e1e1e', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)', minWidth: 90 }}>{l}</span>
                  <span style={{ wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="kicker" style={{ marginBottom: 14 }}>Referral link</div>
              <div style={{ background: 'var(--dark3)', padding: '12px 14px', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 14, border: '1px solid #2a2a2a' }}>{refLink}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                <button className="btn btn-gold btn-sm" onClick={() => { navigator.clipboard?.writeText(refLink); flash('Copied!'); }}>Copy</button>
                <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join OHMI: ' + refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
              <div className="kicker" style={{ marginBottom: 8 }}>Foundation</div>
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>R15 from every kilogram in your subscription feeds children in the Bitou region. You are part of the legacy.</p>
            </div>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
