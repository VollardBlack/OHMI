'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const RANKS = [
  { name:'Bronze',          left:2,    right:2,    pool:750,     bonus:0 },
  { name:'Silver',          left:5,    right:5,    pool:2000,    bonus:0 },
  { name:'Gold',            left:20,   right:20,   pool:6000,    bonus:4000 },
  { name:'Platinum',        left:50,   right:50,   pool:15000,   bonus:10000 },
  { name:'Emerald',         left:100,  right:100,  pool:30000,   bonus:15000 },
  { name:'Sapphire',        left:200,  right:200,  pool:60000,   bonus:25000 },
  { name:'Diamond',         left:500,  right:500,  pool:150000,  bonus:35000 },
  { name:'Crowned Diamond', left:1000, right:1000, pool:300000,  bonus:100000 },
  { name:'Royal Diamond',   left:2500, right:2500, pool:750000,  bonus:250000 },
  { name:'Imperial Diamond',left:5000, right:5000, pool:1500000, bonus:0 },
];

const TABS = [
  { id:'home',      icon:'ti-layout-dashboard', tip:'Overview' },
  { id:'subscribe', icon:'ti-rotate-clockwise',  tip:'Subscription' },
  { id:'shop',      icon:'ti-shopping-bag',      tip:'Shop' },
  { id:'orders',    icon:'ti-receipt',           tip:'My Orders' },
  { id:'network',   icon:'ti-binary-tree-2',     tip:'Network' },
  { id:'earnings',  icon:'ti-coin',              tip:'Earnings' },
  { id:'lifestyle', icon:'ti-sparkles',          tip:'Lifestyle' },
  { id:'ranks',     icon:'ti-trophy',            tip:'Ranks' },
];

const R = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:0,maximumFractionDigits:0});
const D = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
const MN = n => n ? String(n).padStart(5,'0') : '—';
const nextPayout = () => new Date(new Date().getFullYear(), new Date().getMonth()+1, 15)
  .toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

// ── Tree node ─────────────────────────────────────────────
function TreeNode({ node, map, onOpen, depth=0 }) {
  const [open, setOpen] = useState(depth < 2);
  const kids = map[node.id]||[];
  const L = kids.find(k=>k.leg==='L');
  const R = kids.find(k=>k.leg==='R');
  const hasKids = L||R;
  const active = node.status==='active';
  return (
    <div className="tree-node">
      <div className="tree-card" onClick={()=>hasKids&&setOpen(o=>!o)}
        style={{ borderColor: active?'var(--green)':'var(--red-text)', cursor: hasKids?'pointer':'default' }}>
        <div className="tree-name">{node.name}</div>
        <div className="tree-num">#{MN(node.mn)}</div>
        <div className="tree-status" style={{ color: active?'var(--green)':'var(--red-text)' }}>{node.status}</div>
        <div className="tree-counts">L:{node.lc} · R:{node.rc}</div>
        {hasKids && <div style={{fontSize:9,color:'var(--text-dim)',marginTop:2}}>{open?'▲':'▼'}</div>}
      </div>
      {hasKids && open && (
        <div className="tree-legs">
          {['L','R'].map((leg,i) => {
            const child = i===0?L:R;
            return (
              <div key={leg} className="tree-leg">
                <div className="tree-leg-label">{leg}</div>
                {child
                  ? <TreeNode node={child} map={map} onOpen={onOpen} depth={depth+1}/>
                  : <button className="tree-open" onClick={()=>onOpen&&onOpen(node.id,leg)}>+ Add here</button>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Register Modal ────────────────────────────────────────
function RegisterModal({parentNodeId, leg, onClose, onSuccess}) {
  const [form, setForm] = useState({name:'',email:'',phone:''});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit() {
    if (!form.name||!form.email){setErr('Name and email required');return;}
    setBusy(true);setErr('');
    const {data:ex} = await supabase.from('members').select('id').eq('email',form.email).maybeSingle();
    if(ex){setErr('Email already registered');setBusy(false);return;}
    const newId = crypto.randomUUID();
    const {data:pn} = await supabase.from('network_nodes').select('member_id,depth').eq('id',parentNodeId).single();
    await supabase.from('members').insert({id:newId,full_name:form.name,email:form.email,phone:form.phone,status:'pending',sponsor_id:pn?.member_id});
    await supabase.from('network_nodes').insert({member_id:newId,parent_id:parentNodeId,leg,depth:(pn?.depth||0)+1});
    await supabase.from('activations').insert({member_id:newId,amount:2500,status:'pending'});
    setBusy(false);onSuccess(form.name);
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(74,10,20,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:16}}>
      <div className="card" style={{width:'100%',maxWidth:400}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <span style={{fontFamily:'var(--display)',fontSize:22,color:'var(--maroon)',fontWeight:600}}>Register member</span>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,color:'var(--text-muted)',lineHeight:1}}>×</button>
        </div>
        <div style={{padding:'8px 12px',background:'var(--gold-bg)',borderRadius:'var(--r-xs)',border:'1px solid var(--gold-border)',fontSize:12,color:'var(--gold-dk)',marginBottom:16}}>
          Placing in <strong>{leg==='L'?'left':'right'} leg</strong>
        </div>
        {err&&<div style={{padding:'8px 12px',background:'var(--red-bg)',borderRadius:'var(--r-xs)',fontSize:12,color:'var(--red-text)',marginBottom:12}}>{err}</div>}
        <div className="field"><label className="field-label">Full name *</label><input className="field-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="First and last name"/></div>
        <div className="field"><label className="field-label">Email *</label><input className="field-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="their@email.com"/></div>
        <div className="field"><label className="field-label">Phone</label><input className="field-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+27 000 000 0000"/></div>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-maroon" style={{flex:1}} disabled={busy} onClick={submit}>{busy?'Registering…':'Register member'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
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
  const [registerSlot, setRegisterSlot] = useState(null);
  const [treeScale, setTreeScale] = useState(1);

  const flash = m => {setToast(m);setTimeout(()=>setToast(''),3000);};

  async function load() {
    const [m,n,l,s,a,p,po,ll] = await Promise.all([
      supabase.from('members').select('*').order('member_number'),
      supabase.from('network_nodes').select('*'),
      supabase.from('commission_ledger').select('*').order('created_at',{ascending:false}),
      supabase.from('subscriptions').select('*'),
      supabase.from('activations').select('*'),
      supabase.from('packages').select('*').eq('active',true).order('sort_order'),
      supabase.from('package_orders').select('*').order('created_at',{ascending:false}),
      supabase.from('lifestyle_ledger').select('*').order('created_at',{ascending:false}),
    ]);
    setMembers(m.data||[]);setNodes(n.data||[]);setLedger(l.data||[]);
    setPackages(p.data||[]);setPkgOrders(po.data||[]);setLifestyle(ll.data||[]);
    const root=(m.data||[]).find(x=>x.email==='brandon@ohmicoffee.co.za')||(m.data||[])[0];
    setMe(root||null);
    setSub((s.data||[]).find(x=>x.member_id===root?.id)||null);
    setActivation((a.data||[]).find(x=>x.member_id===root?.id)||null);
  }
  useEffect(()=>{load();},[]);

  const treeMap = useMemo(()=>{
    const map={};
    nodes.forEach(n=>{
      if(n.parent_id){
        const m=members.find(x=>x.id===n.member_id);
        (map[n.parent_id]=map[n.parent_id]||[]).push({...n,name:m?.full_name?.split(' ')[0]||'?',mn:m?.member_number,status:m?.status||'pending',lc:n.left_count,rc:n.right_count});
      }
    });
    return map;
  },[nodes,members]);

  const myNode=nodes.find(n=>me&&n.member_id===me.id);
  const L=myNode?.left_count||0, Rcount=myNode?.right_count||0;
  const qual=Math.min(L,Rcount);
  const currentRank=RANKS.filter(r=>r.left<=qual).pop();
  const nextRank=RANKS.find(r=>r.left>qual);
  const rootNode=myNode?{...myNode,name:me?.full_name?.split(' ')[0]||'You',mn:me?.member_number,status:me?.status,lc:L,rc:Rcount}:null;

  const myLedger=ledger.filter(l=>me&&l.member_id===me.id);
  const earned=myLedger.filter(l=>['pool_share','signup_commission'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.amount),0);
  const paidOut=myLedger.filter(l=>l.entry_type==='payout').reduce((s,l)=>s+Number(l.amount),0);
  const balance=earned-paidOut;

  const myLife=lifestyle.filter(l=>me&&l.member_id===me.id);
  const ptBalance=myLife.filter(l=>['rank_bonus','adjustment'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.points),0)
    -myLife.filter(l=>['redemption','expiry'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.points),0);

  const cartItems=packages.filter(p=>cart[p.id]>0).map(p=>({...p,qty:cart[p.id]}));
  const cartTotal=cartItems.reduce((s,i)=>s+Number(i.price)*i.qty,0);
  const cartPool=cartItems.reduce((s,i)=>s+Number(i.pool_contribution)*i.qty,0);
  const cartQty=cartItems.reduce((s,i)=>s+i.qty,0);
  const addCart=(id,d)=>setCart(c=>({...c,[id]:Math.max(0,(c[id]||0)+d)}));
  const myOrders=pkgOrders.filter(o=>me&&o.member_id===me.id);
  const refLink=me&&typeof window!=='undefined'?`${window.location.origin}/join?ref=${me.id}`:'';

  async function placeOrder(){
    if(!me||!cartItems.length)return;
    setBusy('order');
    const period=new Date().toISOString().slice(0,7)+'-01';
    await supabase.from('package_orders').insert(cartItems.map(i=>({member_id:me.id,package_id:i.id,quantity:i.qty,total:Number(i.price)*i.qty,pool_contribution:Number(i.pool_contribution)*i.qty,status:'pending',billing_period:period})));
    setCart({});setBusy('');setCheckoutStep('done');
    const {data}=await supabase.from('package_orders').select('*').order('created_at',{ascending:false});
    setPkgOrders(data||[]);
  }

  const go=t=>{setTab(t);if(t==='shop'||t==='subscribe')setCheckoutStep('browse');};

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>

      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <span className="mobile-topbar-logo">OHMI.</span>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className="topbar-badge topbar-badge-gold" style={{fontSize:9}}>{currentRank?.name||'Unranked'}</span>
          <div className="rail-avatar" style={{width:30,height:30,fontSize:12}}>{me?.full_name?.[0]||'?'}</div>
        </div>
      </div>

      <div className="app-shell">
        {/* Rail */}
        <aside className="rail">
          <div className="rail-logo">O</div>
          <nav className="rail-nav">
            {TABS.map(t=>(
              <button key={t.id} className={`rail-item${tab===t.id?' on':''}`} data-tip={t.tip} onClick={()=>go(t.id)} aria-label={t.tip}>
                <i className={`ti ${t.icon}`} aria-hidden="true"/>
                {t.id==='shop'&&cartQty>0&&<span className="badge">{cartQty}</span>}
              </button>
            ))}
          </nav>
          <div className="rail-divider"/>
          <div className="rail-bottom">
            <Link href="/admin"><button className="rail-item" data-tip="Admin" aria-label="Admin"><i className="ti ti-settings" aria-hidden="true"/></button></Link>
            <div className="rail-avatar">{me?.full_name?.[0]||'?'}</div>
          </div>
        </aside>

        {/* Main */}
        <div className="app-main">
          <div className="app-topbar">
            <span className="app-topbar-title">{TABS.find(t=>t.id===tab)?.tip}</span>
            <span className="app-topbar-sub">· {me?.full_name} #{MN(me?.member_number)}</span>
            <div className="app-topbar-right">
              <span className="topbar-badge topbar-badge-gold">{currentRank?.name||'Unranked'}</span>
              <span className={`topbar-badge ${me?.status==='active'?'topbar-badge-green':'topbar-badge-maroon'}`}>{me?.status||'pending'}</span>
            </div>
          </div>

          <div className="app-content">

            {/* ── HOME ── */}
            {tab==='home'&&<>
              {/* Earnings wallet — DreamTrips card style */}
              <div className="dt-card">
                <div className="dt-card-header">
                  <div className="dt-card-header-label">Earnings wallet</div>
                  <div className="dt-card-header-value">{R(balance)}</div>
                  <div className="dt-card-header-sub">Auto-pays on 15 {new Date(Date.now()+30*86400000).toLocaleString('en-ZA',{month:'long'})}</div>
                </div>
                <div className="dt-card-body">
                  <div className="wallet-date">
                    <i className="ti ti-calendar" aria-hidden="true" style={{fontSize:13}}/>
                    Next payout: {nextPayout()}
                  </div>
                </div>
              </div>

              {/* Lifestyle wallet */}
              <div className="dt-card">
                <div className="dt-card-header" style={{background:'var(--maroon)',backgroundImage:'linear-gradient(135deg, rgba(201,148,58,0.15) 0%, transparent 60%)'}}>
                  <div className="dt-card-header-label">Lifestyle wallet</div>
                  <div className="dt-card-header-value">{ptBalance.toLocaleString()} pts</div>
                  <div className="dt-card-header-sub">
                    {currentRank?.bonus>0?`${R(currentRank.bonus)} pts/month at ${currentRank.name}`:'Unlocks with rank discretionary bonus'}
                  </div>
                </div>
                {!currentRank?.bonus&&(
                  <div className="dt-card-body" style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.7}}>
                    Hit <strong style={{color:'var(--maroon)'}}>Gold rank</strong> to unlock {R(4000)} pts/month — redeemable through Vollard Black for travel &amp; lifestyle.
                  </div>
                )}
              </div>

              {/* Stats row — DreamTrips style */}
              <div className="card card-flush">
                <div className="stat-row">
                  <div className="stat-item">
                    <div className="stat-num">{members.length-1}</div>
                    <div className="stat-label">Members</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-num gold">{L}</div>
                    <div className="stat-label">Left leg</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-num gold">{Rcount}</div>
                    <div className="stat-label">Right leg</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-num gold">{R(earned)}</div>
                    <div className="stat-label">Earned</div>
                  </div>
                </div>
              </div>

              {/* Rank progress */}
              {nextRank&&(
                <div className="card">
                  <div className="section-header">
                    <span className="section-label">Rank progress</span>
                    <span style={{fontSize:12,color:'var(--text-muted)'}}>
                      {currentRank?.name||'Unranked'} → <strong style={{color:'var(--maroon)'}}>{nextRank.name}</strong>
                    </span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
                    {[['Left leg',L,nextRank.left],['Right leg',Rcount,nextRank.right]].map(([label,cur,need])=>(
                      <div key={label} style={{padding:'14px 16px',background:'var(--off-white)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
                          <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>{label}</span>
                          <span style={{fontFamily:'var(--display)',fontSize:20,fontWeight:600,color:cur>=need?'var(--green)':'var(--maroon)'}}>
                            {cur}<span style={{fontSize:13,color:'var(--text-dim)',fontWeight:400}}>/{need}</span>
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className={`progress-fill ${cur>=need?'pf-green':'pf-gold'}`} style={{width:`${Math.min(100,(cur/need)*100)}%`}}/>
                        </div>
                        <div style={{fontSize:11,color:'var(--text-dim)',marginTop:6}}>
                          {cur>=need?'✓ Met':`${need-cur} more needed`}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,padding:'10px 14px',background:'var(--maroon-bg)',borderRadius:'var(--r-xs)',border:'1px solid var(--maroon-border)',fontSize:12,color:'var(--text-sub)',lineHeight:1.6}}>
                    <strong style={{color:'var(--maroon)',fontWeight:600}}>Both legs must qualify.</strong>{' '}
                    Rank is set by your weaker leg. {nextRank.name} unlocks{' '}
                    <strong style={{color:'var(--gold-dk)'}}>{R(nextRank.pool)}/month</strong>
                    {nextRank.bonus>0&&<> + <strong style={{color:'var(--blue)'}}>{R(nextRank.bonus)} lifestyle pts/month</strong></>}.
                  </div>
                </div>
              )}

              {/* Referral */}
              <div className="card">
                <div className="section-header"><span className="section-label">Your referral link</span></div>
                <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--r-xs)',padding:'10px 14px',fontSize:12,color:'var(--text-sub)',wordBreak:'break-all',marginBottom:12}}>
                  {refLink||'Loading…'}
                </div>
                <div style={{display:'flex',gap:8,marginBottom:14}}>
                  <button className="btn btn-maroon btn-sm" onClick={()=>{navigator.clipboard?.writeText(refLink);flash('Link copied');}}>Copy link</button>
                  <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join OHMI Coffee Co.\n'+refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                </div>
                <div style={{padding:'10px 14px',background:'var(--gold-bg)',borderRadius:'var(--r-xs)',border:'1px solid var(--gold-border)',fontSize:12,color:'var(--text-sub)',lineHeight:1.6}}>
                  <i className="ti ti-coins" aria-hidden="true" style={{marginRight:6,color:'var(--gold)'}}/>
                  You earn <strong style={{color:'var(--gold-dk)'}}>R500</strong> sign-up commission every time someone activates through your link.
                </div>
              </div>
            </>}

            {/* ── SUBSCRIPTION ── */}
            {tab==='subscribe'&&(
              <div style={{maxWidth:560}}>
                <div className="dt-card" style={{marginBottom:14}}>
                  <div className="dt-card-header">
                    <div className="dt-card-header-label">Monthly subscription</div>
                    <div className="dt-card-header-value">{R(sub?.amount||1500)}<span style={{fontFamily:'var(--font)',fontSize:14,fontWeight:400,color:'rgba(242,232,213,0.5)',marginLeft:4}}>/month</span></div>
                    <div className="dt-card-header-sub">1kg Uganda Bugisu AA · Builder Pack</div>
                  </div>
                  <div className="dt-card-body">
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:16}}>
                      {[['Pool contribution',R(sub?.pool_contribution||500)],['OHMI retention',R((sub?.amount||1500)-(sub?.pool_contribution||500))],['Status',sub?.status||'inactive']].map(([l,v])=>(
                        <div key={l} style={{padding:'12px 14px',background:'var(--off-white)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)'}}>
                          <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:5}}>{l}</div>
                          <div style={{fontFamily:'var(--display)',fontSize:18,fontWeight:600,color:'var(--maroon)'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:'12px 14px',background:'var(--off-white)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)',fontSize:12,color:'var(--text-sub)',lineHeight:1.8}}>
                      <strong style={{color:'var(--text-h)',display:'block',marginBottom:6}}>How your R1,500 splits</strong>
                      R500 → binary commission pool (30% distributed to ranked reps)<br/>
                      R1,000 → coffee product, roasting, packaging, OHMI operations
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="section-label" style={{marginBottom:10}}>Payout schedule</div>
                  <p style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.8,marginBottom:12}}>
                    Pool earnings are calculated on the 1st and paid to your registered bank account by the <strong style={{color:'var(--maroon)'}}>15th of the following month</strong> — automatically, no request needed.
                  </p>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--gold-bg)',borderRadius:'var(--r-xs)',border:'1px solid var(--gold-border)',fontSize:12,color:'var(--gold-dk)',fontWeight:500}}>
                    <i className="ti ti-calendar" aria-hidden="true"/>
                    Next payout: {nextPayout()}
                  </div>
                </div>
              </div>
            )}

            {/* ── SHOP ── */}
            {tab==='shop'&&<>
              {checkoutStep==='browse'&&<>
                <div>
                  <div className="kicker" style={{marginBottom:4}}>Uganda Bugisu AA · Wiara Coffee</div>
                  <p style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.7,maxWidth:'58ch',marginBottom:16}}>
                    Additional coffee and products beyond your monthly subscription. Each purchase feeds the pool.
                  </p>
                </div>
                <div className="pkg-grid">
                  {packages.map(pkg=>{
                    const qty=cart[pkg.id]||0;
                    const includes=Array.isArray(pkg.includes)?pkg.includes:JSON.parse(pkg.includes||'[]');
                    return (
                      <div key={pkg.id} className={`pkg-card${qty>0?' selected':''}`}>
                        <div className="pkg-header">
                          <div className="pkg-size">{pkg.coffee_kg<1?`${pkg.coffee_kg*1000}g`:`${pkg.coffee_kg}kg`}</div>
                          <div className="pkg-origin">Uganda Bugisu AA</div>
                          {pkg.badge&&<div className="pkg-badge-wrap"><span className="pkg-badge">{pkg.badge}</span></div>}
                        </div>
                        <div className="pkg-body">
                          <div className="pkg-name">{pkg.name}</div>
                          <div className="pkg-tag">{pkg.tagline}</div>
                          <div className="pkg-includes">
                            {includes.slice(0,3).map((item,i)=>(
                              <div key={i} className="pkg-include-row">
                                <span className="pkg-include-tick">✓</span>
                                <span className="pkg-include-text">{item}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pkg-pool">
                            <span className="pkg-pool-label">Pool contribution</span>
                            <span className="pkg-pool-val">{R(pkg.pool_contribution)}</span>
                          </div>
                          <div className="pkg-footer">
                            <span className="pkg-price">{R(pkg.price)}</span>
                            {qty>0?(
                              <div className="pkg-qty">
                                <button className="qty-btn" onClick={()=>addCart(pkg.id,-1)}>−</button>
                                <span className="qty-num">{qty}</span>
                                <button className="qty-btn" onClick={()=>addCart(pkg.id,1)}>+</button>
                              </div>
                            ):(
                              <button className="btn btn-maroon btn-xs" onClick={()=>addCart(pkg.id,1)}>Add</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {cartItems.length>0&&(
                  <div className="cart-bar">
                    <div className="cart-stat"><span className="cart-stat-label">Total</span><span className="cart-stat-val">{R(cartTotal)}</span></div>
                    <div className="cart-divider"/>
                    <div className="cart-stat"><span className="cart-stat-label">Pool</span><span className="cart-stat-val">{R(cartPool)}</span></div>
                    <div className="cart-divider"/>
                    <div className="cart-stat"><span className="cart-stat-label">Items</span><span className="cart-stat-val">{cartQty}</span></div>
                    <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--cream)',borderColor:'rgba(255,255,255,0.2)'}} onClick={()=>setCart({})}>Clear</button>
                      <button className="btn btn-gold" onClick={()=>setCheckoutStep('cart')}>Review →</button>
                    </div>
                  </div>
                )}
              </>}
              {checkoutStep==='cart'&&(
                <div style={{maxWidth:520}}>
                  <div className="section-label" style={{marginBottom:14}}>Review order</div>
                  <div className="card" style={{marginBottom:12}}>
                    {cartItems.map(i=>(
                      <div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:13,color:'var(--text-h)'}}>{i.name} · {i.coffee_kg<1?`${i.coffee_kg*1000}g`:`${i.coffee_kg}kg`} × {i.qty}</div>
                          <div style={{fontSize:11,color:'var(--text-dim)',marginTop:2}}>Pool {R(Number(i.pool_contribution)*i.qty)}</div>
                        </div>
                        <span style={{fontFamily:'var(--display)',fontSize:20,color:'var(--maroon)',fontWeight:600}}>{R(Number(i.price)*i.qty)}</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 0',fontFamily:'var(--display)',fontSize:24,fontWeight:600,color:'var(--text-h)'}}>
                      <span>Total</span><span style={{color:'var(--maroon)'}}>{R(cartTotal)}</span>
                    </div>
                  </div>
                  <div className="card" style={{marginBottom:12,fontSize:12,color:'var(--text-sub)',lineHeight:1.8}}>
                    <strong style={{color:'var(--text-h)',display:'block',marginBottom:8}}>EFT payment details</strong>
                    Bank: FNB · OHMI Coffee Co. (Pty) Ltd<br/>
                    Amount: <strong style={{color:'var(--maroon)'}}>{R(cartTotal)}</strong><br/>
                    Reference: <strong style={{color:'var(--maroon)'}}>{me?.id?.slice(0,8)?.toUpperCase()}-SHOP</strong>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button className="btn btn-ghost" onClick={()=>setCheckoutStep('browse')}>← Back</button>
                    <button className="btn btn-maroon" style={{flex:1}} disabled={busy==='order'} onClick={placeOrder}>{busy==='order'?'Placing…':'Confirm order'}</button>
                  </div>
                </div>
              )}
              {checkoutStep==='done'&&(
                <div style={{maxWidth:440}}>
                  <div className="dt-card">
                    <div className="dt-card-header" style={{textAlign:'center',padding:'28px 24px 20px'}}>
                      <div style={{fontSize:36,marginBottom:12}}>☕</div>
                      <div className="dt-card-header-label">Order placed</div>
                      <div style={{fontFamily:'var(--display)',fontSize:26,color:'var(--gold-lt)',fontWeight:600,margin:'8px 0'}}>We roast on Tuesdays.</div>
                    </div>
                    <div className="dt-card-body" style={{textAlign:'center'}}>
                      <p style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.8,marginBottom:16}}>
                        Reference: <strong style={{color:'var(--maroon)'}}>{me?.id?.slice(0,8)?.toUpperCase()}-SHOP</strong>
                      </p>
                      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>go('orders')}>View orders</button>
                        <button className="btn btn-maroon btn-sm" onClick={()=>setCheckoutStep('browse')}>Order more</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>}

            {/* ── MY ORDERS ── */}
            {tab==='orders'&&(
              <div className="card card-flush">
                <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',background:'var(--off-white)'}}><span className="section-label">Order history</span></div>
                <table className="data-table">
                  <thead><tr><th>Package</th><th>Qty</th><th>Total</th><th>Pool</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {myOrders.length?myOrders.map(o=>{const pkg=packages.find(p=>p.id===o.package_id);return(
                      <tr key={o.id}>
                        <td style={{fontWeight:600}}>{pkg?.name||'—'}</td>
                        <td style={{color:'var(--text-muted)'}}>{o.quantity}</td>
                        <td style={{color:'var(--maroon)',fontWeight:600}}>{R(o.total)}</td>
                        <td style={{color:'var(--text-muted)'}}>{R(o.pool_contribution)}</td>
                        <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'gold':'red'}`}>{o.status}</span></td>
                        <td style={{color:'var(--text-dim)',fontSize:12}}>{D(o.created_at)}</td>
                      </tr>
                    );}): <tr><td colSpan="6" style={{color:'var(--text-dim)',textAlign:'center',padding:28}}>No orders yet — <button style={{background:'none',border:'none',color:'var(--maroon)',cursor:'pointer',fontWeight:600}} onClick={()=>go('shop')}>browse shop</button></td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── NETWORK ── */}
            {tab==='network'&&<>
              <div className="card card-flush">
                <div className="stat-row">
                  <div className="stat-item"><div className="stat-num gold">{L}</div><div className="stat-label">Left leg</div></div>
                  <div className="stat-item"><div className="stat-num gold">{Rcount}</div><div className="stat-label">Right leg</div></div>
                  <div className="stat-item"><div className="stat-num">{members.length-1}</div><div className="stat-label">Downline</div></div>
                  <div className="stat-item"><div className="stat-num">{Math.max(0,...nodes.map(n=>n.depth||0))}</div><div className="stat-label">Max depth</div></div>
                </div>
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--off-white)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className="section-label">Binary tree</span>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setTreeScale(s=>Math.max(0.4,s-0.15))}>−</button>
                    <span style={{fontSize:11,color:'var(--text-muted)',minWidth:32,textAlign:'center'}}>{Math.round(treeScale*100)}%</span>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setTreeScale(s=>Math.min(1.6,s+0.15))}>+</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setTreeScale(1)}>Reset</button>
                  </div>
                </div>
                <div style={{overflow:'auto',padding:24,background:'var(--off-white)'}}>
                  <div style={{transform:`scale(${treeScale})`,transformOrigin:'top center',transition:'transform 0.2s',paddingBottom:treeScale<1?`${(1-treeScale)*120}%`:0}}>
                    {rootNode?<TreeNode node={rootNode} map={treeMap} onOpen={(pid,leg)=>setRegisterSlot({parentNodeId:pid,leg})}/>:<p style={{color:'var(--text-dim)'}}>Loading…</p>}
                  </div>
                </div>
                <div style={{padding:'10px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:16,fontSize:11,color:'var(--text-muted)',background:'var(--off-white)'}}>
                  <span><span style={{color:'var(--green)',marginRight:4}}>■</span>Active</span>
                  <span><span style={{color:'var(--red-text)',marginRight:4}}>■</span>Inactive</span>
                  <span style={{color:'var(--gold-dk)',marginLeft:'auto'}}>Click open slots to register</span>
                </div>
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--off-white)'}}><span className="section-label">Members</span></div>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {members.filter(m=>m.id!==me?.id).map(m=>(
                      <tr key={m.id}>
                        <td style={{color:'var(--text-dim)',fontSize:11,fontWeight:600}}>{MN(m.member_number)}</td>
                        <td style={{fontWeight:600}}>{m.full_name}</td>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{m.email}</td>
                        <td><span className={`pill pill-${m.status==='active'?'green':m.status==='pending'?'gold':'red'}`}>{m.status}</span></td>
                        <td style={{color:'var(--text-dim)',fontSize:12}}>{D(m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── EARNINGS ── */}
            {tab==='earnings'&&<>
              <div className="card card-flush">
                <div className="stat-row">
                  <div className="stat-item"><div className="stat-num gold">{R(earned)}</div><div className="stat-label">Total earned</div></div>
                  <div className="stat-item"><div className="stat-num">{R(paidOut)}</div><div className="stat-label">Paid out</div></div>
                  <div className="stat-item"><div className="stat-num gold">{R(balance)}</div><div className="stat-label">Available</div></div>
                  <div className="stat-item"><div className="stat-num">15th</div><div className="stat-label">Auto-payout</div></div>
                </div>
              </div>
              <div className="card" style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.8}}>
                <strong style={{color:'var(--text-h)',fontWeight:600}}>Automatic monthly payout. </strong>
                Your balance is paid to your registered bank account by the <strong style={{color:'var(--maroon)'}}>15th of the following month</strong>.
                Pool earnings only credit when you hold rank. Sign-up commissions (R500) credit on activation approval.
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--off-white)'}}><span className="section-label">Commission ledger</span></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Note</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                  <tbody>
                    {myLedger.filter(l=>l.entry_type!=='foundation').length?myLedger.filter(l=>l.entry_type!=='foundation').map(l=>(
                      <tr key={l.id}>
                        <td style={{color:'var(--text-dim)',fontSize:12}}>{D(l.created_at)}</td>
                        <td><span className={`pill pill-${l.entry_type==='payout'?'red':l.entry_type==='signup_commission'?'green':'gold'}`}>{l.entry_type==='signup_commission'?'sign-up commission':l.entry_type.replace('_',' ')}</span></td>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{l.note}</td>
                        <td style={{textAlign:'right',fontFamily:'var(--display)',fontSize:20,fontWeight:600,color:l.entry_type==='payout'?'var(--red-text)':'var(--maroon)'}}>{R(l.amount)}</td>
                      </tr>
                    )):<tr><td colSpan="4" style={{color:'var(--text-dim)',textAlign:'center',padding:24}}>Earnings appear after billing runs and sign-up commissions.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── LIFESTYLE ── */}
            {tab==='lifestyle'&&<>
              <div className="dt-card">
                <div className="dt-card-header" style={{backgroundImage:'linear-gradient(135deg,rgba(201,148,58,0.18) 0%,transparent 60%)'}}>
                  <div className="dt-card-header-label">Lifestyle wallet · Vollard Black</div>
                  <div className="dt-card-header-value">{ptBalance.toLocaleString()} pts</div>
                  <div className="dt-card-header-sub">1 point = R1 value · redeemable through Vollard Black</div>
                </div>
              </div>
              <div className="card">
                <div className="section-label" style={{marginBottom:14}}>How it works</div>
                {[
                  ['ti-trophy','Hold rank every month','Points credit on the 1st of each month when you maintain your rank. No rank = no points that month.'],
                  ['ti-sparkles','1 point = R1','Gold = R4,000 pts/month. Points accumulate indefinitely while your membership is active.'],
                  ['ti-plane','Vollard Black catalogue','Redeem for travel, accommodation, experiences, and lifestyle purchases through Vollard Black.'],
                ].map(([icon,title,desc])=>(
                  <div key={title} style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                    <i className={`ti ${icon}`} aria-hidden="true" style={{fontSize:20,color:'var(--gold)',flexShrink:0,marginTop:2}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:'var(--text-h)',marginBottom:4}}>{title}</div>
                      <div style={{fontSize:12,color:'var(--text-sub)',lineHeight:1.7}}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              {currentRank?.bonus>0&&(
                <div className="dt-card">
                  <div className="dt-card-header">
                    <div className="dt-card-header-label">Current earning rate · {currentRank.name}</div>
                    <div className="dt-card-header-value">{R(currentRank.bonus)} pts/month</div>
                    <div className="dt-card-header-sub">Held every month = cumulative</div>
                  </div>
                </div>
              )}
              {myLife.length>0&&(
                <div className="card card-flush">
                  <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--off-white)'}}><span className="section-label">Point history</span></div>
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Type</th><th>Rank</th><th style={{textAlign:'right'}}>Points</th></tr></thead>
                    <tbody>
                      {myLife.map(l=>(
                        <tr key={l.id}>
                          <td style={{color:'var(--text-dim)',fontSize:12}}>{D(l.created_at)}</td>
                          <td><span className={`pill pill-${l.entry_type==='rank_bonus'?'gold':l.entry_type==='redemption'?'red':'grey'}`}>{l.entry_type.replace('_',' ')}</span></td>
                          <td style={{color:'var(--text-muted)',fontSize:12}}>{l.rank_name||'—'}</td>
                          <td style={{textAlign:'right',fontFamily:'var(--display)',fontSize:20,fontWeight:600,color:l.entry_type==='redemption'?'var(--red-text)':'var(--gold-dk)'}}>{['redemption','expiry'].includes(l.entry_type)?'-':''}{Number(l.points).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>}

            {/* ── RANKS ── */}
            {tab==='ranks'&&<>
              <div className="dt-card">
                <div className="dt-card-header">
                  <div className="dt-card-header-label">Your qualifying leg</div>
                  <div className="dt-card-header-value">{qual}</div>
                  <div className="dt-card-header-sub">Both legs must independently hit the threshold · current rank: {currentRank?.name||'Unranked'}</div>
                </div>
              </div>
              <div className="card card-flush">
                <table className="data-table">
                  <thead><tr><th>Rank</th><th>Each leg</th><th>Your L</th><th>Your R</th><th>Pool /month</th><th>Lifestyle pts</th><th>Status</th></tr></thead>
                  <tbody>
                    {RANKS.map(r=>{
                      const achieved=qual>=r.left;
                      const isCurrent=r.name===currentRank?.name;
                      return (
                        <tr key={r.name} style={{background:isCurrent?'var(--maroon-bg)':undefined}}>
                          <td style={{fontWeight:600,color:isCurrent?'var(--maroon)':achieved?'var(--text-h)':'var(--text-dim)'}}>{r.name}</td>
                          <td style={{color:'var(--text-muted)'}}>{r.left.toLocaleString()}</td>
                          <td style={{color:L>=r.left?'var(--green)':'var(--text-dim)',fontWeight:L>=r.left?600:400}}>{L}{L>=r.left?' ✓':''}</td>
                          <td style={{color:Rcount>=r.right?'var(--green)':'var(--text-dim)',fontWeight:Rcount>=r.right?600:400}}>{Rcount}{Rcount>=r.right?' ✓':''}</td>
                          <td style={{color:isCurrent||achieved?'var(--gold-dk)':'var(--text-dim)',fontWeight:500}}>R{r.pool.toLocaleString()}</td>
                          <td style={{color:r.bonus>0?(isCurrent||achieved?'var(--blue)':'var(--text-dim)'):'var(--text-dim)'}}>{r.bonus>0?`${r.bonus.toLocaleString()} pts`:'—'}</td>
                          <td>{isCurrent?<span className="pill pill-maroon">Current</span>:achieved?<span className="pill pill-green">Achieved</span>:<span className="pill pill-grey">Locked</span>}</td>
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

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {[{id:'home',icon:'ti-layout-dashboard',label:'Home'},{id:'network',icon:'ti-binary-tree-2',label:'Network'},{id:'shop',icon:'ti-shopping-bag',label:'Shop'},{id:'earnings',icon:'ti-coin',label:'Earnings'},{id:'lifestyle',icon:'ti-sparkles',label:'Lifestyle'}].map(t=>(
            <button key={t.id} className={`mobile-nav-item${tab===t.id?' on':''}`} onClick={()=>go(t.id)} aria-label={t.label}>
              <i className={`ti ${t.icon}`} aria-hidden="true"/>
              <span>{t.label}</span>
              {t.id==='shop'&&cartQty>0&&<span className="m-badge">{cartQty}</span>}
            </button>
          ))}
          <button className="mobile-nav-item" onClick={()=>go(tab==='ranks'?'home':'ranks')} aria-label="More">
            <i className="ti ti-dots" aria-hidden="true"/>
            <span>More</span>
          </button>
        </div>
      </nav>

      {registerSlot&&<RegisterModal parentNodeId={registerSlot.parentNodeId} leg={registerSlot.leg} onClose={()=>setRegisterSlot(null)} onSuccess={name=>{flash(`✓ ${name} registered`);setRegisterSlot(null);load();}}/>}
      {toast&&<div className="toast">{toast}</div>}
    </>
  );
}
