'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState({});

  // Redirect logged-in users
  useEffect(() => {
    const id    = localStorage.getItem('ohmi_member_id');
    const admin = localStorage.getItem('ohmi_role');
    if (id) window.location.href = admin === 'admin' ? '/admin' : '/dashboard';
  }, []);

  // Parallax on hero
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Intersection observer for scroll-reveal
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setVisible(v => ({ ...v, [e.target.dataset.reveal]: true }));
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const reveal = key => ({
    transition: 'opacity 0.8s ease, transform 0.8s ease',
    opacity:    visible[key] ? 1 : 0,
    transform:  visible[key] ? 'translateY(0)' : 'translateY(32px)',
  });

  const PACKS = [
    {
      name:    'Ignition',
      price:   'R1,499',
      tagline: 'Taste it. Share it. Start earning.',
      tag:     'Entry',
      tagCol:  '#6366F1',
      items:   ['2 × 250g single origin (your choice)', '1 × 250g Sunrise Surprise', '5 × sample sachets to share', 'Business cards · Gift packaging'],
      earn:    'Sponsor earns R500',
      border:  'rgba(99,102,241,0.3)',
    },
    {
      name:    'Builder',
      price:   'R1,899',
      tagline: 'Build your network. Build your income.',
      tag:     'Most Popular',
      tagCol:  '#C9973A',
      items:   ['2 × 1kg single origin (your choice)', '1 × 250g Sunrise Surprise', '10 × sample sachets to share', 'OHMI tote bag · Business cards · Gift packaging'],
      earn:    'Sponsor earns R500',
      border:  'rgba(201,151,58,0.5)',
      featured: true,
    },
    {
      name:    'Empire',
      price:   'R2,499',
      tagline: 'Go all in. One team. One dream.',
      tag:     'Full Range',
      tagCol:  '#10B981',
      items:   ['4 × 1kg bags — all 4 origins', '1 × 250g Sunrise Surprise', '20 × sample sachets to share', 'OHMI mug + tote + premium gift box'],
      earn:    'Sponsor earns R500',
      border:  'rgba(16,185,129,0.3)',
    },
  ];

  const COFFEES = [
    { name: 'Uniquely Uganda',   origin: 'East Africa',   note: 'Dark chocolate · walnut · hazelnut',         img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80' },
    { name: 'Kiss of Kenya',     origin: 'East Africa',   note: 'Blackcurrant · citrus · brown sugar',        img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80' },
    { name: 'Radiant Rwanda',    origin: 'East Africa',   note: 'Caramel · citrus zest · berry',              img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80' },
    { name: 'Crown of Colombia', origin: 'South America', note: 'Chocolatey caramel · juicy fruit',           img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=80' },
    { name: 'Sunrise Surprise',  origin: 'House Blend',   note: 'Smooth dark chocolate · sweet earth',        img: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80' },
  ];

  const S = {
    // Fonts
    display: "'Playfair Display', Georgia, serif",
    sans:    "'Inter', -apple-system, sans-serif",
    // Colours
    ink:     '#0A0A0A',
    dark:    '#111111',
    card:    '#1A1A1A',
    border:  'rgba(255,255,255,0.08)',
    gold:    '#C9973A',
    goldLt:  '#DDB96A',
    cream:   '#F5F0E8',
    muted:   '#8A8580',
    dim:     '#4A4845',
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${S.ink}; color: ${S.cream}; font-family: ${S.sans}; -webkit-font-smoothing: antialiased; }
        a { color: inherit; text-decoration: none; }
        ::selection { background: ${S.gold}; color: #000; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${S.dark}; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,
        background:'rgba(10,10,10,0.85)',backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',height:64,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 clamp(20px, 5vw, 80px)'}}>
        <div style={{fontFamily:S.display,fontSize:24,fontWeight:700,color:S.cream,letterSpacing:'0.02em'}}>
          OHMI<span style={{color:S.gold}}>.</span>
        </div>
        <div style={{display:'flex',gap:32,alignItems:'center'}}>
          {[['#coffees','Coffee'],['#packs','Join'],['#earn','Earn'],['#travel','Travel']].map(([href,label])=>(
            <a key={label} href={href} style={{fontSize:12,fontWeight:600,color:S.muted,letterSpacing:'0.08em',textTransform:'uppercase',transition:'color 0.2s'}}
              onMouseEnter={e=>e.target.style.color=S.cream}
              onMouseLeave={e=>e.target.style.color=S.muted}>
              {label}
            </a>
          ))}
          <a href="/login" style={{background:S.gold,color:'#000',padding:'9px 22px',borderRadius:999,
            fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
            transition:'all 0.2s',boxShadow:'0 4px 20px rgba(201,151,58,0.25)'}}>
            Sign in
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{position:'relative',height:'100vh',minHeight:600,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {/* Background image */}
        <div style={{
          position:'absolute',inset:0,
          backgroundImage:'url(https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1800&q=80)',
          backgroundSize:'cover',backgroundPosition:'center',
          transform:`translateY(${scrollY * 0.3}px) scale(1.1)`,
          transition:'transform 0.1s linear',
        }}/>
        {/* Dark overlay */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.92) 100%)'}}/>
        {/* Gold vignette */}
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 80%, rgba(201,151,58,0.12) 0%, transparent 60%)'}}/>

        {/* Content */}
        <div style={{position:'relative',textAlign:'center',padding:'0 24px',maxWidth:860,margin:'0 auto'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.28em',textTransform:'uppercase',
            color:S.gold,marginBottom:20,opacity:0.9}}>
            One Team · One Dream · One Legacy
          </div>
          <h1 style={{fontFamily:S.display,fontSize:'clamp(48px,8vw,96px)',fontWeight:700,
            color:S.cream,lineHeight:1.05,letterSpacing:'-0.02em',marginBottom:24}}>
            Coffee Will<br/>
            <em style={{color:S.gold,fontStyle:'italic'}}>Take You There</em>
          </h1>
          <p style={{fontSize:'clamp(15px,2vw,19px)',color:'rgba(245,240,232,0.7)',
            lineHeight:1.7,maxWidth:520,margin:'0 auto 40px',fontWeight:300}}>
            Specialty coffee from the world's finest origins. A network that earns. A lifestyle that travels.
          </p>
          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <a href="#packs" style={{background:S.gold,color:'#000',padding:'16px 40px',
              borderRadius:999,fontSize:13,fontWeight:700,letterSpacing:'0.08em',
              textTransform:'uppercase',transition:'all 0.2s',
              boxShadow:'0 6px 32px rgba(201,151,58,0.35)',display:'inline-block'}}>
              Join the Network
            </a>
            <a href="#coffees" style={{background:'rgba(255,255,255,0.08)',color:S.cream,
              padding:'16px 40px',borderRadius:999,fontSize:13,fontWeight:600,
              letterSpacing:'0.06em',textTransform:'uppercase',
              border:'1px solid rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',display:'inline-block'}}>
              Explore Coffees
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',
          display:'flex',flexDirection:'column',alignItems:'center',gap:8,opacity:0.5}}>
          <div style={{fontSize:10,letterSpacing:'0.16em',textTransform:'uppercase',color:S.muted}}>Scroll</div>
          <div style={{width:1,height:40,background:`linear-gradient(${S.gold},transparent)`}}/>
        </div>
      </section>

      {/* ── STAT STRIP ───────────────────────────────────── */}
      <section style={{background:S.dark,borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'32px clamp(20px,5vw,80px)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:32}}>
          {[
            ['5', 'Specialty Origins'],
            ['83+', 'SCA Cup Score'],
            ['R500', 'Binary Pool / Member / Month'],
            ['1:1', 'Points → Travel Rands'],
          ].map(([num, label]) => (
            <div key={label} style={{textAlign:'center'}}>
              <div style={{fontFamily:S.display,fontSize:42,fontWeight:700,color:S.gold,lineHeight:1,letterSpacing:'-0.02em',marginBottom:6}}>{num}</div>
              <div style={{fontSize:11,color:S.muted,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COFFEE RANGE ─────────────────────────────────── */}
      <section id="coffees" style={{padding:'100px clamp(20px,5vw,80px)',background:S.ink}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div data-reveal="coffee-head" style={{...reveal('coffee-head'),textAlign:'center',marginBottom:64}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.24em',textTransform:'uppercase',color:S.gold,marginBottom:16}}>The Range</div>
            <h2 style={{fontFamily:S.display,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,color:S.cream,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:20}}>
              Freshly Roasted.<br/>Single Origin. Yours.
            </h2>
            <p style={{fontSize:16,color:S.muted,lineHeight:1.7,maxWidth:480,margin:'0 auto'}}>
              Sourced from elevation farms across Africa and South America. Roasted to order. No middleman, no compromise.
            </p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
            {COFFEES.map((c, i) => (
              <div key={c.name} data-reveal={`coffee-${i}`}
                style={{...reveal(`coffee-${i}`),transitionDelay:`${i*0.1}s`,
                  background:S.card,borderRadius:16,overflow:'hidden',
                  border:'1px solid rgba(255,255,255,0.07)',
                  transition:`opacity 0.8s ${i*0.1}s ease, transform 0.8s ${i*0.1}s ease, box-shadow 0.2s, border-color 0.2s`
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(201,151,58,0.4)';e.currentTarget.style.boxShadow='0 8px 40px rgba(201,151,58,0.15)';e.currentTarget.style.transform='translateY(-4px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
                <div style={{height:180,overflow:'hidden',position:'relative'}}>
                  <img src={c.img} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.5s ease'}}
                    onMouseEnter={e=>e.target.style.transform='scale(1.05)'}
                    onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 50%,rgba(0,0,0,0.6))'}}/>
                  <div style={{position:'absolute',top:12,left:12,background:'rgba(201,151,58,0.9)',color:'#000',
                    fontSize:9,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',
                    padding:'3px 10px',borderRadius:999}}>
                    {c.origin}
                  </div>
                </div>
                <div style={{padding:'16px 18px 20px'}}>
                  <div style={{fontFamily:S.display,fontSize:17,fontWeight:700,color:S.cream,marginBottom:6,lineHeight:1.2}}>{c.name}</div>
                  <div style={{fontSize:11,color:S.muted,lineHeight:1.6}}>{c.note}</div>
                  <div style={{marginTop:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:S.cream}}>From R125 <span style={{fontSize:10,fontWeight:400,color:S.muted}}>250g</span></div>
                      <div style={{fontSize:10,color:S.muted,marginTop:1}}>Member pricing</div>
                    </div>
                    <div style={{width:8,height:8,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 6px rgba(34,197,94,0.6)'}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:40}}>
            <a href="/login" style={{background:'transparent',color:S.gold,border:`1px solid rgba(201,151,58,0.4)`,
              padding:'12px 32px',borderRadius:999,fontSize:12,fontWeight:700,
              letterSpacing:'0.08em',textTransform:'uppercase',display:'inline-block',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.target.style.background='rgba(201,151,58,0.1)';}}
              onMouseLeave={e=>{e.target.style.background='transparent';}}>
              Shop the full range →
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section style={{padding:'100px clamp(20px,5vw,80px)',background:S.dark,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-200,right:-200,width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,151,58,0.05) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div data-reveal="how-head" style={{...reveal('how-head'),textAlign:'center',marginBottom:80}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.24em',textTransform:'uppercase',color:S.gold,marginBottom:16}}>The Opportunity</div>
            <h2 style={{fontFamily:S.display,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,color:S.cream,letterSpacing:'-0.02em',lineHeight:1.1}}>
              Good Coffee.<br/>
              <em style={{color:S.gold,fontStyle:'italic'}}>Real Income.</em>
            </h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:32}}>
            {[
              { n:'01', title:'Join the Network', body:"Choose your welcome pack. Coffee lands at your door. You're activated, placed in the binary tree, and ready to earn from day one.", icon:'☕' },
              { n:'02', title:'Share What You Love', body:"Every bag you sell earns retail margin. Every person you bring in earns you R500. Your team's monthly subscriptions build your binary pool.", icon:'🤝' },
              { n:'03', title:'Build the Binary', body:'Left leg grows. Right leg grows. Your rank climbs. As your weaker leg strengthens, your share of the monthly pool grows with it.', icon:'🌳' },
              { n:'04', title:'Live the Lifestyle', body:'Commission converts to travel points at 1:1. Book hotels, flights, and car rentals directly through OHMI. Coffee takes you there.', icon:'✈️' },
            ].map((step, i) => (
              <div key={step.n} data-reveal={`step-${i}`}
                style={{...reveal(`step-${i}`),transitionDelay:`${i*0.12}s`,transition:`opacity 0.8s ${i*0.12}s ease, transform 0.8s ${i*0.12}s ease`}}>
                <div style={{fontSize:11,fontWeight:700,color:S.gold,letterSpacing:'0.14em',marginBottom:16}}>{step.n}</div>
                <div style={{fontSize:32,marginBottom:16}}>{step.icon}</div>
                <h3 style={{fontFamily:S.display,fontSize:22,fontWeight:700,color:S.cream,marginBottom:12,lineHeight:1.2}}>{step.title}</h3>
                <p style={{fontSize:14,color:S.muted,lineHeight:1.8}}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WELCOME PACKS ─────────────────────────────────── */}
      <section id="packs" style={{padding:'100px clamp(20px,5vw,80px)',background:S.ink}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div data-reveal="packs-head" style={{...reveal('packs-head'),textAlign:'center',marginBottom:64}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.24em',textTransform:'uppercase',color:S.gold,marginBottom:16}}>Your Entry Point</div>
            <h2 style={{fontFamily:S.display,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,color:S.cream,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:20}}>
              Choose Your Pack.<br/>Start Your Journey.
            </h2>
            <p style={{fontSize:16,color:S.muted,lineHeight:1.7,maxWidth:480,margin:'0 auto'}}>
              Your welcome pack is your activation. No separate fee. What you pay for the pack gets you placed in the network, coffee in hand, ready to earn.
            </p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20,alignItems:'start'}}>
            {PACKS.map((p, i) => (
              <div key={p.name} data-reveal={`pack-${i}`}
                style={{
                  ...reveal(`pack-${i}`),
                  transitionDelay:`${i*0.12}s`,
                  transition:`opacity 0.8s ${i*0.12}s ease, transform 0.8s ${i*0.12}s ease`,
                  background: p.featured ? 'linear-gradient(145deg,#1E1A12,#151208)' : S.card,
                  borderRadius:20,overflow:'hidden',
                  border:`1px solid ${p.border}`,
                  boxShadow: p.featured ? `0 8px 48px rgba(201,151,58,0.15)` : 'none',
                  position:'relative',
                  marginTop: p.featured ? 0 : 0,
                }}>
                {p.featured && (
                  <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${S.gold},${S.goldLt},${S.gold})`}}/>
                )}
                <div style={{padding:'32px 28px 28px'}}>
                  {/* Tag */}
                  <div style={{display:'inline-block',background:`rgba(${p.tagCol==='#C9973A'?'201,151,58':p.tagCol==='#6366F1'?'99,102,241':'16,185,129'},0.12)`,
                    color:p.tagCol,border:`1px solid rgba(${p.tagCol==='#C9973A'?'201,151,58':p.tagCol==='#6366F1'?'99,102,241':'16,185,129'},0.3)`,
                    fontSize:9,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',
                    padding:'4px 12px',borderRadius:999,marginBottom:20}}>
                    {p.tag}
                  </div>

                  {/* Name + price */}
                  <h3 style={{fontFamily:S.display,fontSize:28,fontWeight:700,color:S.cream,marginBottom:4,lineHeight:1}}>{p.name}</h3>
                  <div style={{fontSize:13,color:S.muted,marginBottom:24,fontStyle:'italic'}}>{p.tagline}</div>
                  <div style={{marginBottom:28}}>
                    <span style={{fontFamily:S.display,fontSize:48,fontWeight:700,color:p.featured?S.gold:S.cream,letterSpacing:'-0.03em',lineHeight:1}}>{p.price}</span>
                    <span style={{fontSize:12,color:S.muted,marginLeft:8}}>once-off</span>
                  </div>

                  {/* What's inside */}
                  <div style={{marginBottom:28}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:S.gold,marginBottom:14}}>What's inside</div>
                    {p.items.map(item => (
                      <div key={item} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                        <span style={{color:S.gold,flexShrink:0,marginTop:1,fontSize:12}}>✓</span>
                        <span style={{fontSize:13,color:'rgba(245,240,232,0.75)',lineHeight:1.5}}>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Earn line */}
                  <div style={{background:'rgba(201,151,58,0.06)',border:'1px solid rgba(201,151,58,0.15)',
                    borderRadius:10,padding:'12px 14px',marginBottom:24,
                    display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:16}}>💰</span>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:S.gold}}>{p.earn}</div>
                      <div style={{fontSize:10,color:S.dim,marginTop:2}}>R500 feeds binary pool · grows with your network</div>
                    </div>
                  </div>

                  <a href="/join" style={{
                    display:'block',textAlign:'center',
                    background: p.featured ? S.gold : 'transparent',
                    color: p.featured ? '#000' : S.cream,
                    border: p.featured ? 'none' : `1px solid rgba(255,255,255,0.2)`,
                    padding:'15px',borderRadius:12,
                    fontSize:13,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',
                    transition:'all 0.2s',
                    boxShadow: p.featured ? '0 4px 24px rgba(201,151,58,0.3)' : 'none',
                  }}
                    onMouseEnter={e=>{if(!p.featured){e.currentTarget.style.background='rgba(255,255,255,0.08)';}else{e.currentTarget.style.background=S.goldLt;}}}
                    onMouseLeave={e=>{if(!p.featured){e.currentTarget.style.background='transparent';}else{e.currentTarget.style.background=S.gold;}}}>
                    Get Started →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARN + TRAVEL ─────────────────────────────────── */}
      <section id="earn" style={{padding:'100px clamp(20px,5vw,80px)',background:S.dark}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center'}}>
          <div data-reveal="earn-text" style={reveal('earn-text')}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.24em',textTransform:'uppercase',color:S.gold,marginBottom:20}}>Six Ways to Earn</div>
            <h2 style={{fontFamily:S.display,fontSize:'clamp(32px,4vw,52px)',fontWeight:700,color:S.cream,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:24}}>
              Your Coffee Network<br/>
              <em style={{color:S.gold,fontStyle:'italic'}}>Pays You Monthly</em>
            </h2>
            <p style={{fontSize:15,color:S.muted,lineHeight:1.8,marginBottom:36}}>
              Every subscription in your network contributes R500 to the binary pool every month. Your rank determines your share. The stronger your weaker leg, the bigger your cheque.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {[
                ['Sign-up Bonus',      'R500 direct to you every time someone joins under you'],
                ['Binary Pool Share',  'Monthly pool distributed by rank — grows as your legs grow'],
                ['Retail Margin',      'You keep the difference between wholesale and retail on every bag you sell'],
                ['Travel Points',      'Commission converts 1:1 to travel rands — book hotels and flights'],
              ].map(([title, body]) => (
                <div key={title} style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:S.gold,flexShrink:0,marginTop:6}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:S.cream,marginBottom:4}}>{title}</div>
                    <div style={{fontSize:13,color:S.muted,lineHeight:1.6}}>{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div data-reveal="earn-img" style={{...reveal('earn-img'),transitionDelay:'0.2s',position:'relative',borderRadius:20,overflow:'hidden',aspectRatio:'4/5'}}>
            <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80"
              alt="Team success" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(201,151,58,0.12) 0%,transparent 60%)'}}/>
            <div style={{position:'absolute',bottom:24,left:24,right:24,background:'rgba(10,10,10,0.85)',
              backdropFilter:'blur(12px)',borderRadius:14,padding:'20px 24px',
              border:'1px solid rgba(201,151,58,0.2)'}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:S.gold,marginBottom:8}}>At 50 active members</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                <div>
                  <div style={{fontFamily:S.display,fontSize:36,fontWeight:700,color:S.cream,lineHeight:1}}>R25,000</div>
                  <div style={{fontSize:11,color:S.muted,marginTop:4}}>binary pool per month</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:S.display,fontSize:22,fontWeight:700,color:S.gold}}>R7,500</div>
                  <div style={{fontSize:11,color:S.muted,marginTop:4}}>to rep network</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRAVEL ───────────────────────────────────────── */}
      <section id="travel" style={{position:'relative',padding:'100px clamp(20px,5vw,80px)',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0}}>
          <img src="https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1600&q=80"
            alt="Travel" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.78)'}}/>
        </div>
        <div style={{position:'relative',maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
          <div data-reveal="travel-head" style={reveal('travel-head')}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.24em',textTransform:'uppercase',color:S.gold,marginBottom:16}}>Atlas Travel Club</div>
            <h2 style={{fontFamily:S.display,fontSize:'clamp(36px,5vw,64px)',fontWeight:700,color:S.cream,letterSpacing:'-0.02em',lineHeight:1.05,marginBottom:24}}>
              Your Commission<br/>
              <em style={{color:S.gold,fontStyle:'italic'}}>Becomes Your Holiday</em>
            </h2>
            <p style={{fontSize:16,color:'rgba(245,240,232,0.65)',lineHeight:1.8,maxWidth:540,margin:'0 auto 48px',fontWeight:300}}>
              Every rand you earn in commission converts to a travel rand at 1:1. Book hotels, flights, and car rentals through Vollard Black. OHMI members go places.
            </p>
          </div>
          <div data-reveal="travel-cards" style={{...reveal('travel-cards'),display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:48}}>
            {[
              { icon:'🏨', label:'Hotels', sub:'Luxury stays worldwide' },
              { icon:'✈️', label:'Flights', sub:'Concierge booking service' },
              { icon:'🚗', label:'Car Rental', sub:'Keys waiting on arrival' },
              { icon:'✨', label:'Lifestyle Points', sub:'1 rand = 1 point = 1 rand' },
            ].map(card => (
              <div key={card.label} style={{background:'rgba(255,255,255,0.05)',backdropFilter:'blur(12px)',
                border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'28px 20px',textAlign:'center',
                transition:'all 0.2s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(201,151,58,0.08)';e.currentTarget.style.borderColor='rgba(201,151,58,0.3)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';}}>
                <div style={{fontSize:36,marginBottom:12}}>{card.icon}</div>
                <div style={{fontSize:15,fontWeight:700,color:S.cream,marginBottom:6}}>{card.label}</div>
                <div style={{fontSize:12,color:S.muted}}>{card.sub}</div>
              </div>
            ))}
          </div>
          <a href="/join" style={{background:S.gold,color:'#000',padding:'16px 48px',
            borderRadius:999,fontSize:13,fontWeight:700,letterSpacing:'0.08em',
            textTransform:'uppercase',display:'inline-block',
            boxShadow:'0 6px 32px rgba(201,151,58,0.4)'}}>
            Start Your Journey →
          </a>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{background:S.dark,borderTop:'1px solid rgba(255,255,255,0.06)',padding:'48px clamp(20px,5vw,80px)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr auto',gap:40,alignItems:'start'}}>
          <div>
            <div style={{fontFamily:S.display,fontSize:28,fontWeight:700,color:S.cream,marginBottom:8}}>
              OHMI<span style={{color:S.gold}}>.</span>
            </div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.22em',textTransform:'uppercase',color:S.gold,marginBottom:16}}>
              Coffee · Lifestyle · Legacy
            </div>
            <p style={{fontSize:13,color:S.muted,lineHeight:1.7,maxWidth:360}}>
              Operated by Vollard Black (Pty) Ltd · Western Cape, South Africa. OHMI Network is structured in compliance with the Consumer Protection Act s43.
            </p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12,alignItems:'flex-end'}}>
            {[['Sign in','/login'],['Join the network','/join'],['Member portal','/dashboard']].map(([label,href])=>(
              <a key={label} href={href} style={{fontSize:13,color:S.muted,transition:'color 0.2s'}}
                onMouseEnter={e=>e.target.style.color=S.gold}
                onMouseLeave={e=>e.target.style.color=S.muted}>
                {label}
              </a>
            ))}
          </div>
        </div>
        <div style={{maxWidth:1100,margin:'32px auto 0',paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.05)',
          display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:S.dim}}>
          <span>© {new Date().getFullYear()} Vollard Black (Pty) Ltd · All rights reserved</span>
          <span>It's Good Coffee.</span>
        </div>
      </footer>
    </>
  );
}
