'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BinaryTree from '@/app/components/BinaryTree';

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

const NAV = [
  { section: 'Main' },
  { id:'home',      icon:'ti-layout-dashboard', label:'Overview' },
  { id:'network',   icon:'ti-binary-tree-2',    label:'Network' },
  { id:'earnings',  icon:'ti-coin',             label:'Earnings' },
  { id:'lifestyle', icon:'ti-sparkles',         label:'Lifestyle' },
  { section: 'Coffee' },
  { id:'subscribe', icon:'ti-rotate-clockwise', label:'Subscription' },
  { id:'shop',      icon:'ti-shopping-bag',     label:'Shop' },
  { id:'orders',    icon:'ti-receipt',          label:'My Orders' },
  { section: 'More' },
  { id:'ranks',     icon:'ti-trophy',           label:'Rank Journey' },
  { href:'/travel', icon:'ti-plane',            label:'Travel' },
  { href:'/admin',  icon:'ti-settings',         label:'Admin Panel' },
];

const MOBILE_NAV = [
  { id:'home',      icon:'ti-layout-dashboard', label:'Home' },
  { id:'network',   icon:'ti-binary-tree-2',    label:'Network' },
  { id:'shop',      icon:'ti-shopping-bag',     label:'Shop' },
  { id:'earnings',  icon:'ti-coin',             label:'Earnings' },
  { href:'/travel', icon:'ti-plane',            label:'Travel' },
  { href:'/admin',  icon:'ti-settings',         label:'Admin' },
];

const Rz = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:0,maximumFractionDigits:0});
const Dz = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
const MN = n => n ? String(n).padStart(5,'0') : '—';
const nextPayout = () => new Date(new Date().getFullYear(),new Date().getMonth()+1,15)
  .toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});



function RegisterModal({parentNodeId, leg, onClose, onSuccess}) {
  const [form,setForm] = useState({name:'',email:'',phone:''});
  const [busy,setBusy] = useState(false);
  const [err,setErr] = useState('');
  async function submit() {
    if(!form.name||!form.email){setErr('Name and email required');return;}
    setBusy(true);setErr('');
    const {data:ex}=await supabase.from('members').select('id').eq('email',form.email).maybeSingle();
    if(ex){setErr('Email already registered');setBusy(false);return;}
    const newId=crypto.randomUUID();
    const {data:pn}=await supabase.from('network_nodes').select('member_id,depth').eq('id',parentNodeId).single();
    await supabase.from('members').insert({id:newId,full_name:form.name,email:form.email,phone:form.phone,status:'pending',sponsor_id:pn?.member_id});
    await supabase.from('network_nodes').insert({member_id:newId,parent_id:parentNodeId,leg,depth:(pn?.depth||0)+1});
    await supabase.from('activations').insert({member_id:newId,amount:2500,status:'pending'});
    setBusy(false);onSuccess(form.name);
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:16,backdropFilter:'blur(4px)'}}>
      <div className="card" style={{width:'100%',maxWidth:400,boxShadow:'var(--shadow-xl)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <span style={{fontSize:16,fontWeight:700,color:'var(--text-h)'}}>Register member</span>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,color:'var(--text-muted)',lineHeight:1,cursor:'pointer'}}>×</button>
        </div>
        <div style={{padding:'8px 12px',background:'var(--primary-bg)',borderRadius:'var(--r-xs)',border:'1px solid var(--primary-border)',fontSize:12,color:'var(--primary)',marginBottom:14,fontWeight:500}}>
          Placing in {leg==='L'?'left':'right'} leg
        </div>
        {err&&<div style={{padding:'8px 12px',background:'var(--red-bg)',borderRadius:'var(--r-xs)',fontSize:12,color:'var(--red-text)',marginBottom:12}}>{err}</div>}
        <div className="field"><label className="field-label">Full name *</label><input className="field-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="First and last name"/></div>
        <div className="field"><label className="field-label">Email *</label><input className="field-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="their@email.com"/></div>
        <div className="field"><label className="field-label">Phone</label><input className="field-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+27 000 000 0000"/></div>
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{flex:1}} disabled={busy} onClick={submit}>{busy?'Registering…':'Register member'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tab,setTab] = useState('home');
  const [me,setMe] = useState(null);
  const [members,setMembers] = useState([]);
  const [nodes,setNodes] = useState([]);
  const [ledger,setLedger] = useState([]);
  const [lifestyle,setLifestyle] = useState([]);
  const [sub,setSub] = useState(null);
  const [packages,setPackages] = useState([]);
  const [pkgOrders,setPkgOrders] = useState([]);
  const [shopProducts,setShopProducts] = useState([]);
  const [cart,setCart] = useState({});
  const [checkoutStep,setCheckoutStep] = useState('browse');
  const [busy,setBusy] = useState('');
  const [toast,setToast] = useState('');
  const [registerSlot,setRegisterSlot] = useState(null);

  const flash = m=>{setToast(m);setTimeout(()=>setToast(''),3000);};

  async function load() {
    const [m,n,l,s,p,po,ll,pr]=await Promise.all([
      supabase.from('members').select('*').order('member_number'),
      supabase.from('network_nodes').select('*'),
      supabase.from('commission_ledger').select('*').order('created_at',{ascending:false}),
      supabase.from('subscriptions').select('*'),
      supabase.from('packages').select('*').eq('active',true).order('sort_order'),
      supabase.from('package_orders').select('*').order('created_at',{ascending:false}),
      supabase.from('lifestyle_ledger').select('*').order('created_at',{ascending:false}),
      supabase.from('products').select('*').eq('status','active').order('sort_order'),
    ]);
    setMembers(m.data||[]);setNodes(n.data||[]);setLedger(l.data||[]);
    setPackages(p.data||[]);setPkgOrders(po.data||[]);setLifestyle(ll.data||[]);
    setShopProducts((pr.data||[]).filter(x=>!x.sku?.includes('BUGISU')));
    const root=(m.data||[]).find(x=>x.email==='brandon@ohmicoffee.co.za')||(m.data||[])[0];
    setMe(root||null);
    setSub((s.data||[]).find(x=>x.member_id===root?.id)||null);
  }
  useEffect(()=>{load();},[]);



  const myNode=nodes.find(n=>me&&n.member_id===me.id);
  const L=myNode?.left_count||0,RC=myNode?.right_count||0;
  const qual=Math.min(L,RC);
  const currentRank=RANKS.filter(r=>r.left<=qual).pop();
  const nextRank=RANKS.find(r=>r.left>qual);

  const myLedger=ledger.filter(l=>me&&l.member_id===me.id);
  const earned=myLedger.filter(l=>['pool_share','signup_commission'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.amount),0);
  const paidOut=myLedger.filter(l=>l.entry_type==='payout').reduce((s,l)=>s+Number(l.amount),0);
  const balance=earned-paidOut;

  const myLife=lifestyle.filter(l=>me&&l.member_id===me.id);
  const ptBal=myLife.filter(l=>['rank_bonus','adjustment'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.points),0)
    -myLife.filter(l=>['redemption','expiry'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.points),0);

  const cartItems=shopProducts.filter(p=>cart[p.id]>0).map(p=>({...p,qty:cart[p.id]}));
  const isMember=me?.status==='active';
  const unitPrice=p=>isMember?Number(p.price_member||p.price_retail):Number(p.price_retail);
  const cartTotal=cartItems.reduce((s,i)=>s+unitPrice(i)*i.qty,0);
  const cartPool=cartItems.reduce((s,i)=>s+Number(i.pool_contribution||0)*i.qty,0);
  const cartQty=cartItems.reduce((s,i)=>s+i.qty,0);
  const addCart=(id,d)=>setCart(c=>({...c,[id]:Math.max(0,(c[id]||0)+d)}));
  const myOrders=pkgOrders.filter(o=>me&&o.member_id===me.id);
  const refLink=me&&typeof window!=='undefined'?`${window.location.origin}/join?ref=${me.id}`:'';

  async function placeOrder(){
    if(!me||!cartItems.length)return;
    setBusy('order');
    const period=new Date().toISOString().slice(0,7)+'-01';
    await supabase.from('package_orders').insert(cartItems.map(i=>({member_id:me.id,package_id:i.id,quantity:i.qty,total:(me?.status==='active'?Number(i.price_member||i.price):Number(i.price_retail||i.price))*i.qty,pool_contribution:Number(i.pool_contribution||0)*i.qty,status:'pending',billing_period:period})));
    setCart({});setBusy('');setCheckoutStep('done');
    const {data}=await supabase.from('package_orders').select('*').order('created_at',{ascending:false});
    setPkgOrders(data||[]);
  }

  const go=t=>{setTab(t);if(t==='shop'||t==='subscribe')setCheckoutStep('browse');};

  const PKG_GRADS = ['pkg-header-wallet','pkg-header-earn','pkg-header-sales','pkg-header-amber'];

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>

      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <span className="mobile-topbar-logo">OHMI</span>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className="pill pill-primary" style={{fontSize:9}}>{currentRank?.name||'Unranked'}</span>
          <Link href="/admin">
            <button style={{background:'var(--surface-2)',border:'none',borderRadius:'var(--r-xs)',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-sub)',fontSize:16,cursor:'pointer'}}>
              <i className="ti ti-settings" aria-hidden="true"/>
            </button>
          </Link>
          <div style={{width:30,height:30,borderRadius:'50%',background:'var(--grad-wallet)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
            {me?.full_name?.[0]||'?'}
          </div>
        </div>
      </div>

      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-text">OHMI Coffee</div>
            <div className="sidebar-logo-sub">Member Portal</div>
          </div>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{me?.full_name?.[0]||'?'}</div>
            <div>
              <div className="sidebar-name">{me?.full_name||'Loading…'}</div>
              <div className="sidebar-rank">#{MN(me?.member_number)} · {currentRank?.name||'Unranked'}</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {NAV.map((item,i)=>{
              if(item.section) return <div key={i} className="sidebar-section">{item.section}</div>;
              if(item.href) return (
                <Link key={item.href} href={item.href}>
                  <div className="sidebar-item">
                    <i className={`ti ${item.icon}`} aria-hidden="true"/>
                    {item.label}
                  </div>
                </Link>
              );
              return (
                <button key={item.id} className={`sidebar-item${tab===item.id?' on':''}`} onClick={()=>go(item.id)}>
                  <i className={`ti ${item.icon}`} aria-hidden="true"/>
                  {item.label}
                  {item.id==='shop'&&cartQty>0&&<span className="s-badge-gold">{cartQty}</span>}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <span style={{fontSize:11,color:'var(--text-dim)'}}>© 2026 OHMI Coffee Co.</span>
          </div>
        </aside>

        {/* Icon rail (tablet) */}
        <aside className="rail">
          <div className="rail-logo">O</div>
          <nav className="rail-nav">
            {NAV.filter(n=>n.id||n.href).map((item,i)=>(
              item.href ? (
                <Link key={item.href} href={item.href}>
                  <button className="rail-item" data-tip={item.label} aria-label={item.label}>
                    <i className={`ti ${item.icon}`} aria-hidden="true"/>
                  </button>
                </Link>
              ) : (
                <button key={item.id} className={`rail-item${tab===item.id?' on':''}`} data-tip={item.label} onClick={()=>go(item.id)} aria-label={item.label}>
                  <i className={`ti ${item.icon}`} aria-hidden="true"/>
                  {item.id==='shop'&&cartQty>0&&<span className="badge">{cartQty}</span>}
                </button>
              )
            ))}
          </nav>
        </aside>

        <div className="app-main">
          <div className="app-topbar">
            <span className="app-topbar-title">{NAV.find(n=>n.id===tab)?.label||'Overview'}</span>
            <span className="app-topbar-sub">· {me?.full_name} #{MN(me?.member_number)}</span>
            <div className="app-topbar-right">
              <span className="pill pill-primary">{currentRank?.name||'Unranked'}</span>
              <span className={`pill ${me?.status==='active'?'pill-green':'pill-grey'}`}>{me?.status||'pending'}</span>
            </div>
          </div>

          <div className="app-content">

            {/* ── HOME ── */}
            {tab==='home'&&<>
              {/* Hero wallet cards */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="wallet wallet-earn">
                  <div className="wallet-inner">
                    <div className="wallet-label">Earnings wallet</div>
                    <div className="wallet-amount">{Rz(balance)}</div>
                    <div className="wallet-sub">Auto-pays 15 {new Date(Date.now()+30*86400000).toLocaleString('en-ZA',{month:'long'})}</div>
                    <div className="wallet-date">
                      <i className="ti ti-calendar" aria-hidden="true" style={{fontSize:13}}/>
                      Next: {nextPayout()}
                    </div>
                  </div>
                </div>
                <div className="wallet wallet-lifestyle">
                  <div className="wallet-inner">
                    <div className="wallet-label">Lifestyle wallet</div>
                    <div className="wallet-amount">{ptBal.toLocaleString()} pts</div>
                    <div className="wallet-sub">{currentRank?.bonus>0?`${Rz(currentRank.bonus)} pts/month`:'Unlocks at Gold rank'}</div>
                    <button className="wallet-action" onClick={()=>go('lifestyle')}>
                      <i className="ti ti-sparkles" aria-hidden="true" style={{fontSize:12}}/>
                      View wallet
                    </button>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
                {[
                  {icon:'ti-users',cls:'stat-icon-primary',val:members.length-1,label:'Network members'},
                  {icon:'ti-trending-up',cls:'stat-icon-green',val:L,label:'Left leg'},
                  {icon:'ti-trending-up',cls:'stat-icon-teal',val:RC,label:'Right leg'},
                  {icon:'ti-coin',cls:'stat-icon-purple',val:Rz(earned),label:'Total earned'},
                ].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div className={`stat-icon ${s.cls}`}><i className={`ti ${s.icon}`} aria-hidden="true"/></div>
                    <div>
                      <div className="stat-val">{s.val}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rank progress */}
              {nextRank&&(
                <div className="card">
                  <div className="section-header">
                    <div>
                      <div className="section-title">Rank progress</div>
                      <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{currentRank?.name||'Unranked'} → <strong style={{color:'var(--primary)'}}>{nextRank.name}</strong> · unlock {Rz(nextRank.pool)}/month</div>
                    </div>
                    <span className="pill pill-primary">{qual} / {nextRank.left}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {[['Left leg',L,nextRank.left],['Right leg',RC,nextRank.right]].map(([label,cur,need])=>(
                      <div key={label} style={{padding:'14px',background:'var(--surface-1)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
                          <span style={{fontSize:11,fontWeight:700,color:'var(--text-sub)',letterSpacing:'0.08em',textTransform:'uppercase'}}>{label}</span>
                          <span style={{fontSize:18,fontWeight:800,color:cur>=need?'var(--green)':'var(--text-h)',letterSpacing:'-0.02em'}}>{cur}<span style={{fontSize:13,color:'var(--text-muted)',fontWeight:500}}>/{need}</span></span>
                        </div>
                        <div className="progress-track">
                          <div className={`progress-fill ${cur>=need?'pf-green':'pf-primary'}`} style={{width:`${Math.min(100,(cur/need)*100)}%`}}/>
                        </div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:6}}>{cur>=need?'✓ Threshold met':`${need-cur} more needed`}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,padding:'10px 14px',background:'var(--primary-bg)',borderRadius:'var(--r-xs)',border:'1px solid var(--primary-border)',fontSize:12,color:'var(--text-sub)',lineHeight:1.6}}>
                    <strong style={{color:'var(--primary)',fontWeight:600}}>Both legs must qualify.</strong> Rank is set by your weaker leg.
                    {nextRank.bonus>0&&<> Hitting {nextRank.name} also unlocks <strong style={{color:'var(--purple)'}}>{Rz(nextRank.bonus)} lifestyle pts/month</strong>.</>}
                  </div>
                </div>
              )}

              {/* Referral card */}
              <div className="card">
                <div className="section-header">
                  <div className="section-title">Referral link</div>
                  <span className="pill pill-green">+R500 per activation</span>
                </div>
                <div style={{background:'var(--surface-1)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',fontSize:12,color:'var(--text-sub)',wordBreak:'break-all',marginBottom:12,fontFamily:'monospace'}}>
                  {refLink||'Loading…'}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary btn-sm" onClick={()=>{navigator.clipboard?.writeText(refLink);flash('Link copied ✓');}}>Copy link</button>
                  <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join OHMI Coffee Co.\n'+refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                </div>
              </div>
            </>}

            {/* ── SUBSCRIPTION ── */}
            {tab==='subscribe'&&(
              <div style={{maxWidth:560}}>
                <div className="hero-card hero-card-wallet" style={{marginBottom:14}}>
                  <div className="hero-card-label">Monthly subscription</div>
                  <div className="hero-card-value">{Rz(sub?.amount||1500)}<span style={{fontSize:16,fontWeight:500,marginLeft:4,opacity:0.7}}>/month</span></div>
                  <div className="hero-card-sub">Builder Pack · 1kg Uganda Bugisu AA</div>
                  <span className="pill" style={{background:'rgba(255,255,255,0.2)',color:'#fff',marginTop:12,display:'inline-flex'}}>{sub?.status||'inactive'}</span>
                </div>
                <div className="card" style={{marginBottom:12}}>
                  <div className="section-header"><div className="section-title">How your payment splits</div></div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                    {[['Pool contribution',Rz(sub?.pool_contribution||500),'var(--primary)'],['OHMI operations',Rz((sub?.amount||1500)-(sub?.pool_contribution||500)),'var(--teal)'],['Your coffee',Rz(1000),'var(--green)']].map(([l,v,c])=>(
                      <div key={l} style={{padding:'14px',background:'var(--surface-1)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)',textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:800,color:c,letterSpacing:'-0.02em'}}>{v}</div>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.08em'}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="section-title" style={{marginBottom:10}}>Payout schedule</div>
                  <p style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.8,marginBottom:12}}>
                    Pool earnings are calculated on the 1st and paid to your bank account by the <strong style={{color:'var(--text-h)'}}>15th of the following month</strong> — automatically.
                  </p>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--primary-bg)',borderRadius:'var(--r-sm)',border:'1px solid var(--primary-border)',fontSize:12,color:'var(--primary)',fontWeight:600}}>
                    <i className="ti ti-calendar" aria-hidden="true"/>Next payout: {nextPayout()}
                  </div>
                </div>
              </div>
            )}

            {/* ── SHOP ── */}
            {tab==='shop'&&<>
              {checkoutStep==='done'?(
                <div style={{maxWidth:500,margin:'0 auto'}}>
                  <div style={{background:'linear-gradient(135deg,#10B981,#0EA5E9)',borderRadius:'var(--r-lg)',padding:'36px 28px',textAlign:'center',boxShadow:'var(--shadow-lg)',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.08)',top:-40,right:-40}}/>
                    <div style={{fontSize:48,marginBottom:14}}>☕</div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:8}}>Order confirmed</div>
                    <div style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:8,letterSpacing:'-0.02em'}}>We roast on Tuesdays.</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginBottom:6}}>Your coffee will be freshly roasted and dispatched within 3 business days.</div>
                    <div style={{fontFamily:'monospace',fontSize:13,background:'rgba(0,0,0,0.2)',color:'rgba(255,255,255,0.9)',padding:'8px 16px',borderRadius:'var(--r-sm)',display:'inline-block',marginBottom:20}}>Ref: {me?.id?.slice(0,8)?.toUpperCase()}-SHOP</div>
                    <div style={{background:'rgba(0,0,0,0.15)',borderRadius:'var(--r-sm)',padding:'12px 16px',marginBottom:20,textAlign:'left'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.6)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6}}>EFT Payment Details</div>
                      <div style={{fontSize:13,color:'#fff',lineHeight:1.8}}>
                        <div>Bank: <strong>FNB</strong></div>
                        <div>Account: <strong>OHMI Coffee Co. (Pty) Ltd</strong></div>
                        <div>Reference: <strong>{me?.id?.slice(0,8)?.toUpperCase()}-SHOP</strong></div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                      <button onClick={()=>go('orders')} style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'var(--r-full)',padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>View orders</button>
                      <button onClick={()=>{setCheckoutStep('browse');setCart({});}} style={{background:'#fff',color:'var(--green-text)',border:'none',borderRadius:'var(--r-full)',padding:'10px 20px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Shop more</button>
                    </div>
                  </div>
                </div>
              ) : checkoutStep==='cart' ? (
                /* ── CART / CHECKOUT ── */
                <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>
                  {/* Left: cart items */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setCheckoutStep('browse')} style={{padding:'8px 14px'}}>← Continue shopping</button>
                      <div className="section-title">Your cart · {cartQty} item{cartQty!==1?'s':''}</div>
                    </div>
                    <div className="card card-flush">
                      {cartItems.map(i=>{
                        const price=unitPrice(i);
                        return(
                          <div key={i.id} style={{display:'flex',gap:14,padding:'14px 16px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                            {i.image_url?(
                              <img src={i.image_url} alt={i.name} style={{width:60,height:60,borderRadius:'var(--r-sm)',objectFit:'cover',objectPosition:'center 25%',flexShrink:0}}/>
                            ):(
                              <div style={{width:60,height:60,borderRadius:'var(--r-sm)',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>☕</div>
                            )}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)',marginBottom:2}}>{i.name}</div>
                              <div style={{fontSize:11,color:'var(--text-muted)'}}>1kg · 100% Arabica · Pool: {Rz(Number(i.pool_contribution||0)*i.qty)}</div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                              <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface-1)',borderRadius:'var(--r-full)',border:'1px solid var(--border)',padding:'4px 8px'}}>
                                <button onClick={()=>addCart(i.id,-1)} style={{width:26,height:26,borderRadius:'50%',border:'none',background:'none',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-sub)',fontFamily:'inherit'}}>−</button>
                                <span style={{fontSize:15,fontWeight:700,minWidth:20,textAlign:'center',color:'var(--text-h)'}}>{i.qty}</span>
                                <button onClick={()=>addCart(i.id,1)} style={{width:26,height:26,borderRadius:'50%',border:'none',background:'none',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-sub)',fontFamily:'inherit'}}>+</button>
                              </div>
                              <div style={{textAlign:'right',minWidth:70}}>
                                <div style={{fontSize:16,fontWeight:800,color:'var(--text-h)',letterSpacing:'-0.01em'}}>{Rz(price*i.qty)}</div>
                                <div style={{fontSize:10,color:'var(--text-muted)'}}>{Rz(price)} each</div>
                              </div>
                              <button onClick={()=>addCart(i.id,-i.qty)} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:18,padding:4,lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                            </div>
                          </div>
                        );
                      })}
                      {cartItems.length===0&&(
                        <div style={{padding:'32px 20px',textAlign:'center',color:'var(--text-muted)'}}>
                          <div style={{fontSize:32,marginBottom:8}}>🛒</div>
                          Your cart is empty — <button style={{background:'none',border:'none',color:'var(--primary)',cursor:'pointer',fontWeight:600,fontFamily:'inherit'}} onClick={()=>setCheckoutStep('browse')}>browse coffees</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: order summary */}
                  <div style={{position:'sticky',top:20}}>
                    <div className="card" style={{marginBottom:12}}>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--text-h)',marginBottom:14}}>Order summary</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                        {cartItems.map(i=>(
                          <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                            <span style={{color:'var(--text-sub)'}}>{i.name} × {i.qty}</span>
                            <span style={{fontWeight:600}}>{Rz(unitPrice(i)*i.qty)}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{borderTop:'1px solid var(--border)',paddingTop:12,marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
                          <span style={{color:'var(--text-sub)'}}>Pool contribution</span>
                          <span style={{color:'var(--primary)',fontWeight:600}}>{Rz(cartPool)}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
                          <span style={{color:'var(--text-sub)'}}>Delivery</span>
                          <span style={{color:'var(--green-text)',fontWeight:600}}>Calculated at dispatch</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:800,color:'var(--text-h)',letterSpacing:'-0.01em',marginTop:8,paddingTop:8,borderTop:'2px solid var(--border)'}}>
                          <span>Total</span>
                          <span style={{color:'var(--primary)'}}>{Rz(cartTotal)}</span>
                        </div>
                      </div>
                      {isMember&&(
                        <div style={{padding:'8px 12px',background:'var(--green-bg)',borderRadius:'var(--r-xs)',border:'1px solid rgba(16,185,129,0.2)',fontSize:11,color:'var(--green-text)',fontWeight:600,marginBottom:12}}>
                          ✓ Member pricing applied — saving {Rz(cartItems.reduce((s,i)=>(s+(Number(i.price_retail)-Number(i.price_member))*i.qty),0))}
                        </div>
                      )}
                      <button className="btn btn-primary btn-full" disabled={busy==='order'||!cartItems.length} onClick={placeOrder} style={{fontSize:14,padding:'13px'}}>
                        {busy==='order'?'Placing order…':'Place order'}
                      </button>
                    </div>
                    <div className="card" style={{fontSize:12,color:'var(--text-sub)',lineHeight:1.8}}>
                      <div style={{fontWeight:700,color:'var(--text-h)',marginBottom:6,fontSize:13}}>Payment — EFT</div>
                      <div>Bank: FNB</div>
                      <div>Account: OHMI Coffee Co. (Pty) Ltd</div>
                      <div>Reference: <strong style={{color:'var(--primary)',fontFamily:'monospace'}}>{me?.id?.slice(0,8)?.toUpperCase()}-SHOP</strong></div>
                      <div style={{marginTop:8,padding:'8px 10px',background:'var(--primary-bg)',borderRadius:'var(--r-xs)',fontSize:11,color:'var(--primary)',fontWeight:600}}>Orders processed within 48hrs of payment confirmation.</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── PRODUCT GRID ── */
                <>
                  {/* Header */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                    <div>
                      <div className="section-title">OHMI Coffee Shop</div>
                      <div style={{fontSize:13,color:'var(--text-muted)',marginTop:2}}>
                        Single origin & blends · 1kg · 100% Arabica
                        {isMember&&<span style={{marginLeft:8,color:'var(--green-text)',fontWeight:600}}>· Member price R365</span>}
                      </div>
                    </div>
                    {cartQty>0&&(
                      <button className="btn btn-primary" onClick={()=>setCheckoutStep('cart')} style={{display:'flex',alignItems:'center',gap:8}}>
                        <i className="ti ti-shopping-cart" aria-hidden="true"/>
                        Cart ({cartQty}) · {Rz(cartTotal)}
                      </button>
                    )}
                  </div>

                  {/* Loading state */}
                  {shopProducts.length===0&&(
                    <div style={{textAlign:'center',padding:'48px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                      <div style={{fontSize:36,marginBottom:12}}>☕</div>
                      <div style={{fontSize:15,fontWeight:600,color:'var(--text-h)',marginBottom:4}}>Loading coffees…</div>
                      <div style={{fontSize:13,color:'var(--text-muted)'}}>If this persists, please refresh the page.</div>
                    </div>
                  )}

                  {/* Product grid */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
                    {shopProducts.map(p=>{
                      const qty=cart[p.id]||0;
                      const price=unitPrice(p);
                      return(
                        <div key={p.id} style={{
                          background:'var(--white)',borderRadius:'var(--r)',
                          boxShadow:qty>0?'0 0 0 2px var(--primary), var(--shadow-md)':'var(--shadow-sm)',
                          overflow:'hidden',display:'flex',flexDirection:'column',
                          transition:'box-shadow 0.2s,transform 0.15s',
                        }}
                          onMouseEnter={e=>{if(!qty)e.currentTarget.style.transform='translateY(-2px)';}}
                          onMouseLeave={e=>e.currentTarget.style.transform=''}>

                          {/* Image */}
                          <div style={{position:'relative',height:240,overflow:'hidden',background:'#0a0a0a',flexShrink:0}}>
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',display:'block'}}
                              />
                            ) : (
                              <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48}}>☕</div>
                            )}
                            {/* Qty badge */}
                            {qty>0&&(
                              <div style={{position:'absolute',top:10,right:10,width:30,height:30,borderRadius:'50%',background:'var(--primary)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,boxShadow:'0 2px 8px rgba(99,102,241,0.5)'}}>
                                {qty}
                              </div>
                            )}
                            {/* Name overlay */}
                            <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'32px 14px 12px',background:'linear-gradient(transparent,rgba(0,0,0,0.85))'}}>
                              <div style={{fontSize:15,fontWeight:800,color:'#fff',letterSpacing:'-0.01em',lineHeight:1.2}}>{p.name}</div>
                            </div>
                          </div>

                          {/* Body */}
                          <div style={{padding:'12px 14px 14px',flex:1,display:'flex',flexDirection:'column',gap:10}}>
                            {/* Tasting note */}
                            {p.description&&(
                              <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.6,flex:1}}>
                                {p.description.split('·').slice(1,2).join('').trim() || p.description.slice(0,60)+'…'}
                              </div>
                            )}

                            {/* Price + controls */}
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                              <div>
                                <div style={{fontSize:22,fontWeight:800,color:'var(--text-h)',letterSpacing:'-0.02em',lineHeight:1}}>R{price}</div>
                                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>per 1kg bag</div>
                              </div>
                              {qty>0 ? (
                                <div style={{display:'flex',alignItems:'center',gap:0,background:'var(--surface-1)',borderRadius:'var(--r-full)',border:'1.5px solid var(--primary)',overflow:'hidden'}}>
                                  <button onClick={()=>addCart(p.id,-1)} style={{width:34,height:34,border:'none',background:'none',fontSize:20,cursor:'pointer',color:'var(--primary)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>−</button>
                                  <span style={{fontSize:15,fontWeight:800,color:'var(--primary)',minWidth:24,textAlign:'center'}}>{qty}</span>
                                  <button onClick={()=>addCart(p.id,1)} style={{width:34,height:34,border:'none',background:'none',fontSize:20,cursor:'pointer',color:'var(--primary)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>+</button>
                                </div>
                              ) : (
                                <button className="btn btn-primary btn-sm" onClick={()=>addCart(p.id,1)} style={{borderRadius:'var(--r-full)',minHeight:36}}>
                                  Add to cart
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Floating cart bar */}
                  {cartQty>0&&(
                    <div style={{
                      position:'sticky',bottom:16,
                      background:'var(--primary)',borderRadius:'var(--r)',
                      padding:'14px 18px',display:'flex',alignItems:'center',gap:14,
                      boxShadow:'0 8px 32px rgba(99,102,241,0.4)',margin:'0 4px',
                      zIndex:10,
                    }}>
                      <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
                        <div style={{width:36,height:36,borderRadius:'var(--r-sm)',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🛒</div>
                        <div>
                          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase'}}>{cartQty} item{cartQty!==1?'s':''} · {Rz(cartPool)} pool</div>
                          <div style={{fontSize:20,fontWeight:800,color:'#fff',letterSpacing:'-0.02em',lineHeight:1}}>{Rz(cartTotal)}</div>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>setCart({})} style={{background:'rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'var(--r-full)',padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Clear</button>
                        <button onClick={()=>setCheckoutStep('cart')} style={{background:'#fff',color:'var(--primary)',border:'none',borderRadius:'var(--r-full)',padding:'10px 20px',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
                          Checkout →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>}

            {/* ── MY ORDERS ── */}
            {tab==='orders'&&(
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)'}}><span className="section-label">Order history</span></div>
                <table className="data-table">
                  <thead><tr><th>Package</th><th>Qty</th><th>Total</th><th>Pool</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {myOrders.length?myOrders.map(o=>{const pkg=packages.find(p=>p.id===o.package_id);return(
                      <tr key={o.id}>
                        <td style={{fontWeight:600}}>{pkg?.name||'—'}</td>
                        <td style={{color:'var(--text-muted)'}}>{o.quantity}</td>
                        <td style={{fontWeight:700,color:'var(--text-h)'}}>{Rz(o.total)}</td>
                        <td style={{color:'var(--text-muted)'}}>{Rz(o.pool_contribution)}</td>
                        <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'amber':'red'}`}>{o.status}</span></td>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{Dz(o.created_at)}</td>
                      </tr>
                    );}):(<tr><td colSpan="6" style={{textAlign:'center',padding:28,color:'var(--text-muted)'}}>No orders yet — <button style={{background:'none',border:'none',color:'var(--primary)',cursor:'pointer',fontWeight:600}} onClick={()=>go('shop')}>browse shop</button></td></tr>)}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── NETWORK ── */}
            {tab==='network'&&<>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
                {[{icon:'ti-trending-up',cls:'stat-icon-primary',val:L,label:'Left leg'},{icon:'ti-trending-up',cls:'stat-icon-teal',val:RC,label:'Right leg'},{icon:'ti-users',cls:'stat-icon-green',val:members.length-1,label:'Downline'},{icon:'ti-binary-tree-2',cls:'stat-icon-purple',val:Math.max(0,...nodes.map(n=>n.depth||0)),label:'Max depth'}].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div className={`stat-icon ${s.cls}`}><i className={`ti ${s.icon}`} aria-hidden="true"/></div>
                    <div><div className="stat-val">{s.val}</div><div className="stat-label">{s.label}</div></div>
                  </div>
                ))}
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className="section-label">My network tree</span>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>Pinch or scroll to zoom · drag to pan · tap + to register</span>
                </div>
                <BinaryTree
                  nodes={nodes}
                  members={members}
                  rootMemberId={me?.id}
                  onRegister={(parentNodeId,leg)=>setRegisterSlot({parentNodeId,leg})}
                  isAdmin={false}
                  height={460}
                />
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)'}}><span className="section-label">Your downline</span></div>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {members.filter(m=>m.id!==me?.id).map(m=>(
                      <tr key={m.id}>
                        <td style={{color:'var(--text-dim)',fontSize:11,fontWeight:600}}>{MN(m.member_number)}</td>
                        <td style={{fontWeight:600}}>{m.full_name}</td>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{m.email}</td>
                        <td><span className={`pill pill-${m.status==='active'?'green':m.status==='pending'?'amber':'red'}`}>{m.status}</span></td>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{Dz(m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── EARNINGS ── */}
            {tab==='earnings'&&<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="hero-card hero-card-wallet">
                  <div className="hero-card-label">Available balance</div>
                  <div className="hero-card-value">{Rz(balance)}</div>
                  <div className="hero-card-sub">Auto-pays on 15th · no request needed</div>
                </div>
                <div className="hero-card hero-card-earn">
                  <div className="hero-card-label">Total earned</div>
                  <div className="hero-card-value">{Rz(earned)}</div>
                  <div className="hero-card-sub">{Rz(paidOut)} paid out to date</div>
                </div>
              </div>
              <div className="card">
                <div style={{padding:'10px 14px',background:'var(--primary-bg)',borderRadius:'var(--r-sm)',border:'1px solid var(--primary-border)',fontSize:13,color:'var(--text-sub)',lineHeight:1.7}}>
                  <strong style={{color:'var(--primary)'}}>Automatic payout. </strong>Your balance is paid to your registered bank account by the <strong style={{color:'var(--text-h)'}}>15th of the following month</strong>. Pool earnings only credit when you hold rank. Sign-up commissions (R500) credit on activation approval.
                </div>
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)'}}><span className="section-label">Commission ledger</span></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Note</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                  <tbody>
                    {myLedger.filter(l=>l.entry_type!=='foundation').length?myLedger.filter(l=>l.entry_type!=='foundation').map(l=>(
                      <tr key={l.id}>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{Dz(l.created_at)}</td>
                        <td><span className={`pill pill-${l.entry_type==='payout'?'red':l.entry_type==='signup_commission'?'green':'primary'}`}>{l.entry_type==='signup_commission'?'sign-up':l.entry_type.replace('_',' ')}</span></td>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{l.note}</td>
                        <td style={{textAlign:'right',fontWeight:800,fontSize:16,letterSpacing:'-0.02em',color:l.entry_type==='payout'?'var(--red-text)':'var(--green-text)'}}>{l.entry_type==='payout'?'-':'+' }{Rz(l.amount)}</td>
                      </tr>
                    )):(<tr><td colSpan="4" style={{textAlign:'center',padding:28,color:'var(--text-muted)'}}>Earnings appear after billing runs and sign-up commissions.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── LIFESTYLE ── */}
            {tab==='lifestyle'&&<>
              <div className="hero-card hero-card-sales">
                <div className="hero-card-label">Lifestyle wallet · Vollard Black</div>
                <div className="hero-card-value">{ptBal.toLocaleString()} pts</div>
                <div className="hero-card-sub">1 point = R1 · redeemable on travel, experiences & lifestyle</div>
                {ptBal>0&&<Link href="/travel"><button className="hero-card-action"><i className="ti ti-plane" aria-hidden="true" style={{fontSize:12}}/>Book travel</button></Link>}
              </div>
              <div className="card">
                <div className="section-title" style={{marginBottom:14}}>How lifestyle points work</div>
                {[['ti-trophy','Hold rank every month','Points credit on the 1st when you maintain your rank. No rank = no points that month.','stat-icon-amber'],['ti-sparkles','1 point = R1','Gold = R4,000 pts/month. Points accumulate indefinitely while active.','stat-icon-purple'],['ti-plane','Vollard Black catalogue','Redeem for travel, accommodation, experiences through Vollard Black.','stat-icon-teal']].map(([icon,title,desc,cls])=>(
                  <div key={title} style={{display:'flex',gap:14,padding:'14px 0',borderBottom:'1px solid var(--surface-2)'}}>
                    <div className={`stat-icon ${cls}`} style={{width:40,height:40,flexShrink:0}}><i className={`ti ${icon}`} aria-hidden="true"/></div>
                    <div><div style={{fontWeight:600,fontSize:13,color:'var(--text-h)',marginBottom:4}}>{title}</div><div style={{fontSize:12,color:'var(--text-sub)',lineHeight:1.7}}>{desc}</div></div>
                  </div>
                ))}
              </div>
              {currentRank?.bonus>0&&(
                <div className="hero-card hero-card-wallet">
                  <div className="hero-card-label">Current earning rate · {currentRank.name}</div>
                  <div className="hero-card-value">{Rz(currentRank.bonus)} pts</div>
                  <div className="hero-card-sub">per month · held every month = cumulative</div>
                </div>
              )}
              {myLife.length>0&&(
                <div className="card card-flush">
                  <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)'}}><span className="section-label">Point history</span></div>
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Type</th><th>Rank</th><th style={{textAlign:'right'}}>Points</th></tr></thead>
                    <tbody>
                      {myLife.map(l=>(
                        <tr key={l.id}>
                          <td style={{color:'var(--text-muted)',fontSize:12}}>{Dz(l.created_at)}</td>
                          <td><span className={`pill pill-${l.entry_type==='rank_bonus'?'primary':l.entry_type==='redemption'?'red':'grey'}`}>{l.entry_type.replace('_',' ')}</span></td>
                          <td style={{color:'var(--text-muted)',fontSize:12}}>{l.rank_name||'—'}</td>
                          <td style={{textAlign:'right',fontWeight:800,fontSize:16,letterSpacing:'-0.02em',color:['redemption','expiry'].includes(l.entry_type)?'var(--red-text)':'var(--green-text)'}}>
                            {['redemption','expiry'].includes(l.entry_type)?'−':'+' }{Number(l.points).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>}

            {/* ── RANKS ── */}
            {tab==='ranks'&&<>
              <div className="hero-card hero-card-wallet">
                <div className="hero-card-label">Your qualifying leg</div>
                <div className="hero-card-value">{qual}</div>
                <div className="hero-card-sub">Both legs must independently hit the threshold · currently {currentRank?.name||'Unranked'}</div>
              </div>
              <div className="card card-flush">
                <table className="data-table">
                  <thead><tr><th>Rank</th><th>Each leg</th><th>Your L</th><th>Your R</th><th>Pool /mo</th><th>Lifestyle</th><th>Status</th></tr></thead>
                  <tbody>
                    {RANKS.map(r=>{
                      const achieved=qual>=r.left,isCurrent=r.name===currentRank?.name;
                      return(
                        <tr key={r.name} style={{background:isCurrent?'var(--primary-bg)':undefined}}>
                          <td style={{fontWeight:700,color:isCurrent?'var(--primary)':achieved?'var(--text-h)':'var(--text-muted)'}}>{r.name}</td>
                          <td style={{color:'var(--text-muted)',fontWeight:500}}>{r.left.toLocaleString()}</td>
                          <td style={{fontWeight:L>=r.left?700:400,color:L>=r.left?'var(--green-text)':'var(--text-muted)'}}>{L}{L>=r.left?' ✓':''}</td>
                          <td style={{fontWeight:RC>=r.right?700:400,color:RC>=r.right?'var(--green-text)':'var(--text-muted)'}}>{RC}{RC>=r.right?' ✓':''}</td>
                          <td style={{fontWeight:600,color:isCurrent||achieved?'var(--text-h)':'var(--text-muted)'}}>R{r.pool.toLocaleString()}</td>
                          <td style={{color:r.bonus>0?(isCurrent||achieved?'var(--purple)':'var(--text-muted)'):'var(--text-dim)'}}>{r.bonus>0?`${r.bonus.toLocaleString()} pts`:'—'}</td>
                          <td>{isCurrent?<span className="pill pill-primary">Current</span>:achieved?<span className="pill pill-green">✓</span>:<span className="pill pill-grey">Locked</span>}</td>
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
          <button className={`mobile-nav-item${tab==='home'?' on':''}`} onClick={()=>go('home')}>
            <i className="ti ti-layout-dashboard" aria-hidden="true"/><span>Home</span>
          </button>
          <button className={`mobile-nav-item${tab==='network'?' on':''}`} onClick={()=>go('network')}>
            <i className="ti ti-binary-tree-2" aria-hidden="true"/><span>Network</span>
          </button>
          <button className={`mobile-nav-item${tab==='shop'?' on':''}`} onClick={()=>go('shop')}>
            <i className="ti ti-shopping-bag" aria-hidden="true"/><span>Shop</span>
            {cartQty>0&&<span className="m-badge">{cartQty}</span>}
          </button>
          <button className={`mobile-nav-item${tab==='earnings'?' on':''}`} onClick={()=>go('earnings')}>
            <i className="ti ti-coin" aria-hidden="true"/><span>Earnings</span>
          </button>
          <a href="/travel" className="mobile-nav-item" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,textDecoration:'none',color:'var(--text-muted)',flex:1,padding:'6px 2px 8px'}}>
            <i className="ti ti-plane" aria-hidden="true"/><span>Travel</span>
          </a>
          <a href="/admin" className="mobile-nav-item" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,textDecoration:'none',color:'var(--text-muted)',flex:1,padding:'6px 2px 8px'}}>
            <i className="ti ti-settings" aria-hidden="true"/><span>Admin</span>
          </a>
        </div>
      </nav>

      {registerSlot&&<RegisterModal parentNodeId={registerSlot.parentNodeId} leg={registerSlot.leg} onClose={()=>setRegisterSlot(null)} onSuccess={name=>{flash(`✓ ${name} registered`);setRegisterSlot(null);load();}}/>}
      {toast&&<div className="toast">{toast}</div>}
    </>
  );
}
