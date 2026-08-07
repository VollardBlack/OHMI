'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { searchHotels, DESTINATIONS, MOCK_MODE } from '@/lib/ratehawk';

const Rz = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:0,maximumFractionDigits:0});
const Dz = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
const Stars = ({n}) => <span style={{color:'var(--amber)',fontSize:11}}>{Array(Number(n)||0).fill('★').join('')}</span>;

// ── Today + offsets ───────────────────────────────────────
const dateIn = (days) => {
  const d = new Date(); d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
};

// ── SA airports ───────────────────────────────────────────
const AIRPORTS = [
  'Cape Town (CPT)','Johannesburg (JNB)','Durban (DUR)',
  'Port Elizabeth (GQQ)','George (GRJ)','East London (ELS)',
  'Nairobi (NBO)','Dubai (DXB)','London Heathrow (LHR)',
  'Mauritius (MRU)','Zanzibar (ZNZ)','Harare (HRE)',
];

const CAR_LOCATIONS = [
  'Cape Town Airport','Cape Town City Centre','Stellenbosch',
  'Hermanus','Johannesburg Airport','Sandton','Durban Airport',
  'George Airport','Knysna','Franschhoek',
];

const CAR_CATEGORIES = [
  'Economy (e.g. VW Polo)','Compact (e.g. Toyota Corolla)',
  'Compact SUV (e.g. Hyundai Tucson)','Mid-size SUV (e.g. Ford Escape)',
  'Large SUV (e.g. Toyota Land Cruiser)','Luxury (e.g. BMW 3 Series)',
  'Minivan (7-8 seater)','Bakkie / 4x4 (Safari capable)',
];

// ── Hotel card ────────────────────────────────────────────
function HotelCard({h, nights, onSelect}) {
  return (
    <div className="hotel-card" onClick={()=>onSelect(h)}>
      <div style={{position:'relative'}}>
        <img src={h.image} alt={h.name} className="hotel-img"
          onError={e=>{e.target.style.background='#1a1a2e';e.target.style.minHeight=160;}}/>
        <div style={{position:'absolute',top:10,left:10}}>
          <span className="pill pill-amber" style={{background:'rgba(0,0,0,0.55)',color:'#F59E0B',border:'1px solid rgba(245,158,11,0.4)'}}>
            <Stars n={h.stars}/> {h.stars}-star
          </span>
        </div>
        <div style={{position:'absolute',top:10,right:10,background:'var(--primary)',color:'#fff',borderRadius:'var(--r-xs)',padding:'4px 9px',fontSize:13,fontWeight:800}}>
          {h.rating}
        </div>
      </div>
      <div className="hotel-body">
        <div className="hotel-name">{h.name}</div>
        <div className="hotel-loc"><i className="ti ti-map-pin" aria-hidden="true" style={{fontSize:11}}/>{h.location}</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
          {(h.amenities||[]).slice(0,3).map(a=>(
            <span key={a} style={{fontSize:10,color:'var(--text-sub)',background:'var(--surface-2)',borderRadius:'var(--r-full)',padding:'2px 8px',border:'1px solid var(--border)'}}>{a}</span>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
          <div>
            <span className="hotel-price">{Rz(h.price_per_night)}</span>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>/night · {Rz((h.price_per_night||0)*(nights||1))} total</span>
          </div>
          <button className="btn btn-primary btn-xs" onClick={e=>{e.stopPropagation();onSelect(h);}}>Book →</button>
        </div>
      </div>
    </div>
  );
}

// ── Hotel booking flow ────────────────────────────────────
function HotelBooking({hotel, nights, checkIn, checkOut, guests, ptBal, me, onBack, onDone, flash}) {
  const [room, setRoom] = useState(hotel.room_types?.[0]);
  const [step, setStep] = useState('detail');
  const [pts, setPts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const total = (room?.price||0) * nights;
  const maxPts = Math.min(ptBal, total);
  const cash = Math.max(0, total - pts);

  async function confirm() {
    setBusy(true);
    const bookRef = 'VB-H-' + Date.now().toString(36).toUpperCase();
    await supabase.from('travel_bookings').insert({
      member_id:me.id, booking_ref:bookRef,
      hotel_id:hotel.id, hotel_name:hotel.name, hotel_location:hotel.location,
      room_name:room?.name||'Standard', check_in:checkIn, check_out:checkOut,
      nights, guests, total_cost:total, points_used:pts, cash_due:cash,
      status:cash===0?'confirmed':'pending',
      payment_status:pts>0&&cash===0?'points_only':pts>0?'partial':'pending',
      provider:'Vollard Black',
    });
    if(pts>0) await supabase.from('lifestyle_ledger').insert({
      member_id:me.id,entry_type:'redemption',points:pts,
      note:`Hotel: ${hotel.name} ${bookRef}`,period:new Date().toISOString().slice(0,7)+'-01',
    });
    setBusy(false); setRef(bookRef); onDone();
  }

  if(ref) return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{marginBottom:14}} onClick={onBack}>← Search more</button>
      <div style={{background:'linear-gradient(135deg,#10B981,#0EA5E9)',borderRadius:'var(--r-lg)',padding:'28px 24px',color:'#fff',textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>🏨</div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',opacity:0.7,marginBottom:6}}>Booking {cash===0?'confirmed':'submitted'}</div>
        <div style={{fontSize:22,fontWeight:800,marginBottom:4,letterSpacing:'-0.02em'}}>{hotel.name}</div>
        <div style={{fontSize:13,opacity:0.8,marginBottom:16}}>{Dz(checkIn)} → {Dz(checkOut)} · {nights} nights</div>
        <div style={{background:'rgba(0,0,0,0.15)',borderRadius:'var(--r-sm)',padding:'12px 16px',textAlign:'left',marginBottom:16}}>
          <div style={{fontSize:11,opacity:0.65,marginBottom:4,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase'}}>Ref</div>
          <div style={{fontFamily:'monospace',fontSize:14,fontWeight:700}}>{ref}</div>
        </div>
        {cash>0&&<div style={{background:'rgba(0,0,0,0.15)',borderRadius:'var(--r-sm)',padding:'12px 16px',textAlign:'left',marginBottom:16,fontSize:12,lineHeight:1.8}}>
          <div style={{fontWeight:700,opacity:0.8,marginBottom:4}}>EFT Payment</div>
          <div>FNB · OHMI Coffee Co. (Pty) Ltd</div>
          <div>Amount: <strong>{Rz(cash)}</strong> · Ref: <strong>{ref}</strong></div>
        </div>}
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'var(--r-full)',padding:'10px 24px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Search more</button>
      </div>
    </div>
  );

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{marginBottom:14}} onClick={onBack}>← Results</button>
      <div style={{borderRadius:'var(--r)',overflow:'hidden',height:200,marginBottom:14,background:'#111'}}>
        <img src={hotel.images?.[0]||hotel.image} alt={hotel.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
      <div style={{fontSize:20,fontWeight:800,letterSpacing:'-0.02em',color:'var(--text-h)',marginBottom:4}}>{hotel.name}</div>
      <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>{hotel.address}</div>
      {step==='detail'&&<>
        <div className="card" style={{marginBottom:12}}>
          <div className="section-label" style={{marginBottom:12}}>Select room · {nights} night{nights!==1?'s':''}</div>
          {(hotel.room_types||[{id:'std',name:'Standard Room',price:hotel.price_per_night,beds:'Double bed',capacity:2}]).map(r=>(
            <div key={r.id} onClick={()=>setRoom(r)}
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${room?.id===r.id?'var(--primary)':'var(--border-md)'}`,background:room?.id===r.id?'var(--primary)':'transparent',flexShrink:0}}/>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{r.name}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.beds} · max {r.capacity}</div>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:18,fontWeight:800,letterSpacing:'-0.01em'}}>{Rz(r.price)}<span style={{fontSize:11,fontWeight:400,color:'var(--text-muted)'}}>/night</span></div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>{Rz(r.price*nights)} total</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" onClick={()=>setStep('book')}>Book {room?.name} →</button>
      </>}
      {step==='book'&&<>
        {ptBal>0&&<div className="card card-bordered" style={{marginBottom:12}}>
          <div className="section-label" style={{marginBottom:8}}>Apply lifestyle points</div>
          <div style={{fontSize:12,color:'var(--text-sub)',marginBottom:8}}>Available: <strong style={{color:'var(--primary)'}}>{ptBal.toLocaleString()} pts = {Rz(ptBal)}</strong></div>
          <input type="range" min={0} max={maxPts} step={50} value={pts} onChange={e=>setPts(Number(e.target.value))} style={{width:'100%',accentColor:'var(--primary)',marginBottom:8}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
            <span>Using: <strong style={{color:'var(--primary)'}}>{Rz(pts)}</strong></span>
            <span>Cash due: <strong style={{color:cash>0?'var(--amber)':'var(--green-text)'}}>{cash>0?Rz(cash):'Fully covered ✓'}</strong></span>
          </div>
        </div>}
        <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:'var(--r)',padding:'16px 20px',marginBottom:12,color:'#fff'}}>
          <div style={{fontSize:10,opacity:0.65,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:4}}>Total</div>
          <div style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em'}}>{Rz(total)}</div>
          {pts>0&&<div style={{fontSize:12,opacity:0.7,marginTop:4}}>{Rz(pts)} points · {Rz(cash)} cash</div>}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-ghost" onClick={()=>setStep('detail')}>← Back</button>
          <button className="btn btn-primary" style={{flex:1}} disabled={busy} onClick={confirm}>
            {busy?'Confirming…':cash>0?`Confirm — EFT ${Rz(cash)}`:'Confirm booking'}
          </button>
        </div>
      </>}
    </div>
  );
}

// ── Flight request form ───────────────────────────────────
function FlightRequest({me, ptBal, onDone, flash}) {
  const [f, setF] = useState({
    trip_type:'return', from:'', to:'', depart_date:dateIn(14),
    return_date:dateIn(21), passengers:'1', cabin_class:'Economy', special_requests:'',
  });
  const [pts, setPts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  async function submit() {
    if(!f.from||!f.to||!f.depart_date){flash('Please fill in origin, destination and date');return;}
    setBusy(true);
    const bookRef = 'VB-F-' + Date.now().toString(36).toUpperCase();
    await supabase.from('travel_requests').insert({
      member_id:me.id, booking_ref:bookRef, type:'flight',
      flight_from:f.from, flight_to:f.to,
      depart_date:f.depart_date,
      return_date:f.trip_type==='return'?f.return_date:null,
      trip_type:f.trip_type, passengers:Number(f.passengers),
      cabin_class:f.cabin_class, special_requests:f.special_requests||null,
      points_to_use:pts, status:'pending',
    });
    setBusy(false); setRef(bookRef);
  }

  if(ref) return (
    <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',borderRadius:'var(--r-lg)',padding:'28px 24px',color:'#fff',textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:12}}>✈️</div>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',opacity:0.7,marginBottom:8}}>Flight request submitted</div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:6,letterSpacing:'-0.02em'}}>{f.from} → {f.to}</div>
      <div style={{fontSize:13,opacity:0.8,marginBottom:20}}>{Dz(f.depart_date)}{f.trip_type==='return'?` · Return ${Dz(f.return_date)}`:''} · {f.passengers} pax · {f.cabin_class}</div>
      <div style={{background:'rgba(0,0,0,0.15)',borderRadius:'var(--r-sm)',padding:'14px 16px',textAlign:'left',marginBottom:16,fontSize:13}}>
        <div style={{fontWeight:700,opacity:0.8,marginBottom:8}}>What happens next</div>
        <div style={{opacity:0.8,lineHeight:1.8}}>
          1. Vollard Black receives your request (ref: <strong>{ref}</strong>)<br/>
          2. We source the best available flights<br/>
          3. You receive a quote within 24 hours<br/>
          4. Confirm and pay via EFT to lock the booking
        </div>
      </div>
      {pts>0&&<div style={{background:'rgba(255,255,255,0.1)',borderRadius:'var(--r-sm)',padding:'10px 16px',marginBottom:16,fontSize:12,opacity:0.9}}>
        {pts.toLocaleString()} lifestyle points reserved for offset
      </div>}
      <button onClick={onDone} style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'var(--r-full)',padding:'10px 24px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Done</button>
    </div>
  );

  return (
    <div>
      <div style={{background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(14,165,233,0.06))',border:'1px solid var(--primary-border)',borderRadius:'var(--r)',padding:'14px 18px',marginBottom:16,display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{fontSize:22,flexShrink:0}}>✈️</div>
        <div>
          <div style={{fontWeight:700,color:'var(--primary)',fontSize:14,marginBottom:3}}>Flight concierge service</div>
          <div style={{fontSize:12,color:'var(--text-sub)',lineHeight:1.7}}>
            Submit your flight details and Vollard Black will source the best available options across all airlines. You'll receive a personalised quote within 24 hours and can offset the cost with lifestyle points.
          </div>
        </div>
      </div>

      <div className="card">
        {/* Trip type */}
        <div className="field">
          <label className="field-label">Trip type</label>
          <div style={{display:'flex',gap:8}}>
            {['return','oneway'].map(t=>(
              <button key={t} onClick={()=>set('trip_type',t)} className={f.trip_type===t?'btn btn-primary btn-sm':'btn btn-ghost btn-sm'} style={{borderRadius:'var(--r-full)',flex:1}}>
                {t==='return'?'Return':'One way'}
              </button>
            ))}
          </div>
        </div>

        {/* Route */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'end',marginBottom:14}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-label">From</label>
            <input className="field-input" value={f.from} onChange={e=>set('from',e.target.value)} placeholder="City or airport code" list="airports-from"/>
            <datalist id="airports-from">{AIRPORTS.map(a=><option key={a} value={a}/>)}</datalist>
          </div>
          <button onClick={()=>set('from',f.to)||set('to',f.from)}
            style={{height:44,width:40,background:'var(--primary-bg)',border:'1px solid var(--primary-border)',borderRadius:'var(--r-full)',cursor:'pointer',fontSize:16,color:'var(--primary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:0}}>
            ⇄
          </button>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-label">To</label>
            <input className="field-input" value={f.to} onChange={e=>set('to',e.target.value)} placeholder="City or airport code" list="airports-to"/>
            <datalist id="airports-to">{AIRPORTS.map(a=><option key={a} value={a}/>)}</datalist>
          </div>
        </div>

        {/* Dates */}
        <div style={{display:'grid',gridTemplateColumns:`1fr${f.trip_type==='return'?' 1fr':''}`,gap:10,marginBottom:14}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-label">Departure date</label>
            <input className="field-input" type="date" value={f.depart_date} min={dateIn(1)} onChange={e=>set('depart_date',e.target.value)}/>
          </div>
          {f.trip_type==='return'&&<div className="field" style={{marginBottom:0}}>
            <label className="field-label">Return date</label>
            <input className="field-input" type="date" value={f.return_date} min={f.depart_date} onChange={e=>set('return_date',e.target.value)}/>
          </div>}
        </div>

        {/* Pax + class */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-label">Passengers</label>
            <select className="field-input" value={f.passengers} onChange={e=>set('passengers',e.target.value)}>
              {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} passenger{n!==1?'s':''}</option>)}
            </select>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-label">Cabin class</label>
            <select className="field-input" value={f.cabin_class} onChange={e=>set('cabin_class',e.target.value)}>
              {['Economy','Premium Economy','Business','First Class'].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Special requests */}
        <div className="field" style={{marginBottom:14}}>
          <label className="field-label">Special requests (optional)</label>
          <textarea className="field-input" rows={2} value={f.special_requests} onChange={e=>set('special_requests',e.target.value)} placeholder="Preferred airline, meal requirements, extra baggage, seating preferences…" style={{resize:'vertical'}}/>
        </div>

        {/* Points */}
        {ptBal>0&&<div style={{padding:'14px',background:'var(--primary-bg)',borderRadius:'var(--r-sm)',border:'1px solid var(--primary-border)',marginBottom:14}}>
          <div className="section-label" style={{marginBottom:8}}>Reserve lifestyle points</div>
          <div style={{fontSize:12,color:'var(--text-sub)',marginBottom:8}}>You have <strong style={{color:'var(--primary)'}}>{ptBal.toLocaleString()} pts = {Rz(ptBal)}</strong> · reserve some to offset the quote when it arrives</div>
          <input type="range" min={0} max={ptBal} step={100} value={pts} onChange={e=>setPts(Number(e.target.value))} style={{width:'100%',accentColor:'var(--primary)',marginBottom:6}}/>
          <div style={{fontSize:12,color:'var(--text-sub)'}}>{pts>0?<><strong style={{color:'var(--primary)'}}>{pts.toLocaleString()} pts ({Rz(pts)})</strong> reserved</>:'No points reserved yet'}</div>
        </div>}

        <button className="btn btn-primary btn-full" disabled={busy||!f.from||!f.to} onClick={submit} style={{fontSize:14,padding:'13px'}}>
          {busy?'Submitting…':'Submit flight request →'}
        </button>
      </div>
    </div>
  );
}

// ── Car request form ──────────────────────────────────────
function CarRequest({me, ptBal, onDone, flash}) {
  const [f, setF] = useState({
    location:'', pickup:dateIn(7), dropoff:dateIn(10), category:'Compact SUV (e.g. Hyundai Tucson)', special_requests:'',
  });
  const [pts, setPts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const days = Math.max(1, Math.round((new Date(f.dropoff)-new Date(f.pickup))/86400000));

  async function submit() {
    if(!f.location||!f.pickup||!f.dropoff){flash('Please fill in location and dates');return;}
    setBusy(true);
    const bookRef = 'VB-C-' + Date.now().toString(36).toUpperCase();
    await supabase.from('travel_requests').insert({
      member_id:me.id, booking_ref:bookRef, type:'car',
      car_location:f.location, car_pickup:f.pickup, car_dropoff:f.dropoff,
      car_category:f.category, special_requests:f.special_requests||null,
      points_to_use:pts, status:'pending',
    });
    setBusy(false); setRef(bookRef);
  }

  if(ref) return (
    <div style={{background:'linear-gradient(135deg,#10B981,#6366F1)',borderRadius:'var(--r-lg)',padding:'28px 24px',color:'#fff',textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:12}}>🚗</div>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',opacity:0.7,marginBottom:8}}>Car rental request submitted</div>
      <div style={{fontSize:20,fontWeight:800,marginBottom:6}}>{f.category}</div>
      <div style={{fontSize:13,opacity:0.8,marginBottom:20}}>{f.location} · {Dz(f.pickup)} → {Dz(f.dropoff)} · {days} day{days!==1?'s':''}</div>
      <div style={{background:'rgba(0,0,0,0.15)',borderRadius:'var(--r-sm)',padding:'14px 16px',textAlign:'left',marginBottom:16,fontSize:13}}>
        <div style={{fontWeight:700,opacity:0.8,marginBottom:8}}>What happens next</div>
        <div style={{opacity:0.8,lineHeight:1.8}}>
          1. Vollard Black receives your request (ref: <strong>{ref}</strong>)<br/>
          2. We check availability from local suppliers<br/>
          3. You receive a quote within 24 hours<br/>
          4. Confirm and pay via EFT to secure the car
        </div>
      </div>
      <button onClick={onDone} style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'var(--r-full)',padding:'10px 24px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Done</button>
    </div>
  );

  return (
    <div>
      <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(99,102,241,0.06))',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'var(--r)',padding:'14px 18px',marginBottom:16,display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{fontSize:22,flexShrink:0}}>🚗</div>
        <div>
          <div style={{fontWeight:700,color:'var(--green-text)',fontSize:14,marginBottom:3}}>Car rental concierge</div>
          <div style={{fontSize:12,color:'var(--text-sub)',lineHeight:1.7}}>
            Tell us what you need and Vollard Black will source the best available vehicle from trusted suppliers. Quote delivered within 24 hours — offset with lifestyle points.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label className="field-label">Pickup location</label>
          <input className="field-input" value={f.location} onChange={e=>set('location',e.target.value)} placeholder="Airport, hotel or city" list="car-locations"/>
          <datalist id="car-locations">{CAR_LOCATIONS.map(l=><option key={l} value={l}/>)}</datalist>
        </div>

        {/* Quick location chips */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14,marginTop:-8}}>
          {CAR_LOCATIONS.slice(0,5).map(l=>(
            <button key={l} onClick={()=>set('location',l)}
              className={f.location===l?'btn btn-primary btn-xs':'btn btn-white btn-xs'}
              style={{borderRadius:'var(--r-full)',fontSize:11}}>
              {l}
            </button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-label">Pickup date</label>
            <input className="field-input" type="date" value={f.pickup} min={dateIn(1)} onChange={e=>set('pickup',e.target.value)}/>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-label">Return date</label>
            <input className="field-input" type="date" value={f.dropoff} min={f.pickup} onChange={e=>set('dropoff',e.target.value)}/>
          </div>
        </div>

        {f.pickup&&f.dropoff&&<div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14,padding:'6px 12px',background:'var(--surface-1)',borderRadius:'var(--r-xs)',border:'1px solid var(--border)'}}>
          📅 {days} day{days!==1?'s':''} rental
        </div>}

        <div className="field" style={{marginBottom:14}}>
          <label className="field-label">Vehicle category</label>
          <select className="field-input" value={f.category} onChange={e=>set('category',e.target.value)}>
            {CAR_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="field" style={{marginBottom:14}}>
          <label className="field-label">Special requests (optional)</label>
          <textarea className="field-input" rows={2} value={f.special_requests} onChange={e=>set('special_requests',e.target.value)} placeholder="Automatic/manual, child seat, GPS, insurance preference…" style={{resize:'vertical'}}/>
        </div>

        {ptBal>0&&<div style={{padding:'14px',background:'rgba(16,185,129,0.06)',borderRadius:'var(--r-sm)',border:'1px solid rgba(16,185,129,0.2)',marginBottom:14}}>
          <div className="section-label" style={{marginBottom:8}}>Reserve lifestyle points</div>
          <div style={{fontSize:12,color:'var(--text-sub)',marginBottom:8}}>Available: <strong style={{color:'var(--green-text)'}}>{ptBal.toLocaleString()} pts = {Rz(ptBal)}</strong></div>
          <input type="range" min={0} max={ptBal} step={100} value={pts} onChange={e=>setPts(Number(e.target.value))} style={{width:'100%',accentColor:'var(--green)',marginBottom:6}}/>
          <div style={{fontSize:12,color:'var(--text-sub)'}}>{pts>0?<><strong style={{color:'var(--green-text)'}}>{pts.toLocaleString()} pts ({Rz(pts)})</strong> reserved</>:'No points reserved'}</div>
        </div>}

        <button className="btn btn-primary btn-full" disabled={busy||!f.location} onClick={submit} style={{fontSize:14,padding:'13px'}}>
          {busy?'Submitting…':'Submit car rental request →'}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
export default function Travel() {
  const [type, setType] = useState('hotels');
  const [view, setView] = useState('search'); // search | bookings
  const [me, setMe] = useState(null);
  const [ptBal, setPtBal] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);

  // Hotel search state
  const [dest, setDest] = useState('');
  const [checkIn, setCheckIn] = useState(dateIn(7));
  const [checkOut, setCheckOut] = useState(dateIn(10));
  const [guests, setGuests] = useState(2);
  const [hotels, setHotels] = useState([]);
  const [selHotel, setSelHotel] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Flight/car sub-views
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [showCarForm, setShowCarForm] = useState(false);

  const [toast, setToast] = useState('');
  const flash = m=>{setToast(m);setTimeout(()=>setToast(''),3500);};

  const nights = Math.max(1, Math.round((new Date(checkOut)-new Date(checkIn))/86400000));

  async function loadData() {
    const memberId = typeof window!=='undefined'?localStorage.getItem('ohmi_member_id'):null;
    const emailQuery = memberId ? null : 'brandon@ohmicoffee.co.za';
    const [mb, ll, bk, rq] = await Promise.all([
      memberId
        ? supabase.from('members').select('*').eq('id', memberId).single()
        : supabase.from('members').select('*').eq('email','brandon@ohmicoffee.co.za').single(),
      supabase.from('lifestyle_ledger').select('*'),
      supabase.from('travel_bookings').select('*').order('created_at',{ascending:false}),
      supabase.from('travel_requests').select('*').order('created_at',{ascending:false}),
    ]);
    const m = mb.data;
    setMe(m);
    const ledger = (ll.data||[]).filter(l=>l.member_id===m?.id);
    setPtBal(
      ledger.filter(l=>['rank_bonus','adjustment'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.points),0)
      - ledger.filter(l=>['redemption','expiry'].includes(l.entry_type)).reduce((s,l)=>s+Number(l.points),0)
    );
    setBookings((bk.data||[]).filter(b=>b.member_id===m?.id));
    setRequests((rq.data||[]).filter(r=>r.member_id===m?.id));
  }

  useEffect(()=>{loadData();},[]);

  async function doHotelSearch() {
    if(!dest){flash('Enter a destination');return;}
    setSearching(true); setSearched(false); setSelHotel(null);
    try {
      const r = await searchHotels({destination:dest,checkIn,checkOut,guests});
      setHotels(r);
    } catch(e){ flash('Search failed'); }
    setSearching(false); setSearched(true);
  }

  const allRequests = [...bookings.map(b=>({...b,_kind:'hotel'})), ...requests.map(r=>({...r,_kind:r.type}))];

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>

      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <a href="/dashboard" style={{display:'flex',alignItems:'center',gap:6,background:'var(--surface-2)',border:'none',borderRadius:'var(--r-xs)',height:32,padding:'0 12px',fontSize:12,fontWeight:600,color:'var(--text-sub)',textDecoration:'none'}}>
          <i className="ti ti-arrow-left" style={{fontSize:14}}/>Dashboard
        </a>
        <span className="mobile-topbar-logo">Travel</span>
        {ptBal>0&&<span className="pill pill-primary" style={{fontSize:9}}>{ptBal.toLocaleString()} pts</span>}
      </div>

      <div className="app-shell">
        <aside className="rail">
          <div className="rail-logo">T</div>
          <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:4,flex:1}}>
            <a href="/dashboard" className="rail-item" data-tip="Dashboard" style={{display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',color:'var(--text-muted)'}}>
              <i className="ti ti-layout-dashboard" aria-hidden="true"/>
            </a>
          </div>
        </aside>

        <div className="app-main">
          <div className="app-topbar">
            <a href="/dashboard" className="btn btn-ghost btn-sm" style={{display:'flex',alignItems:'center',gap:6,textDecoration:'none'}}>
              <i className="ti ti-arrow-left" style={{fontSize:14}}/>Dashboard
            </a>
            <span className="app-topbar-title" style={{marginLeft:8}}>Travel · Vollard Black</span>
            {MOCK_MODE&&<span className="pill pill-amber" style={{fontSize:9}}>Demo mode</span>}
            <div className="app-topbar-right">
              <span className="pill pill-primary">
                <i className="ti ti-sparkles" style={{fontSize:11,marginRight:4}}/>
                {ptBal.toLocaleString()} pts
              </span>
            </div>
          </div>

          <div className="app-content">

            {/* Points banner */}
            {ptBal>0&&(
              <div style={{background:'linear-gradient(135deg,#6366F1,#8B5CF6)',borderRadius:'var(--r)',padding:'16px 20px',display:'flex',alignItems:'center',gap:14,boxShadow:'var(--shadow-md)'}}>
                <div style={{fontSize:28,flexShrink:0}}>✨</div>
                <div>
                  <div style={{fontWeight:700,color:'#fff',fontSize:14}}>Lifestyle wallet — {ptBal.toLocaleString()} points = {Rz(ptBal)}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>Apply points to any hotel booking, or reserve them on flight and car requests</div>
                </div>
              </div>
            )}

            {/* Search / My bookings tabs */}
            <div style={{display:'flex',background:'var(--white)',borderRadius:'var(--r)',overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
              {[['search','Search & Book'],['bookings',`My Trips${allRequests.length?` (${allRequests.length})`:''}`]].map(([id,label])=>(
                <button key={id} onClick={()=>{setView(id);setSelHotel(null);setShowFlightForm(false);setShowCarForm(false);}}
                  style={{flex:1,padding:'13px',background:view===id?'var(--primary)':'transparent',color:view===id?'#fff':'var(--text-muted)',border:'none',fontFamily:'var(--font)',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── SEARCH ── */}
            {view==='search'&&<>

              {/* Type selector */}
              {!selHotel&&!showFlightForm&&!showCarForm&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                  {[
                    {id:'hotels',  icon:'🏨', label:'Hotels',      sub:'Book via RateHawk'},
                    {id:'flights', icon:'✈️', label:'Flights',     sub:'Concierge request'},
                    {id:'cars',    icon:'🚗', label:'Car Rental',  sub:'Concierge request'},
                  ].map(t=>(
                    <button key={t.id} onClick={()=>setType(t.id)}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'16px 10px',background:type===t.id?'var(--primary)':'var(--white)',color:type===t.id?'#fff':'var(--text-sub)',border:`1.5px solid ${type===t.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--r)',cursor:'pointer',transition:'all 0.15s',boxShadow:'var(--shadow-xs)',fontFamily:'var(--font)'}}>
                      <span style={{fontSize:26}}>{t.icon}</span>
                      <span style={{fontSize:12,fontWeight:700,letterSpacing:'0.04em'}}>{t.label}</span>
                      <span style={{fontSize:10,opacity:type===t.id?0.75:0.6}}>{t.sub}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── HOTELS ── */}
              {type==='hotels'&&!selHotel&&(
                <>
                  <div className="card">
                    <div className="field">
                      <label className="field-label">Destination</label>
                      <div style={{position:'relative'}}>
                        <i className="ti ti-map-pin" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:16}} aria-hidden="true"/>
                        <input className="field-input" style={{paddingLeft:40}} value={dest} onChange={e=>setDest(e.target.value)} placeholder="City, hotel or resort" onKeyDown={e=>e.key==='Enter'&&doHotelSearch()}/>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14,marginTop:-8}}>
                      {DESTINATIONS.slice(0,8).map(d=>(
                        <button key={d} onClick={()=>setDest(d)} className={dest===d?'btn btn-primary btn-xs':'btn btn-white btn-xs'} style={{borderRadius:'var(--r-full)',fontSize:11}}>{d}</button>
                      ))}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,marginBottom:10}}>
                      <div className="field" style={{marginBottom:0}}>
                        <label className="field-label">Check-in</label>
                        <input className="field-input" type="date" value={checkIn} min={dateIn(0)} onChange={e=>setCheckIn(e.target.value)}/>
                      </div>
                      <div className="field" style={{marginBottom:0}}>
                        <label className="field-label">Check-out</label>
                        <input className="field-input" type="date" value={checkOut} min={checkIn} onChange={e=>setCheckOut(e.target.value)}/>
                      </div>
                      <div className="field" style={{marginBottom:0}}>
                        <label className="field-label">Guests</label>
                        <select className="field-input" style={{width:80}} value={guests} onChange={e=>setGuests(Number(e.target.value))}>
                          {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    {checkIn&&checkOut&&<div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>📅 {nights} night{nights!==1?'s':''}</div>}
                    <button className="btn btn-primary btn-full" disabled={searching} onClick={doHotelSearch}>
                      {searching?'Searching…':'Search hotels'}
                    </button>
                  </div>

                  {/* Results */}
                  {searched&&!searching&&(
                    hotels.length>0?(
                      <>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span className="section-label">{hotels.length} hotels · {dest}</span>
                          <span style={{fontSize:12,color:'var(--text-muted)'}}>{nights} nights · {guests} guests</span>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                          {hotels.map(h=><HotelCard key={h.id} h={h} nights={nights} onSelect={setSelHotel}/>)}
                        </div>
                      </>
                    ):(
                      <div style={{textAlign:'center',padding:'40px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                        <div style={{fontSize:36,marginBottom:10}}>🏨</div>
                        <div style={{fontSize:16,fontWeight:700,color:'var(--text-h)',marginBottom:6}}>No hotels found for {dest}</div>
                        <div style={{fontSize:13,color:'var(--text-muted)'}}>Try a different destination or dates</div>
                      </div>
                    )
                  )}

                  {!searched&&!searching&&(
                    <div>
                      <div className="section-label" style={{marginBottom:12}}>Popular destinations</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                        {[
                          {name:'Cape Town',      img:'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=70'},
                          {name:'Garden Route',   img:'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&q=70'},
                          {name:'Kruger',         img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70'},
                          {name:'Zanzibar',       img:'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&q=70'},
                          {name:'Mauritius',      img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70'},
                          {name:'Dubai',          img:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=70'},
                        ].map(d=>(
                          <button key={d.name} onClick={()=>{setDest(d.name);setType('hotels');}}
                            style={{position:'relative',height:110,borderRadius:'var(--r)',overflow:'hidden',border:'none',cursor:'pointer',padding:0,boxShadow:'var(--shadow-sm)'}}>
                            <img src={d.img} alt={d.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 40%,rgba(0,0,0,0.7)'}}/>
                            <div style={{position:'absolute',bottom:8,left:10,color:'#fff',fontSize:13,fontWeight:700,fontFamily:'var(--font)',textAlign:'left'}}>{d.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Hotel booking detail */}
              {type==='hotels'&&selHotel&&(
                <HotelBooking hotel={selHotel} nights={nights} checkIn={checkIn} checkOut={checkOut} guests={guests} ptBal={ptBal} me={me}
                  onBack={()=>setSelHotel(null)} onDone={()=>{loadData();}} flash={flash}/>
              )}

              {/* ── FLIGHTS ── */}
              {type==='flights'&&(
                <FlightRequest me={me} ptBal={ptBal} onDone={()=>{loadData();setView('bookings');}} flash={flash}/>
              )}

              {/* ── CARS ── */}
              {type==='cars'&&(
                <CarRequest me={me} ptBal={ptBal} onDone={()=>{loadData();setView('bookings');}} flash={flash}/>
              )}
            </>}

            {/* ── MY TRIPS ── */}
            {view==='bookings'&&(
              allRequests.length===0?(
                <div style={{textAlign:'center',padding:'48px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                  <div style={{fontSize:48,marginBottom:12}}>🌍</div>
                  <div style={{fontSize:16,fontWeight:700,color:'var(--text-h)',marginBottom:6}}>No trips yet</div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>Search for hotels, or submit a flight / car request</div>
                  <button className="btn btn-primary" onClick={()=>setView('search')}>Start planning</button>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {/* Hotel bookings */}
                  {bookings.map(b=>(
                    <div key={b.id} style={{background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)',overflow:'hidden'}}>
                      <div style={{background:'linear-gradient(135deg,#6366F1,#0EA5E9)',padding:'14px 20px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div>
                            <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:4}}>🏨 Hotel · {b.booking_ref}</div>
                            <div style={{fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-0.01em'}}>{b.hotel_name}</div>
                            <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>{b.hotel_location}</div>
                          </div>
                          <span className={`pill pill-${b.status==='confirmed'?'green':b.status==='pending'?'amber':'red'}`}>{b.status}</span>
                        </div>
                      </div>
                      <div style={{padding:'14px 20px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:10}}>
                        {[['Check-in',Dz(b.check_in)],['Check-out',Dz(b.check_out)],['Nights',b.nights],['Total',Rz(b.total_cost)],['Cash due',Number(b.cash_due)>0?Rz(b.cash_due):'Covered ✓']].map(([l,v])=>(
                          <div key={l}>
                            <div style={{fontSize:9,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                            <div style={{fontSize:13,fontWeight:700,color:'var(--text-h)'}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Flight + car requests */}
                  {requests.map(r=>(
                    <div key={r.id} style={{background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)',overflow:'hidden'}}>
                      <div style={{background:r.type==='flight'?'linear-gradient(135deg,#374151,#6366F1)':'linear-gradient(135deg,#374151,#10B981)',padding:'14px 20px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div>
                            <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:4}}>
                              {r.type==='flight'?'✈️ Flight':'🚗 Car Rental'} · {r.booking_ref}
                            </div>
                            <div style={{fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-0.01em'}}>
                              {r.type==='flight'?`${r.flight_from} → ${r.flight_to}`:r.car_category}
                            </div>
                            <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>
                              {r.type==='flight'
                                ?`${Dz(r.depart_date)}${r.return_date?` · Return ${Dz(r.return_date)}`:''} · ${r.passengers} pax · ${r.cabin_class}`
                                :`${r.car_location} · ${Dz(r.car_pickup)} → ${Dz(r.car_dropoff)}`}
                            </div>
                          </div>
                          <span className={`pill pill-${r.status==='confirmed'?'green':r.status==='quoted'?'primary':r.status==='pending'?'amber':'red'}`}>{r.status}</span>
                        </div>
                      </div>
                      <div style={{padding:'12px 20px',fontSize:12,color:'var(--text-sub)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span>
                          {r.status==='pending'&&'Awaiting quote — Vollard Black will contact you within 24hrs'}
                          {r.status==='quoted'&&`Quote ready: ${r.quoted_amount?Rz(r.quoted_amount):'—'}`}
                          {r.status==='confirmed'&&'Booking confirmed'}
                          {r.status==='cancelled'&&'Request cancelled'}
                        </span>
                        {r.points_to_use>0&&<span className="pill pill-primary" style={{fontSize:9}}>{Number(r.points_to_use).toLocaleString()} pts reserved</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>
        </div>
      </div>
      {toast&&<div className="toast">{toast}</div>}
    </>
  );
}
