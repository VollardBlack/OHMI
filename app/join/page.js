'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const Rz = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA');

const PACKS = [
  {
    sku:'WP-IGNITION', name:'Ignition Pack', price:1499,
    tagline:'Taste it. Share it. Start earning.',
    tag:'Entry', grad:'linear-gradient(135deg,#6366F1,#818CF8)',
    contents:['2 × 250g single origin (your choice)','1 × 250g Sunrise Surprise','5 × sample sachets','Business cards · Gift packaging'],
  },
  {
    sku:'WP-BUILDER', name:'Builder Pack', price:1899,
    tagline:'Build your network. Build your income.',
    tag:'Most Popular', grad:'linear-gradient(135deg,#6366F1,#0EA5E9)',
    featured:true,
    contents:['2 × 1kg single origin (your choice)','1 × 250g Sunrise Surprise','10 × sample sachets','OHMI tote · Business cards · Gift box'],
  },
  {
    sku:'WP-EMPIRE', name:'Empire Pack', price:2499,
    tagline:'Go all in. One team. One dream.',
    tag:'Full Range', grad:'linear-gradient(135deg,#0EA5E9,#06B6D4)',
    contents:['4 × 1kg — all 4 origins','1 × 250g Sunrise Surprise','20 × sample sachets','OHMI mug + tote + premium gift box'],
  },
];

const COFFEES_250 = ['Uniquely Uganda 250g','Kiss of Kenya 250g','Radiant Rwanda 250g','Crown of Colombia 250g'];
const COFFEES_1KG = ['Uniquely Uganda 1kg','Kiss of Kenya 1kg','Radiant Rwanda 1kg','Crown of Colombia 1kg'];

export default function Join() {
  const [step, setStep]         = useState(1); // 1=pack 2=coffee 3=details 4=confirm 5=done
  const [pack, setPack]         = useState(null);
  const [coffeeChoices, setCoffeeChoices] = useState([]);
  const [sponsor, setSponsor]   = useState(null);
  const [sponsorCode, setSponsorCode] = useState('');
  const [sponsorErr, setSponsorErr]   = useState('');
  const [form, setForm]         = useState({ full_name:'', email:'', phone:'', password:'' });
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [ref, setRef]           = useState('');

  // Auto-fill sponsor from URL ?ref=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (code) { setSponsorCode(code); lookupSponsor(code); }
  }, []);

  async function lookupSponsor(code) {
    if (!code) return;
    const { data } = await supabase.from('members').select('id,full_name,member_number').eq('referral_code', code.toUpperCase()).single();
    if (data) { setSponsor(data); setSponsorErr(''); }
    else setSponsorErr('Referral code not found');
  }

  const needsChoices = pack && (pack.sku === 'WP-IGNITION' || pack.sku === 'WP-BUILDER');
  const choiceCount  = pack?.sku === 'WP-IGNITION' ? 2 : 2;
  const choicePool   = pack?.sku === 'WP-IGNITION' ? COFFEES_250 : COFFEES_1KG;

  function toggleChoice(c) {
    setCoffeeChoices(prev =>
      prev.includes(c) ? prev.filter(x=>x!==c)
      : prev.length < choiceCount ? [...prev, c] : prev
    );
  }

  async function submit() {
    setBusy(true); setError('');
    try {
      // Create member
      const memberNum = Math.floor(10000 + Math.random() * 90000);
      const refCode   = Math.random().toString(36).slice(2,8).toUpperCase();
      const invNum    = 'INV-' + Date.now().toString(36).toUpperCase();

      const { data: m, error: me } = await supabase.from('members').insert({
        full_name:     form.full_name.trim(),
        email:         form.email.trim().toLowerCase(),
        phone:         form.phone.trim(),
        status:        'pending',
        member_number: memberNum,
        referral_code: refCode,
        sponsor_id:    sponsor?.id || null,
        role:          'member',
      }).select().single();

      if (me) throw new Error(me.message);

      // Create activation / welcome pack order
      const ohmiNet = pack.price - 500 - 500;
      const { data: order } = await supabase.from('welcome_pack_orders').insert({
        member_id:         m.id,
        pack_id:           null,
        pack_name:         pack.name,
        pack_price:        pack.price,
        sponsor_id:        sponsor?.id || null,
        sponsor_commission:500,
        pool_contribution: 500,
        ohmi_net:          ohmiNet,
        coffee_choices:    JSON.stringify(coffeeChoices),
        status:            'pending',
        invoice_number:    invNum,
      }).select().single();

      // Create invoice
      await supabase.from('invoices').insert({
        invoice_number: invNum,
        invoice_type:   'welcome_pack',
        member_id:      m.id,
        ref_id:         order?.id,
        line_items: JSON.stringify([
          { description: pack.name, qty:1, unit_price: pack.price, total: pack.price },
        ]),
        subtotal: pack.price,
        shipping: 0,
        vat:      0,
        total:    pack.price,
        status:  'unpaid',
        due_date: new Date(Date.now() + 7*86400000).toISOString().slice(0,10),
      });

      // Notify admin
      await supabase.from('notifications').insert({
        member_id: m.id,
        type:      'new_member',
        title:     `New member: ${m.full_name}`,
        body:      `${m.full_name} registered with ${pack.name} · ${Rz(pack.price)} · Ref: ${invNum}`,
        action_url:'/admin',
      });

      // Notify sponsor
      if (sponsor?.id) {
        await supabase.from('notifications').insert({
          member_id: sponsor.id,
          type:      'commission',
          title:     'New sign-up commission!',
          body:      `${m.full_name} joined under you with ${pack.name}. R500 commission pending.`,
          action_url:'/dashboard',
        });
      }

      setRef(invNum);
      localStorage.setItem('ohmi_member_id', m.id);
      localStorage.setItem('ohmi_role', 'member');
      setStep(5);
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const Progress = () => (
    <div style={{display:'flex',gap:0,marginBottom:32}}>
      {['Pack','Coffee','Details','Confirm'].map((label,i) => {
        const n = i+1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <div style={{display:'flex',alignItems:'center',width:'100%'}}>
              {i>0&&<div style={{flex:1,height:2,background:done?'var(--primary)':'var(--border)'}}/>}
              <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,
                background:done?'var(--primary)':active?'var(--primary)':'var(--surface-2)',
                color:done||active?'#fff':'var(--text-muted)',
                boxShadow:active?'0 0 0 4px rgba(99,102,241,0.15)':'none'}}>
                {done?'✓':n}
              </div>
              {i<3&&<div style={{flex:1,height:2,background:step>n?'var(--primary)':'var(--border)'}}/>}
            </div>
            <div style={{fontSize:10,fontWeight:600,color:active?'var(--primary)':'var(--text-muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>
      <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px',paddingTop:80}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:'-0.03em',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:4}}>OHMI</div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--text-muted)'}}>Coffee · Lifestyle · Legacy</div>
        </div>

        <div style={{width:'100%',maxWidth: step===1?960:560}}>

          {/* STEP 1 — Pick pack */}
          {step===1&&<>
            <div style={{textAlign:'center',marginBottom:32}}>
              <div className="section-label" style={{marginBottom:10}}>Step 1 of 4</div>
              <div className="section-title">Choose your welcome pack</div>
              <div style={{fontSize:14,color:'var(--text-muted)',marginTop:8}}>Your pack is your activation — no separate fee. Coffee arrives at your door.</div>
            </div>

            {/* Sponsor code */}
            <div className="card" style={{marginBottom:24,display:'flex',gap:12,alignItems:'flex-end'}}>
              <div className="field" style={{flex:1,marginBottom:0}}>
                <label className="field-label">Referral code (optional)</label>
                <input className="field-input" value={sponsorCode} onChange={e=>setSponsorCode(e.target.value.toUpperCase())} placeholder="e.g. AB12CD34"/>
              </div>
              <button className="btn btn-ghost" onClick={()=>lookupSponsor(sponsorCode)}>Check</button>
            </div>
            {sponsor&&<div style={{padding:'10px 16px',background:'var(--green-bg)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'var(--r-sm)',marginBottom:20,fontSize:13,color:'var(--green-text)',display:'flex',gap:8,alignItems:'center'}}>
              <i className="ti ti-user-check"/>Referred by <strong>{sponsor.full_name}</strong> · #{String(sponsor.member_number).padStart(5,'0')}
            </div>}
            {sponsorErr&&<div style={{padding:'10px 16px',background:'var(--red-bg)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'var(--r-sm)',marginBottom:20,fontSize:13,color:'var(--red-text)'}}>{sponsorErr}</div>}

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
              {PACKS.map(p=>(
                <div key={p.sku} onClick={()=>{setPack(p);setCoffeeChoices([]);}}
                  style={{borderRadius:20,overflow:'hidden',cursor:'pointer',
                    border:`2px solid ${pack?.sku===p.sku?'#6366F1':'#E5E7EB'}`,
                    boxShadow:pack?.sku===p.sku?'0 8px 32px rgba(99,102,241,0.2)':p.featured?'0 4px 16px rgba(0,0,0,0.06)':'none',
                    transform:p.featured&&pack?.sku!==p.sku?'scale(1.02)':'scale(1)',
                    background:'#fff',transition:'all 0.2s'}}>
                  <div style={{background:p.grad,padding:'24px 24px 20px'}}>
                    <div style={{display:'inline-block',background:'rgba(255,255,255,0.2)',borderRadius:999,padding:'3px 12px',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#fff',marginBottom:12}}>{p.tag}</div>
                    <div style={{fontSize:24,fontWeight:900,color:'#fff',marginBottom:2}}>{p.name}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.75)',marginBottom:16,fontStyle:'italic'}}>{p.tagline}</div>
                    <div style={{fontSize:42,fontWeight:900,color:'#fff',letterSpacing:'-0.03em',lineHeight:1}}>{Rz(p.price)}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:4}}>once-off · activation included</div>
                  </div>
                  <div style={{padding:'20px 24px'}}>
                    {p.contents.map(c=>(
                      <div key={c} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid #F3F4F6',alignItems:'flex-start'}}>
                        <div style={{width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                          <span style={{fontSize:9,color:'#fff',fontWeight:700}}>✓</span>
                        </div>
                        <span style={{fontSize:13,color:'#374151',lineHeight:1.5}}>{c}</span>
                      </div>
                    ))}
                    <div style={{marginTop:16,padding:'12px',background:'rgba(99,102,241,0.05)',borderRadius:10,border:'1px solid rgba(99,102,241,0.12)',fontSize:12,color:'#6366F1',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                      💰 Your sponsor earns R500 · R500 feeds your binary pool
                    </div>
                    {pack?.sku===p.sku&&<div style={{marginTop:12,padding:'10px',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:10,textAlign:'center',fontSize:13,fontWeight:700,color:'#fff'}}>
                      ✓ Selected
                    </div>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',marginTop:28}}>
              <button className="btn btn-primary btn-lg" disabled={!pack} onClick={()=>setStep(needsChoices?2:3)} style={{borderRadius:999,minWidth:200}}>
                {pack?`Continue with ${pack.name} →`:'Select a pack to continue'}
              </button>
            </div>
          </>}

          {/* STEP 2 — Coffee choices */}
          {step===2&&<>
            <Progress/>
            <div className="section-title" style={{marginBottom:6}}>Choose your coffees</div>
            <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>
              Pick {choiceCount} {pack?.sku==='WP-IGNITION'?'250g':'1kg'} bags — your choice of single origin
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:28}}>
              {choicePool.map(c=>{
                const sel = coffeeChoices.includes(c);
                return (
                  <div key={c} onClick={()=>toggleChoice(c)}
                    style={{padding:'16px',borderRadius:12,cursor:'pointer',
                      background:sel?'var(--primary-bg)':'var(--white)',
                      border:`2px solid ${sel?'var(--primary)':'var(--border)'}`,
                      transition:'all 0.15s',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${sel?'var(--primary)':'var(--border-md)'}`,background:sel?'var(--primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {sel&&<span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text-h)'}}>{c}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>Single origin · 100% Arabica</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{padding:'14px 18px',background:'var(--surface-1)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)',marginBottom:24,fontSize:13,color:'var(--text-sub)'}}>
              {coffeeChoices.length}/{choiceCount} selected{coffeeChoices.length>0?`: ${coffeeChoices.join(', ')}`:''}
            </div>
            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-ghost" onClick={()=>setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{flex:1,borderRadius:999}} disabled={coffeeChoices.length<choiceCount} onClick={()=>setStep(3)}>Continue →</button>
            </div>
          </>}

          {/* STEP 3 — Personal details */}
          {step===3&&<>
            <Progress/>
            <div className="section-title" style={{marginBottom:24}}>Your details</div>
            <div className="card" style={{display:'flex',flexDirection:'column',gap:0}}>
              {[
                ['full_name','Full name','text','Brandon Marriott'],
                ['email','Email address','email','you@email.com'],
                ['phone','Phone number','tel','+27 82 000 0000'],
                ['password','Create password','password','Min 8 characters'],
              ].map(([key,label,type,ph])=>(
                <div key={key} className="field">
                  <label className="field-label">{label}</label>
                  <input className="field-input" type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/>
                </div>
              ))}
            </div>
            {error&&<div style={{padding:'12px 16px',background:'var(--red-bg)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'var(--r-sm)',marginTop:12,fontSize:13,color:'var(--red-text)'}}>{error}</div>}
            <div style={{display:'flex',gap:12,marginTop:16}}>
              <button className="btn btn-ghost" onClick={()=>setStep(needsChoices?2:1)}>← Back</button>
              <button className="btn btn-primary" style={{flex:1,borderRadius:999}} disabled={!form.full_name||!form.email||!form.phone} onClick={()=>setStep(4)}>Continue →</button>
            </div>
          </>}

          {/* STEP 4 — Confirm */}
          {step===4&&<>
            <Progress/>
            <div className="section-title" style={{marginBottom:24}}>Confirm your order</div>
            <div className="card card-flush" style={{overflow:'hidden',marginBottom:16}}>
              <div style={{background:pack.grad,padding:'20px 24px',color:'#fff'}}>
                <div style={{fontSize:18,fontWeight:800}}>{pack.name}</div>
                <div style={{fontSize:28,fontWeight:900,letterSpacing:'-0.02em',marginTop:4}}>{Rz(pack.price)}</div>
              </div>
              <div style={{padding:'16px 24px'}}>
                {coffeeChoices.length>0&&<>
                  <div className="section-label" style={{marginBottom:8}}>Your coffee choices</div>
                  {coffeeChoices.map(c=><div key={c} style={{fontSize:13,color:'var(--text-sub)',padding:'4px 0',borderBottom:'1px solid var(--border)'}}>{c}</div>)}
                  <div style={{height:12}}/>
                </>}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[['Your name',form.full_name],['Email',form.email],['Phone',form.phone],['Sponsor',sponsor?.full_name||'Direct (no sponsor)']].map(([l,v])=>(
                    <div key={l}>
                      <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text-h)'}}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card" style={{marginBottom:16}}>
              <div className="section-label" style={{marginBottom:12}}>Payment — EFT</div>
              <div style={{fontSize:13,color:'var(--text-sub)',lineHeight:2}}>
                <div>Bank: <strong>FNB</strong></div>
                <div>Account: <strong>OHMI Coffee Co. (Pty) Ltd</strong></div>
                <div>Amount: <strong style={{color:'var(--primary)'}}>{Rz(pack.price)}</strong></div>
                <div>Reference: <strong>Your name + phone</strong></div>
              </div>
              <div style={{marginTop:12,padding:'10px 14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'#B45309'}}>
                ⏱ Your account will be activated within 24 hours of payment receipt
              </div>
            </div>
            {error&&<div style={{padding:'12px 16px',background:'var(--red-bg)',borderRadius:'var(--r-sm)',fontSize:13,color:'var(--red-text)',marginBottom:12}}>{error}</div>}
            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-ghost" onClick={()=>setStep(3)}>← Back</button>
              <button className="btn btn-primary" style={{flex:1,borderRadius:999,padding:'14px'}} disabled={busy} onClick={submit}>
                {busy?'Processing…':'Confirm & Submit →'}
              </button>
            </div>
          </>}

          {/* STEP 5 — Done */}
          {step===5&&<>
            <div style={{textAlign:'center',background:'#fff',borderRadius:24,padding:'48px 32px',boxShadow:'0 8px 40px rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.15)'}}>
              <div style={{fontSize:56,marginBottom:20}}>☕</div>
              <div style={{fontSize:24,fontWeight:900,color:'var(--text-h)',letterSpacing:'-0.02em',marginBottom:8}}>You're in the network!</div>
              <div style={{fontSize:15,color:'var(--text-muted)',lineHeight:1.7,marginBottom:28}}>
                Welcome to OHMI, {form.full_name.split(' ')[0]}. Your account is pending activation.<br/>
                We'll confirm within 24 hours of payment receipt.
              </div>
              <div style={{background:'var(--surface-1)',borderRadius:'var(--r)',padding:'16px 20px',marginBottom:28,textAlign:'left'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>Your invoice reference</div>
                <div style={{fontSize:20,fontWeight:800,color:'var(--primary)',fontFamily:'monospace'}}>{ref}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Use this as your EFT payment reference</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <a href="/dashboard" className="btn btn-primary btn-full" style={{borderRadius:999,padding:'14px',fontSize:14}}>Go to my dashboard →</a>
                <a href="/" className="btn btn-ghost btn-full" style={{borderRadius:999}}>Back to home</a>
              </div>
            </div>
          </>}
        </div>
      </div>
    </>
  );
}
