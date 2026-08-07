'use client';
import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('home') === '1') return;
    const id = localStorage.getItem('ohmi_member_id');
    const role = localStorage.getItem('ohmi_role');
    if (id) window.location.href = role === 'admin' ? '/admin' : '/dashboard';
  }, []);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.reveal]: true }));
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const fade = (key, delay = 0) => ({
    transition: `opacity 0.7s ${delay}s ease, transform 0.7s ${delay}s ease`,
    opacity: visible[key] ? 1 : 0,
    transform: visible[key] ? 'translateY(0)' : 'translateY(28px)',
  });

  const PACKS = [
    {
      name: 'Ignition',
      price: 'R1,499',
      sub: 'Taste it. Share it. Start earning.',
      tag: 'Entry Pack',
      grad: 'linear-gradient(135deg,#6366F1,#818CF8)',
      items: ['2 × 250g single origin (your choice)', '1 × 250g Sunrise Surprise blend', '5 × sample sachets', 'Business cards · Gift packaging'],
    },
    {
      name: 'Builder',
      price: 'R1,899',
      sub: 'Build your network. Build your income.',
      tag: 'Most Popular',
      grad: 'linear-gradient(135deg,#6366F1,#0EA5E9)',
      featured: true,
      items: ['2 × 1kg single origin (your choice)', '1 × 250g Sunrise Surprise blend', '10 × sample sachets', 'OHMI tote bag · Business cards · Gift box'],
    },
    {
      name: 'Empire',
      price: 'R2,499',
      sub: 'Go all in. One team. One dream.',
      tag: 'Full Range',
      grad: 'linear-gradient(135deg,#0EA5E9,#06B6D4)',
      items: ['4 × 1kg bags — all 4 origins', '1 × 250g Sunrise Surprise blend', '20 × sample sachets', 'OHMI mug + tote + premium gift box'],
    },
  ];

  const COFFEES = [
    { name: 'Uniquely Uganda',   origin: 'East Africa',   sca: '83.0', note: 'Dark chocolate · walnut · hazelnut',   img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80', from: 'R99', size:'250g' },
    { name: 'Kiss of Kenya',     origin: 'East Africa',   sca: '83.25',note: 'Blackcurrant · citrus · brown sugar',  img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80', from: 'R109', size:'250g' },
    { name: 'Radiant Rwanda',    origin: 'East Africa',   sca: '83.5', note: 'Caramel · citrus zest · berry',        img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80', from: 'R109', size:'250g' },
    { name: 'Crown of Colombia', origin: 'South America', sca: '83.0', note: 'Chocolate caramel · juicy fruit',      img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&q=80', from: 'R119', size:'250g' },
    { name: 'Sunrise Surprise',  origin: 'House Blend',   sca: '—',    note: 'Smooth dark chocolate · sweet earth', img: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500&q=80', from: 'R119', size:'250g' },
  ];

  const STEPS = [
    { n:'01', icon:'☕', title:'Choose Your Pack',    body:"Pick your welcome pack — it's your activation. Coffee ships to your door. You're in the network from day one." },
    { n:'02', icon:'🤝', title:'Share the Coffee',    body:"Sell bags at retail margin. Bring people in and earn R500 per sign-up. Your team's subscriptions build the pool." },
    { n:'03', icon:'🌳', title:'Build the Binary',    body:"Left leg grows. Right leg grows. Your rank climbs. Monthly pool share grows with your weaker leg." },
    { n:'04', icon:'✈️', title:'Live the Lifestyle',  body:"Commission earns travel points at 1:1. Book hotels, flights, and car rentals through Vollard Black." },
  ];

  const navBg = scrollY > 60
    ? 'rgba(255,255,255,0.97)'
    : 'rgba(255,255,255,0.0)';
  const navBorder = scrollY > 60 ? '1px solid #E5E7EB' : '1px solid transparent';
  const navShadow = scrollY > 60 ? '0 2px 20px rgba(0,0,0,0.06)' : 'none';
  const navText = scrollY > 60 ? '#374151' : '#fff';
  const navLogo = scrollY > 60
    ? 'linear-gradient(135deg,#6366F1,#0EA5E9)'
    : 'linear-gradient(135deg,#fff,rgba(255,255,255,0.85))';

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#F5F6FA;color:#374151;font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
        a{color:inherit;text-decoration:none}
        ::selection{background:#6366F1;color:#fff}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#F3F4F6}
        ::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:3px}
        .btn-hero{display:inline-flex;align-items:center;justify-content:center;padding:15px 36px;border-radius:9999px;font-size:14px;font-weight:700;letter-spacing:0.04em;cursor:pointer;transition:all 0.2s;border:none;font-family:inherit}
        .btn-hero-primary{background:linear-gradient(135deg,#6366F1,#0EA5E9);color:#fff;box-shadow:0 6px 32px rgba(99,102,241,0.35)}
        .btn-hero-primary:hover{transform:translateY(-2px);box-shadow:0 10px 40px rgba(99,102,241,0.45)}
        .btn-hero-ghost{background:rgba(255,255,255,0.15);color:#fff;border:1.5px solid rgba(255,255,255,0.4);backdrop-filter:blur(8px)}
        .btn-hero-ghost:hover{background:rgba(255,255,255,0.25);transform:translateY(-2px)}
        .nav-link{font-size:13px;font-weight:600;letter-spacing:0.04em;transition:color 0.2s;cursor:pointer}
        .card-hover{transition:transform 0.2s,box-shadow 0.2s}
        .card-hover:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(99,102,241,0.15)}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:1000,
        background:navBg,borderBottom:navBorder,boxShadow:navShadow,
        height:64,display:'flex',alignItems:'center',
        padding:'0 clamp(16px,5vw,80px)',transition:'all 0.3s',backdropFilter:scrollY>60?'blur(12px)':'none'}}>
        <div style={{maxWidth:1160,margin:'0 auto',width:'100%',display:'flex',alignItems:'center',gap:32}}>
          {/* Logo */}
          <div style={{flex:1}}>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',
              background:navLogo,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',transition:'all 0.3s'}}>
              OHMI
            </div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.16em',
              color:scrollY>60?'#9CA3AF':'rgba(255,255,255,0.6)',
              textTransform:'uppercase',marginTop:0,transition:'color 0.3s'}}>
              Coffee · Lifestyle · Legacy
            </div>
          </div>

          {/* Links — desktop */}
          <div style={{display:'flex',gap:28,alignItems:'center'}}>
            {[['#coffees','Coffee'],['#packs','Join'],['#earn','Earn'],['#travel','Travel']].map(([href,label])=>(
              <a key={label} href={href} className="nav-link" style={{color:navText,transition:'color 0.3s'}}>{label}</a>
            ))}
            <a href="/login" style={{
              background:'linear-gradient(135deg,#6366F1,#0EA5E9)',color:'#fff',
              padding:'9px 22px',borderRadius:9999,fontSize:13,fontWeight:700,
              boxShadow:'0 4px 16px rgba(99,102,241,0.3)',transition:'all 0.2s',
              display:'inline-block'}}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',overflow:'hidden'}}>
        {/* Background */}
        <div style={{position:'absolute',inset:0,
          backgroundImage:'url(https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1800&q=85)',
          backgroundSize:'cover',backgroundPosition:'center',
          transform:`translateY(${scrollY*0.25}px) scale(1.08)`,
          transition:'transform 0.1s linear'}}/>
        {/* Gradient overlay */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(99,102,241,0.85) 0%,rgba(14,165,233,0.75) 50%,rgba(99,102,241,0.65) 100%)'}}/>
        {/* Pattern overlay */}
        <div style={{position:'absolute',inset:0,opacity:0.04,backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'2\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}/>

        <div style={{position:'relative',width:'100%',maxWidth:1160,margin:'0 auto',padding:'120px clamp(16px,5vw,80px) 80px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center'}}>
          {/* Left — headline */}
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:9999,padding:'6px 16px',marginBottom:28}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#34D399',display:'inline-block',boxShadow:'0 0 6px rgba(52,211,153,0.8)'}}/>
              <span style={{fontSize:11,fontWeight:700,color:'#fff',letterSpacing:'0.12em',textTransform:'uppercase'}}>Network is open · Join today</span>
            </div>
            <h1 style={{fontSize:'clamp(40px,6vw,72px)',fontWeight:900,color:'#fff',lineHeight:1.05,letterSpacing:'-0.03em',marginBottom:24}}>
              Coffee Will<br/>
              <span style={{background:'linear-gradient(135deg,#FDE68A,#FCD34D)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                Take You There
              </span>
            </h1>
            <p style={{fontSize:18,color:'rgba(255,255,255,0.82)',lineHeight:1.7,marginBottom:40,fontWeight:300,maxWidth:460}}>
              Specialty coffee from Africa's finest origins. A binary network that pays monthly. A lifestyle that travels.
            </p>
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              <a href="#packs" className="btn-hero btn-hero-primary">Join the Network</a>
              <a href="#coffees" className="btn-hero btn-hero-ghost">Explore Coffee</a>
            </div>
          </div>

          {/* Right — floating stat card */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Main card */}
            <div style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.22)',borderRadius:24,padding:'32px 28px',color:'#fff'}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:20}}>Network at a glance</div>
              {[
                ['5', 'Single origin coffees'],
                ['83+', 'Average SCA cup score'],
                ['R500', 'Binary pool per member/month'],
                ['1 : 1', 'Commission → travel points'],
              ].map(([val,label])=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>{label}</span>
                  <span style={{fontSize:20,fontWeight:800,color:'#fff',letterSpacing:'-0.02em'}}>{val}</span>
                </div>
              ))}
            </div>
            {/* Mini pool card */}
            <div style={{background:'linear-gradient(135deg,rgba(253,230,138,0.2),rgba(252,211,77,0.1))',backdropFilter:'blur(16px)',border:'1px solid rgba(253,230,138,0.3)',borderRadius:16,padding:'20px 24px',display:'flex',alignItems:'center',gap:16}}>
              <div style={{fontSize:32}}>💰</div>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:'#FDE68A',letterSpacing:'-0.02em',lineHeight:1}}>R25,000</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginTop:4}}>monthly pool at 50 members</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:6,opacity:0.6}}>
          <div style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',fontWeight:600}}>Scroll</div>
          <div style={{width:1,height:36,background:'linear-gradient(#fff,transparent)'}}/>
        </div>
      </section>

      {/* ── LOGOS / TRUST STRIP ── */}
      <section style={{background:'#fff',borderBottom:'1px solid #E5E7EB',padding:'28px clamp(16px,5vw,80px)'}}>
        <div style={{maxWidth:1160,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:48,flexWrap:'wrap',rowGap:16}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9CA3AF',marginRight:16}}>Proudly</div>
          {['100% Arabica','SCA Graded','Freshly Roasted','Bitou Foundation Partner','CPA s43 Compliant'].map(t=>(
            <div key={t} style={{display:'flex',alignItems:'center',gap:8,padding:'0 24px',borderLeft:'1px solid #E5E7EB'}}>
              <span style={{color:'#6366F1',fontSize:14}}>✓</span>
              <span style={{fontSize:12,fontWeight:600,color:'#6B7280',whiteSpace:'nowrap'}}>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── COFFEE RANGE ── */}
      <section id="coffees" style={{background:'#F5F6FA',padding:'96px clamp(16px,5vw,80px)'}}>
        <div style={{maxWidth:1160,margin:'0 auto'}}>
          <div data-reveal="c-head" style={{...fade('c-head'),textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-block',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.1))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:9999,padding:'6px 18px',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#6366F1',marginBottom:20}}>
              The Coffee
            </div>
            <h2 style={{fontSize:'clamp(32px,4vw,52px)',fontWeight:900,color:'#111827',letterSpacing:'-0.03em',lineHeight:1.1,marginBottom:16}}>
              Freshly Roasted.<br/>Single Origin. Yours.
            </h2>
            <p style={{fontSize:17,color:'#6B7280',lineHeight:1.7,maxWidth:500,margin:'0 auto'}}>
              Sourced from elevation farms across Africa and South America. Roasted to order, no middleman, no compromise.
            </p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:20}}>
            {COFFEES.map((c,i)=>(
              <div key={c.name} data-reveal={`c${i}`} className="card-hover"
                style={{...fade(`c${i}`,i*0.08),background:'#fff',borderRadius:20,overflow:'hidden',border:'1px solid #E5E7EB',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                <div style={{position:'relative',height:190,overflow:'hidden'}}>
                  <img src={c.img} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.5s'}}
                    onMouseEnter={e=>e.target.style.transform='scale(1.06)'}
                    onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 55%,rgba(0,0,0,0.5))'}}/>
                  <div style={{position:'absolute',top:12,left:12,background:'linear-gradient(135deg,#6366F1,#0EA5E9)',color:'#fff',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'3px 10px',borderRadius:9999}}>
                    {c.origin}
                  </div>
                  {c.sca!=='—'&&<div style={{position:'absolute',top:12,right:12,background:'rgba(255,255,255,0.92)',color:'#6366F1',fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:9999}}>
                    SCA {c.sca}
                  </div>}
                </div>
                <div style={{padding:'16px 18px 20px'}}>
                  <div style={{fontSize:16,fontWeight:800,color:'#111827',marginBottom:5,letterSpacing:'-0.01em'}}>{c.name}</div>
                  <div style={{fontSize:11,color:'#6B7280',lineHeight:1.6,marginBottom:14}}>{c.note}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:18,fontWeight:800,color:'#6366F1'}}>From {c.from}</div>
                      <div style={{fontSize:10,color:'#9CA3AF',marginTop:1}}>{c.size} · member price</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <span style={{width:7,height:7,borderRadius:'50%',background:'#10B981',display:'inline-block',boxShadow:'0 0 5px rgba(16,185,129,0.5)'}}/>
                      <span style={{fontSize:10,fontWeight:600,color:'#10B981'}}>In stock</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:44}}>
            <a href="/login" className="btn-hero btn-hero-primary" style={{display:'inline-flex'}}>Shop the full range →</a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{background:'#fff',padding:'96px clamp(16px,5vw,80px)'}}>
        <div style={{maxWidth:1160,margin:'0 auto'}}>
          <div data-reveal="h-head" style={{...fade('h-head'),textAlign:'center',marginBottom:64}}>
            <div style={{display:'inline-block',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.1))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:9999,padding:'6px 18px',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#6366F1',marginBottom:20}}>
              How It Works
            </div>
            <h2 style={{fontSize:'clamp(32px,4vw,52px)',fontWeight:900,color:'#111827',letterSpacing:'-0.03em',lineHeight:1.1}}>
              Four steps to<br/>
              <span style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                coffee freedom
              </span>
            </h2>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24}}>
            {STEPS.map((s,i)=>(
              <div key={s.n} data-reveal={`s${i}`}
                style={{...fade(`s${i}`,i*0.1),background:'#F9FAFB',borderRadius:20,padding:'32px 28px',border:'1px solid #E5E7EB',position:'relative',overflow:'hidden'}}>
                {/* Step number watermark */}
                <div style={{position:'absolute',top:-10,right:16,fontSize:80,fontWeight:900,color:'#E5E7EB',lineHeight:1,userSelect:'none',letterSpacing:'-0.04em'}}>{s.n}</div>
                <div style={{fontSize:36,marginBottom:20}}>{s.icon}</div>
                <h3 style={{fontSize:20,fontWeight:800,color:'#111827',marginBottom:12,letterSpacing:'-0.01em'}}>{s.title}</h3>
                <p style={{fontSize:14,color:'#6B7280',lineHeight:1.8}}>{s.body}</p>
                <div style={{marginTop:20,display:'inline-flex',alignItems:'center',gap:6,background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(14,165,233,0.08))',border:'1px solid rgba(99,102,241,0.15)',borderRadius:9999,padding:'5px 14px'}}>
                  <span style={{fontSize:11,fontWeight:700,color:'#6366F1',letterSpacing:'0.06em'}}>Step {s.n}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WELCOME PACKS ── */}
      <section id="packs" style={{background:'#F5F6FA',padding:'96px clamp(16px,5vw,80px)'}}>
        <div style={{maxWidth:1160,margin:'0 auto'}}>
          <div data-reveal="p-head" style={{...fade('p-head'),textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-block',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.1))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:9999,padding:'6px 18px',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#6366F1',marginBottom:20}}>
              Your Entry Point
            </div>
            <h2 style={{fontSize:'clamp(32px,4vw,52px)',fontWeight:900,color:'#111827',letterSpacing:'-0.03em',lineHeight:1.1,marginBottom:16}}>
              Choose your pack.<br/>Start your journey.
            </h2>
            <p style={{fontSize:17,color:'#6B7280',lineHeight:1.7,maxWidth:500,margin:'0 auto'}}>
              Your welcome pack is your activation — no separate fee. Coffee arrives at your door. You're placed in the network, ready to earn from day one.
            </p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:24,alignItems:'start'}}>
            {PACKS.map((p,i)=>(
              <div key={p.name} data-reveal={`pk${i}`}
                style={{...fade(`pk${i}`,i*0.1),borderRadius:24,overflow:'hidden',
                  boxShadow:p.featured?'0 12px 48px rgba(99,102,241,0.2)':'0 4px 20px rgba(0,0,0,0.06)',
                  border:p.featured?'2px solid rgba(99,102,241,0.4)':'1px solid #E5E7EB',
                  background:'#fff',transform:p.featured?'scale(1.03)':'scale(1)',
                  position:'relative'}}>
                {/* Gradient top bar */}
                <div style={{background:p.grad,padding:'28px 28px 24px'}}>
                  <div style={{display:'inline-block',background:'rgba(255,255,255,0.2)',borderRadius:9999,padding:'4px 12px',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#fff',marginBottom:16}}>
                    {p.tag}
                  </div>
                  <div style={{fontSize:30,fontWeight:900,color:'#fff',letterSpacing:'-0.02em',marginBottom:4}}>{p.name}</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:20,fontStyle:'italic'}}>{p.sub}</div>
                  <div>
                    <span style={{fontSize:52,fontWeight:900,color:'#fff',letterSpacing:'-0.03em',lineHeight:1}}>{p.price}</span>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.65)',marginLeft:8}}>once-off · no monthly fee</span>
                  </div>
                </div>

                {/* Body */}
                <div style={{padding:'24px 28px 28px'}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:16}}>What's inside</div>
                  {p.items.map(item=>(
                    <div key={item} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 0',borderBottom:'1px solid #F3F4F6'}}>
                      <div style={{width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                        <span style={{fontSize:10,color:'#fff',fontWeight:700}}>✓</span>
                      </div>
                      <span style={{fontSize:13,color:'#374151',lineHeight:1.5}}>{item}</span>
                    </div>
                  ))}

                  <div style={{background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(14,165,233,0.06))',border:'1px solid rgba(99,102,241,0.12)',borderRadius:12,padding:'14px 16px',margin:'20px 0',display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:20}}>💰</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'#6366F1'}}>Your sponsor earns R500</div>
                      <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>R500 feeds your binary pool monthly</div>
                    </div>
                  </div>

                  <a href="/join" style={{display:'block',textAlign:'center',background:p.grad,color:'#fff',padding:'14px',borderRadius:12,fontSize:13,fontWeight:700,letterSpacing:'0.04em',boxShadow:p.featured?'0 4px 20px rgba(99,102,241,0.3)':'none',transition:'all 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                    Get Started →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARN SECTION ── */}
      <section id="earn" style={{background:'#fff',padding:'96px clamp(16px,5vw,80px)'}}>
        <div style={{maxWidth:1160,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center'}}>
          <div data-reveal="e-text" style={fade('e-text')}>
            <div style={{display:'inline-block',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.1))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:9999,padding:'6px 18px',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#6366F1',marginBottom:24}}>
              The Income
            </div>
            <h2 style={{fontSize:'clamp(32px,4vw,52px)',fontWeight:900,color:'#111827',letterSpacing:'-0.03em',lineHeight:1.1,marginBottom:20}}>
              Your network pays<br/>
              <span style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                you every month
              </span>
            </h2>
            <p style={{fontSize:16,color:'#6B7280',lineHeight:1.8,marginBottom:40}}>
              Every member in your network contributes R500 to the binary pool monthly. Your rank determines your share. The bigger your network, the bigger your cheque.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              {[
                ['💰','R500 sign-up bonus','Paid to you immediately when someone joins under you'],
                ['📊','Binary pool share','Monthly pool distributed by rank as your legs grow'],
                ['🛍️','Retail margin','Keep the difference on every bag you sell to customers'],
                ['✈️','Travel points','Commission converts 1:1 to travel rands — book and go'],
              ].map(([icon,title,body])=>(
                <div key={title} style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.1))',border:'1px solid rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{icon}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#111827',marginBottom:3}}>{title}</div>
                    <div style={{fontSize:13,color:'#6B7280',lineHeight:1.6}}>{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div data-reveal="e-vis" style={{...fade('e-vis',0.2)}}>
            <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:24,padding:'40px 36px',color:'#fff',boxShadow:'0 20px 60px rgba(99,102,241,0.3)'}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:32}}>Monthly pool at scale</div>
              {[
                ['10 members', 'R5,000', 'pool', 'R1,500', 'to reps'],
                ['50 members', 'R25,000', 'pool', 'R7,500', 'to reps'],
                ['100 members', 'R50,000', 'pool', 'R15,000', 'to reps'],
                ['250 members', 'R125,000', 'pool', 'R37,500', 'to reps'],
              ].map(([members,pool,plabel,reps,rlabel],idx)=>(
                <div key={members} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.65)',minWidth:100}}>{members}</span>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:18,fontWeight:800,color:'#FDE68A',letterSpacing:'-0.02em'}}>{pool}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.5)'}}>{reps} to reps</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:24,padding:'16px',background:'rgba(255,255,255,0.1)',borderRadius:14,backdropFilter:'blur(8px)'}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginBottom:4}}>OHMI retains 70% for ops + foundation</div>
                <div style={{fontSize:13,color:'#fff',fontWeight:600}}>Bitou Foundation receives R15 per kg roasted</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRAVEL ── */}
      <section id="travel" style={{position:'relative',padding:'96px clamp(16px,5vw,80px)',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0}}>
          <img src="https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1600&q=85" alt="Travel" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(99,102,241,0.88),rgba(14,165,233,0.82))'}}/>
        </div>
        <div style={{position:'relative',maxWidth:1160,margin:'0 auto',textAlign:'center'}}>
          <div data-reveal="t-head" style={fade('t-head')}>
            <div style={{display:'inline-block',background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:9999,padding:'6px 18px',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#fff',marginBottom:24}}>
              Atlas Travel Club
            </div>
            <h2 style={{fontSize:'clamp(36px,5vw,64px)',fontWeight:900,color:'#fff',letterSpacing:'-0.03em',lineHeight:1.05,marginBottom:20}}>
              Your commission<br/>becomes your holiday
            </h2>
            <p style={{fontSize:17,color:'rgba(255,255,255,0.75)',lineHeight:1.7,maxWidth:520,margin:'0 auto 56px',fontWeight:300}}>
              Every rand you earn converts to a travel rand at 1:1. Book hotels, flights, and car rentals through Vollard Black. OHMI members go places.
            </p>
          </div>

          <div data-reveal="t-cards" style={{...fade('t-cards',0.2),display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:48}}>
            {[
              ['🏨','Hotels','Luxury stays worldwide'],
              ['✈️','Flights','Concierge booking service'],
              ['🚗','Car Rental','Keys waiting on arrival'],
              ['✨','1:1 Points','1 rand = 1 point = 1 rand'],
            ].map(([icon,label,sub])=>(
              <div key={label} style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:20,padding:'32px 20px',textAlign:'center',transition:'all 0.2s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.22)';e.currentTarget.style.transform='translateY(-4px)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.transform='translateY(0)';}}>
                <div style={{fontSize:40,marginBottom:16}}>{icon}</div>
                <div style={{fontSize:16,fontWeight:700,color:'#fff',marginBottom:6}}>{label}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.65)'}}>{sub}</div>
              </div>
            ))}
          </div>
          <a href="/join" className="btn-hero" style={{background:'#fff',color:'#6366F1',fontWeight:700,padding:'16px 48px',borderRadius:9999,fontSize:14,display:'inline-flex',boxShadow:'0 6px 32px rgba(0,0,0,0.2)'}}>
            Start Your Journey →
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:'#111827',padding:'60px clamp(16px,5vw,80px) 32px'}}>
        <div style={{maxWidth:1160,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:60,marginBottom:48}}>
            <div>
              <div style={{fontSize:28,fontWeight:900,letterSpacing:'-0.03em',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:8}}>OHMI</div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'#6366F1',marginBottom:16}}>Coffee · Lifestyle · Legacy</div>
              <p style={{fontSize:13,color:'#6B7280',lineHeight:1.7,maxWidth:320}}>
                Specialty coffee from Africa's finest origins, paired with a network that pays and a lifestyle that travels. Operated by Vollard Black (Pty) Ltd · Western Cape, South Africa.
              </p>
              <p style={{fontSize:11,color:'#4B5563',marginTop:12,lineHeight:1.6}}>
                OHMI Network is structured in compliance with the Consumer Protection Act s43. CPA compliant business model.
              </p>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:20}}>Platform</div>
              {[['Sign In','/login'],["Join the Network",'/join'],['Member Portal','/dashboard'],['Admin Panel','/admin']].map(([l,h])=>(
                <a key={l} href={h} style={{display:'block',fontSize:14,color:'#6B7280',marginBottom:12,transition:'color 0.2s'}}
                  onMouseEnter={e=>e.target.style.color='#fff'}
                  onMouseLeave={e=>e.target.style.color='#6B7280'}>{l}</a>
              ))}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:20}}>Coffee</div>
              {['Uniquely Uganda','Kiss of Kenya','Radiant Rwanda','Crown of Colombia','Sunrise Surprise'].map(n=>(
                <a key={n} href="/login" style={{display:'block',fontSize:14,color:'#6B7280',marginBottom:12,transition:'color 0.2s'}}
                  onMouseEnter={e=>e.target.style.color='#fff'}
                  onMouseLeave={e=>e.target.style.color='#6B7280'}>{n}</a>
              ))}
            </div>
          </div>
          <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,color:'#4B5563'}}>
            <span>© {new Date().getFullYear()} Vollard Black (Pty) Ltd · All rights reserved</span>
            <span style={{color:'#6366F1',fontWeight:600}}>It's Good Coffee.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
