'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const RANKS = ['Bronze','Silver','Gold','Platinum','Ruby','Emerald','Sapphire','Diamond','Blue Diamond','Imperial Diamond'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const NAV = [
  { id:'dashboard', label:'Dashboard' },
  { id:'store', label:'Online Store' },
  { id:'subscriptions', label:'My Subscriptions' },
  { id:'genealogy', label:'Genealogy' },
  { id:'financial', label:'Financial' },
  { id:'builder', label:'Business Builder' },
  { id:'profile', label:'My Profile' },
  { id:'help', label:'Help Center' },
  { id:'income', label:'Income Report' },
];

/* ─── tiny chart components ─── */
function Donut({ income, payout }) {
  const total = (income + payout) || 1;
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 140 140" style={{width:120,flexShrink:0}}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e8efff" strokeWidth="16"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#3b6ef5" strokeWidth="16"
        strokeDasharray={`${c*(income/total)} ${c}`} strokeLinecap="round" transform="rotate(-90 70 70)"/>
      <text x="70" y="64" textAnchor="middle" style={{fontSize:10,fill:'#9aa3b8',fontFamily:'inherit'}}>Total</text>
      <text x="70" y="82" textAnchor="middle" style={{fontSize:13,fontWeight:700,fill:'#1c2437',fontFamily:'inherit'}}>R{(income+payout).toLocaleString()}</text>
    </svg>
  );
}

function LineChart({ points }) {
  const w=560,h=150,pad=30;
  const max=Math.max(...points.map(p=>p.v),1);
  const step=(w-pad*2)/Math.max(points.length-1,1);
  const xy=points.map((p,i)=>[pad+i*step, h-pad-(p.v/max)*(h-pad*2)]);
  const path=xy.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join(' ');
  const area=path+` L${xy[xy.length-1][0]},${h-pad} L${pad},${h-pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:150}} preserveAspectRatio="none">
      <path d={area} fill="#e8efff"/>
      <path d={path} fill="none" stroke="#3b6ef5" strokeWidth="2.5"/>
      {xy.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="#3b6ef5" strokeWidth="2"/>)}
      {points.map((p,i)=><text key={i} x={pad+i*step} y={h-8} textAnchor="middle" style={{fontSize:10,fill:'#9aa3b8',fontFamily:'inherit'}}>{p.label}</text>)}
    </svg>
  );
}

function TreeNode({ node, map }) {
  const kids = map[node.id]||[];
  const L = kids.find(k=>k.leg==='L');
  const R = kids.find(k=>k.leg==='R');
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{background:node.subscribed?'#3b6ef5':'#e8efff',color:node.subscribed?'#fff':'#6b7590',borderRadius:10,padding:'10px 16px',minWidth:120,textAlign:'center',fontSize:13,fontWeight:600,boxShadow:'0 2px 8px rgba(59,110,245,.15)'}}>
        {node.display_name}<div style={{fontSize:10,opacity:.8,marginTop:3}}>{node.subscribed?(node.tier_id==='priority'?'Priority':'Standard'):'Inactive'}</div>
      </div>
      {(L||R)&&(
        <div style={{display:'flex',gap:32,marginTop:24,position:'relative'}}>
          <div style={{position:'absolute',top:-14,left:'25%',right:'25%',borderTop:'1px solid #d1d9f0'}}/>
          {['L','R'].map(leg=>{
            const child=leg==='L'?L:R;
            return (
              <div key={leg} style={{display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
                <div style={{position:'absolute',top:-14,height:14,borderLeft:'1px solid #d1d9f0'}}/>
                <div style={{fontSize:9,color:'#9aa3b8',marginBottom:6,letterSpacing:2}}>{leg}</div>
                {child?<TreeNode node={child} map={map}/>:<div style={{border:'1px dashed #d1d9f0',borderRadius:8,padding:'10px 16px',minWidth:90,textAlign:'center',fontSize:11,color:'#9aa3b8'}}>Open</div>}
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
  const [refSales, setRefSales] = useState([]);
  const [subs, setSubs] = useState([]);
  const [treeNodes, setTreeNodes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(()=>{
    (async()=>{
      const [m,n,l,r,s,tv,o]=await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('network_nodes').select('*'),
        supabase.from('commission_ledger').select('*').order('created_at',{ascending:false}),
        supabase.from('referral_sales').select('*').order('created_at',{ascending:false}),
        supabase.from('subscriptions').select('*,subscription_tiers(name,price)'),
        supabase.from('network_tree_view').select('*'),
        supabase.from('retail_orders').select('*').order('created_at',{ascending:false}),
      ]);
      const mem=m.data||[];
      setMembers(mem);setNodes(n.data||[]);setLedger(l.data||[]);
      setRefSales(r.data||[]);setSubs(s.data||[]);setTreeNodes(tv.data||[]);setOrders(o.data||[]);
      setMe(mem.find(x=>x.email==='brandon@ohmicoffee.co.za')||mem[0]||null);
    })();
  },[]);

  const downlineIds=useMemo(()=>{
    if(!me)return new Set();
    const myNode=nodes.find(n=>n.member_id===me.id);
    if(!myNode)return new Set();
    const kids={};
    nodes.forEach(n=>{if(n.parent_id)(kids[n.parent_id]=kids[n.parent_id]||[]).push(n);});
    const out=new Set();const q=[myNode.id];
    while(q.length){const id=q.pop();(kids[id]||[]).forEach(k=>{out.add(k.member_id);q.push(k.id);});}
    return out;
  },[me,nodes]);

  const myLedger=ledger.filter(l=>me&&l.member_id===me.id);
  const income=myLedger.filter(l=>l.entry_type!=='payout').reduce((s,l)=>s+Number(l.cash_amount),0);
  const payout=myLedger.filter(l=>l.entry_type==='payout').reduce((s,l)=>s+Number(l.cash_amount),0);
  const balance=income-payout;
  const points=myLedger.reduce((s,l)=>s+Number(l.points_amount),0);
  const commissions=refSales.filter(r=>me&&r.rep_id===me.id).reduce((s,r)=>s+Number(r.commission_amount),0);
  const directRefs=members.filter(m=>me&&m.referred_by===me.id);
  const activeDownline=[...downlineIds].filter(id=>subs.find(s=>s.member_id===id&&s.active)).length;
  const rankIdx=Math.min(Math.floor(activeDownline/2),RANKS.length-1);
  const mySub=subs.find(s=>me&&s.member_id===me.id);

  const joinSeries=useMemo(()=>{
    const now=new Date();const out=[];
    for(let i=6;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const v=members.filter(m=>downlineIds.has(m.id)&&m.created_at&&
        new Date(m.created_at).getMonth()===d.getMonth()&&
        new Date(m.created_at).getFullYear()===d.getFullYear()).length;
      out.push({label:MONTHS[d.getMonth()],v});
    }
    return out;
  },[members,downlineIds]);

  const teamPerf=[...downlineIds].map(id=>{
    const m=members.find(x=>x.id===id);if(!m)return null;
    const refs=members.filter(x=>x.referred_by===id).length;
    const earn=ledger.filter(l=>l.member_id===id&&l.entry_type!=='payout').reduce((s,l)=>s+Number(l.cash_amount),0);
    return{name:m.full_name,refs,earn};
  }).filter(Boolean).sort((a,b)=>b.earn-a.earn).slice(0,6);

  // Tree map
  const treeMap={};
  let treeRoot=null;
  treeNodes.forEach(n=>{
    if(!n.parent_id)treeRoot=n;
    else(treeMap[n.parent_id]=treeMap[n.parent_id]||[]).push(n);
  });

  const refLink=me?`https://ohmi-coffee-co.vercel.app/join?ref=${me.id.slice(0,8)}`:'';
  const fmtR=n=>'R'+Number(n||0).toLocaleString();
  const fmtD=d=>d?new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}):'—';
  const flash=m=>{setToast(m);setTimeout(()=>setToast(''),2500);};

  async function requestPayout(){
    const{error}=await supabase.from('commission_ledger').insert({member_id:me.id,entry_type:'payout',period:new Date().toISOString().slice(0,7)+'-01',cash_amount:balance,note:'Manual payout request'});
    if(error)flash('Payout request failed');else flash(`Payout of ${fmtR(balance)} requested ✓`);
  }

  const c='bo-card';

  return (
    <div className="bo">
      {/* ── Sidebar ── */}
      <aside className="bo-side">
        <div className="bo-logo">OHMI<b>COFFEE</b></div>
        <div className="bo-user"><span className="bo-avatar">{me?.full_name?.[0]||'·'}</span>{me?.full_name||'…'}</div>
        <nav className="bo-nav">
          {NAV.map(n=>(
            <button key={n.id} className={tab===n.id?'on':''} onClick={()=>setTab(n.id)}>{n.label}</button>
          ))}
        </nav>
        <div style={{marginTop:'auto',padding:'20px 16px'}}><Link href="/" style={{color:'#9aa3b8',fontSize:12}}>← Storefront</Link></div>
      </aside>

      {/* ── Main ── */}
      <div className="bo-body">
        <header className="bo-top">
          <div><h1>{NAV.find(n=>n.id===tab)?.label}</h1><div className="bo-crumb">Home › {NAV.find(n=>n.id===tab)?.label}</div></div>
          <div className="bo-top-right"><span className="bo-bell">🔔<i>3</i></span><span className="bo-avatar">{me?.full_name?.[0]||'·'}</span></div>
        </header>

        {/* ════ DASHBOARD ════ */}
        {tab==='dashboard'&&<>
          <div className="bo-grid3">
            <div className={`${c} bo-stat`}><span className="bo-ico">💰</span><div><div className="bo-stat-label">Income</div><div className="bo-stat-num">{fmtR(income)}</div><div className="bo-delta up">All time</div></div></div>
            <div className={`${c} bo-stat`}><span className="bo-ico">📤</span><div><div className="bo-stat-label">Total Payout</div><div className="bo-stat-num">{fmtR(payout)}</div><div className="bo-delta">Paid to date</div></div></div>
            <div className={`${c} bo-stat`}><span className="bo-ico">👛</span><div><div className="bo-stat-label">Total Balance</div><div className="bo-stat-num">{fmtR(balance)}</div><div className="bo-delta">Available</div></div></div>
            <div className={`${c} bo-donut`}><Donut income={income||1} payout={payout}/><div className="bo-donut-side"><div className="bo-donut-title">Income Payout Overview</div><div className="bo-legend"><i style={{background:'#3b6ef5'}}></i>{fmtR(income)} Income</div><div className="bo-legend"><i style={{background:'#e8efff'}}></i>{fmtR(payout)} Payout</div></div></div>
            <div className={`${c} bo-idcard`}><div className="bo-id-name">{me?.full_name||'…'}</div><div className="bo-id-role">Active Member</div><div className="bo-id-link">{refLink.replace('https://','')}</div><div className="bo-id-actions"><button onClick={()=>{navigator.clipboard?.writeText(refLink);flash('Link copied');}}>Copy</button><a href={`https://wa.me/?text=${encodeURIComponent('Join OHMI Coffee Co: '+refLink)}`} target="_blank" rel="noreferrer">WhatsApp</a></div></div>
          </div>
          <div className="bo-grid2">
            <div className={c}><div className="bo-card-title">Network <span className="dim2">Overview of team joins</span></div><LineChart points={joinSeries}/></div>
            <div className="bo-metrics">
              {[['👥','Total Referrals',directRefs.length],['🌐','Downline Team Count',downlineIds.size],['🎁','Total Bonus',fmtR(0)],['💳','Commissions',fmtR(commissions)]].map(([ico,label,val])=>(
                <div key={label} className={`${c} bo-metric`}><span className="bo-ico sm">{ico}</span><span className="bo-metric-label">{label}</span><span className="bo-metric-val">{val}</span></div>
              ))}
              <div className={`${c} bo-rank`}><div className="bo-donut-title">The next level is yours to achieve!</div><div className="bo-rank-row"><span>Current Rank</span><b>🥉 {RANKS[rankIdx]}</b></div><div className="bo-rank-row"><span>Next Rank</span><b>🥈 {RANKS[Math.min(rankIdx+1,RANKS.length-1)]}</b></div><div className="bo-bar"><i style={{width:`${Math.min(100,(activeDownline/((rankIdx+1)*2))*100)}%`}}></i></div><div className="dim2" style={{fontSize:11,marginTop:6}}>{(rankIdx+1)*2-activeDownline>0?`${(rankIdx+1)*2-activeDownline} more active subscription${(rankIdx+1)*2-activeDownline>1?'s':''} in your team to rank up`:'Rank up ready!'}</div></div>
            </div>
          </div>
          <div className="bo-grid2b">
            <div className={c}><div className="bo-card-title">Referrals</div><table className="bo-table"><thead><tr><th>User</th><th>Joined Date</th><th>Status</th></tr></thead><tbody>{directRefs.length?directRefs.map(r=><tr key={r.id}><td><b>{r.full_name}</b><div className="dim2">{r.email}</div></td><td>{fmtD(r.created_at)}</td><td>{subs.find(s=>s.member_id===r.id&&s.active)?<span className="pill on2">Active</span>:<span className="pill">Inactive</span>}</td></tr>):<tr><td colSpan="3" className="dim2">No direct referrals yet — share your link above.</td></tr>}</tbody></table></div>
            <div className={c}><div className="bo-card-title">Team performance</div><table className="bo-table"><thead><tr><th>User</th><th>Referrals</th><th>Earnings</th></tr></thead><tbody>{teamPerf.length?teamPerf.map(t=><tr key={t.name}><td><b>{t.name}</b></td><td>{t.refs}</td><td className="blue">{fmtR(t.earn)}</td></tr>):<tr><td colSpan="3" className="dim2">Team earnings appear after the first billing run.</td></tr>}</tbody></table></div>
            <div className={c}><div className="bo-card-title">Events</div>{[['Tue','Roast day — orders ship within 48h'],['Thu','Team call — 19:00 SAST'],['Sat','Waterstone tasting pop-up']].map(([d,t])=><div key={t} className="bo-event"><span className="bo-event-day">{d}</span>{t}</div>)}</div>
          </div>
        </>}

        {/* ════ ONLINE STORE ════ */}
        {tab==='store'&&<>
          <div className="bo-grid3" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
            {[{id:'250g',name:'Bugisu AA — 250g',price:100,desc:'Cocoa, stone fruit, brown sugar. The perfect trial bag.',tag:'Uganda · Mt Elgon'},{id:'1kg',name:'Bugisu AA — 1kg',price:365,desc:'The house kilo. Roasted to order, sealed same day.',tag:'Uganda · Mt Elgon'},{id:'press',name:'OHMI Plunger — 600ml',price:295,desc:'Borosilicate French press, copper band.',tag:'Brew gear'}].map(p=>(
              <div key={p.id} className={c} style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{background:'#1c2437',borderRadius:8,height:140,display:'flex',alignItems:'center',justifyContent:'center',color:'#3b6ef5',fontSize:28,fontWeight:900}}>{p.id.toUpperCase()}</div>
                <div style={{fontSize:11,color:'#9aa3b8',letterSpacing:2,textTransform:'uppercase'}}>{p.tag}</div>
                <div style={{fontWeight:700,fontSize:16}}>{p.name}</div>
                <div style={{fontSize:13,color:'#6b7590',flex:1}}>{p.desc}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                  <span style={{fontWeight:900,fontSize:20}}>R{p.price}</span>
                  <button className="bo-btn" onClick={()=>flash(`${p.name} added — checkout coming soon`)}>Add to order</button>
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ════ SUBSCRIPTIONS ════ */}
        {tab==='subscriptions'&&<>
          <div className="bo-grid2" style={{gridTemplateColumns:'1fr 1fr'}}>
            {[{id:'standard',name:'Standard',price:1000,points:400,perks:['1× 250g bag monthly','R400 Atlas travel points','Binary pool participation','15% retail commission']},{id:'priority',name:'Priority',price:2000,points:1100,perks:['2× 250g bags monthly','R1,100 Atlas travel points','Priority binary placement','15% retail commission','Concierge support']}].map(t=>{
              const active=mySub?.tier_id===t.id&&mySub?.active;
              return(
                <div key={t.id} className={c} style={{border:active?'2px solid #3b6ef5':'2px solid transparent'}}>
                  {active&&<div style={{background:'#3b6ef5',color:'#fff',fontSize:11,letterSpacing:2,textTransform:'uppercase',padding:'4px 10px',borderRadius:6,display:'inline-block',marginBottom:12}}>Your current plan</div>}
                  <div style={{fontSize:22,fontWeight:900}}>{t.name}</div>
                  <div style={{fontSize:32,fontWeight:900,margin:'10px 0'}}>R{t.price.toLocaleString()}<span style={{fontSize:14,fontWeight:400,color:'#9aa3b8'}}>/month</span></div>
                  <div style={{fontSize:13,color:'#6b7590',marginBottom:16}}>Accrues <b>{t.points} Atlas travel points</b> every billing cycle</div>
                  {t.perks.map(p=><div key={p} style={{fontSize:13,padding:'6px 0',borderBottom:'1px solid #f3f5f9',display:'flex',gap:8}}><span style={{color:'#3b6ef5'}}>✓</span>{p}</div>)}
                  <button className="bo-btn" style={{marginTop:16,width:'100%',opacity:active?.5:1}} disabled={active} onClick={()=>flash(active?'Already on this plan':'Subscription upgrade — payment coming soon')}>
                    {active?'Current plan':'Upgrade to '+t.name}
                  </button>
                </div>
              );
            })}
          </div>
          {mySub&&<div className={c} style={{marginTop:16}}>
            <div className="bo-card-title">Your subscription history</div>
            <table className="bo-table"><thead><tr><th>Plan</th><th>Status</th><th>Since</th><th>Points accrued</th></tr></thead>
            <tbody><tr><td><b>{mySub.subscription_tiers?.name||mySub.tier_id}</b></td><td>{mySub.active?<span className="pill on2">Active</span>:<span className="pill">Inactive</span>}</td><td>{fmtD(mySub.created_at)}</td><td><b className="blue">{points} pts</b></td></tr></tbody></table>
          </div>}
        </>}

        {/* ════ GENEALOGY ════ */}
        {tab==='genealogy'&&<>
          <div className={c} style={{marginBottom:16,display:'flex',gap:24,flexWrap:'wrap'}}>
            <div><span className="dim2">Total downline</span><div style={{fontWeight:700,fontSize:20}}>{downlineIds.size} members</div></div>
            <div><span className="dim2">Active in downline</span><div style={{fontWeight:700,fontSize:20,color:'#23a45b'}}>{activeDownline} active</div></div>
            <div><span className="dim2">Open slots</span><div style={{fontWeight:700,fontSize:20,color:'#3b6ef5'}}>{Math.max(0,(downlineIds.size+1)*2-downlineIds.size)} available</div></div>
          </div>
          <div className={c} style={{overflowX:'auto',paddingBottom:20}}>
            <div className="bo-card-title">Binary tree</div>
            <div style={{padding:'24px 0',minWidth:600}}>
              {treeRoot?<TreeNode node={treeRoot} map={treeMap}/>:<p className="dim2">Tree loading…</p>}
            </div>
          </div>
        </>}

        {/* ════ FINANCIAL ════ */}
        {tab==='financial'&&<>
          <div className="bo-grid3" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
            <div className={`${c} bo-stat`}><span className="bo-ico">💰</span><div><div className="bo-stat-label">Total Earned</div><div className="bo-stat-num">{fmtR(income)}</div></div></div>
            <div className={`${c} bo-stat`}><span className="bo-ico">👛</span><div><div className="bo-stat-label">Available Balance</div><div className="bo-stat-num">{fmtR(balance)}</div></div></div>
            <div className={`${c} bo-stat`}><span className="bo-ico">✈️</span><div><div className="bo-stat-label">Atlas Travel Points</div><div className="bo-stat-num">{points} pts</div></div></div>
          </div>
          {balance>0&&<div className={c} style={{marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div><div style={{fontWeight:700}}>Request payout</div><div className="dim2">Minimum R500 · Processed within 3 business days</div></div>
            <button className="bo-btn" onClick={requestPayout} disabled={balance<500}>{balance>=500?`Request ${fmtR(balance)}`:'Minimum R500 required'}</button>
          </div>}
          <div className={c}>
            <div className="bo-card-title">Commission ledger <span className="dim2">Every entry traces to a real product sale — CPA s43 audit trail</span></div>
            <table className="bo-table"><thead><tr><th>Type</th><th>Note</th><th>Period</th><th>Cash</th><th>Points</th></tr></thead>
            <tbody>{myLedger.length?myLedger.map(l=><tr key={l.id}><td><span style={{fontSize:11,background:'#e8efff',color:'#3b6ef5',borderRadius:4,padding:'2px 7px'}}>{l.entry_type.replaceAll('_',' ')}</span></td><td style={{color:'#6b7590',fontSize:12}}>{l.note}</td><td className="dim2">{l.period}</td><td><b>{l.cash_amount>0?fmtR(l.cash_amount):'—'}</b></td><td style={{color:'#3b6ef5'}}>{l.points_amount>0?`${l.points_amount} pts`:'—'}</td></tr>):<tr><td colSpan="5" className="dim2">No ledger entries yet.</td></tr>}</tbody></table>
          </div>
        </>}

        {/* ════ BUSINESS BUILDER ════ */}
        {tab==='builder'&&<>
          <div className="bo-grid2" style={{gridTemplateColumns:'1fr 1fr',marginBottom:16}}>
            <div className={c}><div className="bo-card-title">Your referral link</div>
              <div style={{background:'#f5f7fb',borderRadius:8,padding:'12px 14px',fontSize:13,wordBreak:'break-all',marginBottom:12}}>{refLink}</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button className="bo-btn" onClick={()=>{navigator.clipboard?.writeText(refLink);flash('Link copied');}}>Copy link</button>
                <a className="bo-btn" style={{textDecoration:'none'}} href={`https://wa.me/?text=${encodeURIComponent('Join me at OHMI Coffee Co: '+refLink)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
              </div>
            </div>
            <div className={c}><div className="bo-card-title">Rank progress</div>
              <div className="bo-rank-row"><span>Current</span><b>🥉 {RANKS[rankIdx]}</b></div>
              <div className="bo-rank-row"><span>Next</span><b>🥈 {RANKS[Math.min(rankIdx+1,RANKS.length-1)]}</b></div>
              <div className="bo-bar" style={{marginTop:12}}><i style={{width:`${Math.min(100,(activeDownline/((rankIdx+1)*2))*100)}%`}}></i></div>
              <p className="dim2" style={{marginTop:8,fontSize:12}}>Recruit {Math.max(0,(rankIdx+1)*2-activeDownline)} more active subscribers to rank up</p>
            </div>
          </div>
          <div className={c}><div className="bo-card-title">All 10 OHMI ranks</div>
            <table className="bo-table"><thead><tr><th>Rank</th><th>Active subscribers needed</th><th>Status</th></tr></thead>
            <tbody>{RANKS.map((r,i)=><tr key={r}><td><b>{r}</b></td><td>{(i+1)*2}</td><td>{i<rankIdx?<span className="pill on2">Achieved</span>:i===rankIdx?<span className="pill" style={{background:'#e8efff',color:'#3b6ef5'}}>Current</span>:<span className="pill">Locked</span>}</td></tr>)}</tbody></table>
          </div>
        </>}

        {/* ════ MY PROFILE ════ */}
        {tab==='profile'&&<>
          <div className="bo-grid2" style={{gridTemplateColumns:'1fr 2fr',gap:16}}>
            <div className={c} style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:'#3b6ef5',color:'#fff',fontSize:32,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{me?.full_name?.[0]||'?'}</div>
              <div style={{fontWeight:700,fontSize:18}}>{me?.full_name}</div>
              <div className="dim2">{me?.email}</div>
              <span className="pill on2">Active Member</span>
              <div style={{fontSize:12,color:'#6b7590',marginTop:4}}>Joined {fmtD(me?.created_at)}</div>
            </div>
            <div className={c}>
              <div className="bo-card-title">Account details</div>
              {[['Full name',me?.full_name],['Email',me?.email],['Member ID',me?.id?.slice(0,8)+'…'],['Subscription',mySub?.subscription_tiers?.name||'—'],['Rank',RANKS[rankIdx]],['Referral link',refLink]].map(([l,v])=>(
                <div key={l} style={{display:'flex',gap:16,padding:'10px 0',borderBottom:'1px solid #f3f5f9',fontSize:14}}>
                  <span style={{color:'#9aa3b8',minWidth:120}}>{l}</span><span style={{fontWeight:500,wordBreak:'break-all'}}>{v||'—'}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ════ HELP CENTER ════ */}
        {tab==='help'&&<>
          <div className="bo-grid2" style={{gridTemplateColumns:'1fr 1fr'}}>
            {[['How does the binary work?','Each member can have two direct recruits — a Left leg and a Right leg. Everyone else spills into the next available position below. Your pool share is calculated on the weaker leg every month.'],['When do I get paid?','Pool commissions run on the 1st of each month. Retail commissions are posted within 48 hours of a confirmed sale. Payouts are processed within 3 business days of your request.'],['What is CPA s43?','South African Consumer Protection Act Section 43 governs MLM businesses. OHMI is compliant: every commission you earn traces to real coffee sold and consumed — never to recruitment fees.'],['Atlas travel points?','R400 (Standard) or R1,100 (Priority) in Atlas travel points accrue monthly. Once the Atlas Travel Club API is live, you can redeem them for hotel stays across southern Africa.'],['How do I rank up?','Each rank requires more active paying subscribers in your total downline. Active = their subscription billed this month. See Business Builder for the full rank table.'],['Contact support','Email support@ohmicoffee.co.za or WhatsApp +27 (0)13 xxx xxxx. Office hours 08:00–17:00 SAST, Monday–Friday.']].map(([q,a])=>(
              <div key={q} className={c}><div style={{fontWeight:700,marginBottom:8}}>{q}</div><div style={{fontSize:13,color:'#6b7590',lineHeight:1.7}}>{a}</div></div>
            ))}
          </div>
        </>}

        {/* ════ INCOME REPORT ════ */}
        {tab==='income'&&<>
          <div className={c} style={{marginBottom:16}}>
            <div className="bo-card-title">Monthly income summary</div>
            <table className="bo-table"><thead><tr><th>Period</th><th>Binary pool</th><th>Retail commissions</th><th>Travel points</th><th>Total cash</th></tr></thead>
            <tbody>{['2026-08-01'].map(period=>{
              const pl=myLedger.filter(l=>l.period===period);
              const pool=pl.filter(l=>l.entry_type==='binary_pool_share').reduce((s,l)=>s+Number(l.cash_amount),0);
              const ret=pl.filter(l=>l.entry_type==='retail_commission').reduce((s,l)=>s+Number(l.cash_amount),0);
              const pts=pl.reduce((s,l)=>s+Number(l.points_amount),0);
              return(<tr key={period}><td><b>{period.slice(0,7)}</b></td><td>{fmtR(pool)}</td><td>{fmtR(ret)}</td><td style={{color:'#3b6ef5'}}>{pts} pts</td><td><b>{fmtR(pool+ret)}</b></td></tr>);
            })}</tbody></table>
          </div>
          <div className={c}>
            <div className="bo-card-title">Full ledger</div>
            <table className="bo-table"><thead><tr><th>Date</th><th>Type</th><th>Note</th><th>Amount</th></tr></thead>
            <tbody>{myLedger.map(l=><tr key={l.id}><td className="dim2">{fmtD(l.created_at)}</td><td><span style={{fontSize:11,background:'#e8efff',color:'#3b6ef5',borderRadius:4,padding:'2px 7px'}}>{l.entry_type.replaceAll('_',' ')}</span></td><td style={{fontSize:12,color:'#6b7590'}}>{l.note}</td><td style={{fontWeight:700}}>{Number(l.cash_amount)>0?fmtR(l.cash_amount):Number(l.points_amount)>0?`${l.points_amount} pts`:'—'}</td></tr>)}</tbody></table>
          </div>
        </>}

      </div>

      {toast&&<div className="toast">{toast}</div>}
    </div>
  );
}
