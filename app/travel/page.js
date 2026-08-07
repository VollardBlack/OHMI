'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { searchHotels, searchFlights, searchCars, DESTINATIONS, AIRPORTS, CAR_LOCATIONS, MOCK_MODE } from '@/lib/ratehawk';

const Rz = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:0,maximumFractionDigits:0});
const Dz = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
const Stars = ({n}) => <span style={{color:'var(--amber)',letterSpacing:1,fontSize:11}}>{Array(Number(n)||0).fill('★').join('')}</span>;

const SEARCH_TYPES = [
  { id:'hotels',  label:'Hotels',      icon:'ti-building' },
  { id:'flights', label:'Flights',     icon:'ti-plane' },
  { id:'cars',    label:'Car Rental',  icon:'ti-car' },
];

// ── Airline logo placeholder ──────────────────────────────
const AirlineBadge = ({code, name}) => (
  <div style={{width:42,height:42,borderRadius:'var(--r-xs)',background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    <span style={{fontFamily:'var(--display)',fontSize:11,fontWeight:700,color:'var(--teal)',letterSpacing:0}}>{code}</span>
  </div>
);

// ── Hotel card ────────────────────────────────────────────
function HotelCard({h, nights, onSelect}) {
  return (
    <div className="hotel-card" onClick={()=>onSelect(h)}>
      <div style={{position:'relative'}}>
        <img src={h.image} alt={h.name} className="hotel-img"
          onError={e=>{e.target.style.background='#eee';e.target.style.display='none';}}/>
        <div style={{position:'absolute',top:10,left:10}}>
          <span className="pill pill-gold"><Stars n={h.stars}/> {h.stars}-star</span>
        </div>
        <div style={{position:'absolute',top:10,right:10,background:'var(--primary)',color:'var(--teal)',borderRadius:'var(--r-xs)',padding:'4px 9px',fontSize:13,fontWeight:700,fontFamily:'var(--display)'}}>
          {h.rating}
        </div>
      </div>
      <div className="hotel-body">
        <div className="hotel-name">{h.name}</div>
        <div className="hotel-loc"><i className="ti ti-map-pin" aria-hidden="true" style={{fontSize:11}}/>{h.location}</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
          {h.amenities.slice(0,3).map(a=>(
            <span key={a} style={{fontSize:10,color:'var(--text-sub)',background:'var(--surface-2)',borderRadius:'var(--r-full)',padding:'2px 8px',border:'1px solid var(--border)'}}>{a}</span>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
          <div>
            <span className="hotel-price">{Rz(h.price_per_night)}</span>
            <span style={{fontSize:11,color:'var(--text-dim)'}}>/night · {Rz(h.total||h.price_per_night*(nights||1))} total</span>
          </div>
          <button className="btn btn-maroon btn-xs" onClick={e=>{e.stopPropagation();onSelect(h);}}>View →</button>
        </div>
      </div>
    </div>
  );
}

// ── Flight card ───────────────────────────────────────────
function FlightCard({f, onSelect}) {
  return (
    <div className="card" style={{cursor:'pointer',transition:'box-shadow 0.15s,transform 0.15s'}}
      onClick={()=>onSelect(f)}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='var(--shadow-md)';e.currentTarget.style.transform='translateY(-1px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='';e.currentTarget.style.transform='';}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <AirlineBadge code={f.airline_code} name={f.airline}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:'var(--text-h)',marginBottom:1}}>{f.airline} · {f.flight_number}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{f.class} class · {f.stops===0?'Non-stop':`${f.stops} stop${f.stops>1?'s':''}`}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,color:'var(--primary)'}}>
            {Rz(f.total||f.price)}
          </div>
          <div style={{fontSize:10,color:'var(--text-dim)'}}>{f.passengers>1?`pp · ${Rz(f.price)}`:'per person'}</div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:0,background:'var(--surface-1)',borderRadius:'var(--r-sm)',padding:'12px 16px'}}>
        <div style={{textAlign:'left'}}>
          <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:700,color:'var(--text-h)'}}>{f.departure}</div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)'}}>{f.from.code}</div>
          <div style={{fontSize:10,color:'var(--text-dim)'}}>{f.from.city}</div>
        </div>
        <div style={{flex:1,textAlign:'center',padding:'0 12px'}}>
          <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:4}}>{f.duration}</div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{flex:1,height:1.5,background:'var(--border-md)'}}/>
            <i className="ti ti-plane" aria-hidden="true" style={{color:'var(--primary)',fontSize:14,transform:'rotate(0deg)'}}/>
            <div style={{flex:1,height:1.5,background:'var(--border-md)'}}/>
          </div>
          <div style={{fontSize:10,color:f.stops===0?'var(--green)':'var(--amber)',marginTop:4,fontWeight:600}}>
            {f.stops===0?'Non-stop':`${f.stops} stop`}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:700,color:'var(--text-h)'}}>{f.arrival}</div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)'}}>{f.to.code}</div>
          <div style={{fontSize:10,color:'var(--text-dim)'}}>{f.to.city}</div>
        </div>
      </div>
      <div style={{marginTop:10,fontSize:11,color:'var(--text-dim)',display:'flex',alignItems:'center',gap:4}}>
        <i className="ti ti-briefcase" aria-hidden="true" style={{fontSize:12}}/>{f.baggage}
      </div>
    </div>
  );
}

// ── Car card ──────────────────────────────────────────────
function CarCard({c, onSelect}) {
  return (
    <div className="hotel-card" onClick={()=>onSelect(c)}>
      <div style={{position:'relative'}}>
        <img src={c.image} alt={c.name} className="hotel-img"
          onError={e=>{e.target.style.display='none';}}/>
        <div style={{position:'absolute',top:10,left:10}}>
          <span className="pill pill-maroon">{c.category}</span>
        </div>
        {c.free_cancellation&&(
          <div style={{position:'absolute',top:10,right:10}}>
            <span className="pill pill-green">Free cancel</span>
          </div>
        )}
      </div>
      <div className="hotel-body">
        <div className="hotel-name">{c.name}</div>
        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{c.provider}</div>
        <div style={{display:'flex',gap:12,marginBottom:10,flexWrap:'wrap'}}>
          {[['ti-users',c.seats+' seats'],['ti-luggage',c.bags+' bags'],['ti-settings',c.transmission],['ti-droplet',c.fuel]].map(([icon,label])=>(
            <span key={label} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-sub)'}}>
              <i className={`ti ${icon}`} aria-hidden="true" style={{fontSize:12,color:'var(--primary)'}}/>{label}
            </span>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
          <div>
            <span className="hotel-price">{Rz(c.price_per_day)}</span>
            <span style={{fontSize:11,color:'var(--text-dim)'}}>/day · {c.days?Rz(c.total)+' total':''}</span>
          </div>
          <button className="btn btn-maroon btn-xs" onClick={e=>{e.stopPropagation();onSelect(c);}}>Book →</button>
        </div>
      </div>
    </div>
  );
}

// ── Hotel Detail + Booking ────────────────────────────────
function HotelBooking({hotel, nights, checkIn, checkOut, guests, ptBalance, me, onBack, onBooked, flash}) {
  const [selRoom, setSelRoom] = useState(hotel.room_types[0]);
  const [step, setStep] = useState('detail');
  const [busy, setBusy] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [ptsToUse, setPtsToUse] = useState(0);
  const [ref, setRef] = useState('');
  const totalCost = selRoom.price * nights;
  const maxPts = Math.min(ptBalance, totalCost);
  const cashDue = Math.max(0, totalCost - ptsToUse);

  async function confirm() {
    setBusy(true);
    const bookRef = 'VB-H-' + Date.now().toString(36).toUpperCase();
    const {error} = await supabase.from('travel_bookings').insert({
      member_id:me.id, booking_ref:bookRef, hotel_id:hotel.id,
      hotel_name:hotel.name, hotel_location:hotel.location, room_name:selRoom.name,
      check_in:checkIn, check_out:checkOut, nights, guests,
      total_cost:totalCost, points_used:ptsToUse, cash_due:cashDue,
      status:cashDue===0?'confirmed':'pending',
      payment_status:ptsToUse>0&&cashDue===0?'points_only':ptsToUse>0?'partial':'pending',
      provider:'Vollard Black',
    });
    if(ptsToUse>0) await supabase.from('lifestyle_ledger').insert({member_id:me.id,entry_type:'redemption',points:ptsToUse,note:`Hotel booking ${bookRef}`,period:new Date().toISOString().slice(0,7)+'-01'});
    setBusy(false);
    if(error){flash('Booking failed');return;}
    setRef(bookRef); setStep('done'); onBooked();
  }

  if(step==='done') return (
    <div>
      <div className="dt-card">
        <div className="dt-card-header" style={{textAlign:'center',padding:'28px 20px 20px'}}>
          <div style={{fontSize:36,marginBottom:10}}>🏨</div>
          <div className="dt-card-header-label">Booking {cashDue===0?'confirmed':'submitted'}</div>
          <div style={{fontFamily:'var(--display)',fontSize:22,color:'var(--teal)',fontWeight:600,marginTop:6}}>{hotel.name}</div>
        </div>
        <div className="dt-card-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            {[['Reference',ref],['Check-in',Dz(checkIn)],['Check-out',Dz(checkOut)],['Room',selRoom.name],['Total',Rz(totalCost)],['Cash due',cashDue>0?Rz(cashDue):'Covered']].map(([l,v])=>(
              <div key={l} style={{padding:'10px 12px',background:'var(--surface-1)',borderRadius:'var(--r-xs)',border:'1px solid var(--border)'}}>
                <div style={{fontSize:9,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--primary)',wordBreak:'break-all'}}>{v}</div>
              </div>
            ))}
          </div>
          {cashDue>0&&<div style={{padding:'12px 14px',background:'var(--amber-bg)',borderRadius:'var(--r-sm)',border:'1px solid var(--gold-border)',fontSize:12,color:'var(--text-sub)',lineHeight:1.8,marginBottom:14}}>
            <strong style={{color:'var(--primary)',display:'block',marginBottom:4}}>EFT payment</strong>
            Vollard Black · FNB · Ref: <strong>{ref}</strong> · {Rz(cashDue)}
          </div>}
          <button className="btn btn-maroon btn-full" onClick={onBack}>Search more</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{marginBottom:14}} onClick={onBack}>← Results</button>
      <div style={{position:'relative',borderRadius:'var(--r)',overflow:'hidden',height:220,marginBottom:14}}>
        <img src={hotel.images?.[imgIdx]||hotel.image} alt={hotel.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        <div style={{position:'absolute',bottom:12,left:0,right:0,display:'flex',justifyContent:'center',gap:5}}>
          {(hotel.images||[hotel.image]).map((_,i)=>(
            <button key={i} onClick={()=>setImgIdx(i)} style={{width:7,height:7,borderRadius:'50%',background:i===imgIdx?'var(--amber)':'rgba(255,255,255,0.5)',border:'none',cursor:'pointer',padding:0}}/>
          ))}
        </div>
      </div>
      <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,color:'var(--primary)',marginBottom:3}}>{hotel.name}</div>
      <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>{hotel.address}</div>
      <p style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.8,marginBottom:14}}>{hotel.description}</p>
      {step==='detail'&&<>
        <div className="card" style={{marginBottom:12}}>
          <div className="section-label" style={{marginBottom:10}}>Select room · {nights} night{nights!==1?'s':''}</div>
          {hotel.room_types.map(r=>(
            <div key={r.id} onClick={()=>setSelRoom(r)}
              style={{padding:'14px 0',borderBottom:'1px solid var(--border)',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${selRoom.id===r.id?'var(--primary)':'var(--border-md)'}`,background:selRoom.id===r.id?'var(--primary)':'transparent',flexShrink:0}}/>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:'var(--text-h)'}}>{r.name}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.beds} · {r.capacity} guests max</div>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:600,color:'var(--primary)'}}>{Rz(r.price)}<span style={{fontSize:11,fontFamily:'var(--font)',color:'var(--text-dim)',fontWeight:400}}>/night</span></div>
                <div style={{fontSize:11,color:'var(--text-dim)'}}>{Rz(r.price*nights)} total</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-maroon btn-full" onClick={()=>setStep('book')}>Book {selRoom.name} →</button>
      </>}
      {step==='book'&&<>
        {ptBalance>0&&(
          <div className="card card-gold" style={{marginBottom:12}}>
            <div className="section-label" style={{marginBottom:8}}>Apply lifestyle points</div>
            <div style={{fontSize:12,color:'var(--text-sub)',marginBottom:8}}>Available: <strong style={{color:'var(--amber)'}}>{ptBalance.toLocaleString()} pts = {Rz(ptBalance)}</strong></div>
            <input type="range" min={0} max={maxPts} step={100} value={ptsToUse} onChange={e=>setPtsToUse(Number(e.target.value))} style={{width:'100%',accentColor:'var(--amber)',marginBottom:8}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
              <span>Using: <strong style={{color:'var(--amber)'}}>{ptsToUse.toLocaleString()} pts ({Rz(ptsToUse)})</strong></span>
              <span>Cash due: <strong style={{color:'var(--primary)'}}>{Rz(cashDue)}</strong></span>
            </div>
          </div>
        )}
        <div className="dt-card" style={{marginBottom:12}}>
          <div className="dt-card-header" style={{padding:'14px 20px'}}>
            <div className="dt-card-header-label">Total</div>
            <div className="dt-card-header-value">{Rz(totalCost)}</div>
            {ptsToUse>0&&<div className="dt-card-header-sub">{Rz(ptsToUse)} covered by points · {Rz(cashDue)} cash due</div>}
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-ghost" onClick={()=>setStep('detail')}>← Back</button>
          <button className="btn btn-maroon" style={{flex:1}} disabled={busy} onClick={confirm}>
            {busy?'Confirming…':cashDue>0?`Confirm — Pay ${Rz(cashDue)} EFT`:'Confirm booking'}
          </button>
        </div>
      </>}
    </div>
  );
}

// ── Flight Booking ────────────────────────────────────────
function FlightBooking({flight, passengers, ptBalance, me, onBack, onBooked, flash}) {
  const [ptsToUse, setPtsToUse] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const totalCost = flight.total || flight.price * passengers;
  const maxPts = Math.min(ptBalance, totalCost);
  const cashDue = Math.max(0, totalCost - ptsToUse);

  async function confirm() {
    setBusy(true);
    const bookRef = 'VB-F-' + Date.now().toString(36).toUpperCase();
    await supabase.from('travel_bookings').insert({
      member_id:me.id, booking_ref:bookRef,
      hotel_id:flight.id, hotel_name:`${flight.airline} ${flight.flight_number}`,
      hotel_location:`${flight.from.city} → ${flight.to.city}`,
      room_name:`${flight.class} · ${passengers} pax`,
      check_in:new Date().toISOString().slice(0,10),
      check_out:new Date().toISOString().slice(0,10),
      nights:1, guests:passengers,
      total_cost:totalCost, points_used:ptsToUse, cash_due:cashDue,
      status:cashDue===0?'confirmed':'pending',
      payment_status:ptsToUse>0&&cashDue===0?'points_only':ptsToUse>0?'partial':'pending',
      provider:'Vollard Black',
    });
    if(ptsToUse>0) await supabase.from('lifestyle_ledger').insert({member_id:me.id,entry_type:'redemption',points:ptsToUse,note:`Flight booking ${bookRef}`,period:new Date().toISOString().slice(0,7)+'-01'});
    setBusy(false);
    setRef(bookRef); onBooked();
  }

  if(ref) return (
    <div>
      <div className="dt-card">
        <div className="dt-card-header" style={{textAlign:'center',padding:'28px 20px 20px'}}>
          <div style={{fontSize:36,marginBottom:10}}>✈️</div>
          <div className="dt-card-header-label">Flight {cashDue===0?'confirmed':'submitted'}</div>
          <div style={{fontFamily:'var(--display)',fontSize:20,color:'var(--teal)',fontWeight:600,marginTop:6}}>{flight.from.city} → {flight.to.city}</div>
        </div>
        <div className="dt-card-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            {[['Reference',ref],['Flight',`${flight.airline} ${flight.flight_number}`],['Route',`${flight.from.code} → ${flight.to.code}`],['Class',flight.class],['Total',Rz(totalCost)],['Cash due',cashDue>0?Rz(cashDue):'Covered']].map(([l,v])=>(
              <div key={l} style={{padding:'10px 12px',background:'var(--surface-1)',borderRadius:'var(--r-xs)',border:'1px solid var(--border)'}}>
                <div style={{fontSize:9,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--primary)',wordBreak:'break-all'}}>{v}</div>
              </div>
            ))}
          </div>
          {cashDue>0&&<div style={{padding:'12px 14px',background:'var(--amber-bg)',borderRadius:'var(--r-sm)',border:'1px solid var(--gold-border)',fontSize:12,lineHeight:1.8,marginBottom:14}}>
            Vollard Black · FNB · Ref: <strong>{ref}</strong> · {Rz(cashDue)}
          </div>}
          <button className="btn btn-maroon btn-full" onClick={onBack}>Search more</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{marginBottom:14}} onClick={onBack}>← Results</button>
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <AirlineBadge code={flight.airline_code} name={flight.airline}/>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)'}}>{flight.airline} · {flight.flight_number}</div>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>{flight.class} · {flight.stops===0?'Non-stop':`${flight.stops} stop`}</div>
          </div>
        </div>
        <div style={{background:'var(--surface-1)',borderRadius:'var(--r-sm)',padding:'16px',display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <div style={{textAlign:'left'}}>
            <div style={{fontFamily:'var(--display)',fontSize:24,fontWeight:700,color:'var(--text-h)'}}>{flight.departure}</div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)'}}>{flight.from.code} · {flight.from.city}</div>
          </div>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>{flight.duration}</div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{flex:1,height:1.5,background:'var(--border-md)'}}/>
              <i className="ti ti-plane" aria-hidden="true" style={{color:'var(--primary)',fontSize:16}}/>
              <div style={{flex:1,height:1.5,background:'var(--border-md)'}}/>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'var(--display)',fontSize:24,fontWeight:700,color:'var(--text-h)'}}>{flight.arrival}</div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)'}}>{flight.to.code} · {flight.to.city}</div>
          </div>
        </div>
        <div style={{fontSize:11,color:'var(--text-dim)',display:'flex',alignItems:'center',gap:4}}>
          <i className="ti ti-briefcase" aria-hidden="true" style={{fontSize:12}}/>{flight.baggage}
        </div>
      </div>
      {ptBalance>0&&(
        <div className="card card-gold" style={{marginBottom:12}}>
          <div className="section-label" style={{marginBottom:8}}>Apply lifestyle points</div>
          <div style={{fontSize:12,color:'var(--text-sub)',marginBottom:8}}>Available: <strong style={{color:'var(--amber)'}}>{ptBalance.toLocaleString()} pts = {Rz(ptBalance)}</strong></div>
          <input type="range" min={0} max={maxPts} step={100} value={ptsToUse} onChange={e=>setPtsToUse(Number(e.target.value))} style={{width:'100%',accentColor:'var(--amber)',marginBottom:8}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
            <span>Using: <strong style={{color:'var(--amber)'}}>{ptsToUse.toLocaleString()} pts</strong></span>
            <span>Cash due: <strong style={{color:'var(--primary)'}}>{Rz(cashDue)}</strong></span>
          </div>
        </div>
      )}
      <div className="dt-card" style={{marginBottom:12}}>
        <div className="dt-card-header" style={{padding:'14px 20px'}}>
          <div className="dt-card-header-label">Total · {passengers} pax</div>
          <div className="dt-card-header-value">{Rz(totalCost)}</div>
          {ptsToUse>0&&<div className="dt-card-header-sub">{Rz(ptsToUse)} covered · {Rz(cashDue)} cash due</div>}
        </div>
      </div>
      <button className="btn btn-maroon btn-full" disabled={busy} onClick={confirm}>
        {busy?'Confirming…':cashDue>0?`Confirm — Pay ${Rz(cashDue)} EFT`:'Confirm flight'}
      </button>
    </div>
  );
}

// ── Car Booking ───────────────────────────────────────────
function CarBooking({car, pickupDate, dropoffDate, ptBalance, me, onBack, onBooked, flash}) {
  const [ptsToUse, setPtsToUse] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const days = Math.max(1,Math.round((new Date(dropoffDate)-new Date(pickupDate))/86400000));
  const totalCost = car.price_per_day * days;
  const maxPts = Math.min(ptBalance, totalCost);
  const cashDue = Math.max(0, totalCost - ptsToUse);

  async function confirm() {
    setBusy(true);
    const bookRef = 'VB-C-' + Date.now().toString(36).toUpperCase();
    await supabase.from('travel_bookings').insert({
      member_id:me.id, booking_ref:bookRef,
      hotel_id:car.id, hotel_name:car.name,
      hotel_location:car.provider, room_name:`${car.category} · ${days} days`,
      check_in:pickupDate, check_out:dropoffDate,
      nights:days, guests:1,
      total_cost:totalCost, points_used:ptsToUse, cash_due:cashDue,
      status:cashDue===0?'confirmed':'pending',
      payment_status:ptsToUse>0&&cashDue===0?'points_only':ptsToUse>0?'partial':'pending',
      provider:'Vollard Black',
    });
    if(ptsToUse>0) await supabase.from('lifestyle_ledger').insert({member_id:me.id,entry_type:'redemption',points:ptsToUse,note:`Car rental ${bookRef}`,period:new Date().toISOString().slice(0,7)+'-01'});
    setBusy(false);
    setRef(bookRef); onBooked();
  }

  if(ref) return (
    <div className="dt-card">
      <div className="dt-card-header" style={{textAlign:'center',padding:'28px 20px 20px'}}>
        <div style={{fontSize:36,marginBottom:10}}>🚗</div>
        <div className="dt-card-header-label">Car rental {cashDue===0?'confirmed':'submitted'}</div>
        <div style={{fontFamily:'var(--display)',fontSize:22,color:'var(--teal)',fontWeight:600,marginTop:6}}>{car.name}</div>
      </div>
      <div className="dt-card-body">
        <div style={{fontSize:12,color:'var(--text-sub)',lineHeight:1.8,marginBottom:14}}>
          Ref: <strong style={{color:'var(--primary)'}}>{ref}</strong> · {days} days · {Rz(totalCost)} total{cashDue>0?` · ${Rz(cashDue)} EFT due`:''}
        </div>
        <button className="btn btn-maroon btn-full" onClick={onBack}>Search more</button>
      </div>
    </div>
  );

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{marginBottom:14}} onClick={onBack}>← Results</button>
      <div style={{borderRadius:'var(--r)',overflow:'hidden',height:180,marginBottom:14}}>
        <img src={car.image} alt={car.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
      <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,color:'var(--primary)',marginBottom:4}}>{car.name}</div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:14}}>
        {[['ti-users',car.seats+' seats'],['ti-luggage',car.bags+' bags'],['ti-settings',car.transmission],['ti-droplet',car.fuel]].map(([icon,label])=>(
          <span key={label} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--text-sub)'}}>
            <i className={`ti ${icon}`} aria-hidden="true" style={{color:'var(--primary)'}}/>{label}
          </span>
        ))}
      </div>
      {ptBalance>0&&(
        <div className="card card-gold" style={{marginBottom:12}}>
          <div className="section-label" style={{marginBottom:8}}>Apply lifestyle points</div>
          <input type="range" min={0} max={maxPts} step={100} value={ptsToUse} onChange={e=>setPtsToUse(Number(e.target.value))} style={{width:'100%',accentColor:'var(--amber)',marginBottom:8}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
            <span>Using: <strong style={{color:'var(--amber)'}}>{ptsToUse.toLocaleString()} pts</strong></span>
            <span>Cash due: <strong style={{color:'var(--primary)'}}>{Rz(cashDue)}</strong></span>
          </div>
        </div>
      )}
      <div className="dt-card" style={{marginBottom:12}}>
        <div className="dt-card-header" style={{padding:'14px 20px'}}>
          <div className="dt-card-header-label">Total · {days} day{days!==1?'s':''}</div>
          <div className="dt-card-header-value">{Rz(totalCost)}</div>
        </div>
      </div>
      <button className="btn btn-maroon btn-full" disabled={busy} onClick={confirm}>
        {busy?'Confirming…':cashDue>0?`Confirm — Pay ${Rz(cashDue)} EFT`:'Confirm rental'}
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
export default function Travel() {
  const [searchType, setSearchType] = useState('hotels');
  const [tab, setTab] = useState('search');
  const [me, setMe] = useState(null);
  const [ptBalance, setPtBalance] = useState(0);
  const [bookings, setBookings] = useState([]);

  // Hotel search
  const [dest, setDest] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [hotels, setHotels] = useState([]);
  const [selHotel, setSelHotel] = useState(null);

  // Flight search
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState('return');
  const [flights, setFlights] = useState([]);
  const [selFlight, setSelFlight] = useState(null);

  // Car search
  const [carLoc, setCarLoc] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [cars, setCars] = useState([]);
  const [selCar, setSelCar] = useState(null);

  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState('');

  const flash = m => {setToast(m);setTimeout(()=>setToast(''),3500);};

  // Default dates
  useEffect(()=>{
    const t=new Date(); const inn=new Date(t); inn.setDate(t.getDate()+7);
    const out=new Date(inn); out.setDate(inn.getDate()+3);
    const rd=new Date(inn); rd.setDate(inn.getDate()+10);
    setCheckIn(inn.toISOString().slice(0,10)); setCheckOut(out.toISOString().slice(0,10));
    setFlightDate(inn.toISOString().slice(0,10)); setReturnDate(rd.toISOString().slice(0,10));
    setPickupDate(inn.toISOString().slice(0,10)); setDropoffDate(out.toISOString().slice(0,10));
  },[]);

  useEffect(()=>{
    (async()=>{
      const [m,ll,b]=await Promise.all([
        supabase.from('members').select('*').eq('email','brandon@ohmicoffee.co.za').single(),
        supabase.from('lifestyle_ledger').select('*'),
        supabase.from('travel_bookings').select('*').order('created_at',{ascending:false}),
      ]);
      setMe(m.data);
      setPtBalance((ll.data||[]).reduce((s,l)=>{
        if(['rank_bonus','adjustment'].includes(l.entry_type)) return s+Number(l.points);
        if(['redemption','expiry'].includes(l.entry_type)) return s-Number(l.points);
        return s;
      },0));
      setBookings(b.data||[]);
    })();
  },[]);

  const nights=checkIn&&checkOut?Math.max(1,Math.round((new Date(checkOut)-new Date(checkIn))/86400000)):1;

  async function doSearch() {
    setSearching(true); setSearched(false);
    setSelHotel(null); setSelFlight(null); setSelCar(null);
    try {
      if(searchType==='hotels') {
        if(!dest){flash('Enter a destination');setSearching(false);return;}
        const r=await searchHotels({destination:dest,checkIn,checkOut,guests});
        setHotels(r);
      } else if(searchType==='flights') {
        if(!flightFrom||!flightTo){flash('Enter origin and destination');setSearching(false);return;}
        const r=await searchFlights({from:flightFrom,to:flightTo,date:flightDate,returnDate:tripType==='return'?returnDate:null,passengers,tripType});
        setFlights(r);
      } else {
        if(!carLoc){flash('Enter pickup location');setSearching(false);return;}
        const r=await searchCars({location:carLoc,pickupDate,dropoffDate});
        setCars(r);
      }
      setSearched(true);
    } catch(e){flash('Search failed');}
    setSearching(false);
  }

  async function refreshBookings() {
    const {data}=await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});
    setBookings(data||[]);
  }

  const showDetail = selHotel || selFlight || selCar;

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>
      <div className="mobile-topbar">
        <span className="mobile-topbar-logo">Travel</span>
        <Link href="/dashboard"><button className="btn btn-ghost btn-xs" style={{color:'rgba(255,255,255,0.7)',borderColor:'rgba(255,255,255,0.2)'}}>← Back</button></Link>
      </div>

      <div className="app-shell">
        <aside className="rail">
          <div className="rail-logo">O</div>
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'0 8px'}}>
            <Link href="/dashboard"><button className="rail-item" data-tip="Dashboard" aria-label="Dashboard"><i className="ti ti-layout-dashboard" aria-hidden="true"/></button></Link>
            <button className="rail-item on" data-tip="Travel" aria-label="Travel"><i className="ti ti-plane" aria-hidden="true"/></button>
          </div>
          <div style={{padding:'0 8px 16px'}}><div className="rail-avatar">{me?.full_name?.[0]||'?'}</div></div>
        </aside>

        <div className="app-main">
          <div className="app-topbar">
            <span className="app-topbar-title">Travel · Vollard Black</span>
            <span className="app-topbar-sub">{MOCK_MODE?' · demo mode':' · powered by RateHawk'}</span>
            <div className="app-topbar-right">
              <span className="topbar-badge topbar-badge-gold">
                <i className="ti ti-sparkles" aria-hidden="true" style={{marginRight:4}}/>
                {ptBalance.toLocaleString()} pts
              </span>
            </div>
          </div>

          <div className="app-content">
            {/* Points banner */}
            <div className="dt-card">
              <div className="dt-card-header" style={{backgroundImage:'linear-gradient(135deg,rgba(200,145,58,0.15) 0%,transparent 60%)'}}>
                <div className="dt-card-header-label">Lifestyle wallet · use points to offset any booking</div>
                <div className="dt-card-header-value">{ptBalance.toLocaleString()} pts</div>
                <div className="dt-card-header-sub">{Rz(ptBalance)} value · 1 point = R1 · redeemable on hotels, flights and car rental</div>
              </div>
            </div>

            {/* Search / Bookings tabs */}
            <div style={{display:'flex',gap:0,background:'var(--white)',borderRadius:'var(--r)',overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
              {[{id:'search',label:'Search'},{id:'bookings',label:`My Bookings${bookings.length?` (${bookings.length})`:''}` }].map(t=>(
                <button key={t.id} onClick={()=>{setTab(t.id);setSelHotel(null);setSelFlight(null);setSelCar(null);}}
                  style={{flex:1,padding:'13px 16px',background:tab===t.id?'var(--primary)':'transparent',color:tab===t.id?'#fff':'var(--text-muted)',border:'none',fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer',transition:'all 0.15s'}}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab==='search'&&<>
              {/* If detail view */}
              {showDetail ? (
                selHotel ? <HotelBooking hotel={selHotel} nights={nights} checkIn={checkIn} checkOut={checkOut} guests={guests} ptBalance={ptBalance} me={me} onBack={()=>setSelHotel(null)} onBooked={()=>{refreshBookings();}} flash={flash}/>
                : selFlight ? <FlightBooking flight={selFlight} passengers={passengers} ptBalance={ptBalance} me={me} onBack={()=>setSelFlight(null)} onBooked={()=>{refreshBookings();}} flash={flash}/>
                : <CarBooking car={selCar} pickupDate={pickupDate} dropoffDate={dropoffDate} ptBalance={ptBalance} me={me} onBack={()=>setSelCar(null)} onBooked={()=>{refreshBookings();}} flash={flash}/>
              ) : (
                <>
                  {/* Search type selector — DreamTrips tab style */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    {SEARCH_TYPES.map(st=>(
                      <button key={st.id} onClick={()=>{setSearchType(st.id);setSearched(false);}}
                        style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'14px 10px',background:searchType===st.id?'var(--primary)':'var(--white)',color:searchType===st.id?'#fff':'var(--text-sub)',border:`1.5px solid ${searchType===st.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--r)',fontFamily:'var(--font)',fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer',transition:'all 0.15s',boxShadow:'var(--shadow-xs)'}}>
                        <i className={`ti ${st.icon}`} aria-hidden="true" style={{fontSize:22}}/>
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Hotel search form */}
                  {searchType==='hotels'&&(
                    <div className="card">
                      <div className="field">
                        <label className="field-label">Destination</label>
                        <div style={{position:'relative'}}>
                          <i className="ti ti-map-pin" aria-hidden="true" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'var(--text-muted)'}}/>
                          <input className="field-input" style={{paddingLeft:40}} value={dest} onChange={e=>setDest(e.target.value)} placeholder="City, resort or hotel" onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
                        {DESTINATIONS.slice(0,8).map(d=><button key={d} onClick={()=>setDest(d)} className={`btn btn-xs ${dest===d?'btn-primary':'btn-ghost'}`} style={{borderRadius:'var(--r-full)'}}>{d}</button>)}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,marginBottom:14}}>
                        <div className="field" style={{marginBottom:0}}><label className="field-label">Check-in</label><input className="field-input" type="date" value={checkIn} min={new Date().toISOString().slice(0,10)} onChange={e=>setCheckIn(e.target.value)}/></div>
                        <div className="field" style={{marginBottom:0}}><label className="field-label">Check-out</label><input className="field-input" type="date" value={checkOut} min={checkIn} onChange={e=>setCheckOut(e.target.value)}/></div>
                        <div className="field" style={{marginBottom:0}}><label className="field-label">Guests</label>
                          <select className="field-input" style={{width:90}} value={guests} onChange={e=>setGuests(Number(e.target.value))}>
                            {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                      {checkIn&&checkOut&&<div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>{nights} night{nights!==1?'s':''}</div>}
                      <button className="btn btn-maroon btn-full" disabled={searching} onClick={doSearch}>
                        {searching?'Searching hotels…':'Search hotels'}
                      </button>
                    </div>
                  )}

                  {/* Flight search form */}
                  {searchType==='flights'&&(
                    <div className="card">
                      <div style={{display:'flex',gap:8,marginBottom:14}}>
                        {[{v:'return',l:'Return'},{v:'oneway',l:'One way'}].map(t=>(
                          <button key={t.v} onClick={()=>setTripType(t.v)}
                            className={tripType===t.v?'btn btn-maroon btn-xs':'btn btn-ghost btn-xs'}
                            style={{borderRadius:'var(--r-full)'}}>{t.l}
                          </button>
                        ))}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:10,alignItems:'end',marginBottom:14}}>
                        <div className="field" style={{marginBottom:0}}>
                          <label className="field-label">From</label>
                          <div style={{position:'relative'}}>
                            <i className="ti ti-plane-departure" aria-hidden="true" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--text-muted)'}}/>
                            <input className="field-input" style={{paddingLeft:36}} value={flightFrom} onChange={e=>setFlightFrom(e.target.value)} placeholder="Cape Town, CPT"/>
                          </div>
                        </div>
                        <button onClick={()=>{const t=flightFrom;setFlightFrom(flightTo);setFlightTo(t);}}
                          style={{background:'var(--primary-bg)',border:'1px solid var(--maroon-border)',borderRadius:'var(--r-full)',padding:'10px 12px',cursor:'pointer',color:'var(--primary)',fontSize:16,marginBottom:1}}>⇄</button>
                        <div className="field" style={{marginBottom:0}}>
                          <label className="field-label">To</label>
                          <div style={{position:'relative'}}>
                            <i className="ti ti-plane-arrival" aria-hidden="true" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--text-muted)'}}/>
                            <input className="field-input" style={{paddingLeft:36}} value={flightTo} onChange={e=>setFlightTo(e.target.value)} placeholder="Johannesburg, JNB"/>
                          </div>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:`1fr${tripType==='return'?' 1fr':''} auto`,gap:10,marginBottom:14}}>
                        <div className="field" style={{marginBottom:0}}><label className="field-label">Departure</label><input className="field-input" type="date" value={flightDate} min={new Date().toISOString().slice(0,10)} onChange={e=>setFlightDate(e.target.value)}/></div>
                        {tripType==='return'&&<div className="field" style={{marginBottom:0}}><label className="field-label">Return</label><input className="field-input" type="date" value={returnDate} min={flightDate} onChange={e=>setReturnDate(e.target.value)}/></div>}
                        <div className="field" style={{marginBottom:0}}><label className="field-label">Pax</label>
                          <select className="field-input" style={{width:80}} value={passengers} onChange={e=>setPassengers(Number(e.target.value))}>
                            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                      <button className="btn btn-maroon btn-full" disabled={searching} onClick={doSearch}>
                        {searching?'Searching flights…':'Search flights'}
                      </button>
                    </div>
                  )}

                  {/* Car search form */}
                  {searchType==='cars'&&(
                    <div className="card">
                      <div className="field">
                        <label className="field-label">Pickup location</label>
                        <div style={{position:'relative'}}>
                          <i className="ti ti-map-pin" aria-hidden="true" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'var(--text-muted)'}}/>
                          <input className="field-input" style={{paddingLeft:40}} value={carLoc} onChange={e=>setCarLoc(e.target.value)} placeholder="Airport or city"/>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
                        {CAR_LOCATIONS.slice(0,6).map(l=><button key={l} onClick={()=>setCarLoc(l)} className={`btn btn-xs ${carLoc===l?'btn-primary':'btn-ghost'}`} style={{borderRadius:'var(--r-full)'}}>{l}</button>)}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                        <div className="field" style={{marginBottom:0}}><label className="field-label">Pickup date</label><input className="field-input" type="date" value={pickupDate} min={new Date().toISOString().slice(0,10)} onChange={e=>setPickupDate(e.target.value)}/></div>
                        <div className="field" style={{marginBottom:0}}><label className="field-label">Return date</label><input className="field-input" type="date" value={dropoffDate} min={pickupDate} onChange={e=>setDropoffDate(e.target.value)}/></div>
                      </div>
                      <button className="btn btn-maroon btn-full" disabled={searching} onClick={doSearch}>
                        {searching?'Searching cars…':'Search car rental'}
                      </button>
                    </div>
                  )}

                  {/* Loading */}
                  {searching&&(
                    <div style={{textAlign:'center',padding:'40px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                      <div style={{fontFamily:'var(--display)',fontSize:20,color:'var(--primary)',marginBottom:8}}>
                        {searchType==='hotels'?'Finding the best hotels…':searchType==='flights'?'Searching flights…':'Finding available cars…'}
                      </div>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>{searchType==='hotels'?`${dest} · ${nights} nights`:searchType==='flights'?`${flightFrom} → ${flightTo}`:`${carLoc}`}</div>
                    </div>
                  )}

                  {/* Results */}
                  {searched&&!searching&&<>
                    {searchType==='hotels'&&(
                      hotels.length>0 ? (
                        <>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span className="section-label">{hotels.length} hotels · {dest}</span>
                            <span style={{fontSize:12,color:'var(--text-muted)'}}>{nights} nights · {guests} guests</span>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                            {hotels.map(h=><HotelCard key={h.id} h={h} nights={nights} onSelect={setSelHotel}/>)}
                          </div>
                        </>
                      ) : <div style={{textAlign:'center',padding:'40px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}><div style={{fontSize:36,marginBottom:10}}>🏨</div><div style={{fontFamily:'var(--display)',fontSize:20,color:'var(--primary)'}}>No hotels found for {dest}</div></div>
                    )}
                    {searchType==='flights'&&(
                      flights.length>0 ? (
                        <>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span className="section-label">{flights.length} flights · {flightFrom} → {flightTo}</span>
                            <span style={{fontSize:12,color:'var(--text-muted)'}}>{passengers} pax · {tripType}</span>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:10}}>
                            {flights.map(f=><FlightCard key={f.id} f={f} onSelect={setSelFlight}/>)}
                          </div>
                        </>
                      ) : <div style={{textAlign:'center',padding:'40px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}><div style={{fontSize:36,marginBottom:10}}>✈️</div><div style={{fontFamily:'var(--display)',fontSize:20,color:'var(--primary)'}}>No flights found</div></div>
                    )}
                    {searchType==='cars'&&(
                      cars.length>0 ? (
                        <>
                          <div className="section-label" style={{marginBottom:2}}>{cars.length} cars available · {carLoc}</div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
                            {cars.map(c=><CarCard key={c.id} c={{...c,days:Math.max(1,Math.round((new Date(dropoffDate)-new Date(pickupDate))/86400000)),total:c.price_per_day*Math.max(1,Math.round((new Date(dropoffDate)-new Date(pickupDate))/86400000))}} onSelect={setSelCar}/>)}
                          </div>
                        </>
                      ) : <div style={{textAlign:'center',padding:'40px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}><div style={{fontSize:36,marginBottom:10}}>🚗</div><div style={{fontFamily:'var(--display)',fontSize:20,color:'var(--primary)'}}>No cars found</div></div>
                    )}
                  </>}

                  {/* Featured destinations (empty state) */}
                  {!searched&&!searching&&(
                    <div>
                      <div className="section-label" style={{marginBottom:12}}>Popular destinations</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                        {[
                          {name:'Cape Town',img:'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=80'},
                          {name:'Garden Route',img:'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&q=80'},
                          {name:'Kruger',img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80'},
                          {name:'Zanzibar',img:'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&q=80'},
                          {name:'Mauritius',img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80'},
                          {name:'Dubai',img:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80'},
                        ].map(d=>(
                          <button key={d.name} onClick={()=>{setDest(d.name);setSearchType('hotels');}}
                            style={{position:'relative',height:110,borderRadius:'var(--r)',overflow:'hidden',border:'none',cursor:'pointer',padding:0,boxShadow:'var(--shadow-sm)'}}>
                            <img src={d.img} alt={d.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 35%,rgba(92,10,24,0.72))'}}/>
                            <div style={{position:'absolute',bottom:8,left:10,right:10,color:'#fff',fontSize:13,fontWeight:700,fontFamily:'var(--display)',textAlign:'left'}}>{d.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>}

            {/* ── MY BOOKINGS ── */}
            {tab==='bookings'&&(
              bookings.length===0 ? (
                <div style={{textAlign:'center',padding:'48px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                  <div style={{fontSize:40,marginBottom:12}}>✈️</div>
                  <div style={{fontFamily:'var(--display)',fontSize:22,color:'var(--primary)',marginBottom:8}}>No bookings yet</div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>Search for hotels, flights or car rental and offset costs with lifestyle points.</div>
                  <button className="btn btn-maroon" onClick={()=>setTab('search')}>Start searching</button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {bookings.map(b=>(
                    <div key={b.id} className="dt-card">
                      <div className="dt-card-header" style={{padding:'14px 20px 12px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div>
                            <div className="dt-card-header-label">{b.booking_ref}</div>
                            <div style={{fontFamily:'var(--display)',fontSize:18,color:'var(--teal)',fontWeight:600,marginTop:4}}>{b.hotel_name}</div>
                            <div style={{fontSize:12,color:'rgba(255,255,255,0.45)',marginTop:2}}>{b.hotel_location}</div>
                          </div>
                          <span className={`pill pill-${b.status==='confirmed'?'green':b.status==='pending'?'gold':'red'}`}>{b.status}</span>
                        </div>
                      </div>
                      <div className="dt-card-body">
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8}}>
                          {[['Room/Type',b.room_name],['Check-in',Dz(b.check_in)],['Check-out',Dz(b.check_out)],['Duration',`${b.nights} ${b.nights===1?'night':'nights'}`],['Total',Rz(b.total_cost)],['Cash due',b.cash_due>0?Rz(b.cash_due):'Covered']].map(([l,v])=>(
                            <div key={l} style={{padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--r-xs)',border:'1px solid var(--border)'}}>
                              <div style={{fontSize:9,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                              <div style={{fontSize:12,fontWeight:700,color:'var(--primary)'}}>{v}</div>
                            </div>
                          ))}
                        </div>
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
