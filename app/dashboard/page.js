'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
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
  { id: 'home',      icon: 'ti-layout-dashboard', tip: 'Overview' },
  { id: 'subscribe', icon: 'ti-rotate-clockwise',  tip: 'Subscription' },
  { id: 'shop',      icon: 'ti-shopping-bag',      tip: 'Shop' },
  { id: 'orders',    icon: 'ti-receipt',           tip: 'My Orders' },
  { id: 'network',   icon: 'ti-binary-tree-2',     tip: 'Network' },
  { id: 'earnings',  icon: 'ti-coin',              tip: 'Earnings' },
  { id: 'lifestyle', icon: 'ti-sparkles',          tip: 'Lifestyle Wallet' },
  { id: 'ranks',     icon: 'ti-trophy',            tip: 'Rank Journey' },
];

const fmtR = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtMN = n => n ? String(n).padStart(5, '0') : '—';
const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const nextPayoutDate = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  return next.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ── Interactive Binary Tree ──────────────────────────────────────────────────
function TreeNode({ node, map, onOpenSlot, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const kids = map[node.id] || [];
  const L = kids.find(k => k.leg === 'L');
  const R = kids.find(k => k.leg === 'R');
  const hasKids = L || R;
  const isActive = node.status === 'active';

  return (
    <div className="tree-node">
      <div
        className="tree-card"
        style={{ borderColor: isActive ? 'rgba(61,158,107,0.5)' : 'rgba(192,80,58,0.4)', cursor: hasKids ? 'pointer' : 'default' }}
        onClick={() => hasKids && setOpen(o => !o)}
      >
        <div className="tree-name">{node.name}</div>
        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>#{fmtMN(node.memberNumber)}</div>
        <div className="tree-status" style={{ color: isActive ? 'var(--green)' : 'var(--red)' }}>{node.status}</div>
        <div className="tree-counts">L:{node.lc} · R:{node.rc}</div>
        {hasKids && <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 3 }}>{open ? '▲' : '▼'}</div>}
      </div>
      {(hasKids || true) && open && (
        <div className="tree-legs">
          {['L', 'R'].map((leg, i) => {
            const child = i === 0 ? L : R;
            return (
              <div key={leg} className="tree-leg">
                <div className="tree-leg-label">{leg}</div>
                {child
                  ? <TreeNode node={child} map={map} onOpenSlot={onOpenSlot} depth={depth + 1} />
                  : <button
                      className="tree-open"
                      style={{ cursor: 'pointer', background: 'none', border: '1px dashed rgba(201,168,76,0.3)', color: 'var(--gold)', fontSize: 10, padding: '8px 14px', borderRadius: 'var(--r-md)' }}
                      onClick={() => onOpenSlot && onOpenSlot(node.id, leg)}
                    >
                      + Register here
                    </button>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Register Modal ───────────────────────────────────────────────────────────
function RegisterModal({ parentNodeId, leg, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function register() {
    if (!form.name || !form.email) { setErr('Name and email required'); return; }
    setBusy(true); setErr('');
    const { data: existing } = await supabase.from('members').select('id').eq('email', form.email).maybeSingle();
    if (existing) { setErr('Email already registered'); setBusy(false); return; }

    const newId = crypto.randomUUID();
    const { data: parentNode } = await supabase.from('network_nodes').select('member_id, depth').eq('id', parentNodeId).single();

    const { error: mErr } = await supabase.from('members').insert({
      id: newId, full_name: form.name, email: form.email,
      phone: form.phone, status: 'pending',
      sponsor_id: parentNode?.member_id,
    });
    if (mErr) { setErr(mErr.message); setBusy(false); return; }

    await supabase.from('network_nodes').insert({
      member_id: newId, parent_id: parentNodeId,
      leg, depth: (parentNode?.depth || 0) + 1,
    });
    await supabase.from('activations').insert({ member_id: newId, amount: 2500, status: 'pending' });

    setBusy(false);
    onSuccess(form.name);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div className="card" style={{ width: 400, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 20 }}>Register new member</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, padding: '8px 12px', background: 'var(--dark)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
          Placing in <strong style={{ color: 'var(--gold)' }}>{leg === 'L' ? 'left' : 'right'} leg</strong>
        </div>
        {err && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12, padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 'var(--r-sm)' }}>{err}</div>}
        <div className="field">
          <label className="field-label">Full name *</label>
          <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First and last name" />
        </div>
        <div className="field">
          <label className="field-label">Email *</label>
          <input className="field-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="their@email.com" />
        </div>
        <div className="field">
          <label className="field-label">Phone</label>
          <input className="field-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+27 000 000 0000" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" style={{ flex: 1 }} disabled={busy} onClick={register}>
            {busy ? 'Registering…' : 'Register member'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState('home');
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [lifestyle, setLifestyle] = useState([]);
  const [sub, setSub] = useState(null);
  const [activation, setActivation] = useState(null);
  const [packages, setPackages] = useState([]);
  const [pkgOrders, setPkgOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [checkoutStep, setCheckoutStep] = useState('browse');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [registerSlot, setRegisterSlot] = useState(null); // { parentNodeId, leg }
  const [treeScale, setTreeScale] = useState(1);

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3000); };

  async function load() {
    const [m, n, l, s, a, p, po, ll] = await Promise.all([
      supabase.from('members').select('*').order('member_number'),
      supabase.from('network_nodes').select('*'),
      supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('activations').select('*'),
      supabase.from('packages').select('*').eq('active', true).order('sort_order'),
      supabase.from('package_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('lifestyle_ledger').select('*').order('created_at', { ascending: false }),
    ]);
    setMembers(m.data || []);
    setNodes(n.data || []);
    setLedger(l.data || []);
    setPackages(p.data || []);
    setPkgOrders(po.data || []);
    setLifestyle(ll.data || []);
    const root = (m.data||[]).find(x => x.email === 'brandon@ohmicoffee.co.za') || (m.data||[])[0];
    setMe(root || null);
    setSub((s.data||[]).find(x => x.member_id === root?.id) || null);
    setActivation((a.data||[]).find(x => x.member_id === root?.id) || null);
  }

  useEffect(() => { load(); }, []);

  // Tree map
  const treeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      if (n.parent_id) {
        const m = members.find(x => x.id === n.member_id);
        (map[n.parent_id] = map[n.parent_id] || []).push({
          ...n, name: m?.full_name?.split(' ')[0] || '?',
          memberNumber: m?.member_number,
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
  const currentRank = RANKS.filter(r => r.left <= qualLeg).pop();
  const nextRank    = RANKS.find(r => r.left > qualLeg);
  const rootNode    = myNode ? { ...myNode, name: me?.full_name?.split(' ')[0] || 'You', memberNumber: me?.member_number, status: me?.status, lc: leftCount, rc: rightCount } : null;

  // Earnings — only pool_share and signup_commission count, not unranked
  const myLedger   = ledger.filter(l => me && l.member_id === me.id);
  const earned     = myLedger.filter(l => ['pool_share','signup_commission'].includes(l.entry_type)).reduce((s,l) => s+Number(l.amount), 0);
  const paidOut    = myLedger.filter(l => l.entry_type === 'payout').reduce((s,l) => s+Number(l.amount), 0);
  const balance    = earned - paidOut;

  // Lifestyle points
  const myLifestyle  = lifestyle.filter(l => me && l.member_id === me.id);
  const pointsEarned = myLifestyle.filter(l => ['rank_bonus','adjustment'].includes(l.entry_type)).reduce((s,l) => s+Number(l.points), 0);
  const pointsUsed   = myLifestyle.filter(l => ['redemption','expiry'].includes(l.entry_type)).reduce((s,l) => s+Number(l.points), 0);
  const pointBalance = pointsEarned - pointsUsed;

  // Shop cart
  const cartItems = packages.filter(p => cart[p.id] > 0).map(p => ({ ...p, qty: cart[p.id] }));
  const cartTotal = cartItems.reduce((s,i) => s + Number(i.price)*i.qty, 0);
  const cartPool  = cartItems.reduce((s,i) => s + Number(i.pool_contribution)*i.qty, 0);
  const cartQty   = cartItems.reduce((s,i) => s + i.qty, 0);
  const addCart   = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0,(c[id]||0)+d) }));
  const myOrders  = pkgOrders.filter(o => me && o.member_id === me.id);

  const refLink = me && typeof window !== 'undefined' ? `${window.location.origin}/join?ref=${me.id}` : '';

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
    setCart({}); setBusy(''); setCheckoutStep('done');
    const { data } = await supabase.from('package_orders').select('*').order('created_at', { ascending: false });
    setPkgOrders(data || []);
  }

  const switchTo = t => { setTab(t); if (t === 'shop' || t === 'subscribe') setCheckoutStep('browse'); };

  // The subscription package (Builder Pack = monthly default)
  const subPackage = packages.find(p => p.name === 'Builder Pack') || packages[1];
  const shopPackages = packages.filter(p => p.name !== 'Builder Pack');

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <div className="app-shell">

        {/* Rail */}
        <aside className="rail">
          <div className="rail-logo">O</div>
          <nav className="rail-nav">
            {TABS.map(t => (
              <button key={t.id} className={`rail-item${tab===t.id?' on':''}`}
                data-tip={t.tip} onClick={() => switchTo(t.id)} aria-label={t.tip}>
                <i className={`ti ${t.icon}`} aria-hidden="true" />
                {t.id==='shop' && cartQty>0 && <span className="badge">{cartQty}</span>}
                {t.id==='lifestyle' && pointBalance>0 && <span className="badge" style={{ background:'var(--blue)' }}>✦</span>}
              </button>
            ))}
          </nav>
          <div className="rail-divider" />
          <div className="rail-bottom">
            <Link href="/admin">
              <button className="rail-item" data-tip="Admin" aria-label="Admin"><i className="ti ti-settings" aria-hidden="true" /></button>
            </Link>
            <div className="rail-avatar">{me?.full_name?.[0] || '?'}</div>
          </div>
        </aside>

        {/* Main */}
        <div className="app-main">
          <div className="app-topbar">
            <span className="app-topbar-title">{TABS.find(t=>t.id===tab)?.tip}</span>
            <span className="app-topbar-sub">· {me?.full_name} · #{fmtMN(me?.member_number)}</span>
            <div className="app-topbar-right">
              <span className="topbar-badge topbar-badge-gold">{currentRank?.name || 'Unranked'}</span>
              <span className="topbar-badge" style={{ background: me?.status==='active'?'var(--green-bg)':'var(--red-bg)', color: me?.status==='active'?'var(--green)':'var(--red)', border: `1px solid ${me?.status==='active'?'rgba(61,158,107,0.25)':'rgba(192,80,58,0.25)'}` }}>
                {me?.status || 'pending'}
              </span>
            </div>
          </div>

          <div className="app-content">

            {/* ── OVERVIEW ── */}
            {tab === 'home' && <>
              {/* Wallet cards */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {/* Earnings wallet */}
                <div className="wallet wallet-earn">
                  <div className="wallet-label">Earnings wallet</div>
                  <div className="wallet-amount">{fmtR(balance)}</div>
                  <div className="wallet-sub">
                    {balance > 0
                      ? `Auto-pays on 15 ${new Date(Date.now()+30*86400000).toLocaleString('en-ZA',{month:'long'})}`
                      : 'Earns when you hit rank'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:10, padding:'8px 10px', background:'rgba(0,0,0,0.2)', borderRadius:'var(--r-sm)' }}>
                    <i className="ti ti-calendar" aria-hidden="true" style={{ fontSize:11, marginRight:5 }} />
                    Next payout: {nextPayoutDate()}
                  </div>
                </div>
                {/* Lifestyle wallet */}
                <div className="wallet wallet-travel">
                  <div className="wallet-label">Lifestyle Wallet</div>
                  <div className="wallet-amount" style={{ color:'var(--blue)' }}>{pointBalance.toLocaleString()} pts</div>
                  <div className="wallet-sub">
                    {currentRank?.bonus > 0
                      ? `${fmtR(currentRank.bonus)} pts/month at ${currentRank.name}`
                      : 'Unlocks with rank discretionary bonus'}
                  </div>
                  {pointBalance > 0 && (
                    <button className="wallet-action" onClick={() => switchTo('lifestyle')}>
                      <i className="ti ti-sparkles" aria-hidden="true" style={{ fontSize:12 }} />
                      View lifestyle benefits
                    </button>
                  )}
                  {pointBalance === 0 && (
                    <div style={{ fontSize:11, color:'var(--dim)', marginTop:10 }}>
                      Hit Gold rank to unlock {fmtR(4000)} pts/month
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="metric-grid">
                {[
                  ['Members', members.length - 1, ''],
                  ['Left leg', leftCount, 'gold'],
                  ['Right leg', rightCount, 'gold'],
                  ['Earned', fmtR(earned), 'gold'],
                ].map(([l,v,c]) => (
                  <div key={l} className="metric">
                    <div className={`metric-val ${c}`}>{v}</div>
                    <div className="metric-label">{l}</div>
                  </div>
                ))}
              </div>

              {/* Rank progress */}
              {nextRank && (
                <div className="card">
                  <div className="section-header">
                    <span className="section-label">Rank progress</span>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>
                      {currentRank?.name || 'Unranked'} → <span style={{ color:'var(--gold)' }}>{nextRank.name}</span>
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[['Left', leftCount, nextRank.left], ['Right', rightCount, nextRank.right]].map(([label, cur, need]) => (
                      <div key={label} style={{ background:'var(--dark)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'12px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                          <span style={{ fontSize:11, color:'var(--muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{label} leg</span>
                          <span style={{ fontFamily:'var(--display)', fontSize:18, color: cur>=need?'var(--green)':'var(--white)', fontWeight:600 }}>
                            {cur}<span style={{ fontSize:13, color:'var(--dim)', fontWeight:400 }}>/{need}</span>
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className={`progress-fill ${cur>=need?'pf-green':'pf-gold'}`} style={{ width:`${Math.min(100,(cur/need)*100)}%` }} />
                        </div>
                        <div style={{ fontSize:11, color:'var(--dim)', marginTop:6 }}>
                          {cur>=need ? '✓ threshold met' : `${need-cur} more needed`}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:12, padding:'10px 14px', background:'var(--dark)', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>
                    <strong style={{ color:'var(--white)', fontWeight:500 }}>Both legs must qualify.</strong>{' '}
                    Rank is set by your weaker leg.
                    {nextRank.name} unlocks <strong style={{ color:'var(--gold)', fontWeight:500 }}>{fmtR(nextRank.pool)}/month</strong>
                    {nextRank.bonus > 0 && <> + <strong style={{ color:'var(--blue)', fontWeight:500 }}>{fmtR(nextRank.bonus)} lifestyle pts/month</strong></>}.
                  </div>
                </div>
              )}

              {/* Referral */}
              <div className="card">
                <div className="section-header"><span className="section-label">Your referral link</span></div>
                <div style={{ background:'var(--dark)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:12, color:'var(--muted)', wordBreak:'break-all', marginBottom:12 }}>
                  {refLink || 'Loading…'}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-gold btn-sm" onClick={() => { navigator.clipboard?.writeText(refLink); flash('Link copied'); }}>Copy link</button>
                  <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join OHMI Coffee Co.\n'+refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                </div>
                <div style={{ marginTop:12, fontSize:11, color:'var(--dim)', lineHeight:1.6, padding:'8px 12px', background:'var(--dark)', borderRadius:'var(--r-sm)', border:'1px solid var(--border)' }}>
                  <i className="ti ti-coins" aria-hidden="true" style={{ marginRight:6, fontSize:11 }} />
                  You earn <strong style={{ color:'var(--gold)' }}>R500</strong> sign-up commission every time someone activates through your link.
                </div>
              </div>
            </>}

            {/* ── SUBSCRIPTION ── */}
            {tab === 'subscribe' && (
              <div style={{ maxWidth:560 }}>
                <div className="section-label" style={{ marginBottom:16 }}>Your monthly subscription</div>
                <div className="card card-gold" style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                    <div>
                      <div style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:600, marginBottom:4 }}>
                        {sub ? `Builder Pack · R${sub.amount}/month` : 'No active subscription'}
                      </div>
                      <span className={`pill pill-${sub?.status==='active'?'green':'red'}`}>{sub?.status || 'inactive'}</span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--display)', fontSize:32, color:'var(--gold)', fontWeight:600 }}>1kg</div>
                      <div style={{ fontSize:10, color:'var(--dim)', letterSpacing:'0.14em', textTransform:'uppercase' }}>Uganda Bugisu AA</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      ['Monthly', `R${sub?.amount||1500}`],
                      ['Pool contribution', `R${sub?.pool_contribution||500}`],
                      ['OHMI retention', `R${(sub?.amount||1500)-(sub?.pool_contribution||500)}`],
                    ].map(([l,v]) => (
                      <div key={l} style={{ padding:'12px 14px', background:'var(--dark)', borderRadius:'var(--r-md)', border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:10, color:'var(--dim)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>{l}</div>
                        <div style={{ fontFamily:'var(--display)', fontSize:20, color:'var(--gold)', fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.8, padding:'12px 14px', background:'rgba(0,0,0,0.2)', borderRadius:'var(--r-sm)' }}>
                    <strong style={{ color:'var(--white)', fontWeight:500 }}>How your R1,500 works:</strong><br />
                    R500 enters the binary commission pool — distributed to ranked reps on the 1st of each month.<br />
                    R1,000 covers your monthly coffee product, roasting, packaging, and OHMI operations.
                  </div>
                </div>
                <div className="card" style={{ marginBottom:16 }}>
                  <div className="section-label" style={{ marginBottom:10 }}>Activation status</div>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <span className={`pill pill-${activation?.status==='paid'?'green':'gold'}`}>R2,500 activation — {activation?.status||'pending'}</span>
                    {activation?.status !== 'paid' && (
                      <span style={{ fontSize:12, color:'var(--muted)' }}>EFT to orders@ohmicoffee.co.za · Ref: {me?.id?.slice(0,8)?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div className="section-label" style={{ marginBottom:10 }}>Payout schedule</div>
                  <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.8 }}>
                    Pool earnings are calculated on the 1st of each month and paid to your registered bank account
                    by the <strong style={{ color:'var(--white)', fontWeight:500 }}>15th of the following month</strong> — automatically, no request needed.
                    Sign-up commissions (R500) are credited immediately on activation approval.
                  </p>
                  <div style={{ marginTop:12, padding:'10px 14px', background:'var(--dark)', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', fontSize:12, color:'var(--gold)' }}>
                    <i className="ti ti-calendar" aria-hidden="true" style={{ marginRight:6 }} />
                    Next payout: {nextPayoutDate()}
                  </div>
                </div>
              </div>
            )}

            {/* ── SHOP ── */}
            {tab === 'shop' && <>
              {checkoutStep === 'browse' && <>
                <div>
                  <div className="kicker" style={{ marginBottom:4 }}>Additional coffee & merchandise</div>
                  <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7, maxWidth:'58ch', marginBottom:20 }}>
                    Order extra coffee or add-on products beyond your monthly subscription. These are once-off purchases and also contribute to the pool.
                  </p>
                </div>
                <div className="pkg-grid">
                  {packages.map(pkg => {
                    const qty = cart[pkg.id] || 0;
                    const includes = Array.isArray(pkg.includes) ? pkg.includes : JSON.parse(pkg.includes || '[]');
                    return (
                      <div key={pkg.id} className={`pkg-card${qty>0?' selected':''}`}>
                        <div className="pkg-header">
                          <div className="pkg-size">{pkg.coffee_kg<1?`${pkg.coffee_kg*1000}g`:`${pkg.coffee_kg}kg`}</div>
                          <div className="pkg-origin">Uganda Bugisu AA</div>
                          {pkg.badge && <div className="pkg-badge-wrap"><span className="pkg-badge">{pkg.badge}</span></div>}
                        </div>
                        <div className="pkg-body">
                          <div className="pkg-name">{pkg.name}</div>
                          <div className="pkg-tag">{pkg.tagline}</div>
                          <div style={{ marginBottom:14, flex:1 }}>
                            {includes.slice(0,3).map((item,i) => (
                              <div key={i} style={{ display:'flex', gap:8, marginBottom:5 }}>
                                <span style={{ color:'var(--gold)', fontSize:11, flexShrink:0 }}>✓</span>
                                <span style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{item}</span>
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
                    <div className="cart-stat"><span className="cart-stat-label">Total</span><span className="cart-stat-val">{fmtR(cartTotal)}</span></div>
                    <div className="cart-divider" />
                    <div className="cart-stat"><span className="cart-stat-label">Pool</span><span className="cart-stat-val">{fmtR(cartPool)}</span></div>
                    <div className="cart-divider" />
                    <div className="cart-stat"><span className="cart-stat-label">Items</span><span className="cart-stat-val">{cartQty}</span></div>
                    <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setCart({})}>Clear</button>
                      <button className="btn btn-gold" onClick={() => setCheckoutStep('cart')}>Review →</button>
                    </div>
                  </div>
                )}
              </>}
              {checkoutStep === 'cart' && (
                <div style={{ maxWidth:520 }}>
                  <div className="section-label" style={{ marginBottom:16 }}>Review order</div>
                  <div className="card" style={{ marginBottom:12 }}>
                    {cartItems.map(i => (
                      <div key={i.id} style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:500, fontSize:13 }}>{i.name} · {i.coffee_kg<1?`${i.coffee_kg*1000}g`:`${i.coffee_kg}kg`} × {i.qty}</div>
                          <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>Pool {fmtR(Number(i.pool_contribution)*i.qty)}</div>
                        </div>
                        <span style={{ fontFamily:'var(--display)', fontSize:18, color:'var(--gold)', fontWeight:600 }}>{fmtR(Number(i.price)*i.qty)}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 0 0', fontFamily:'var(--display)', fontSize:22, fontWeight:600 }}>
                      <span>Total</span><span style={{ color:'var(--gold)' }}>{fmtR(cartTotal)}</span>
                    </div>
                  </div>
                  <div className="card" style={{ marginBottom:12, fontSize:12, color:'var(--muted)', lineHeight:1.8 }}>
                    <strong style={{ color:'var(--white)', fontWeight:500, display:'block', marginBottom:8 }}>EFT payment details</strong>
                    Bank: FNB · OHMI Coffee Co. (Pty) Ltd<br />
                    Amount: <strong style={{ color:'var(--gold)' }}>{fmtR(cartTotal)}</strong><br />
                    Reference: <strong style={{ color:'var(--gold)' }}>{me?.id?.slice(0,8)?.toUpperCase()}-SHOP</strong>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setCheckoutStep('browse')}>← Back</button>
                    <button className="btn btn-gold" style={{ flex:1 }} disabled={busy==='order'} onClick={placeOrder}>
                      {busy==='order' ? 'Placing…' : 'Confirm order'}
                    </button>
                  </div>
                </div>
              )}
              {checkoutStep === 'done' && (
                <div style={{ maxWidth:440 }}>
                  <div className="card card-gold" style={{ textAlign:'center', padding:'28px 24px' }}>
                    <div style={{ fontSize:32, marginBottom:12 }}>☕</div>
                    <div className="kicker" style={{ marginBottom:8 }}>Order placed</div>
                    <h2 style={{ fontFamily:'var(--display)', fontSize:24, marginBottom:12 }}>We roast on Tuesdays.</h2>
                    <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.8, marginBottom:20 }}>
                      Reference: <strong style={{ color:'var(--gold)' }}>{me?.id?.slice(0,8)?.toUpperCase()}-SHOP</strong><br />
                      Pool contribution is live immediately.
                    </p>
                    <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
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
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
                  <span className="section-label">Order history</span>
                </div>
                <table className="data-table">
                  <thead><tr><th>Package</th><th>Qty</th><th>Total</th><th>Pool</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {myOrders.length ? myOrders.map(o => {
                      const pkg = packages.find(p => p.id === o.package_id);
                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight:500 }}>{pkg?.name||'—'}</td>
                          <td style={{ color:'var(--muted)' }}>{o.quantity}</td>
                          <td style={{ color:'var(--gold)', fontWeight:500 }}>{fmtR(o.total)}</td>
                          <td style={{ color:'var(--muted)' }}>{fmtR(o.pool_contribution)}</td>
                          <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'gold':'red'}`}>{o.status}</span></td>
                          <td style={{ color:'var(--dim)', fontSize:12 }}>{fmtD(o.created_at)}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="6" style={{ color:'var(--dim)', textAlign:'center', padding:28 }}>
                        No orders yet —&nbsp;
                        <button style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', fontSize:13 }} onClick={() => switchTo('shop')}>browse the shop</button>
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

              {/* Tree with zoom */}
              <div className="card card-flush">
                <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span className="section-label">Binary tree · click + to register · click nodes to expand</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => setTreeScale(s => Math.max(0.4, s-0.15))}>−</button>
                    <span style={{ fontSize:11, color:'var(--muted)', minWidth:34, textAlign:'center' }}>{Math.round(treeScale*100)}%</span>
                    <button className="btn btn-ghost btn-xs" onClick={() => setTreeScale(s => Math.min(1.5, s+0.15))}>+</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setTreeScale(1)}>Reset</button>
                  </div>
                </div>
                <div style={{ overflow:'auto', padding:24 }}>
                  <div style={{ transform:`scale(${treeScale})`, transformOrigin:'top center', transition:'transform 0.2s', paddingBottom: treeScale < 1 ? `${(1-treeScale)*100}%` : 0 }}>
                    {rootNode
                      ? <TreeNode node={rootNode} map={treeMap} onOpenSlot={(parentNodeId, leg) => setRegisterSlot({ parentNodeId, leg })} />
                      : <p style={{ color:'var(--dim)' }}>Loading…</p>}
                  </div>
                </div>
                <div style={{ padding:'10px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:16, fontSize:11, color:'var(--dim)' }}>
                  <span style={{ color:'var(--green)' }}>■</span> Active &nbsp;
                  <span style={{ color:'var(--red)' }}>■</span> Inactive / Pending
                </div>
              </div>

              <div className="card card-flush">
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}><span className="section-label">Network members</span></div>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {members.filter(m => m.id !== me?.id).map(m => (
                      <tr key={m.id}>
                        <td style={{ color:'var(--dim)', fontSize:11, fontWeight:600 }}>{fmtMN(m.member_number)}</td>
                        <td style={{ fontWeight:500 }}>{m.full_name}</td>
                        <td style={{ color:'var(--muted)', fontSize:12 }}>{m.email}</td>
                        <td><span className={`pill pill-${m.status==='active'?'green':m.status==='pending'?'gold':'red'}`}>{m.status}</span></td>
                        <td style={{ color:'var(--dim)', fontSize:12 }}>{fmtD(m.created_at)}</td>
                      </tr>
                    ))}
                    {members.length <= 1 && <tr><td colSpan="5" style={{ color:'var(--dim)', textAlign:'center', padding:24 }}>No network members yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── EARNINGS ── */}
            {tab === 'earnings' && <>
              <div className="metric-grid">
                {[['Total earned',fmtR(earned),'gold'],['Paid out',fmtR(paidOut),''],['Available',fmtR(balance),'gold'],['Next payout','15th','']].map(([l,v,c]) => (
                  <div key={l} className="metric"><div className={`metric-val ${c}`} style={{ fontSize:22 }}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card" style={{ marginBottom:0 }}>
                <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.8, padding:'4px 0' }}>
                  <strong style={{ color:'var(--white)', fontWeight:500 }}>Automatic monthly payout.</strong> No request needed.
                  Your balance is paid to your registered bank account by the <strong style={{ color:'var(--gold)', fontWeight:500 }}>15th of the following month</strong> every month.
                  Pool earnings only credit when you hold rank. Sign-up commissions (R500) credit immediately on activation approval.
                </div>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}><span className="section-label">Commission ledger · CPA s43 audit trail</span></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Note</th><th style={{ textAlign:'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {myLedger.filter(l => l.entry_type !== 'foundation').length ? myLedger.filter(l => l.entry_type !== 'foundation').map(l => (
                      <tr key={l.id}>
                        <td style={{ color:'var(--dim)', fontSize:12 }}>{fmtD(l.created_at)}</td>
                        <td><span className={`pill pill-${l.entry_type==='payout'?'red':l.entry_type==='pool_share'?'gold':l.entry_type==='signup_commission'?'green':'grey'}`}>
                          {l.entry_type==='signup_commission'?'sign-up commission':l.entry_type.replace('_',' ')}
                        </span></td>
                        <td style={{ color:'var(--muted)', fontSize:12 }}>{l.note}</td>
                        <td style={{ textAlign:'right', fontFamily:'var(--display)', fontSize:18, fontWeight:600, color:l.entry_type==='payout'?'var(--red)':'var(--gold)' }}>{fmtR(l.amount)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" style={{ color:'var(--dim)', textAlign:'center', padding:24 }}>
                        Earnings appear here after billing runs and sign-up commissions.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── LIFESTYLE WALLET ── */}
            {tab === 'lifestyle' && <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="wallet wallet-travel">
                  <div className="wallet-label">Lifestyle wallet</div>
                  <div className="wallet-amount" style={{ color:'var(--blue)' }}>{pointBalance.toLocaleString()} pts</div>
                  <div className="wallet-sub">1 point = R1 value</div>
                </div>
                <div className="metric" style={{ display:'flex', flexDirection:'column', justifyContent:'center' }}>
                  <div className="metric-val blue">{fmtR(pointBalance)}</div>
                  <div className="metric-label">Rand equivalent</div>
                  <div className="metric-sub">Redeemable through Vollard Black</div>
                </div>
              </div>

              <div className="card">
                <div className="section-label" style={{ marginBottom:12 }}>How lifestyle points work</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    ['ti-trophy', 'Hit rank and hold it', 'Points credit on the 1st of each month when you maintain your rank. No rank = no points that month.'],
                    ['ti-sparkles', '1 point = R1', 'Points convert at a fixed 1:1 ratio. Gold rank = R4,000 pts/month. Imperial Diamond = R0 (cash only at that level).'],
                    ['ti-plane', 'Use through Vollard Black', 'Redeem points for travel, accommodation, experiences, and lifestyle purchases through the Vollard Black catalogue.'],
                    ['ti-calendar', 'Points never expire', 'As long as your membership is active, your lifestyle points accumulate indefinitely.'],
                  ].map(([icon, title, desc]) => (
                    <div key={title} style={{ display:'flex', gap:14, padding:'12px 14px', background:'var(--dark)', borderRadius:'var(--r-md)', border:'1px solid var(--border)' }}>
                      <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize:18, color:'var(--blue)', flexShrink:0, marginTop:2 }} />
                      <div>
                        <div style={{ fontWeight:500, fontSize:13, marginBottom:4 }}>{title}</div>
                        <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {currentRank?.bonus > 0 && (
                <div className="card card-blue">
                  <div className="section-label" style={{ marginBottom:8, color:'var(--blue)' }}>Your current earning rate</div>
                  <div style={{ fontFamily:'var(--display)', fontSize:28, color:'var(--blue)', fontWeight:600, marginBottom:4 }}>
                    {fmtR(currentRank.bonus)} pts / month
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>At {currentRank.name} rank · held every month = cumulative</div>
                </div>
              )}
              {!currentRank?.bonus && (
                <div className="card" style={{ borderLeft:'3px solid var(--border)', padding:'16px 20px' }}>
                  <div style={{ fontFamily:'var(--display)', fontSize:18, marginBottom:8 }}>Lifestyle points unlock at Gold rank.</div>
                  <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.8 }}>
                    Gold requires 20 active members on each leg. At Gold you earn R4,000 pts/month — cumulative as long as you hold rank.
                    Keep building your network.
                  </p>
                </div>
              )}

              {/* Point history */}
              {myLifestyle.length > 0 && (
                <div className="card card-flush">
                  <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}><span className="section-label">Point history</span></div>
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Type</th><th>Rank</th><th>Note</th><th style={{ textAlign:'right' }}>Points</th></tr></thead>
                    <tbody>
                      {myLifestyle.map(l => (
                        <tr key={l.id}>
                          <td style={{ color:'var(--dim)', fontSize:12 }}>{fmtD(l.created_at)}</td>
                          <td><span className={`pill pill-${l.entry_type==='rank_bonus'?'blue':l.entry_type==='redemption'?'red':'grey'}`}>{l.entry_type.replace('_',' ')}</span></td>
                          <td style={{ color:'var(--muted)', fontSize:12 }}>{l.rank_name||'—'}</td>
                          <td style={{ color:'var(--muted)', fontSize:12 }}>{l.note}</td>
                          <td style={{ textAlign:'right', fontFamily:'var(--display)', fontSize:18, fontWeight:600, color:l.entry_type==='redemption'?'var(--red)':'var(--blue)' }}>
                            {['redemption','expiry'].includes(l.entry_type)?'-':''}{Number(l.points).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>}

            {/* ── RANKS ── */}
            {tab === 'ranks' && <>
              <div className="card card-gold" style={{ padding:'16px 20px' }}>
                <div style={{ fontFamily:'var(--display)', fontSize:18, color:'var(--gold)', marginBottom:6 }}>Rank is set by your weaker leg.</div>
                <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>
                  9L / 10R = Silver, not Gold. Both legs must independently hit the threshold.
                  Your qualifying leg is <strong style={{ color:'var(--white)', fontWeight:500 }}>{qualLeg}</strong>.
                </p>
              </div>
              <div className="card card-flush">
                <table className="data-table">
                  <thead><tr><th>Rank</th><th>Each leg</th><th>Your L</th><th>Your R</th><th>Pool /month</th><th>Lifestyle pts</th><th>Status</th></tr></thead>
                  <tbody>
                    {RANKS.map(r => {
                      const achieved = qualLeg >= r.left;
                      const isCurrent = r.name === currentRank?.name;
                      return (
                        <tr key={r.name} style={{ background: isCurrent?'rgba(201,168,76,0.05)':undefined }}>
                          <td style={{ fontWeight:500, color: isCurrent?'var(--gold)':achieved?'var(--white)':'var(--dim)' }}>{r.name}</td>
                          <td style={{ color:'var(--muted)' }}>{r.left.toLocaleString()}</td>
                          <td style={{ color:leftCount>=r.left?'var(--green)':'var(--dim)', fontWeight:leftCount>=r.left?500:400 }}>{leftCount}{leftCount>=r.left?' ✓':''}</td>
                          <td style={{ color:rightCount>=r.right?'var(--green)':'var(--dim)', fontWeight:rightCount>=r.right?500:400 }}>{rightCount}{rightCount>=r.right?' ✓':''}</td>
                          <td style={{ color:isCurrent||achieved?'var(--gold)':'var(--dim)', fontWeight:500 }}>R{r.pool.toLocaleString()}</td>
                          <td style={{ color:r.bonus>0?(isCurrent||achieved?'var(--blue)':'var(--dim)'):'var(--dim)' }}>
                            {r.bonus>0?`${r.bonus.toLocaleString()} pts`:'—'}
                          </td>
                          <td>
                            {isCurrent?<span className="pill pill-gold">Current</span>
                              :achieved?<span className="pill pill-green">Achieved</span>
                              :<span className="pill pill-grey">Locked</span>}
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

      {/* Register modal */}
      {registerSlot && (
        <RegisterModal
          parentNodeId={registerSlot.parentNodeId}
          leg={registerSlot.leg}
          onClose={() => setRegisterSlot(null)}
          onSuccess={name => {
            flash(`✓ ${name} registered — pending activation`);
            setRegisterSlot(null);
            load();
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
