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

const TABS = [
  { id: 'home',     icon: 'ti-layout-dashboard', tip: 'Overview' },
  { id: 'shop',     icon: 'ti-shopping-bag',     tip: 'Shop' },
  { id: 'orders',   icon: 'ti-receipt',          tip: 'My Orders' },
  { id: 'network',  icon: 'ti-binary-tree-2',    tip: 'Network' },
  { id: 'earnings', icon: 'ti-coin',             tip: 'Earnings' },
  { id: 'travel',   icon: 'ti-plane',            tip: 'Travel Wallet' },
  { id: 'ranks',    icon: 'ti-trophy',           tip: 'Rank Journey' },
];

const fmtR = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function TreeNode({ node, map }) {
  const [open, setOpen] = useState(node.depth < 2);
  const kids = map[node.id] || [];
  const L = kids.find(k => k.leg === 'L');
  const R = kids.find(k => k.leg === 'R');
  const hasKids = L || R;
  return (
    <div className="tree-node">
      <div className={`tree-card ${node.status === 'active' ? 'active' : ''}`} onClick={() => hasKids && setOpen(o=>!o)}>
        <div className="tree-name">{node.name}</div>
        <div className="tree-status">{node.status}</div>
        <div className="tree-counts">L:{node.lc} · R:{node.rc}</div>
      </div>
      {hasKids && open && (
        <div className="tree-legs">
          {['L','R'].map((leg,i) => {
            const child = i === 0 ? L : R;
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
  const [tab, setTab] = useState('home');
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [sub, setSub] = useState(null);
  const [activation, setActivation] = useState(null);
  const [packages, setPackages] = useState([]);
  const [pkgOrders, setPkgOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [checkoutStep, setCheckoutStep] = useState('browse');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [travelAlloc, setTravelAlloc] = useState(0);

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
      setSub((s.data||[]).find(x => x.member_id === root?.id) || null);
      setActivation((a.data||[]).find(x => x.member_id === root?.id) || null);
    })();
  }, []);

  const treeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      if (n.parent_id) {
        const m = members.find(x => x.id === n.member_id);
        (map[n.parent_id] = map[n.parent_id] || []).push({
          ...n, name: m?.full_name?.split(' ')[0] || '?',
          status: m?.status || 'pending',
          lc: n.left_count, rc: n.right_count,
        });
      }
    });
    return map;
  }, [nodes, members]);

  const myNode = nodes.find(n => me && n.member_id === me.id);
  const leftCount  = myNode?.left_count  || 0;
  const rightCount = myNode?.right_count || 0;
  const qualLeg    = Math.min(leftCount, rightCount);
  const weakerIsLeft = leftCount <= rightCount;
  const currentRank = RANKS.filter(r => r.left <= qualLeg).pop();
  const nextRank    = RANKS.find(r => r.left > qualLeg);

  const rootNode = myNode ? { ...myNode, name: me?.full_name?.split(' ')[0] || 'You', status: me?.status, lc: leftCount, rc: rightCount } : null;

  const myLedger  = ledger.filter(l => me && l.member_id === me.id);
  const earned    = myLedger.filter(l => l.entry_type !== 'payout').reduce((s,l) => s+Number(l.amount), 0);
  const paidOut   = myLedger.filter(l => l.entry_type === 'payout').reduce((s,l) => s+Number(l.amount), 0);
  const balance   = earned - paidOut - travelAlloc;
  const myOrders  = pkgOrders.filter(o => me && o.member_id === me.id);

  const cartItems = packages.filter(p => cart[p.id] > 0).map(p => ({ ...p, qty: cart[p.id] }));
  const cartTotal = cartItems.reduce((s,i) => s + Number(i.price) * i.qty, 0);
  const cartPool  = cartItems.reduce((s,i) => s + Number(i.pool_contribution) * i.qty, 0);
  const cartQty   = cartItems.reduce((s,i) => s + i.qty, 0);
  const addCart   = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id]||0)+d) }));

  const refLink = me && typeof window !== 'undefined'
    ? `${window.location.origin}/join?ref=${me.id}` : '';

  async function placeOrder() {
    if (!me || !cartItems.length) return;
    setBusy('order');
    const period = new Date().toISOString().slice(0,7) + '-01';
    await supabase.from('package_orders').insert(
      cartItems.map(i => ({
        member_id: me.id, package_id: i.id, quantity: i.qty,
        total: Number(i.price)*i.qty,
        pool_contribution: Number(i.pool_contribution)*i.qty,
        status: 'pending', billing_period: period,
      }))
    );
    await supabase.from('pool_contributions').insert(
      cartItems.map(i => ({ member_id: me.id, period, amount: Number(i.pool_contribution)*i.qty, active: true }))
    );
    setCart({});
    setBusy('');
    setCheckoutStep('done');
    const { data } = await supabase.from('package_orders').select('*').order('created_at', { ascending: false });
    setPkgOrders(data || []);
  }

  async function requestPayout(amount) {
    if (amount < 500) { flash('Minimum payout is R500'); return; }
    await supabase.from('commission_ledger').insert({
      member_id: me.id, entry_type: 'payout', amount,
      note: 'Member payout request',
      period: new Date().toISOString().slice(0,7) + '-01',
    });
    flash('✓ Payout request submitted');
    const { data } = await supabase.from('commission_ledger').select('*').order('created_at', { ascending: false });
    setLedger(data || []);
  }

  const switchTo = (t) => { setTab(t); if (t === 'shop') setCheckoutStep('browse'); };

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <div className="app-shell">

        {/* Icon rail */}
        <aside className="rail">
          <div className="rail-logo">O</div>
          <nav className="rail-nav">
            {TABS.map(t => (
              <button key={t.id} className={`rail-item${tab === t.id ? ' on' : ''}`}
                data-tip={t.tip} onClick={() => switchTo(t.id)} aria-label={t.tip}>
                <i className={`ti ${t.icon}`} aria-hidden="true" />
                {t.id === 'shop' && cartQty > 0 && <span className="badge">{cartQty}</span>}
              </button>
            ))}
          </nav>
          <div className="rail-divider" />
          <div className="rail-bottom">
            <button className="rail-item" data-tip="Profile" aria-label="Profile">
              <i className="ti ti-user" aria-hidden="true" />
            </button>
            <Link href="/admin">
              <button className="rail-item" data-tip="Admin" aria-label="Admin">
                <i className="ti ti-settings" aria-hidden="true" />
              </button>
            </Link>
            <div className="rail-avatar">{me?.full_name?.[0] || '?'}</div>
          </div>
        </aside>

        {/* Main */}
        <div className="app-main">
          <div className="app-topbar">
            <span className="app-topbar-title">{TABS.find(t=>t.id===tab)?.tip || 'Overview'}</span>
            <span className="app-topbar-sub">· {me?.full_name}</span>
            <div className="app-topbar-right">
              <span className="topbar-badge topbar-badge-gold">{currentRank?.name || 'Unranked'}</span>
              <span className={`topbar-badge ${me?.status === 'active' ? 'topbar-badge-green' : ''}`}
                style={me?.status !== 'active' ? { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(192,80,58,0.2)' } : {}}>
                {me?.status || 'pending'}
              </span>
            </div>
          </div>

          <div className="app-content">

            {/* ── OVERVIEW ── */}
            {tab === 'home' && <>
              {/* Wallets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="wallet wallet-earn">
                  <div className="wallet-label">Earnings wallet</div>
                  <div className="wallet-amount">{fmtR(balance)}</div>
                  <div className="wallet-sub">Available · {fmtR(earned)} total earned</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {balance >= 500 && (
                      <button className="wallet-action" onClick={() => requestPayout(balance)}>
                        <i className="ti ti-arrow-up-right" aria-hidden="true" style={{ fontSize: 12 }} />
                        Request payout
                      </button>
                    )}
                    <button className="wallet-action" onClick={() => switchTo('earnings')}>
                      View ledger
                    </button>
                  </div>
                </div>
                <div className="wallet wallet-travel">
                  <div className="wallet-label">Travel wallet</div>
                  <div className="wallet-amount" style={{ color: 'var(--blue)' }}>{fmtR(travelAlloc)}</div>
                  <div className="wallet-sub">Offset hotel &amp; flight costs · RateHawk</div>
                  {earned > 0 && balance > 0 && (
                    <button className="wallet-action" onClick={() => switchTo('travel')}>
                      <i className="ti ti-plane" aria-hidden="true" style={{ fontSize: 12 }} />
                      Allocate earnings
                    </button>
                  )}
                  {travelAlloc === 0 && earned === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>Earn a rank bonus to unlock travel credits</div>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="metric-grid">
                {[
                  ['Network', members.length - 1, '', ''],
                  ['Left leg', leftCount, weakerIsLeft ? 'gold' : '', weakerIsLeft ? '← weaker' : ''],
                  ['Right leg', rightCount, !weakerIsLeft ? 'gold' : '', !weakerIsLeft ? '← weaker' : ''],
                  ['Pool earned', fmtR(earned), 'gold', ''],
                ].map(([label, val, cls, sub]) => (
                  <div key={label} className="metric">
                    <div className={`metric-val ${cls}`}>{val}</div>
                    <div className="metric-label">{label}</div>
                    {sub && <div className="metric-sub" style={{ color: 'var(--gold)' }}>{sub}</div>}
                  </div>
                ))}
              </div>

              {/* Rank progress */}
              {nextRank && (
                <div className="card">
                  <div className="section-header">
                    <span className="section-label">Rank progress</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {currentRank?.name || 'Unranked'} → <span style={{ color: 'var(--gold)' }}>{nextRank.name}</span>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['Left', leftCount, nextRank.left, leftCount <= rightCount],
                      ['Right', rightCount, nextRank.right, rightCount < leftCount]].map(([label, cur, need, isWeak]) => (
                      <div key={label} style={{ background: 'var(--dark)', border: `1px solid ${isWeak ? 'rgba(91,174,245,0.2)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {label} leg {isWeak && <span style={{ color: 'var(--blue)' }}>← focus</span>}
                          </span>
                          <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: cur >= need ? 'var(--green)' : 'var(--white)', fontWeight: 600 }}>
                            {cur}<span style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 400 }}>/{need}</span>
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className={`progress-fill ${cur >= need ? 'pf-green' : 'pf-gold'}`}
                            style={{ width: `${Math.min(100, (cur/need)*100)}%` }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
                          {cur >= need ? '✓ threshold met' : `${need - cur} more needed`}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--dark)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--white)', fontWeight: 500 }}>Both legs must qualify.</strong> Rank is set by your weaker leg.
                    {nextRank.name} unlocks <strong style={{ color: 'var(--gold)', fontWeight: 500 }}>{fmtR(nextRank.pool)}/month</strong>
                    {nextRank.bonus > 0 && <> + <strong style={{ color: 'var(--gold)', fontWeight: 500 }}>{fmtR(nextRank.bonus)} discretionary bonus → travel wallet</strong></>}.
                  </div>
                </div>
              )}

              {/* Referral */}
              <div className="card">
                <div className="section-header"><span className="section-label">Referral link</span></div>
                <div style={{ background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 12 }}>
                  {refLink || 'Loading…'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-gold btn-sm" onClick={() => { navigator.clipboard?.writeText(refLink); flash('Link copied'); }}>Copy link</button>
                  <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join OHMI Coffee Co.\n'+refLink)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
                </div>
              </div>
            </>}

            {/* ── SHOP ── */}
            {tab === 'shop' && <>
              {checkoutStep === 'browse' && <>
                <div>
                  <div className="kicker" style={{ marginBottom: 4 }}>Uganda Bugisu AA · Wiara Coffee</div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: '58ch' }}>
                    Every package contributes to the binary pool and feeds the OHMI Foundation.
                    Your purchase is your business — it earns while you drink.
                  </p>
                </div>
                <div className="pkg-grid">
                  {packages.map(pkg => {
                    const qty = cart[pkg.id] || 0;
                    const includes = Array.isArray(pkg.includes) ? pkg.includes : JSON.parse(pkg.includes || '[]');
                    return (
                      <div key={pkg.id} className={`pkg-card${qty > 0 ? ' selected' : ''}`}>
                        <div className="pkg-header">
                          <div className="pkg-size">
                            {pkg.coffee_kg < 1 ? `${pkg.coffee_kg*1000}g` : `${pkg.coffee_kg}kg`}
                          </div>
                          <div className="pkg-origin">Uganda Bugisu AA</div>
                          {pkg.badge && <div className="pkg-badge-wrap"><span className="pkg-badge">{pkg.badge}</span></div>}
                        </div>
                        <div className="pkg-body">
                          <div className="pkg-name">{pkg.name}</div>
                          <div className="pkg-tag">{pkg.tagline}</div>
                          <div style={{ marginBottom: 14 }}>
                            {includes.map((item, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                                <span style={{ color: 'var(--gold)', fontSize: 12, flexShrink: 0 }}>✓</span>
                                <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{item}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pkg-pool">
                            <span className="pkg-pool-label">Pool contribution</span>
                            <span className="pkg-pool-val">{fmtR(pkg.pool_contribution)}</span>
                          </div>
                          <div className="pkg-footer">
                            <span className="pkg-price">{fmtR(pkg.price)}</span>
                            {qty > 0 ? (
                              <div className="pkg-qty">
                                <button className="qty-btn" onClick={() => addCart(pkg.id,-1)}>−</button>
                                <span className="qty-num">{qty}</span>
                                <button className="qty-btn" onClick={() => addCart(pkg.id,1)}>+</button>
                              </div>
                            ) : (
                              <button className="btn btn-gold btn-xs" onClick={() => addCart(pkg.id,1)}>Add</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {cartItems.length > 0 && (
                  <div className="cart-bar">
                    <div className="cart-stat">
                      <span className="cart-stat-label">Total</span>
                      <span className="cart-stat-val">{fmtR(cartTotal)}</span>
                    </div>
                    <div className="cart-divider" />
                    <div className="cart-stat">
                      <span className="cart-stat-label">Pool contribution</span>
                      <span className="cart-stat-val">{fmtR(cartPool)}</span>
                    </div>
                    <div className="cart-divider" />
                    <div className="cart-stat">
                      <span className="cart-stat-label">Items</span>
                      <span className="cart-stat-val">{cartQty}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setCart({})}>Clear</button>
                      <button className="btn btn-gold" onClick={() => setCheckoutStep('cart')}>Review order →</button>
                    </div>
                  </div>
                )}
              </>}

              {checkoutStep === 'cart' && (
                <div style={{ maxWidth: 560 }}>
                  <div className="section-label" style={{ marginBottom: 16 }}>Review your order</div>
                  <div className="card" style={{ marginBottom: 12 }}>
                    {cartItems.map(i => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{i.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                            {i.coffee_kg<1?`${i.coffee_kg*1000}g`:`${i.coffee_kg}kg`} · Qty {i.qty} · Pool {fmtR(Number(i.pool_contribution)*i.qty)}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)', fontWeight: 600 }}>{fmtR(Number(i.price)*i.qty)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600 }}>
                      <span>Total</span><span style={{ color: 'var(--gold)' }}>{fmtR(cartTotal)}</span>
                    </div>
                  </div>
                  <div className="card" style={{ marginBottom: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 500, color: 'var(--white)', marginBottom: 8 }}>EFT Payment details</div>
                    Bank: FNB · OHMI Coffee Co. (Pty) Ltd<br />
                    Amount: <strong style={{ color: 'var(--gold)' }}>{fmtR(cartTotal)}</strong><br />
                    Reference: <strong style={{ color: 'var(--gold)' }}>{me?.id?.slice(0,8)?.toUpperCase()}-ORDER</strong><br />
                    <span style={{ color: 'var(--dim)', fontSize: 11 }}>Send proof to orders@ohmicoffee.co.za</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setCheckoutStep('browse')}>← Back</button>
                    <button className="btn btn-gold" style={{ flex: 1 }} disabled={busy==='order'} onClick={placeOrder}>
                      {busy==='order' ? 'Placing…' : 'Confirm order'}
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'done' && (
                <div style={{ maxWidth: 480 }}>
                  <div className="card card-gold" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 14 }}>☕</div>
                    <div className="kicker" style={{ marginBottom: 8 }}>Order placed</div>
                    <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, marginBottom: 12 }}>We roast on Tuesdays.</h2>
                    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                      Complete your EFT using reference <strong style={{ color: 'var(--gold)' }}>{me?.id?.slice(0,8)?.toUpperCase()}-ORDER</strong>.
                      Your pool contribution is live immediately.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => switchTo('orders')}>View orders</button>
                      <button className="btn btn-gold btn-sm" onClick={() => setCheckoutStep('browse')}>Order more</button>
                    </div>
                  </div>
                </div>
              )}
            </>}

            {/* ── MY ORDERS ── */}
            {tab === 'orders' && (
              <div className="card card-flush">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <span className="section-label">Package orders</span>
                </div>
                <table className="data-table">
                  <thead><tr><th>Package</th><th>Qty</th><th>Total</th><th>Pool</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {myOrders.length ? myOrders.map(o => {
                      const pkg = packages.find(p => p.id === o.package_id);
                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 500 }}>{pkg?.name || '—'}</td>
                          <td style={{ color: 'var(--muted)' }}>{o.quantity}</td>
                          <td style={{ color: 'var(--gold)', fontWeight: 500 }}>{fmtR(o.total)}</td>
                          <td style={{ color: 'var(--muted)' }}>{fmtR(o.pool_contribution)}</td>
                          <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'gold':'red'}`}>{o.status}</span></td>
                          <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(o.created_at)}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="6" style={{ color: 'var(--dim)', textAlign: 'center', padding: 28 }}>
                        No orders yet —&nbsp;
                        <button style={{ background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontSize:13 }} onClick={() => switchTo('shop')}>browse packages</button>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── NETWORK ── */}
            {tab === 'network' && <>
              <div className="metric-grid">
                {[['Left leg', leftCount,'gold'],['Right leg', rightCount,'gold'],['Total downline', members.length-1,''],['Max depth', Math.max(0,...nodes.map(n=>n.depth||0)),'']].map(([l,v,c]) => (
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card card-flush" style={{ overflow: 'auto' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <span className="section-label">Binary tree · click nodes to expand</span>
                </div>
                <div className="tree-wrap" style={{ padding: '24px', minWidth: 500 }}>
                  {rootNode ? <TreeNode node={rootNode} map={treeMap} /> : <p style={{ color: 'var(--dim)' }}>Loading…</p>}
                </div>
              </div>
              <div className="card card-flush">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <span className="section-label">Network members</span>
                </div>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {members.filter(m => m.id !== me?.id).map(m => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 500 }}>{m.full_name}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{m.email}</td>
                        <td><span className={`pill pill-${m.status==='active'?'green':'grey'}`}>{m.status}</span></td>
                        <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(m.created_at)}</td>
                      </tr>
                    ))}
                    {members.length <= 1 && <tr><td colSpan="4" style={{ color: 'var(--dim)', textAlign: 'center', padding: 24 }}>No network members yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── EARNINGS ── */}
            {tab === 'earnings' && <>
              <div className="metric-grid">
                {[['Total earned',fmtR(earned),'gold'],['Paid out',fmtR(paidOut),''],['In travel wallet',fmtR(travelAlloc),'blue'],['Available',fmtR(balance),'gold']].map(([l,v,c]) => (
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              {balance >= 500 && (
                <div className="card card-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>Request payout — {fmtR(balance)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Processed within 3 business days · EFT to registered bank</div>
                  </div>
                  <button className="btn btn-gold btn-sm" onClick={() => requestPayout(balance)}>Request payout</button>
                </div>
              )}
              <div className="card card-flush">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <span className="section-label">Commission ledger · CPA s43 audit trail</span>
                </div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Note</th><th style={{ textAlign:'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {myLedger.length ? myLedger.map(l => (
                      <tr key={l.id}>
                        <td style={{ color: 'var(--dim)', fontSize: 12 }}>{fmtD(l.created_at)}</td>
                        <td><span className={`pill pill-${l.entry_type==='payout'?'red':l.entry_type==='pool_share'?'gold':'grey'}`}>{l.entry_type.replace('_',' ')}</span></td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.note}</td>
                        <td style={{ textAlign:'right', fontFamily:'var(--display)', fontSize:18, fontWeight:600, color: l.entry_type==='payout'?'var(--red)':'var(--gold)' }}>{fmtR(l.amount)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" style={{ color:'var(--dim)', textAlign:'center', padding:24 }}>Ledger populates after billing run.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── TRAVEL WALLET ── */}
            {tab === 'travel' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="wallet wallet-earn">
                  <div className="wallet-label">Earnings available</div>
                  <div className="wallet-amount">{fmtR(balance)}</div>
                  <div className="wallet-sub">Can be allocated to travel</div>
                </div>
                <div className="wallet wallet-travel">
                  <div className="wallet-label">Travel wallet</div>
                  <div className="wallet-amount" style={{ color: 'var(--blue)' }}>{fmtR(travelAlloc)}</div>
                  <div className="wallet-sub">Offsets hotel &amp; flight costs</div>
                </div>
              </div>
              {balance > 0 && (
                <div className="card">
                  <div className="section-label" style={{ marginBottom: 14 }}>Allocate earnings to travel</div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 16 }}>
                    Move earnings from your cash wallet into your travel wallet. Travel credits are used to offset
                    hotel, flight, and package costs booked through OHMI Travel (RateHawk).
                  </p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {[500, 1000, 2000, balance].filter((v,i,a)=>a.indexOf(v)===i && v <= balance && v > 0).map(amt => (
                      <button key={amt} className="btn btn-ghost btn-sm" onClick={() => { setTravelAlloc(t => Math.min(balance+t, t+amt)); flash(`${fmtR(amt)} moved to travel wallet`); }}>
                        Allocate {fmtR(amt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="card card-blue">
                <div className="section-label" style={{ marginBottom: 12 }}>Travel coming soon</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
                  OHMI Travel is powered by RateHawk — giving you access to over 2.5 million hotels, flights, and travel packages at wholesale rates.
                  Book with your travel wallet balance and pay only the difference.
                </p>
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--dark)', borderRadius: 'var(--r-md)', border: '1px solid var(--blue-border)', fontSize: 12, color: 'var(--blue)' }}>
                  <i className="ti ti-plane" aria-hidden="true" style={{ marginRight: 8 }} />
                  RateHawk integration · coming with rank unlocks
                </div>
              </div>
              {travelAlloc > 0 && (
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                  onClick={() => { setTravelAlloc(0); flash('Travel wallet cleared'); }}>
                  Return to earnings wallet
                </button>
              )}
            </>}

            {/* ── RANKS ── */}
            {tab === 'ranks' && <>
              <div className="card card-gold" style={{ padding: '16px 20px' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)', marginBottom: 6 }}>Rank is set by your weaker leg.</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                  9L / 10R = Silver — not Gold. Both legs must independently reach the threshold.
                  Your qualifying leg is <strong style={{ color: 'var(--white)', fontWeight: 500 }}>{qualLeg}</strong>.
                  Focus on your <strong style={{ color: 'var(--blue)', fontWeight: 500 }}>{weakerIsLeft ? 'left' : 'right'} leg</strong>.
                </p>
              </div>
              <div className="card card-flush">
                <table className="data-table">
                  <thead><tr><th>Rank</th><th>Each leg needs</th><th>Your left</th><th>Your right</th><th>Pool /month</th><th>Disc. bonus</th><th>Status</th></tr></thead>
                  <tbody>
                    {RANKS.map(r => {
                      const achieved = qualLeg >= r.left;
                      const isCurrent = r.name === currentRank?.name;
                      return (
                        <tr key={r.name} style={{ background: isCurrent ? 'rgba(201,168,76,0.05)' : undefined }}>
                          <td style={{ fontWeight: 500, color: isCurrent ? 'var(--gold)' : achieved ? 'var(--white)' : 'var(--dim)' }}>{r.name}</td>
                          <td style={{ color: 'var(--muted)' }}>{r.left.toLocaleString()}</td>
                          <td style={{ color: leftCount >= r.left ? 'var(--green)' : 'var(--dim)', fontWeight: leftCount >= r.left ? 500 : 400 }}>
                            {leftCount} {leftCount >= r.left ? '✓' : ''}
                          </td>
                          <td style={{ color: rightCount >= r.right ? 'var(--green)' : 'var(--dim)', fontWeight: rightCount >= r.right ? 500 : 400 }}>
                            {rightCount} {rightCount >= r.right ? '✓' : ''}
                          </td>
                          <td style={{ color: isCurrent||achieved ? 'var(--gold)' : 'var(--dim)', fontWeight: 500 }}>R{r.pool.toLocaleString()}</td>
                          <td style={{ color: r.bonus > 0 ? (isCurrent||achieved ? 'var(--blue)' : 'var(--dim)') : 'var(--dim)' }}>
                            {r.bonus > 0 ? `R${r.bonus.toLocaleString()}` : '—'}
                          </td>
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
              </div>
            </>}

          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
