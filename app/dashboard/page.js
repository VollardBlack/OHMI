'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import BinaryTree from '../components/BinaryTree';

const Rz = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA',{maximumFractionDigits:0});
const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
const pad  = n => String(n||0).padStart(5,'0');

const RANK_COLOURS = {
  'Unranked':'#9CA3AF','Bronze':'#CD7F32','Silver':'#C0C0C0','Gold':'#C9973A',
  'Platinum':'#6366F1','Diamond':'#0EA5E9','Black Diamond':'#111827',
  'Royal Diamond':'#7C3AED','Crown Diamond':'#DC2626','Presidential':'#F59E0B','Imperial Diamond':'#10B981'
};

const SHIPPING = [
  {id:'pudo',    label:'PUDO Locker (cheapest · 2-4 days)',          fee:49},
  {id:'cg-local',label:'Courier Guy Local (1-2 days)',               fee:65},
  {id:'cg-reg',  label:'Courier Guy Regional (2-3 days)',            fee:85},
  {id:'cg-nat',  label:'Courier Guy National (3-5 days)',            fee:95},
  {id:'wiara',   label:'Cape Town local delivery (FREE · Wed-Fri)',  fee:0},
];

export default function Dashboard() {
  const [me, setMe]             = useState(null);
  const [nodes, setNodes]       = useState([]);
  const [members, setMembers]   = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [ledger, setLedger]     = useState([]);
  const [rankDefs, setRankDefs] = useState([]);
  const [training, setTraining] = useState([]);
  const [progress, setProgress] = useState([]);
  const [notifs, setNotifs]     = useState([]);
  const [tab, setTab]           = useState('home');
  const [busy, setBusy]         = useState('');
  const [toast, setToast]       = useState('');

  // Shop
  const [cart, setCart]         = useState({});
  const [grind, setGrind]       = useState({});
  const [shipping, setShipping] = useState(SHIPPING[2]);
  const [sizeFilter, setSizeFilter] = useState('all');
  const [checkoutStep, setCheckoutStep] = useState('browse');

  // Profile edit
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  const flash = msg => { setToast(msg); setTimeout(()=>setToast(''),3500); };

  const load = useCallback(async () => {
    const mid = localStorage.getItem('ohmi_member_id');
    if (!mid) { window.location.href = '/'; return; }
    const [mRes, nRes, mbRes, prRes, orRes, ldRes, rdRes, trRes, tpRes, ntRes] = await Promise.all([
      supabase.from('members').select('*').eq('id',mid).single(),
      supabase.from('network_nodes').select('*'),
      supabase.from('members').select('id,full_name,member_number,status,rank,email'),
      supabase.from('products').select('*').eq('status','active').order('sort_order'),
      supabase.from('package_orders').select('*').eq('member_id',mid).order('created_at',{ascending:false}),
      supabase.from('commission_ledger').select('*').eq('member_id',mid).order('created_at',{ascending:false}),
      supabase.from('rank_definitions').select('*').order('sort_order'),
      supabase.from('training_modules').select('*').eq('status','active').order('sort_order'),
      supabase.from('training_progress').select('*').eq('member_id',mid),
      supabase.from('notifications').select('*').eq('member_id',mid).order('created_at',{ascending:false}).limit(10),
    ]);
    setMe(mRes.data);
    setProfileForm(mRes.data||{});
    setNodes(nRes.data||[]);
    setMembers(mbRes.data||[]);
    setProducts(prRes.data||[]);
    setOrders(orRes.data||[]);
    setLedger(ldRes.data||[]);
    setRankDefs(rdRes.data||[]);
    setTraining(trRes.data||[]);
    setProgress(tpRes.data||[]);
    setNotifs(ntRes.data||[]);
  }, []);

  useEffect(()=>{ load(); },[load]);

  // ── Computed ──────────────────────────────────────────
  const isMember     = true; // All buyers must be members or wholesale — no public retail
  const cartItems    = products.filter(p=>cart[p.id]>0).map(p=>({...p,qty:cart[p.id]||0}));
  const cartTotal    = cartItems.reduce((s,i)=>s+(isMember?Number(i.price_member||i.price_retail):Number(i.price_retail))*i.qty,0);
  const grindTotal   = cartItems.reduce((s,i)=>s+(grind[i.id]?3*i.qty:0),0);
  const orderTotal   = cartTotal + grindTotal + shipping.fee;
  const cartQty      = cartItems.reduce((s,i)=>s+i.qty,0);
  const commBalance  = ledger.filter(l=>!['redemption','expiry'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.amount||0),0)
                     - ledger.filter(l=>['redemption','expiry'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.amount||0),0);
  const rank         = me?.rank || 'Unranked';
  const rankCol      = RANK_COLOURS[rank] || '#9CA3AF';
  const rankDef      = rankDefs.find(r=>r.rank_name===rank);
  const nextRankDef  = rankDefs.find(r=>r.sort_order===(rankDef?.sort_order||0)+1);
  const weakerLeg    = Math.min(me?.rank_left_vol||0, me?.rank_right_vol||0);
  const rankPct      = nextRankDef ? Math.min(100, Math.round((weakerLeg/(nextRankDef.min_weaker_leg||1))*100)) : 100;
  const myNode       = nodes.find(n=>n.member_id===me?.id);
  const downlineIds  = nodes.filter(n=>n.parent_id===myNode?.id).map(n=>n.member_id);
  const downline     = members.filter(m=>downlineIds.includes(m.id));
  const trainingDone = progress.filter(p=>p.completed).length;
  const trainingPct  = training.length ? Math.round((trainingDone/training.length)*100) : 0;
  const shopFiltered = products.filter(p=>sizeFilter==='all'||(sizeFilter==='250g'&&p.weight_g==250)||(sizeFilter==='1kg'&&p.weight_g==1000));

  // Earnings — group ledger by month
  const byMonth = {};
  ledger.forEach(l=>{
    const mo = (l.period||l.created_at||'').slice(0,7)||'Unknown';
    if(!byMonth[mo]) byMonth[mo]={income:0,redemptions:0,entries:[]};
    const amt = Number(l.amount||0);
    if(['redemption','expiry'].includes(l.entry_type)) byMonth[mo].redemptions+=amt;
    else byMonth[mo].income+=amt;
    byMonth[mo].entries.push(l);
  });
  const earningMonths = Object.keys(byMonth).sort().reverse();
  const thisMonthIncome = earningMonths.length>0 ? (byMonth[earningMonths[0]]?.income||0) : 0;

  function addCart(id,delta) {
    setCart(c=>({...c,[id]:Math.max(0,(c[id]||0)+delta)}));
  }

  async function placeOrder() {
    if (!cartItems.length) return;
    setBusy('order');
    const period = new Date().toISOString().slice(0,7)+'-01';
    await supabase.from('package_orders').insert(cartItems.map(i=>({
      member_id:me.id, package_id:i.id, quantity:i.qty,
      total:(isMember?Number(i.price_member||i.price_retail):Number(i.price_retail))*i.qty,
      pool_contribution:Number(i.pool_contribution||0)*i.qty,
      shipping_fee:shipping.fee, shipping_address:shipping.label,
      delivery_method:shipping.id,
      grind_option:!!grind[i.id], grind_fee:grind[i.id]?3*i.qty:0,
      status:'pending', billing_period:period
    })));
    setCart({}); setGrind({}); setCheckoutStep('done');
    setBusy('');
  }

  async function saveProfile() {
    setBusy('profile');
    await supabase.from('members').update({
      full_name:       profileForm.full_name,
      phone:           profileForm.phone,
      whatsapp:        profileForm.whatsapp,
      id_number:       profileForm.id_number,
      payout_bank_name:    profileForm.payout_bank_name,
      payout_account_number: profileForm.payout_account_number,
      payout_branch_code:  profileForm.payout_branch_code,
    }).eq('id',me.id);
    setEditProfile(false); setBusy(''); flash('Profile saved ✓'); load();
  }

  async function markTraining(moduleId) {
    const done = progress.find(p=>p.module_id===moduleId)?.completed;
    if (done) return;
    await supabase.from('training_progress').upsert({member_id:me.id,module_id:moduleId,completed:true,completed_at:new Date().toISOString()});
    flash('Module completed! ✓'); load();
  }

  const go = t => { setTab(t); setCheckoutStep('browse'); window.scrollTo(0,0); };
  const price = p => isMember ? Number(p.price_member||p.price_retail) : Number(p.price_retail);

  const TRAINING_CATS = {getting_started:'🚀 Getting Started',coffee:'☕ Coffee Knowledge',network:'🌳 Network & Sales',compliance:'⚖️ Compliance',advanced:'🎯 Advanced'};

  if (!me) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:28,fontWeight:900,background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:12}}>OHMI</div>
        <div style={{fontSize:12,color:'var(--text-muted)'}}>Loading your dashboard…</div>
      </div>
    </div>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>

      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:20,fontWeight:900,background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>OHMI</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {notifs.filter(n=>!n.read).length>0&&<div style={{width:8,height:8,borderRadius:'50%',background:'var(--red)'}}/>}
          <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${rankCol},${rankCol}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',border:`2px solid ${rankCol}40`}}>
            {me.full_name?.[0]||'?'}
          </div>
        </div>
      </div>

      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-text">OHMI</div>
            <div className="sidebar-logo-sub">Coffee · Lifestyle · Legacy</div>
          </div>
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{background:`linear-gradient(135deg,${rankCol},${rankCol}88)`}}>
              {me.full_name?.[0]||'?'}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="sidebar-name" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{me.full_name}</div>
              <div className="sidebar-rank" style={{color:rankCol}}>#{pad(me.member_number)} · {rank}</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section">My Account</div>
            {[['home','ti-home','Home'],['network','ti-binary-tree-2','My Network'],['earnings','ti-coin','Earnings'],['lifestyle','ti-sparkles','Lifestyle & Travel']].map(([id,icon,label])=>(
              <button key={id} className={`sidebar-item${tab===id?' on':''}`} onClick={()=>go(id)}>
                <i className={`ti ${icon}`}/>{label}
              </button>
            ))}
            <div className="sidebar-section">Coffee</div>
            {[['shop','ti-shopping-bag','Shop Coffee'],['orders','ti-package','My Orders'],['subscribe','ti-star','Welcome Packs']].map(([id,icon,label])=>(
              <button key={id} className={`sidebar-item${tab===id?' on':''}`} onClick={()=>go(id)}>
                <i className={`ti ${icon}`}/>{label}
              </button>
            ))}
            <div className="sidebar-section">Learn</div>
            {[['training','ti-school','Training'],['ranks','ti-trophy','Rank Guide']].map(([id,icon,label])=>(
              <button key={id} className={`sidebar-item${tab===id?' on':''}`} onClick={()=>go(id)}>
                <i className={`ti ${icon}`}/>{label}
              </button>
            ))}
            <div className="sidebar-section">Settings</div>
            {[['profile','ti-user','My Profile']].map(([id,icon,label])=>(
              <button key={id} className={`sidebar-item${tab===id?' on':''}`} onClick={()=>go(id)}>
                <i className={`ti ${icon}`}/>{label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <a href="/" className="btn btn-white btn-sm" style={{flex:1,textAlign:'center',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <i className="ti ti-logout" style={{fontSize:13}}/> Sign out
            </a>
          </div>
        </aside>

        {/* Rail */}
        <aside className="rail">
          <div className="rail-logo">O</div>
          <nav className="rail-nav">
            {[['home','ti-home','Home'],['network','ti-binary-tree-2','Network'],['shop','ti-shopping-bag','Shop'],['earnings','ti-coin','Earnings'],['training','ti-school','Training'],['profile','ti-user','Profile']].map(([id,icon,tip])=>(
              <button key={id} className={`rail-item${tab===id?' on':''}`} data-tip={tip} onClick={()=>go(id)} aria-label={tip}>
                <i className={`ti ${icon}`}/>
                {id==='shop'&&cartQty>0&&<span className="badge">{cartQty}</span>}
              </button>
            ))}
          </nav>
          <div className="rail-divider"/>
          <div className="rail-bottom">
            <a href="/" className="rail-item" data-tip="Sign out" style={{display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-logout"/></a>
          </div>
        </aside>

        <div className="app-main">
          {/* Topbar */}
          <div className="app-topbar">
            <div className="app-topbar-title">
              {{'home':'Dashboard','network':'My Network','shop':'Coffee Shop','orders':'My Orders','subscribe':'Welcome Packs','earnings':'Earnings','lifestyle':'Lifestyle & Travel','training':'Training Academy','ranks':'Rank Guide','profile':'My Profile'}[tab]||'OHMI'}
            </div>
            <div className="app-topbar-right">
              {cartQty>0&&tab!=='shop'&&(
                <button className="btn btn-primary btn-sm" onClick={()=>go('shop')} style={{display:'flex',alignItems:'center',gap:6}}>
                  <i className="ti ti-shopping-cart" style={{fontSize:14}}/>{cartQty} · {Rz(orderTotal)}
                </button>
              )}
              <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${rankCol},${rankCol}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}} onClick={()=>go('profile')}>
                {me.full_name?.[0]||'?'}
              </div>
            </div>
          </div>

          <div className="app-content">

            {/* ── HOME ── */}
            {tab==='home'&&<>
              {/* Welcome banner */}
              <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:'var(--r)',padding:'22px 24px',color:'#fff',boxShadow:'0 6px 32px rgba(99,102,241,0.25)',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.06)',top:-40,right:-40}}/>
                <div style={{position:'absolute',width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.04)',bottom:-30,right:60}}/>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:4}}>Good to see you</div>
                <div style={{fontSize:24,fontWeight:800,letterSpacing:'-0.02em',marginBottom:2}}>{me.full_name?.split(' ')[0]}</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                  <span style={{background:`rgba(255,255,255,0.15)`,border:`1px solid rgba(255,255,255,0.25)`,borderRadius:999,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#fff'}}>{rank}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>#{pad(me.member_number)}</span>
                </div>
              </div>

              {/* KPIs */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
                {[
                  {icon:'ti-users',      cls:'stat-icon-primary', val:nodes.filter(n=>n.member_id!==me.id).length, label:'Network size'},
                  {icon:'ti-arrow-left', cls:'stat-icon-primary', val:me?.rank_left_vol||0,  label:'Left leg'},
                  {icon:'ti-arrow-right',cls:'stat-icon-teal',    val:me?.rank_right_vol||0, label:'Right leg'},
                  {icon:'ti-coin',       cls:'stat-icon-amber',   val:Rz(commBalance),        label:'Comm. balance'},
                  {icon:'ti-sparkles',   cls:'stat-icon-purple',  val:(me?.commission_balance||0).toLocaleString(), label:'Travel pts'},
                ].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div className={`stat-icon ${s.cls}`}><i className={`ti ${s.icon}`}/></div>
                    <div><div className="stat-val" style={{fontSize:18}}>{s.val}</div><div className="stat-label">{s.label}</div></div>
                  </div>
                ))}
              </div>

              {/* Rank progress */}
              <div className="card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div>
                    <div className="section-label" style={{marginBottom:4}}>Rank progress</div>
                    <div style={{fontSize:18,fontWeight:800,color:rankCol}}>{rank}</div>
                  </div>
                  {nextRankDef&&<div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>Next rank</div>
                    <div style={{fontSize:14,fontWeight:700,color:RANK_COLOURS[nextRankDef.rank_name]||'var(--primary)'}}>{nextRankDef.rank_name}</div>
                  </div>}
                </div>
                <div style={{background:'var(--surface-2)',borderRadius:999,height:10,overflow:'hidden',marginBottom:10}}>
                  <div style={{height:'100%',borderRadius:999,background:`linear-gradient(90deg,${rankCol},${rankCol}88)`,width:`${rankPct}%`,transition:'width 0.8s ease'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-muted)'}}>
                  <span>Weaker leg: <strong style={{color:'var(--text-h)'}}>{weakerLeg} members</strong></span>
                  {nextRankDef&&<span>Need: <strong style={{color:'var(--primary)'}}>{nextRankDef.min_weaker_leg} in weaker leg</strong></span>}
                </div>
                {rankPct>=100&&!nextRankDef&&<div style={{marginTop:10,padding:'10px',background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.1))',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--green-text)',fontWeight:600,textAlign:'center'}}>🏆 Maximum rank achieved — Imperial Diamond!</div>}
              </div>

              {/* Referral link */}
              <div className="card" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(14,165,233,0.05))',border:'1px solid var(--primary-border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div className="stat-icon stat-icon-primary"><i className="ti ti-link"/></div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)'}}>Your referral link</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>Share to earn R500 per sign-up + build your binary</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{flex:1,padding:'10px 14px',background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',fontSize:12,fontFamily:'monospace',color:'var(--primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {typeof window!=='undefined'?`${window.location.origin}/join?ref=${me?.referral_code||'...'}`:'/join?ref=...'}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>{navigator.clipboard?.writeText(`${window.location.origin}/join?ref=${me?.referral_code}`);flash('Link copied! 🔗');}}>
                    <i className="ti ti-copy" style={{fontSize:13}}/> Copy
                  </button>
                </div>
              </div>

              {/* Training progress */}
              {trainingPct < 100&&<div className="card" style={{cursor:'pointer'}} onClick={()=>go('training')}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)'}}>🎓 Training Academy</div>
                  <span className="pill pill-amber">{trainingDone}/{training.length} done</span>
                </div>
                <div style={{background:'var(--surface-2)',borderRadius:999,height:8,overflow:'hidden',marginBottom:8}}>
                  <div style={{height:'100%',borderRadius:999,background:'linear-gradient(90deg,#6366F1,#0EA5E9)',width:`${trainingPct}%`,transition:'width 0.6s ease'}}/>
                </div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>Complete required modules to stay compliant and unlock advanced strategies</div>
              </div>}

              {/* Direct team */}
              {downline.length>0&&<div className="card card-flush">
                <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)'}}>
                  <span className="section-label">Your direct team ({downline.length})</span>
                </div>
                {downline.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px',borderBottom:'1px solid var(--border)'}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${RANK_COLOURS[m.rank]||'#6366F1'},${RANK_COLOURS[m.rank]||'#0EA5E9'})`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>{m.full_name?.[0]||'?'}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.full_name}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>#{pad(m.member_number)}</div>
                    </div>
                    <span className={`pill pill-${m.status==='active'?'green':'amber'}`}>{m.status}</span>
                  </div>
                ))}
              </div>}
            </>}

            {/* ── NETWORK ── */}
            {tab==='network'&&<>
              <div className="card card-flush">
                <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className="section-label">Your genealogy tree</span>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>Pinch to zoom · drag to pan</span>
                </div>
                <BinaryTree nodes={nodes} members={members} rootMemberId={me.id} isAdmin={false} height={500}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="card" style={{textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#6366F1',marginBottom:8}}>Left Leg</div>
                  <div style={{fontSize:36,fontWeight:800,color:'var(--text-h)'}}>{me?.rank_left_vol||0}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>members</div>
                </div>
                <div className="card" style={{textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#0EA5E9',marginBottom:8}}>Right Leg</div>
                  <div style={{fontSize:36,fontWeight:800,color:'var(--text-h)'}}>{me?.rank_right_vol||0}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>members</div>
                </div>
              </div>
            </>}

            {/* ── SHOP ── */}
            {tab==='shop'&&<>
              {checkoutStep==='done'&&<div style={{textAlign:'center',background:'#fff',borderRadius:24,padding:'48px 24px',boxShadow:'var(--shadow-lg)'}}>
                <div style={{fontSize:48,marginBottom:16}}>✅</div>
                <div style={{fontSize:22,fontWeight:800,color:'var(--text-h)',marginBottom:8}}>Order placed!</div>
                <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>We'll confirm within 24 hours. Pay via EFT using your order reference.</div>
                <button className="btn btn-primary btn-lg" style={{borderRadius:999}} onClick={()=>setCheckoutStep('browse')}>Shop more</button>
              </div>}

              {checkoutStep!=='done'&&<>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                  <div>
                    <div className="section-title">The Coffee Shop</div>
                    {isMember&&<div style={{fontSize:12,color:'var(--green-text)',marginTop:3,fontWeight:600}}>✓ Member pricing active</div>}
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <div style={{display:'flex',background:'var(--surface-2)',borderRadius:999,padding:3,gap:3}}>
                      {[['all','All'],['250g','250g'],['1kg','1kg']].map(([v,l])=>(
                        <button key={v} onClick={()=>setSizeFilter(v)} style={{padding:'6px 14px',background:sizeFilter===v?'#fff':'transparent',border:'none',borderRadius:999,fontSize:12,fontWeight:sizeFilter===v?700:500,color:sizeFilter===v?'var(--primary)':'var(--text-muted)',cursor:'pointer',boxShadow:sizeFilter===v?'var(--shadow-xs)':'none',fontFamily:'inherit'}}>{l}</button>
                      ))}
                    </div>
                    {cartQty>0&&<button className="btn btn-primary btn-sm" onClick={()=>setCheckoutStep('cart')} style={{display:'flex',alignItems:'center',gap:6}}>
                      <i className="ti ti-shopping-cart" style={{fontSize:14}}/>{cartQty} · {Rz(orderTotal)}
                    </button>}
                  </div>
                </div>

                {checkoutStep==='browse'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16}}>
                  {shopFiltered.map(p=>{
                    const qty=cart[p.id]||0;
                    return(
                      <div key={p.id} className="product-card">
                        <div style={{position:'relative',height:170,background:'var(--surface-1)'}}>
                          <img src={p.image_url||`/products/${p.sku?.toLowerCase()}.png`} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';}}/>
                          <div style={{position:'absolute',top:10,left:10,background:'rgba(0,0,0,0.55)',color:'#fff',borderRadius:999,padding:'3px 10px',fontSize:9,fontWeight:700,backdropFilter:'blur(4px)'}}>
                            {p.weight_g>=1000?'1kg':'250g'}
                          </div>
                          {qty>0&&<div style={{position:'absolute',top:10,right:10,width:28,height:28,borderRadius:'50%',background:'var(--primary)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,boxShadow:'0 2px 8px rgba(99,102,241,0.5)'}}>{qty}</div>}
                        </div>
                        <div style={{padding:'12px 14px 14px',flex:1,display:'flex',flexDirection:'column',gap:8}}>
                          <div style={{fontSize:14,fontWeight:700,color:'var(--text-h)',lineHeight:1.2}}>{p.name}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)',flex:1,lineHeight:1.5}}>
                            {p.description?.split('·').slice(1,2).join('').trim()||'Single origin · 100% Arabica'}
                          </div>
                          {/* Stock */}
                          <div style={{fontSize:10,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
                            {Number(p.stock_qty)===0?(
                              <><span style={{width:6,height:6,borderRadius:'50%',background:'var(--red)',display:'inline-block'}}/>
                              <span style={{color:'var(--red-text)'}}>Roasted to order · 3-5 days</span></>
                            ):Number(p.stock_qty)<=p.stock_low_threshold?(
                              <><span style={{width:6,height:6,borderRadius:'50%',background:'var(--amber)',display:'inline-block'}}/>
                              <span style={{color:'var(--amber)'}}>Low stock — {p.stock_qty} left</span></>
                            ):(
                              <><span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block',boxShadow:'0 0 4px rgba(34,197,94,0.5)'}}/>
                              <span style={{color:'var(--green-text)'}}>In stock</span></>
                            )}
                          </div>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                            <div>
                              <div style={{fontSize:20,fontWeight:800,color:'var(--text-h)',letterSpacing:'-0.02em',lineHeight:1}}>{Rz(price(p))}</div>

                            </div>
                            {qty>0?(
                              <div style={{display:'flex',alignItems:'center',gap:0,background:'var(--surface-1)',borderRadius:999,border:'1.5px solid var(--primary)',overflow:'hidden'}}>
                                <button onClick={()=>addCart(p.id,-1)} style={{width:32,height:32,border:'none',background:'none',fontSize:18,cursor:'pointer',color:'var(--primary)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>−</button>
                                <span style={{fontSize:14,fontWeight:800,color:'var(--primary)',minWidth:22,textAlign:'center'}}>{qty}</span>
                                <button onClick={()=>addCart(p.id,1)}  style={{width:32,height:32,border:'none',background:'none',fontSize:18,cursor:'pointer',color:'var(--primary)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>+</button>
                              </div>
                            ):(
                              <button className="btn btn-primary btn-sm" onClick={()=>addCart(p.id,1)} style={{borderRadius:999,fontSize:12}}>Add</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>}

                {checkoutStep==='cart'&&<>
                  <button className="btn btn-ghost btn-sm" style={{alignSelf:'flex-start'}} onClick={()=>setCheckoutStep('browse')}>← Continue shopping</button>
                  {cartItems.map(i=>(
                    <div key={i.id} style={{background:'#fff',borderRadius:'var(--r)',padding:'14px 16px',border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)'}}>{i.name}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{i.weight_g>=1000?'1kg':'250g'} · {Number(i.stock_qty)===0?'Roasted to order · 3-5 days':'Ships 1-2 days'}</div>
                        <div style={{display:'flex',gap:8,marginTop:8}}>
                          <button onClick={()=>setGrind(g=>({...g,[i.id]:false}))} className={!grind[i.id]?'btn btn-primary btn-xs':'btn btn-ghost btn-xs'} style={{borderRadius:999}}>Whole beans</button>
                          <button onClick={()=>setGrind(g=>({...g,[i.id]:true}))} className={grind[i.id]?'btn btn-primary btn-xs':'btn btn-ghost btn-xs'} style={{borderRadius:999}}>Ground +R3</button>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:0,background:'var(--surface-1)',borderRadius:999,border:'1.5px solid var(--primary)',overflow:'hidden'}}>
                          <button onClick={()=>addCart(i.id,-1)} style={{width:30,height:30,border:'none',background:'none',fontSize:16,cursor:'pointer',color:'var(--primary)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>−</button>
                          <span style={{fontSize:13,fontWeight:800,color:'var(--primary)',minWidth:20,textAlign:'center'}}>{i.qty}</span>
                          <button onClick={()=>addCart(i.id,1)}  style={{width:30,height:30,border:'none',background:'none',fontSize:16,cursor:'pointer',color:'var(--primary)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>+</button>
                        </div>
                        <div style={{fontWeight:800,fontSize:16,color:'var(--text-h)',minWidth:70,textAlign:'right'}}>{Rz(price(i)*i.qty)}</div>
                      </div>
                    </div>
                  ))}

                  {/* Shipping */}
                  <div className="card">
                    <div className="section-label" style={{marginBottom:10}}>Delivery method</div>
                    {SHIPPING.map(s=>(
                      <div key={s.id} onClick={()=>setShipping(s)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',marginBottom:6,background:shipping.id===s.id?'var(--primary-bg)':'var(--surface-1)',border:`1.5px solid ${shipping.id===s.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--r-sm)',cursor:'pointer'}}>
                        <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${shipping.id===s.id?'var(--primary)':'var(--border-md)'}`,background:shipping.id===s.id?'var(--primary)':'transparent',flexShrink:0}}/>
                        <span style={{fontSize:13,flex:1}}>{s.label}</span>
                        <span style={{fontWeight:700,fontSize:13,color:s.fee===0?'var(--green-text)':'var(--text-h)'}}>{s.fee===0?'FREE':Rz(s.fee)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="card">
                    {[['Subtotal',Rz(cartTotal)],['Grind',grindTotal?Rz(grindTotal):'—'],['Shipping',shipping.fee===0?'FREE':Rz(shipping.fee)]].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
                        <span style={{color:'var(--text-sub)'}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 0',fontSize:18,fontWeight:800,color:'var(--text-h)'}}>
                      <span>Total</span><span style={{color:'var(--primary)'}}>{Rz(orderTotal)}</span>
                    </div>
                  </div>

                  {/* EFT */}
                  <div className="card" style={{background:'rgba(99,102,241,0.04)',border:'1px solid var(--primary-border)'}}>
                    <div className="section-label" style={{marginBottom:10}}>Payment — EFT</div>
                    <div style={{fontSize:13,color:'var(--text-sub)',lineHeight:2}}>
                      <div>Bank: <strong>FNB</strong> · Account: <strong>OHMI Coffee Co. (Pty) Ltd</strong></div>
                      <div>Amount: <strong style={{color:'var(--primary)'}}>{Rz(orderTotal)}</strong> · Reference: <strong>{me?.full_name?.split(' ')[0]} + {me?.member_number}</strong></div>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-full" disabled={busy==='order'} onClick={placeOrder} style={{fontSize:14,padding:'14px',borderRadius:999}}>
                    {busy==='order'?'Placing order…':'Place order →'}
                  </button>
                </>}
              </>}
            </>}

            {/* ── ORDERS ── */}
            {tab==='orders'&&<>
              <div className="section-title" style={{marginBottom:16}}>My Orders</div>
              {orders.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>
                <div style={{fontSize:36,marginBottom:10}}>📦</div>
                <div style={{fontWeight:600}}>No orders yet</div>
                <button className="btn btn-primary btn-sm" style={{marginTop:16,borderRadius:999}} onClick={()=>go('shop')}>Shop coffee →</button>
              </div>}
              {orders.map(o=>{
                const prod = products.find(p=>p.id===o.package_id);
                return(
                  <div key={o.id} className="card card-flush" style={{overflow:'hidden'}}>
                    <div style={{padding:'14px 18px',background:'var(--surface-1)',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)'}}>{prod?.name||'Coffee order'}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{fmtD(o.created_at)}</div>
                      </div>
                      <span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'amber':'red'}`}>{o.status}</span>
                    </div>
                    <div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                      {[['Qty',o.quantity],['Amount',Rz(o.total)],['Delivery',o.delivery_method||'—']].map(([l,v])=>(
                        <div key={l}>
                          <div style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--text-h)'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>}

            {/* ── WELCOME PACKS ── */}
            {tab==='subscribe'&&<>
              <div className="section-title" style={{marginBottom:6}}>Welcome Packs</div>
              <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:24}}>Your activation. Coffee delivered. Network ready.</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
                {[
                  {name:'Ignition Pack',price:1499,tag:'Entry',grad:'linear-gradient(135deg,#6366F1,#818CF8)',items:['2 × 250g single origin (your choice)','1 × 250g Sunrise Surprise','5 × sample sachets','Business cards · Gift packaging']},
                  {name:'Builder Pack', price:1899,tag:'Most Popular',grad:'linear-gradient(135deg,#6366F1,#0EA5E9)',featured:true,items:['2 × 1kg single origin (your choice)','1 × 250g Sunrise Surprise','10 × sample sachets','OHMI tote bag · Business cards · Gift box']},
                  {name:'Empire Pack',  price:2499,tag:'Full Range',grad:'linear-gradient(135deg,#0EA5E9,#06B6D4)',items:['4 × 1kg all 4 origins','1 × 250g Sunrise Surprise','20 × sample sachets','OHMI mug · Tote · Premium gift box']},
                ].map(p=>(
                  <div key={p.name} style={{borderRadius:20,overflow:'hidden',border:p.featured?'2px solid #6366F1':'1px solid var(--border)',boxShadow:p.featured?'0 8px 32px rgba(99,102,241,0.18)':'var(--shadow-sm)',background:'#fff',transform:p.featured?'scale(1.02)':'scale(1)'}}>
                    <div style={{background:p.grad,padding:'22px 22px 18px'}}>
                      <div style={{display:'inline-block',background:'rgba(255,255,255,0.2)',borderRadius:999,padding:'3px 12px',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#fff',marginBottom:10}}>{p.tag}</div>
                      <div style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:8}}>{p.name}</div>
                      <div style={{fontSize:36,fontWeight:900,color:'#fff',letterSpacing:'-0.03em',lineHeight:1}}>R{p.price.toLocaleString('en-ZA')}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',marginTop:4}}>once-off · activation included</div>
                    </div>
                    <div style={{padding:'16px 20px 20px'}}>
                      {p.items.map(item=>(
                        <div key={item} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:12,color:'var(--text-sub)',alignItems:'center'}}>
                          <span style={{color:'var(--primary)',fontWeight:700,fontSize:11}}>✓</span>{item}
                        </div>
                      ))}
                      <div style={{marginTop:14,padding:'10px',background:'var(--primary-bg)',border:'1px solid var(--primary-border)',borderRadius:'var(--r-sm)',fontSize:11,color:'var(--primary)',fontWeight:600}}>
                        💰 Your sponsor earns R500 · R500 feeds binary pool
                      </div>
                      <a href={`/join`} className="btn btn-primary btn-full" style={{marginTop:14,borderRadius:12,padding:'13px',fontSize:13,display:'block',textAlign:'center'}}>
                        Get Started →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>}

            {/* ── EARNINGS ── */}
            {tab==='earnings'&&<>
              {/* Monthly KPIs */}
              <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:'var(--r)',padding:'22px 24px',color:'#fff',boxShadow:'var(--shadow-md)',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.06)',top:-30,right:-30}}/>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:6}}>This month · {new Date().toLocaleDateString('en-ZA',{month:'long',year:'numeric'})}</div>
                <div style={{fontSize:40,fontWeight:900,letterSpacing:'-0.03em',lineHeight:1,marginBottom:4}}>{Rz(thisMonthIncome)}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>Pool share: {rankDef?.pool_pct||0}% · Rank bonus: {Rz(rankDef?.monthly_bonus||0)}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
                {[
                  ['Balance',Rz(commBalance),'stat-icon-primary','ti-wallet'],
                  ['Travel pts',(me?.commission_balance||0).toLocaleString(),'stat-icon-purple','ti-sparkles'],
                  ['Pool share',`${rankDef?.pool_pct||0}%`,'stat-icon-teal','ti-chart-pie'],
                  ['Rank bonus',Rz(rankDef?.monthly_bonus||0),'stat-icon-amber','ti-star'],
                ].map(([l,v,cls,icon])=>(
                  <div key={l} className="stat-card">
                    <div className={`stat-icon ${cls}`}><i className={`ti ${icon}`}/></div>
                    <div><div className="stat-val" style={{fontSize:18}}>{v}</div><div className="stat-label">{l}</div></div>
                  </div>
                ))}
              </div>

              {/* Monthly breakdown */}
              {earningMonths.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>
                <div style={{fontSize:36,marginBottom:10}}>💰</div>
                <div style={{fontWeight:600}}>No earnings yet</div>
                <div style={{fontSize:13,marginTop:6}}>Commission is paid monthly once your rank qualifies</div>
              </div>}
              {earningMonths.map(mo=>(
                <div key={mo} className="card card-flush" style={{overflow:'hidden'}}>
                  <div style={{padding:'14px 18px',background:'var(--surface-1)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)'}}>{new Date(mo+'-01').toLocaleDateString('en-ZA',{month:'long',year:'numeric'})}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{(byMonth[mo]?.entries||[]).length} transaction{(byMonth[mo]?.entries||[]).length!==1?'s':''}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:20,fontWeight:800,color:'var(--primary)'}}>{Rz(byMonth[mo]?.income||0)}</div>
                      {(byMonth[mo]?.redemptions||0)>0&&<div style={{fontSize:11,color:'var(--red-text)'}}>−{Rz(byMonth[mo]?.redemptions||0)} redeemed</div>}
                    </div>
                  </div>
                  {(byMonth[mo]?.entries||[]).map(l=>(
                    <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 18px',borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--text-h)'}}>{l.note||l.entry_type?.replace(/_/g,' ')}</div>
                        <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{fmtD(l.created_at)}</div>
                      </div>
                      <div style={{fontSize:15,fontWeight:800,color:['redemption','expiry'].includes(l.entry_type)?'var(--red-text)':'var(--green-text)'}}>
                        {['redemption','expiry'].includes(l.entry_type)?'−':'+' }{Rz(Number(l.amount||0))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Payout banking */}
              <div className="card" style={{background:'rgba(99,102,241,0.04)',border:'1px solid var(--primary-border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div className="section-label">Payout banking</div>
                  <button className="btn btn-ghost btn-xs" onClick={()=>go('profile')}>Edit</button>
                </div>
                {[['Bank',me?.payout_bank_name],['Account',me?.payout_account_number],['Branch code',me?.payout_branch_code]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
                    <span style={{color:'var(--text-muted)'}}>{l}</span>
                    <span style={{fontWeight:600,color:v?'var(--text-h)':'var(--red-text)'}}>{v||'Not set — add to receive payouts'}</span>
                  </div>
                ))}
              </div>
            </>}

            {/* ── LIFESTYLE ── */}
            {tab==='lifestyle'&&<>
              <div style={{background:'linear-gradient(135deg,#6366F1,#8B5CF6)',borderRadius:'var(--r)',padding:'22px 24px',color:'#fff',boxShadow:'var(--shadow-md)'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:8}}>Lifestyle wallet</div>
                <div style={{fontSize:36,fontWeight:800,letterSpacing:'-0.02em'}}>{(me?.commission_balance||0).toLocaleString()} <span style={{fontSize:16,fontWeight:500,opacity:0.7}}>points</span></div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginTop:6}}>1 point = R1 of travel value · redeemable on hotels, flights and car rental</div>
              </div>
              <a href="/travel" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',background:'#fff',borderRadius:'var(--r)',border:'1px solid var(--border)',boxShadow:'var(--shadow-sm)',textDecoration:'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:28}}>✈️</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:'var(--text-h)'}}>Atlas Travel Club</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>Book hotels, flights and car rentals</div>
                  </div>
                </div>
                <i className="ti ti-arrow-right" style={{fontSize:18,color:'var(--text-muted)'}}/>
              </a>
            </>}

            {/* ── TRAINING ── */}
            {tab==='training'&&<>
              {/* Progress bar */}
              <div className="card" style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',color:'#fff'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:8}}>Training Academy</div>
                <div style={{fontSize:22,fontWeight:800,marginBottom:12}}>{trainingDone} of {training.length} modules complete</div>
                <div style={{background:'rgba(255,255,255,0.2)',borderRadius:999,height:10,overflow:'hidden',marginBottom:8}}>
                  <div style={{height:'100%',borderRadius:999,background:'#fff',width:`${trainingPct}%`,transition:'width 0.6s ease'}}/>
                </div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>{trainingPct}% complete{trainingPct===100?' · All modules done! 🎓':''}</div>
              </div>

              {/* Modules by category */}
              {Object.entries(TRAINING_CATS).map(([cat,catLabel])=>{
                const mods = training.filter(m=>m.category===cat);
                if (!mods.length) return null;
                return (
                  <div key={cat}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text-h)',marginBottom:10,marginTop:4}}>{catLabel}</div>
                    {mods.map(m=>{
                      const done = progress.find(p=>p.module_id===m.id)?.completed;
                      return (
                        <div key={m.id} style={{background:'#fff',borderRadius:'var(--r)',border:`1px solid ${done?'rgba(16,185,129,0.2)':'var(--border)'}`,padding:'16px 18px',marginBottom:8,display:'flex',alignItems:'center',gap:14,boxShadow:'var(--shadow-sm)'}}>
                          <div style={{width:40,height:40,borderRadius:'var(--r-sm)',background:done?'var(--green-bg)':'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                            {done?'✅':'📖'}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:700,color:'var(--text-h)',display:'flex',alignItems:'center',gap:8}}>
                              {m.title}
                              {m.required&&!done&&<span className="pill pill-amber" style={{fontSize:9}}>Required</span>}
                              {done&&<span className="pill pill-green" style={{fontSize:9}}>Done</span>}
                            </div>
                            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:3,lineHeight:1.5}}>{m.description}</div>
                            <div style={{fontSize:10,color:'var(--text-dim)',marginTop:4}}>{m.duration_mins||m.duration_min} min read</div>
                          </div>
                          {!done&&<button className="btn btn-primary btn-xs" style={{flexShrink:0,borderRadius:999}} onClick={()=>markTraining(m.id)}>
                            Mark done
                          </button>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>}

            {/* ── RANKS ── */}
            {tab==='ranks'&&<>
              <div className="section-title" style={{marginBottom:20}}>Rank Guide</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {rankDefs.map(r=>{
                  const isCurrent = r.rank_name===rank;
                  const isAchieved = (rankDef?.sort_order||0) >= r.sort_order;
                  return (
                    <div key={r.rank_name} style={{background:'#fff',borderRadius:'var(--r)',border:`${isCurrent?'2px':'1px'} solid ${isCurrent?r.colour:'var(--border)'}`,padding:'16px 20px',boxShadow:isCurrent?`0 4px 20px ${r.colour}30`:'var(--shadow-sm)',opacity:(!isAchieved&&!isCurrent)?0.6:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:isCurrent?12:0}}>
                        <div style={{width:36,height:36,borderRadius:'50%',background:r.colour,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 2px 8px ${r.colour}40`}}>
                          <span style={{fontSize:12,fontWeight:800,color:'#fff'}}>{r.sort_order}</span>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,fontWeight:800,color:'var(--text-h)',display:'flex',alignItems:'center',gap:8}}>
                            {r.rank_name}
                            {isCurrent&&<span style={{background:r.colour,color:'#fff',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:999,letterSpacing:'0.08em'}}>YOUR RANK</span>}
                          </div>
                          <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Weaker leg: {r.min_weaker_leg}+ members</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:15,fontWeight:800,color:r.colour}}>{r.pool_pct}% pool</div>
                          {r.monthly_bonus>0&&<div style={{fontSize:11,color:'var(--text-muted)'}}>+{Rz(r.monthly_bonus)} bonus</div>}
                        </div>
                      </div>
                      {isCurrent&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                        {[[`${r.pool_pct}%`,'Pool share'],[Rz(r.monthly_bonus||0),'Monthly bonus'],[(r.travel_pts||0).toLocaleString(),'Travel pts/mo']].map(([v,l])=>(
                          <div key={l} style={{textAlign:'center'}}>
                            <div style={{fontSize:16,fontWeight:800,color:r.colour}}>{v}</div>
                            <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{l}</div>
                          </div>
                        ))}
                      </div>}
                    </div>
                  );
                })}
              </div>
            </>}

            {/* ── PROFILE ── */}
            {tab==='profile'&&<>
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:4}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:`linear-gradient(135deg,${rankCol},${rankCol}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:'#fff',flexShrink:0,border:`3px solid ${rankCol}40`}}>
                  {me.full_name?.[0]||'?'}
                </div>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:'var(--text-h)'}}>{me.full_name}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>#{pad(me.member_number)} · {me.email}</div>
                  <span style={{display:'inline-block',background:rankCol,color:'#fff',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:999,marginTop:4}}>{rank}</span>
                </div>
              </div>

              {!editProfile?(
                <>
                  <div className="card card-flush">
                    <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span className="section-label">Personal details</span>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setEditProfile(true)}>Edit</button>
                    </div>
                    {[['Full name',me.full_name],['Email',me.email],['Phone',me.phone||'—'],['WhatsApp',me.whatsapp||'—'],['ID number',me.id_number||'—'],['Member type',me.member_type||'member'],['KYC status',me.kyc_status||'pending']].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontSize:12,color:'var(--text-muted)'}}>{l}</span>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--text-h)'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card card-flush">
                    <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)'}}><span className="section-label">Payout banking</span></div>
                    {[['Bank',me.payout_bank_name||'—'],['Account number',me.payout_account_number||'—'],['Branch code',me.payout_branch_code||'—']].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontSize:12,color:'var(--text-muted)'}}>{l}</span>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--text-h)'}}>{v}</span>
                      </div>
                    ))}
                    <div style={{padding:'12px 18px'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditProfile(true)}>Update banking →</button></div>
                  </div>
                </>
              ):(
                <div className="card">
                  <div className="section-label" style={{marginBottom:16}}>Edit profile</div>
                  {[['full_name','Full name','text'],['phone','Phone','tel'],['whatsapp','WhatsApp number','tel'],['id_number','SA ID number','text'],['payout_bank_name','Bank name','text'],['payout_account_number','Account number','text'],['payout_branch_code','Branch code','text']].map(([key,label,type])=>(
                    <div key={key} className="field">
                      <label className="field-label">{label}</label>
                      <input className="field-input" type={type} value={profileForm[key]||''} onChange={e=>setProfileForm(f=>({...f,[key]:e.target.value}))}/>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:10}}>
                    <button className="btn btn-ghost" onClick={()=>setEditProfile(false)}>Cancel</button>
                    <button className="btn btn-primary" style={{flex:1}} disabled={busy==='profile'} onClick={saveProfile}>
                      {busy==='profile'?'Saving…':'Save profile'}
                    </button>
                  </div>
                </div>
              )}

              <button className="btn btn-ghost btn-full" style={{color:'var(--red-text)'}} onClick={()=>{localStorage.clear();window.location.href='/';}}>
                <i className="ti ti-logout" style={{fontSize:14}}/> Sign out
              </button>
            </>}

          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {[['home','ti-home','Home'],['network','ti-binary-tree-2','Network'],['shop','ti-shopping-bag','Shop'],['earnings','ti-coin','Earn'],['profile','ti-user','Profile']].map(([id,icon,label])=>(
            <button key={id} className={`mobile-nav-item${tab===id?' on':''}`} onClick={()=>go(id)}>
              <i className={`ti ${icon}`}/>
              <span>{label}</span>
              {id==='shop'&&cartQty>0&&<span style={{position:'absolute',top:4,left:'50%',marginLeft:8,width:16,height:16,borderRadius:'50%',background:'var(--red)',color:'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{cartQty}</span>}
            </button>
          ))}
        </div>
      </nav>

      {toast&&<div className="toast">{toast}</div>}
    </>
  );
}
