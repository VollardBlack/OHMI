'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const Rz = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA',{maximumFractionDigits:0});
const dateIn = days => { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';

// Curated OHMI destinations — hand-picked, aspirational
const DESTINATIONS = [
  { id:'cpt',  name:'Cape Town',      country:'South Africa', tag:'Home Ground',  img:'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=700&q=80', from:'R1,200',   desc:'Table Mountain · V&A Waterfront · Winelands' },
  { id:'jnb',  name:'Johannesburg',   country:'South Africa', tag:'Business Hub', img:'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=700&q=80', from:'R950',    desc:'Sandton · Soweto · Cradle of Humankind' },
  { id:'mru',  name:'Mauritius',      country:'Indian Ocean', tag:'Beach Escape', img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80', from:'R4,200',  desc:'White beaches · Turquoise lagoons · Luxury resorts' },
  { id:'znz',  name:'Zanzibar',       country:'Tanzania',     tag:'Island Life',  img:'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=700&q=80', from:'R3,800',  desc:'Stone Town · Spice routes · Pristine beaches' },
  { id:'dxb',  name:'Dubai',          country:'UAE',          tag:'City of Gold', img:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700&q=80', from:'R5,500',  desc:'Burj Khalifa · Desert safari · World-class shopping' },
  { id:'nbo',  name:'Nairobi',        country:'Kenya',        tag:'Safari Gateway',img:'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=700&q=80', from:'R2,900', desc:'Masai Mara gateway · Karen Blixen · Giraffe Centre' },
  { id:'lhr',  name:'London',         country:'United Kingdom',tag:'World Class', img:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=700&q=80', from:'R12,000', desc:'West End · Museums · Royal palaces · Premier football' },
  { id:'grj',  name:'Garden Route',   country:'South Africa', tag:'Road Trip',    img:'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=700&q=80', from:'R1,500',  desc:'Knysna · Plettenberg Bay · Tsitsikamma · Mossel Bay' },
];

const AIRPORTS = ['CPT – Cape Town','JNB – Johannesburg','DUR – Durban','PLZ – Port Elizabeth','GRJ – George','NBO – Nairobi','DXB – Dubai','LHR – London Heathrow','MRU – Mauritius','ZNZ – Zanzibar','MLA – Malta','CDG – Paris'];

export default function Travel() {
  const [me, setMe]           = useState(null);
  const [ptBal, setPtBal]     = useState(0);
  const [bookings, setBookings]= useState([]);
  const [requests, setRequests]= useState([]);
  const [view, setView]       = useState('explore'); // explore | hotels | flight | car | mytrips
  const [selDest, setSelDest] = useState(null);
  const [toast, setToast]     = useState('');
  const flash = m => { setToast(m); setTimeout(()=>setToast(''),3000); };

  // Hotel search
  const [checkIn, setCheckIn]  = useState(dateIn(14));
  const [checkOut, setCheckOut]= useState(dateIn(17));
  const [guests, setGuests]    = useState(2);
  const [hotels, setHotels]    = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched]   = useState(false);
  const [selHotel, setSelHotel]   = useState(null);
  const [pts, setPts]             = useState(0);
  const [bookBusy, setBookBusy]   = useState(false);
  const [bookRef, setBookRef]     = useState('');

  // Flight request
  const [fl, setFl] = useState({ from:'', to:'', depart:dateIn(21), ret:dateIn(28), trip:'return', pax:'1', cabin:'Economy', notes:'' });
  const [flPts, setFlPts] = useState(0);
  const [flBusy, setFlBusy] = useState(false);
  const [flRef, setFlRef] = useState('');

  // Car request
  const [car, setCar] = useState({ location:'Cape Town Airport', pickup:dateIn(14), dropoff:dateIn(17), category:'Compact SUV', notes:'' });
  const [carPts, setCarPts] = useState(0);
  const [carBusy, setCarBusy] = useState(false);
  const [carRef, setCarRef] = useState('');

  const nights = Math.max(1, Math.round((new Date(checkOut)-new Date(checkIn))/86400000));
  const cash = (selHotel?.price_per_night||0)*nights - pts;

  async function load() {
    const mid = localStorage.getItem('ohmi_member_id');
    if (!mid) { window.location.href='/'; return; }
    const [mb, ll, bk, rq] = await Promise.all([
      supabase.from('members').select('*').eq('id',mid).single(),
      supabase.from('commission_ledger').select('*').eq('member_id',mid),
      supabase.from('travel_bookings').select('*').eq('member_id',mid).order('created_at',{ascending:false}),
      supabase.from('travel_requests').select('*').eq('member_id',mid).order('created_at',{ascending:false}),
    ]);
    setMe(mb.data);
    const l = ll.data||[];
    setPtBal(Math.max(0,
      l.filter(x=>!['redemption','expiry'].includes(x.entry_type)).reduce((s,x)=>s+Number(x.amount||0),0)
      - l.filter(x=>['redemption','expiry'].includes(x.entry_type)).reduce((s,x)=>s+Number(x.amount||0),0)
    ));
    setBookings(bk.data||[]);
    setRequests(rq.data||[]);
  }

  useEffect(()=>{ load(); },[]);

  async function searchHotels() {
    if (!selDest) return;
    setSearching(true); setSearched(false); setSelHotel(null); setBookRef('');
    try {
      const res = await fetch(`/api/search/hotels?q=${encodeURIComponent(selDest.name)}&check_in=${checkIn}&check_out=${checkOut}&adults=${guests}`);
      const data = await res.json();
      setHotels(data.hotels||[]);
    } catch { setHotels([]); }
    setSearching(false); setSearched(true);
  }

  async function bookHotel() {
    setBookBusy(true);
    const ref = 'VB-H-'+Date.now().toString(36).toUpperCase();
    await supabase.from('travel_bookings').insert({
      member_id:me.id, booking_ref:ref,
      hotel_name:selHotel.name, hotel_location:selHotel.location,
      check_in:checkIn, check_out:checkOut, nights, guests,
      total_cost:selHotel.price_per_night*nights, points_used:pts, cash_due:Math.max(0,cash),
      status:cash<=0?'confirmed':'pending', provider:'Vollard Black',
    });
    if (pts>0) await supabase.from('commission_ledger').insert({member_id:me.id,entry_type:'redemption',amount:pts,note:`Hotel: ${selHotel.name} ${ref}`,period:new Date().toISOString().slice(0,7)+'-01'});
    setBookRef(ref); setBookBusy(false); load();
  }

  async function submitFlight() {
    setFlBusy(true);
    const ref = 'VB-F-'+Date.now().toString(36).toUpperCase();
    await supabase.from('travel_requests').insert({
      member_id:me.id, booking_ref:ref, type:'flight',
      flight_from:fl.from, flight_to:fl.to, depart_date:fl.depart,
      return_date:fl.trip==='return'?fl.ret:null, trip_type:fl.trip,
      passengers:Number(fl.pax), cabin_class:fl.cabin, special_requests:fl.notes||null,
      points_to_use:flPts, status:'pending',
    });
    setFlRef(ref); setFlBusy(false); load();
  }

  async function submitCar() {
    setCarBusy(true);
    const ref = 'VB-C-'+Date.now().toString(36).toUpperCase();
    await supabase.from('travel_requests').insert({
      member_id:me.id, booking_ref:ref, type:'car',
      car_location:car.location, car_pickup:car.pickup, car_dropoff:car.dropoff,
      car_category:car.category, special_requests:car.notes||null,
      points_to_use:carPts, status:'pending',
    });
    setCarRef(ref); setCarBusy(false); load();
  }

  const allTrips = [
    ...bookings.map(b=>({...b,_t:'hotel'})),
    ...requests.map(r=>({...r,_t:r.type})),
  ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  if (!me) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}><div style={{fontSize:24,color:'var(--text-muted)'}}>Loading…</div></div>;

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>
      <style>{`
        body{background:#F5F6FA;font-family:'Inter',-apple-system,sans-serif;margin:0}
        *{box-sizing:border-box}
        .field-label{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;display:block;margin-bottom:5px}
        .field-input{width:100%;padding:11px 14px;background:#fff;color:#111827;border:1px solid #E5E7EB;border-radius:10px;font-size:14px;font-family:inherit;outline:none}
        .field-input:focus{border-color:#6366F1;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;font-size:13px;font-weight:600;border-radius:10px;border:none;cursor:pointer;font-family:inherit;transition:all 0.2s}
        .btn-primary{background:linear-gradient(135deg,#6366F1,#0EA5E9);color:#fff;box-shadow:0 4px 16px rgba(99,102,241,0.25)}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(99,102,241,0.35)}
        .btn-primary:disabled{opacity:0.5;transform:none}
        .btn-ghost{background:transparent;color:#6B7280;border:1px solid #E5E7EB}
        .btn-ghost:hover{background:#F9FAFB}
        .pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
        .pill-green{background:rgba(16,185,129,0.1);color:#059669;border:1px solid rgba(16,185,129,0.2)}
        .pill-amber{background:rgba(245,158,11,0.1);color:#B45309;border:1px solid rgba(245,158,11,0.2)}
        .pill-primary{background:rgba(99,102,241,0.1);color:#6366F1;border:1px solid rgba(99,102,241,0.2)}
      `}</style>

      {/* Topbar */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #E5E7EB',height:56,display:'flex',alignItems:'center',padding:'0 20px',gap:12}}>
        <a href="/dashboard" style={{display:'flex',alignItems:'center',gap:6,background:'#F3F4F6',border:'none',borderRadius:8,height:32,padding:'0 12px',fontSize:12,fontWeight:600,color:'#374151',cursor:'pointer',textDecoration:'none'}}>
          <i className="ti ti-arrow-left" style={{fontSize:14}}/>Back
        </a>
        <div style={{flex:1,fontWeight:800,fontSize:16,letterSpacing:'-0.01em',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Atlas Travel</div>
        {ptBal>0&&<div className="pill pill-primary">✨ {ptBal.toLocaleString()} pts = {Rz(ptBal)}</div>}
        <button onClick={()=>setView('mytrips')} style={{background:'none',border:'1px solid #E5E7EB',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:600,cursor:'pointer',color:'#374151',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
          <i className="ti ti-luggage" style={{fontSize:14}}/>My trips{allTrips.length>0?` (${allTrips.length})`:''}
        </button>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'20px 16px 80px'}}>

        {/* ── EXPLORE ── */}
        {view==='explore'&&<>
          {/* Hero */}
          <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:20,padding:'32px 28px',color:'#fff',marginBottom:24,position:'relative',overflow:'hidden',boxShadow:'0 8px 32px rgba(99,102,241,0.25)'}}>
            <div style={{position:'absolute',width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,0.06)',top:-60,right:-60}}/>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:10}}>Atlas Travel Club · Member Benefit</div>
            <h1 style={{fontSize:'clamp(24px,4vw,36px)',fontWeight:900,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:10}}>Your commission.<br/>Your holiday.</h1>
            <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',lineHeight:1.7,maxWidth:440,marginBottom:24}}>
              Every rand you earn converts to a travel point at 1:1. Use your points to offset hotel bookings, or request flights and car rentals through our concierge.
            </p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[['🏨','Hotels','Book now'],['✈️','Flights','Concierge'],['🚗','Car Rental','Concierge']].map(([icon,label,tag])=>(
                <button key={label} onClick={()=>setView(label.toLowerCase())} style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:12,padding:'12px 18px',color:'#fff',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all 0.2s',minWidth:90}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
                  <span style={{fontSize:24}}>{icon}</span>
                  <span style={{fontSize:12,fontWeight:700}}>{label}</span>
                  <span style={{fontSize:9,opacity:0.7,letterSpacing:'0.06em',textTransform:'uppercase'}}>{tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Destinations */}
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:16}}>Curated Destinations</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
            {DESTINATIONS.map(d=>(
              <div key={d.id} onClick={()=>{setSelDest(d);setView('hotels');setSearched(false);setHotels([]);setSelHotel(null);setBookRef('');}}
                style={{borderRadius:16,overflow:'hidden',cursor:'pointer',border:'1px solid #E5E7EB',boxShadow:'0 2px 8px rgba(0,0,0,0.04)',transition:'all 0.2s',background:'#fff'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(99,102,241,0.15)';e.currentTarget.style.borderColor='rgba(99,102,241,0.3)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';e.currentTarget.style.borderColor='#E5E7EB';}}>
                <div style={{position:'relative',height:160}}>
                  <img src={d.img} alt={d.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 40%,rgba(0,0,0,0.55))'}}/>
                  <div style={{position:'absolute',top:10,left:10,background:'linear-gradient(135deg,#6366F1,#0EA5E9)',color:'#fff',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'3px 10px',borderRadius:999}}>{d.tag}</div>
                  <div style={{position:'absolute',bottom:10,left:12,right:12}}>
                    <div style={{fontSize:16,fontWeight:800,color:'#fff',marginBottom:2}}>{d.name}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>{d.country}</div>
                  </div>
                </div>
                <div style={{padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:12,color:'#6B7280',lineHeight:1.5}}>{d.desc}</div>
                  <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                    <div style={{fontSize:11,color:'#9CA3AF'}}>From</div>
                    <div style={{fontSize:16,fontWeight:800,color:'#6366F1'}}>{d.from}</div>
                    <div style={{fontSize:10,color:'#9CA3AF'}}>per night</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ── HOTELS ── */}
        {view==='hotels'&&<>
          <button className="btn btn-ghost" style={{marginBottom:16}} onClick={()=>{setView('explore');setSelDest(null);}}>← Destinations</button>
          {!bookRef&&<>
            <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #E5E7EB',marginBottom:16,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
              <div style={{marginBottom:14}}>
                <label className="field-label">Destination</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                  {DESTINATIONS.map(d=>(
                    <button key={d.id} onClick={()=>setSelDest(d)} style={{padding:'7px 14px',borderRadius:999,border:`1.5px solid ${selDest?.id===d.id?'#6366F1':'#E5E7EB'}`,background:selDest?.id===d.id?'rgba(99,102,241,0.06)':'#fff',color:selDest?.id===d.id?'#6366F1':'#6B7280',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,marginBottom:14}}>
                <div><label className="field-label">Check-in</label><input className="field-input" type="date" value={checkIn} min={dateIn(1)} onChange={e=>setCheckIn(e.target.value)}/></div>
                <div><label className="field-label">Check-out</label><input className="field-input" type="date" value={checkOut} min={checkIn} onChange={e=>setCheckOut(e.target.value)}/></div>
                <div><label className="field-label">Guests</label><select className="field-input" value={guests} onChange={e=>setGuests(Number(e.target.value))} style={{width:70}}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
              </div>
              {checkIn&&checkOut&&<div style={{fontSize:12,color:'#6B7280',marginBottom:14}}>📅 {nights} night{nights!==1?'s':''}</div>}
              <button className="btn btn-primary" style={{width:'100%',padding:'13px'}} disabled={!selDest||searching} onClick={searchHotels}>
                {searching?'Searching RateHawk…':`Search hotels in ${selDest?.name||'—'}`}
              </button>
            </div>

            {/* Results */}
            {!selHotel&&searched&&<>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:14}}>
                {hotels.length} hotels found · {selDest?.name} · {nights} nights
              </div>
              {hotels.length===0&&<div style={{textAlign:'center',padding:48,background:'#fff',borderRadius:16,border:'1px solid #E5E7EB'}}>
                <div style={{fontSize:36,marginBottom:10}}>🏨</div>
                <div style={{fontWeight:700,color:'#111827',marginBottom:6}}>No hotels found</div>
                <div style={{fontSize:13,color:'#6B7280'}}>Try different dates or another destination</div>
              </div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
                {hotels.map(h=>(
                  <div key={h.id} onClick={()=>{setSelHotel(h);setPts(0);}} style={{background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #E5E7EB',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.3)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(99,102,241,0.12)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';}}>
                    <div style={{height:160,position:'relative',background:'#F3F4F6'}}>
                      {h.image&&<img src={h.image} alt={h.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>}
                      <div style={{position:'absolute',top:10,right:10,background:'#fff',borderRadius:8,padding:'4px 10px',fontSize:12,fontWeight:800,color:'#111827'}}>{h.rating}</div>
                      <div style={{position:'absolute',top:10,left:10,background:'linear-gradient(135deg,#6366F1,#0EA5E9)',color:'#fff',borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700}}>{'⭐'.repeat(Math.min(h.stars||3,5))}</div>
                    </div>
                    <div style={{padding:'14px 16px'}}>
                      <div style={{fontSize:14,fontWeight:700,color:'#111827',marginBottom:3}}>{h.name}</div>
                      <div style={{fontSize:11,color:'#9CA3AF',marginBottom:10}}>{h.location}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>
                        {(h.amenities||[]).slice(0,3).map(a=><span key={a} style={{fontSize:10,color:'#6B7280',background:'#F3F4F6',borderRadius:999,padding:'2px 8px'}}>{a}</span>)}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{fontSize:20,fontWeight:800,color:'#6366F1',letterSpacing:'-0.02em'}}>{Rz(h.price_per_night)}</div>
                          <div style={{fontSize:10,color:'#9CA3AF'}}>/night · {Rz((h.price_per_night||0)*nights)} total</div>
                        </div>
                        <button className="btn btn-primary" style={{fontSize:12,padding:'8px 16px'}} onClick={e=>{e.stopPropagation();setSelHotel(h);setPts(0);}}>Book →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>}

            {/* Hotel booking detail */}
            {selHotel&&<>
              <button className="btn btn-ghost" style={{marginBottom:14}} onClick={()=>setSelHotel(null)}>← Results</button>
              <div style={{background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #E5E7EB',marginBottom:14}}>
                <div style={{height:200,background:'#F3F4F6',position:'relative'}}>
                  {selHotel.image&&<img src={selHotel.image} alt={selHotel.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                </div>
                <div style={{padding:'20px'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'#111827',marginBottom:4}}>{selHotel.name}</div>
                  <div style={{fontSize:13,color:'#6B7280',marginBottom:16}}>{selHotel.location}</div>
                  {ptBal>0&&<div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:12,padding:'16px',marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:8}}>Apply lifestyle points</div>
                    <div style={{fontSize:13,color:'#6B7280',marginBottom:8}}>Available: <strong style={{color:'#6366F1'}}>{ptBal.toLocaleString()} pts = {Rz(ptBal)}</strong></div>
                    <input type="range" min={0} max={Math.min(ptBal,(selHotel.price_per_night||0)*nights)} step={50} value={pts} onChange={e=>setPts(Number(e.target.value))} style={{width:'100%',accentColor:'#6366F1',marginBottom:8}}/>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                      <span>Using: <strong style={{color:'#6366F1'}}>{Rz(pts)}</strong></span>
                      <span>Cash due: <strong style={{color:cash<=0?'#059669':'#B45309'}}>{cash<=0?'Fully covered ✓':Rz(Math.max(0,cash))}</strong></span>
                    </div>
                  </div>}
                  <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:12,padding:'16px 20px',marginBottom:16,color:'#fff'}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:4}}>{nights} nights · {guests} guests</div>
                    <div style={{fontSize:32,fontWeight:900,letterSpacing:'-0.03em'}}>{Rz((selHotel.price_per_night||0)*nights)}</div>
                    {pts>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginTop:4}}>{Rz(pts)} points · {Rz(Math.max(0,cash))} EFT</div>}
                  </div>
                  {cash>0&&<div style={{background:'rgba(99,102,241,0.04)',border:'1px solid rgba(99,102,241,0.12)',borderRadius:12,padding:'14px 16px',marginBottom:16,fontSize:13,color:'#374151',lineHeight:1.8}}>
                    <strong>EFT Payment</strong><br/>
                    FNB · OHMI Coffee Co. (Pty) Ltd<br/>
                    Amount: <strong style={{color:'#6366F1'}}>{Rz(Math.max(0,cash))}</strong> · Ref: your name
                  </div>}
                  <button className="btn btn-primary" style={{width:'100%',padding:'14px',fontSize:14}} disabled={bookBusy} onClick={bookHotel}>
                    {bookBusy?'Confirming…':cash<=0?'Confirm booking (fully covered)':`Confirm — EFT ${Rz(Math.max(0,cash))}`}
                  </button>
                </div>
              </div>
            </>}
          </>}

          {/* Booking confirmed */}
          {bookRef&&<div style={{background:'linear-gradient(135deg,#10B981,#0EA5E9)',borderRadius:20,padding:'32px 28px',color:'#fff',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>🏨</div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:8}}>Booking {cash<=0?'confirmed':'submitted'}</div>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>{selHotel?.name}</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginBottom:24}}>{fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} nights</div>
            <div style={{background:'rgba(0,0,0,0.15)',borderRadius:12,padding:'14px',marginBottom:20,textAlign:'left'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'0.1em',marginBottom:4}}>REFERENCE</div>
              <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700}}>{bookRef}</div>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>{setBookRef('');setSelHotel(null);setSearched(false);}} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:12,padding:'11px 24px',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>Search more</button>
              <button onClick={()=>setView('mytrips')} style={{background:'#fff',border:'none',borderRadius:12,padding:'11px 24px',color:'#10B981',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>My trips →</button>
            </div>
          </div>}
        </>}

        {/* ── FLIGHTS ── */}
        {view==='flights'&&<>
          <button className="btn btn-ghost" style={{marginBottom:16}} onClick={()=>setView('explore')}>← Back</button>
          {!flRef?(<>
            <div style={{background:'rgba(99,102,241,0.05)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:14,padding:'16px',marginBottom:20,display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:24,flexShrink:0}}>✈️</span>
              <div>
                <div style={{fontWeight:700,color:'#6366F1',marginBottom:4}}>Flight concierge service</div>
                <div style={{fontSize:13,color:'#6B7280',lineHeight:1.7}}>Submit your flight details. Vollard Black will source the best available flights across all airlines and send you a personalised quote within 24 hours. Use your lifestyle points to offset the cost.</div>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #E5E7EB',display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'flex',gap:8}}>
                {['return','oneway'].map(t=><button key={t} onClick={()=>setFl(f=>({...f,trip:t}))} style={{flex:1,padding:'10px',borderRadius:10,border:`1.5px solid ${fl.trip===t?'#6366F1':'#E5E7EB'}`,background:fl.trip===t?'rgba(99,102,241,0.06)':'#fff',color:fl.trip===t?'#6366F1':'#6B7280',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>{t==='return'?'Return':'One way'}</button>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'end'}}>
                <div><label className="field-label">From</label><input className="field-input" value={fl.from} onChange={e=>setFl(f=>({...f,from:e.target.value}))} placeholder="City or IATA code" list="fl-from-list"/><datalist id="fl-from-list">{AIRPORTS.map(a=><option key={a} value={a}/>)}</datalist></div>
                <button onClick={()=>setFl(f=>({...f,from:f.to,to:f.from}))} style={{height:44,width:40,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:999,cursor:'pointer',fontSize:16,color:'#6366F1',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:0,flexShrink:0}}>⇄</button>
                <div><label className="field-label">To</label><input className="field-input" value={fl.to} onChange={e=>setFl(f=>({...f,to:e.target.value}))} placeholder="City or IATA code" list="fl-to-list"/><datalist id="fl-to-list">{AIRPORTS.map(a=><option key={a} value={a}/>)}</datalist></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:`1fr${fl.trip==='return'?' 1fr':''} 1fr 1fr`,gap:10}}>
                <div><label className="field-label">Depart</label><input className="field-input" type="date" value={fl.depart} min={dateIn(1)} onChange={e=>setFl(f=>({...f,depart:e.target.value}))}/></div>
                {fl.trip==='return'&&<div><label className="field-label">Return</label><input className="field-input" type="date" value={fl.ret} min={fl.depart} onChange={e=>setFl(f=>({...f,ret:e.target.value}))}/></div>}
                <div><label className="field-label">Passengers</label><select className="field-input" value={fl.pax} onChange={e=>setFl(f=>({...f,pax:e.target.value}))}>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                <div><label className="field-label">Cabin</label><select className="field-input" value={fl.cabin} onChange={e=>setFl(f=>({...f,cabin:e.target.value}))}>{['Economy','Premium Economy','Business','First Class'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div><label className="field-label">Special requests (optional)</label><textarea className="field-input" rows={2} value={fl.notes} onChange={e=>setFl(f=>({...f,notes:e.target.value}))} placeholder="Preferred airline, meals, baggage, seating…" style={{resize:'vertical'}}/></div>
              {ptBal>0&&<div style={{background:'rgba(99,102,241,0.04)',border:'1px solid rgba(99,102,241,0.12)',borderRadius:12,padding:'14px'}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:8}}>Reserve lifestyle points</div>
                <div style={{fontSize:13,color:'#6B7280',marginBottom:8}}>Available: <strong style={{color:'#6366F1'}}>{ptBal.toLocaleString()} pts = {Rz(ptBal)}</strong></div>
                <input type="range" min={0} max={ptBal} step={100} value={flPts} onChange={e=>setFlPts(Number(e.target.value))} style={{width:'100%',accentColor:'#6366F1',marginBottom:6}}/>
                <div style={{fontSize:13,color:'#6B7280'}}>{flPts>0?<><strong style={{color:'#6366F1'}}>{Rz(flPts)}</strong> reserved to offset quote</>:'No points reserved'}</div>
              </div>}
              <button className="btn btn-primary" style={{padding:'14px',fontSize:14}} disabled={flBusy||!fl.from||!fl.to} onClick={submitFlight}>{flBusy?'Submitting…':'Submit flight request →'}</button>
            </div>
          </>):(
            <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:20,padding:'32px 28px',color:'#fff',textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>✈️</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:8}}>Flight request submitted</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>{fl.from} → {fl.to}</div>
              <div style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginBottom:24}}>{fmtDate(fl.depart)}{fl.trip==='return'?` · Return ${fmtDate(fl.ret)}`:''} · {fl.pax} pax · {fl.cabin}</div>
              <div style={{background:'rgba(0,0,0,0.15)',borderRadius:12,padding:'14px 16px',marginBottom:20,textAlign:'left',lineHeight:1.8,fontSize:13}}>
                <div style={{fontWeight:700,marginBottom:6}}>What happens next</div>
                <div style={{opacity:0.85}}>1. Ref: <strong>{flRef}</strong><br/>2. We source best flights across all airlines<br/>3. Quote delivered within 24 hours<br/>4. Confirm → pay EFT → tickets issued</div>
              </div>
              {flPts>0&&<div style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px',marginBottom:16,fontSize:13}}>{flPts.toLocaleString()} lifestyle points reserved</div>}
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button onClick={()=>setFlRef('')} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:12,padding:'11px 24px',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>New request</button>
                <button onClick={()=>setView('mytrips')} style={{background:'#fff',border:'none',borderRadius:12,padding:'11px 24px',color:'#6366F1',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>My trips →</button>
              </div>
            </div>
          )}
        </>}

        {/* ── CARS ── */}
        {view==='car rental'&&<>
          <button className="btn btn-ghost" style={{marginBottom:16}} onClick={()=>setView('explore')}>← Back</button>
          {!carRef?(<>
            <div style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:14,padding:'16px',marginBottom:20,display:'flex',gap:12}}>
              <span style={{fontSize:24,flexShrink:0}}>🚗</span>
              <div>
                <div style={{fontWeight:700,color:'#059669',marginBottom:4}}>Car rental concierge</div>
                <div style={{fontSize:13,color:'#6B7280',lineHeight:1.7}}>Tell us what you need and we'll source the best available vehicle from trusted suppliers. Quote within 24 hours, offset with lifestyle points.</div>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #E5E7EB',display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="field-label">Pickup location</label>
                <input className="field-input" value={car.location} onChange={e=>setCar(c=>({...c,location:e.target.value}))} placeholder="Airport, hotel or city" list="car-locs"/>
                <datalist id="car-locs">{['Cape Town Airport','Cape Town City','Stellenbosch','Johannesburg Airport','Sandton','Durban Airport','George Airport','Knysna','Hermanus','Franschhoek'].map(l=><option key={l} value={l}/>)}</datalist>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {['Cape Town Airport','Stellenbosch','George Airport','Johannesburg Airport'].map(l=><button key={l} onClick={()=>setCar(c=>({...c,location:l}))} style={{padding:'6px 12px',borderRadius:999,border:`1.5px solid ${car.location===l?'#059669':'#E5E7EB'}`,background:car.location===l?'rgba(16,185,129,0.06)':'#fff',color:car.location===l?'#059669':'#6B7280',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label className="field-label">Pickup date</label><input className="field-input" type="date" value={car.pickup} min={dateIn(1)} onChange={e=>setCar(c=>({...c,pickup:e.target.value}))}/></div>
                <div><label className="field-label">Return date</label><input className="field-input" type="date" value={car.dropoff} min={car.pickup} onChange={e=>setCar(c=>({...c,dropoff:e.target.value}))}/></div>
              </div>
              <div><label className="field-label">Vehicle category</label><select className="field-input" value={car.category} onChange={e=>setCar(c=>({...c,category:e.target.value}))}>{['Economy (e.g. VW Polo)','Compact (e.g. Toyota Corolla)','Compact SUV (e.g. Hyundai Tucson)','Mid-size SUV (e.g. Ford Escape)','Large SUV (e.g. Land Cruiser)','Luxury (e.g. BMW 3 Series)','Minivan (7-8 seater)','Bakkie / 4x4 (Safari)'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="field-label">Notes (optional)</label><textarea className="field-input" rows={2} value={car.notes} onChange={e=>setCar(c=>({...c,notes:e.target.value}))} placeholder="Automatic/manual, child seat, GPS…" style={{resize:'vertical'}}/></div>
              {ptBal>0&&<div style={{background:'rgba(16,185,129,0.04)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:12,padding:'14px'}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:8}}>Reserve lifestyle points</div>
                <input type="range" min={0} max={ptBal} step={100} value={carPts} onChange={e=>setCarPts(Number(e.target.value))} style={{width:'100%',accentColor:'#059669',marginBottom:6}}/>
                <div style={{fontSize:13,color:'#6B7280'}}>{carPts>0?<><strong style={{color:'#059669'}}>{Rz(carPts)}</strong> reserved</>:'No points reserved'}</div>
              </div>}
              <button className="btn btn-primary" style={{padding:'14px',fontSize:14,background:'linear-gradient(135deg,#10B981,#0EA5E9)'}} disabled={carBusy||!car.location} onClick={submitCar}>{carBusy?'Submitting…':'Submit car rental request →'}</button>
            </div>
          </>):(
            <div style={{background:'linear-gradient(135deg,#10B981,#6366F1)',borderRadius:20,padding:'32px 28px',color:'#fff',textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>🚗</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>{car.category}</div>
              <div style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginBottom:24}}>{car.location} · {fmtDate(car.pickup)} → {fmtDate(car.dropoff)}</div>
              <div style={{background:'rgba(0,0,0,0.15)',borderRadius:12,padding:'14px 16px',marginBottom:20,textAlign:'left',fontSize:13,lineHeight:1.8}}>
                <div style={{fontWeight:700,marginBottom:6}}>What happens next</div>
                <div style={{opacity:0.85}}>1. Ref: <strong>{carRef}</strong><br/>2. We check availability from local suppliers<br/>3. Quote within 24 hours<br/>4. Confirm → pay → keys waiting</div>
              </div>
              <button onClick={()=>setView('mytrips')} style={{background:'#fff',border:'none',borderRadius:12,padding:'12px 28px',color:'#10B981',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>View my trips →</button>
            </div>
          )}
        </>}

        {/* ── MY TRIPS ── */}
        {view==='mytrips'&&<>
          <button className="btn btn-ghost" style={{marginBottom:16}} onClick={()=>setView('explore')}>← Explore</button>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:16}}>My trips · {allTrips.length} total</div>
          {allTrips.length===0&&<div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:20,border:'1px solid #E5E7EB'}}>
            <div style={{fontSize:48,marginBottom:12}}>🌍</div>
            <div style={{fontWeight:700,color:'#111827',fontSize:16,marginBottom:8}}>No trips yet</div>
            <div style={{fontSize:13,color:'#6B7280',marginBottom:20}}>Explore destinations and book your first trip</div>
            <button className="btn btn-primary" onClick={()=>setView('explore')}>Explore →</button>
          </div>}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {allTrips.map(t=>{
              const grad = t._t==='hotel'?'linear-gradient(135deg,#6366F1,#0EA5E9)':t._t==='flight'?'linear-gradient(135deg,#374151,#6366F1)':'linear-gradient(135deg,#374151,#10B981)';
              const icon = t._t==='hotel'?'🏨':t._t==='flight'?'✈️':'🚗';
              const title = t._t==='hotel'?t.hotel_name:t._t==='flight'?`${t.flight_from} → ${t.flight_to}`:t.car_category;
              const detail = t._t==='hotel'?`${fmtDate(t.check_in)} → ${fmtDate(t.check_out)} · ${t.nights} nights`:t._t==='flight'?`${fmtDate(t.depart_date)} · ${t.passengers} pax · ${t.cabin_class}`:`${t.car_location} · ${fmtDate(t.car_pickup)} → ${fmtDate(t.car_dropoff)}`;
              return(
                <div key={t.id} style={{background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #E5E7EB',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                  <div style={{background:grad,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:4}}>{icon} {t._t==='hotel'?'Hotel':t._t==='flight'?'Flight':'Car Rental'} · {t.booking_ref}</div>
                      <div style={{fontSize:17,fontWeight:800,color:'#fff'}}>{title}</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>{detail}</div>
                    </div>
                    <span className={`pill ${t.status==='confirmed'?'pill-green':t.status==='quoted'?'pill-primary':'pill-amber'}`} style={{flexShrink:0}}>{t.status}</span>
                  </div>
                  {t._t!=='hotel'&&t.status==='pending'&&<div style={{padding:'12px 20px',fontSize:12,color:'#6B7280'}}>
                    Awaiting quote — Vollard Black will contact you within 24 hours
                  </div>}
                  {t._t!=='hotel'&&t.status==='quoted'&&t.quoted_amount&&<div style={{padding:'12px 20px',fontSize:13,color:'#374151',fontWeight:600}}>
                    Quote: <span style={{color:'#6366F1'}}>{Rz(t.quoted_amount)}</span> {t.points_to_use>0&&`· ${Number(t.points_to_use).toLocaleString()} pts reserved`}
                  </div>}
                </div>
              );
            })}
          </div>
        </>}
      </div>
      {toast&&<div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#111827',color:'#fff',padding:'12px 24px',borderRadius:999,fontSize:13,fontWeight:500,boxShadow:'0 4px 20px rgba(0,0,0,0.2)',zIndex:999,whiteSpace:'nowrap'}}>{toast}</div>}
    </>
  );
}
