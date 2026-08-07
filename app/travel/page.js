'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { searchHotels, DESTINATIONS, MOCK_MODE } from '@/lib/ratehawk';

const R = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:0,maximumFractionDigits:0});
const MN = n => n ? String(n).padStart(5,'0') : '—';
const Stars = ({n}) => <span style={{color:'var(--gold)',letterSpacing:1}}>{Array(n).fill('★').join('')}</span>;

const TABS = [
  { id:'search',   label:'Search Hotels' },
  { id:'bookings', label:'My Bookings' },
];

// ── Hotel card ────────────────────────────────────────────
function HotelCard({ hotel, nights, onSelect }) {
  return (
    <div className="dt-card" style={{cursor:'pointer',transition:'transform 0.15s,box-shadow 0.15s'}}
      onClick={() => onSelect(hotel)}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(74,10,20,0.18)';}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
      {/* Image */}
      <div style={{position:'relative',height:180,overflow:'hidden'}}>
        <img src={hotel.image} alt={hotel.name}
          style={{width:'100%',height:'100%',objectFit:'cover'}}
          onError={e=>{e.target.style.background='var(--maroon)';e.target.style.display='none';}}/>
        <div style={{position:'absolute',top:12,left:12}}>
          <span className="chip chip-gold"><Stars n={hotel.stars}/></span>
        </div>
        <div style={{position:'absolute',top:12,right:12,background:'var(--maroon)',color:'var(--gold-lt)',borderRadius:'var(--r-xs)',padding:'4px 10px',fontSize:12,fontWeight:700,fontFamily:'var(--display)'}}>
          {hotel.rating} <span style={{fontSize:10,color:'rgba(242,232,213,0.6)',fontFamily:'var(--font)',fontWeight:400}}>/ 10</span>
        </div>
        {/* Gradient overlay */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:60,background:'linear-gradient(transparent,rgba(74,10,20,0.5))'}}/>
      </div>
      {/* Body */}
      <div className="dt-card-body" style={{padding:'14px 16px'}}>
        <div style={{fontSize:15,fontWeight:700,color:'var(--text-h)',marginBottom:3}}>{hotel.name}</div>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10,display:'flex',alignItems:'center',gap:4}}>
          <i className="ti ti-map-pin" aria-hidden="true" style={{fontSize:11}}/>
          {hotel.location}
        </div>
        {/* Amenities */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          {hotel.amenities.slice(0,3).map(a=>(
            <span key={a} style={{fontSize:10,color:'var(--text-sub)',background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:20,padding:'2px 8px'}}>{a}</span>
          ))}
          {hotel.amenities.length>3&&<span style={{fontSize:10,color:'var(--text-dim)'}}>+{hotel.amenities.length-3}</span>}
        </div>
        {/* Price */}
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'var(--display)',fontSize:26,fontWeight:600,color:'var(--maroon)',lineHeight:1}}>{R(hotel.price_per_night)}</div>
            <div style={{fontSize:11,color:'var(--text-dim)',marginTop:2}}>per night · {R(hotel.total || hotel.price_per_night * (nights||1))} total</div>
          </div>
          <button className="btn btn-maroon btn-sm" onClick={e=>{e.stopPropagation();onSelect(hotel);}}>View rooms →</button>
        </div>
      </div>
    </div>
  );
}

// ── Hotel Detail / Booking ────────────────────────────────
function HotelDetail({ hotel, nights, checkIn, checkOut, guests, ptBalance, me, onBack, onBooked, flash }) {
  const [selRoom, setSelRoom] = useState(null);
  const [step, setStep] = useState('detail'); // detail | book | confirm | done
  const [busy, setBusy] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [ptsToUse, setPtsToUse] = useState(0);
  const [bookingRef, setBookingRef] = useState('');

  const room = selRoom || hotel.room_types[0];
  const totalCost = room.price * nights;
  const maxPts = Math.min(ptBalance, totalCost);
  const cashDue = Math.max(0, totalCost - ptsToUse);

  async function confirmBooking() {
    setBusy(true);
    const ref = 'VB-' + Date.now().toString(36).toUpperCase();
    const { error } = await supabase.from('travel_bookings').insert({
      member_id: me.id,
      booking_ref: ref,
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      hotel_location: hotel.location,
      room_name: room.name,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      guests,
      total_cost: totalCost,
      points_used: ptsToUse,
      cash_due: cashDue,
      status: cashDue === 0 ? 'confirmed' : 'pending',
      payment_status: ptsToUse > 0 && cashDue === 0 ? 'points_only' : ptsToUse > 0 ? 'partial' : 'pending',
      provider: 'Vollard Black',
    });
    if (ptsToUse > 0) {
      await supabase.from('lifestyle_ledger').insert({
        member_id: me.id, entry_type: 'redemption', points: ptsToUse,
        note: `Travel booking ${ref} — ${hotel.name}`,
        period: new Date().toISOString().slice(0,7) + '-01',
      });
    }
    setBusy(false);
    if (error) { flash('Booking failed — ' + error.message); return; }
    setBookingRef(ref);
    setStep('done');
    onBooked();
  }

  return (
    <div>
      {step !== 'done' && (
        <button className="btn btn-ghost btn-sm" style={{marginBottom:14}} onClick={onBack}>← Back to results</button>
      )}

      {/* Image gallery */}
      <div style={{position:'relative',borderRadius:'var(--r)',overflow:'hidden',height:240,marginBottom:14}}>
        <img src={hotel.images?.[imgIdx]||hotel.image} alt={hotel.name}
          style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        <div style={{position:'absolute',bottom:12,left:0,right:0,display:'flex',justifyContent:'center',gap:6}}>
          {(hotel.images||[hotel.image]).map((_,i)=>(
            <button key={i} onClick={()=>setImgIdx(i)}
              style={{width:8,height:8,borderRadius:'50%',background:i===imgIdx?'var(--gold)':'rgba(255,255,255,0.5)',border:'none',cursor:'pointer',padding:0}}/>
          ))}
        </div>
        <div style={{position:'absolute',top:14,left:14}}>
          <span className="chip chip-gold"><Stars n={hotel.stars}/></span>
        </div>
        <div style={{position:'absolute',top:14,right:14,background:'var(--maroon)',color:'var(--gold-lt)',borderRadius:'var(--r-xs)',padding:'5px 12px',fontSize:14,fontWeight:700,fontFamily:'var(--display)'}}>
          {hotel.rating}<span style={{fontSize:11,color:'rgba(242,232,213,0.5)',fontFamily:'var(--font)',fontWeight:400,marginLeft:2}}>/ 10</span>
        </div>
      </div>

      {step === 'done' ? (
        <div className="dt-card">
          <div className="dt-card-header" style={{textAlign:'center',padding:'28px 24px 20px'}}>
            <div style={{fontSize:40,marginBottom:12}}>✈️</div>
            <div className="dt-card-header-label">Booking {cashDue===0?'confirmed':'submitted'}</div>
            <div style={{fontFamily:'var(--display)',fontSize:24,color:'var(--gold-lt)',fontWeight:600,margin:'8px 0'}}>{hotel.name}</div>
          </div>
          <div className="dt-card-body">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[['Booking ref',bookingRef],['Hotel',hotel.name],['Room',room.name],[`${nights} nights`,`${checkIn} → ${checkOut}`],['Total cost',R(totalCost)],['Points used',ptsToUse>0?`${ptsToUse.toLocaleString()} pts`:'None'],['Cash due',cashDue>0?R(cashDue):'Fully covered']].map(([l,v])=>(
                <div key={l} style={{padding:'10px 12px',background:'var(--off-white)',borderRadius:'var(--r-xs)',border:'1px solid var(--border)'}}>
                  <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--maroon)',wordBreak:'break-all'}}>{v}</div>
                </div>
              ))}
            </div>
            {cashDue > 0 && (
              <div style={{padding:'12px 16px',background:'var(--gold-bg)',borderRadius:'var(--r-sm)',border:'1px solid var(--gold-border)',fontSize:12,color:'var(--text-sub)',lineHeight:1.8,marginBottom:14}}>
                <strong style={{color:'var(--maroon)',display:'block',marginBottom:6}}>EFT payment required</strong>
                Bank: FNB · Vollard Black (Pty) Ltd<br/>
                Amount: <strong style={{color:'var(--maroon)'}}>{R(cashDue)}</strong><br/>
                Reference: <strong style={{color:'var(--maroon)'}}>{bookingRef}</strong><br/>
                <span style={{color:'var(--text-dim)'}}>Email: bookings@vollardblack.co.za</span>
              </div>
            )}
            <button className="btn btn-maroon btn-full" onClick={onBack}>Search more hotels</button>
          </div>
        </div>
      ) : step === 'book' ? (
        <div>
          <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,color:'var(--maroon)',marginBottom:4}}>{hotel.name}</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:16}}>{hotel.location} · {room.name}</div>

          {/* Booking summary */}
          <div className="card" style={{marginBottom:12}}>
            <div className="section-label" style={{marginBottom:12}}>Booking summary</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['Check-in',checkIn],['Check-out',checkOut],['Nights',nights],['Guests',guests],['Room',room.name],['Rate per night',R(room.price)]].map(([l,v])=>(
                <div key={l} style={{padding:'10px 12px',background:'var(--off-white)',borderRadius:'var(--r-xs)',border:'1px solid var(--border)'}}>
                  <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:600,color:'var(--text-h)'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lifestyle points */}
          {ptBalance > 0 && (
            <div className="card card-gold" style={{marginBottom:12}}>
              <div className="section-label" style={{marginBottom:8}}>Use lifestyle points</div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
                <span style={{fontSize:12,color:'var(--text-sub)'}}>Available: <strong style={{color:'var(--gold-dk)'}}>{ptBalance.toLocaleString()} pts</strong></span>
                <span style={{fontSize:12,color:'var(--text-dim)'}}>= {R(ptBalance)}</span>
              </div>
              <input type="range" min={0} max={maxPts} step={100} value={ptsToUse}
                onChange={e=>setPtsToUse(Number(e.target.value))}
                style={{width:'100%',accentColor:'var(--gold)',marginBottom:10}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                <span style={{color:'var(--text-muted)'}}>Using: <strong style={{color:'var(--gold-dk)'}}>{ptsToUse.toLocaleString()} pts ({R(ptsToUse)})</strong></span>
                <span style={{color:'var(--text-muted)'}}>Cash due: <strong style={{color:'var(--maroon)'}}>{R(cashDue)}</strong></span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="dt-card" style={{marginBottom:14}}>
            <div className="dt-card-header" style={{padding:'16px 20px 14px'}}>
              <div className="dt-card-header-label">Total cost</div>
              <div className="dt-card-header-value">{R(totalCost)}</div>
              {ptsToUse>0&&<div className="dt-card-header-sub">{R(ptsToUse)} covered by points · {R(cashDue)} cash due</div>}
            </div>
          </div>

          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-ghost" onClick={()=>setStep('detail')}>← Back</button>
            <button className="btn btn-maroon" style={{flex:1}} disabled={busy} onClick={confirmBooking}>
              {busy?'Confirming…':cashDue>0?`Confirm — Pay ${R(cashDue)} via EFT`:'Confirm booking'}
            </button>
          </div>
        </div>
      ) : (
        /* Detail view */
        <div>
          <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,color:'var(--maroon)',marginBottom:4}}>{hotel.name}</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12,display:'flex',alignItems:'center',gap:4}}>
            <i className="ti ti-map-pin" aria-hidden="true" style={{fontSize:11}}/>{hotel.address}
          </div>
          <div style={{fontSize:13,color:'var(--text-sub)',lineHeight:1.8,marginBottom:16}}>{hotel.description}</div>

          {/* Amenities */}
          <div className="card" style={{marginBottom:12}}>
            <div className="section-label" style={{marginBottom:10}}>Amenities</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {hotel.amenities.map(a=>(
                <span key={a} style={{fontSize:11,color:'var(--text-sub)',background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:20,padding:'4px 12px',display:'flex',alignItems:'center',gap:4}}>
                  <i className="ti ti-check" aria-hidden="true" style={{fontSize:10,color:'var(--green)'}}/>{a}
                </span>
              ))}
            </div>
          </div>

          {/* Room selection */}
          <div className="card card-flush" style={{marginBottom:14}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--off-white)'}}><span className="section-label">Select a room · {nights} night{nights!==1?'s':''}</span></div>
            {hotel.room_types.map(r=>(
              <div key={r.id} onClick={()=>setSelRoom(r)}
                style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:selRoom?.id===r.id?'var(--maroon-bg)':undefined,transition:'background 0.15s',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:selRoom?.id===r.id?'var(--maroon)':'var(--text-h)',marginBottom:3}}>{r.name}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>{r.beds} · Up to {r.capacity} guests</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--display)',fontSize:22,color:'var(--maroon)',fontWeight:600}}>{R(r.price)}<span style={{fontSize:12,color:'var(--text-dim)',fontWeight:400}}>/night</span></div>
                  <div style={{fontSize:11,color:'var(--text-dim)'}}>{R(r.price*nights)} total</div>
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-maroon btn-full" onClick={()=>{if(!selRoom)setSelRoom(hotel.room_types[0]);setStep('book');}}>
            Book {selRoom?.name||hotel.room_types[0].name} →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Travel Page ──────────────────────────────────────
export default function Travel() {
  const [tab, setTab] = useState('search');
  const [me, setMe] = useState(null);
  const [ptBalance, setPtBalance] = useState(0);
  const [bookings, setBookings] = useState([]);

  // Search state
  const [dest, setDest] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [results, setResults] = useState([]);
  const [searching, setBusy2] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selHotel, setSelHotel] = useState(null);
  const [toast, setToast] = useState('');

  const flash = m => {setToast(m);setTimeout(()=>setToast(''),3500);};

  // Default dates
  useEffect(()=>{
    const today = new Date();
    const inn = new Date(today); inn.setDate(today.getDate()+7);
    const out = new Date(inn); out.setDate(inn.getDate()+3);
    setCheckIn(inn.toISOString().slice(0,10));
    setCheckOut(out.toISOString().slice(0,10));
  },[]);

  useEffect(()=>{
    (async()=>{
      const [m, ll, b] = await Promise.all([
        supabase.from('members').select('*').eq('email','brandon@ohmicoffee.co.za').single(),
        supabase.from('lifestyle_ledger').select('*'),
        supabase.from('travel_bookings').select('*').order('created_at',{ascending:false}),
      ]);
      setMe(m.data);
      const pts = (ll.data||[]).reduce((s,l)=>{
        if(['rank_bonus','adjustment'].includes(l.entry_type)) return s+Number(l.points);
        if(['redemption','expiry'].includes(l.entry_type)) return s-Number(l.points);
        return s;
      },0);
      setPtBalance(pts);
      setBookings(b.data||[]);
    })();
  },[]);

  const nights = checkIn && checkOut ? Math.max(1, Math.round((new Date(checkOut)-new Date(checkIn))/86400000)) : 1;

  async function search() {
    if (!dest) { flash('Please enter a destination'); return; }
    if (!checkIn || !checkOut) { flash('Please set check-in and check-out dates'); return; }
    setBusy2(true); setSearched(false); setSelHotel(null); setResults([]);
    try {
      const hotels = await searchHotels({ destination: dest, checkIn, checkOut, guests });
      setResults(hotels);
      setSearched(true);
    } catch(e) { flash('Search failed — please try again'); }
    setBusy2(false);
  }

  async function refreshBookings() {
    const {data} = await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});
    setBookings(data||[]);
  }

  const R2 = n => 'R\u202f'+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:0,maximumFractionDigits:0});
  const D = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>

      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <span className="mobile-topbar-logo">Travel</span>
        <Link href="/dashboard">
          <button className="btn btn-ghost btn-xs" style={{color:'rgba(242,232,213,0.7)',borderColor:'rgba(242,232,213,0.2)'}}>← Dashboard</button>
        </Link>
      </div>

      <div className="app-shell">
        {/* Rail */}
        <aside className="rail">
          <div className="rail-logo">O</div>
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'0 8px'}}>
            <Link href="/dashboard">
              <button className="rail-item" data-tip="Dashboard" aria-label="Dashboard"><i className="ti ti-layout-dashboard" aria-hidden="true"/></button>
            </Link>
            <button className="rail-item on" data-tip="Travel" aria-label="Travel"><i className="ti ti-plane" aria-hidden="true"/></button>
          </div>
          <div style={{padding:'0 8px 16px'}}>
            <div className="rail-avatar">{me?.full_name?.[0]||'?'}</div>
          </div>
        </aside>

        <div className="app-main">
          {/* Desktop topbar */}
          <div className="app-topbar">
            <span className="app-topbar-title">Travel</span>
            <span className="app-topbar-sub">· Vollard Black · powered by RateHawk{MOCK_MODE?' · demo mode':''}</span>
            <div className="app-topbar-right">
              <span className="topbar-badge topbar-badge-gold">
                <i className="ti ti-sparkles" aria-hidden="true" style={{marginRight:4}}/>
                {ptBalance.toLocaleString()} pts available
              </span>
            </div>
          </div>

          <div className="app-content">
            {/* Wallet banner */}
            <div className="dt-card">
              <div className="dt-card-header" style={{backgroundImage:'linear-gradient(135deg,rgba(201,148,58,0.18) 0%,transparent 60%)'}}>
                <div className="dt-card-header-label">Lifestyle wallet · redeemable on this booking</div>
                <div className="dt-card-header-value">{ptBalance.toLocaleString()} pts</div>
                <div className="dt-card-header-sub">{R2(ptBalance)} in value · 1 point = R1 offset on any booking</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',gap:0,background:'var(--card-bg)',borderRadius:'var(--r)',overflow:'hidden',boxShadow:'var(--shadow-sm)',border:'1px solid var(--border)'}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>{setTab(t.id);setSelHotel(null);}}
                  style={{flex:1,padding:'12px 16px',background:tab===t.id?'var(--maroon)':'transparent',color:tab===t.id?'var(--cream)':'var(--text-muted)',border:'none',fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer',transition:'all 0.15s'}}>
                  {t.label}
                  {t.id==='bookings'&&bookings.length>0&&<span style={{marginLeft:8,background:tab==='bookings'?'var(--gold)':'var(--maroon)',color:tab==='bookings'?'var(--maroon)':'var(--cream)',borderRadius:20,padding:'1px 7px',fontSize:10}}>{bookings.length}</span>}
                </button>
              ))}
            </div>

            {/* ── SEARCH ── */}
            {tab==='search'&&<>
              {selHotel ? (
                <HotelDetail
                  hotel={selHotel} nights={nights}
                  checkIn={checkIn} checkOut={checkOut} guests={guests}
                  ptBalance={ptBalance} me={me}
                  onBack={()=>setSelHotel(null)}
                  onBooked={()=>{refreshBookings();setPtBalance(0);}}
                  flash={flash}
                />
              ) : (
                <>
                  {/* Search form */}
                  <div className="card">
                    <div className="section-label" style={{marginBottom:14}}>Search hotels</div>
                    {/* Destination */}
                    <div className="field">
                      <label className="field-label">Destination</label>
                      <div style={{position:'relative'}}>
                        <i className="ti ti-map-pin" aria-hidden="true" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'var(--text-muted)'}}/>
                        <input className="field-input" style={{paddingLeft:40}} value={dest}
                          onChange={e=>setDest(e.target.value)} placeholder="City, resort, or hotel name"
                          onKeyDown={e=>e.key==='Enter'&&search()}/>
                      </div>
                    </div>
                    {/* Quick destinations */}
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
                      {DESTINATIONS.slice(0,8).map(d=>(
                        <button key={d} onClick={()=>setDest(d)}
                          className={`btn btn-xs ${dest===d?'btn-maroon':'btn-ghost'}`}
                          style={{borderRadius:20}}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {/* Dates + guests */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px',gap:10,marginBottom:14}}>
                      <div className="field" style={{marginBottom:0}}>
                        <label className="field-label">Check-in</label>
                        <input className="field-input" type="date" value={checkIn} min={new Date().toISOString().slice(0,10)} onChange={e=>setCheckIn(e.target.value)}/>
                      </div>
                      <div className="field" style={{marginBottom:0}}>
                        <label className="field-label">Check-out</label>
                        <input className="field-input" type="date" value={checkOut} min={checkIn} onChange={e=>setCheckOut(e.target.value)}/>
                      </div>
                      <div className="field" style={{marginBottom:0}}>
                        <label className="field-label">Guests</label>
                        <select className="field-input" value={guests} onChange={e=>setGuests(Number(e.target.value))}>
                          {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} guest{n>1?'s':''}</option>)}
                        </select>
                      </div>
                    </div>
                    {checkIn&&checkOut&&<div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>{nights} night{nights!==1?'s':''} · {new Date(checkIn).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})} → {new Date(checkOut).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}</div>}
                    <button className="btn btn-maroon btn-full" disabled={searching} onClick={search}
                      style={{fontSize:13,padding:'13px 20px'}}>
                      {searching
                        ? <><i className="ti ti-loader-2" aria-hidden="true" style={{marginRight:6,animation:'spin 1s linear infinite'}}/>Searching…</>
                        : <><i className="ti ti-search" aria-hidden="true" style={{marginRight:6}}/>Search hotels</>}
                    </button>
                  </div>

                  {/* Results */}
                  {searching&&(
                    <div style={{textAlign:'center',padding:'40px 20px',color:'var(--text-muted)'}}>
                      <div style={{fontFamily:'var(--display)',fontSize:20,marginBottom:8}}>Finding the best hotels…</div>
                      <div style={{fontSize:12}}>Searching {dest} for {nights} night{nights!==1?'s':''}</div>
                    </div>
                  )}
                  {searched&&!searching&&(
                    results.length>0?(
                      <>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div className="section-label">{results.length} hotels in {dest}</div>
                          <div style={{fontSize:12,color:'var(--text-muted)'}}>{nights} night{nights!==1?'s':''} · {guests} guest{guests>1?'s':''}</div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                          {results.map(h=>(
                            <HotelCard key={h.id} hotel={h} nights={nights} onSelect={setSelHotel}/>
                          ))}
                        </div>
                      </>
                    ):(
                      <div style={{textAlign:'center',padding:'40px 20px',background:'var(--card-bg)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                        <div style={{fontSize:40,marginBottom:12}}>🏨</div>
                        <div style={{fontFamily:'var(--display)',fontSize:20,color:'var(--maroon)',marginBottom:8}}>No hotels found</div>
                        <div style={{fontSize:13,color:'var(--text-muted)'}}>Try a different destination or dates</div>
                      </div>
                    )
                  )}
                  {!searched&&!searching&&(
                    /* Featured destinations */
                    <div>
                      <div className="section-label" style={{marginBottom:14}}>Featured destinations</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
                        {[
                          {name:'Cape Town',img:'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=80'},
                          {name:'Garden Route',img:'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&q=80'},
                          {name:'Kruger',img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80'},
                          {name:'Zanzibar',img:'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&q=80'},
                          {name:'Mauritius',img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80'},
                          {name:'Dubai',img:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80'},
                        ].map(d=>(
                          <button key={d.name} onClick={()=>{setDest(d.name);}}
                            style={{position:'relative',height:120,borderRadius:'var(--r-sm)',overflow:'hidden',border:'none',cursor:'pointer',padding:0}}>
                            <img src={d.img} alt={d.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 30%,rgba(74,10,20,0.75))'}}/>
                            <div style={{position:'absolute',bottom:10,left:12,right:12,color:'var(--cream)',fontSize:13,fontWeight:700,fontFamily:'var(--display)',textAlign:'left'}}>{d.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>}

            {/* ── MY BOOKINGS ── */}
            {tab==='bookings'&&<>
              {bookings.length===0?(
                <div style={{textAlign:'center',padding:'48px 20px',background:'var(--card-bg)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                  <div style={{fontSize:40,marginBottom:12}}>✈️</div>
                  <div style={{fontFamily:'var(--display)',fontSize:22,color:'var(--maroon)',marginBottom:8}}>No bookings yet</div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>Search for hotels and use your lifestyle points to offset the cost.</div>
                  <button className="btn btn-maroon" onClick={()=>setTab('search')}>Search hotels</button>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {bookings.map(b=>(
                    <div key={b.id} className="dt-card">
                      <div className="dt-card-header" style={{padding:'14px 20px 12px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div>
                            <div className="dt-card-header-label">Booking {b.booking_ref}</div>
                            <div style={{fontFamily:'var(--display)',fontSize:20,color:'var(--gold-lt)',fontWeight:600,margin:'4px 0'}}>{b.hotel_name}</div>
                            <div style={{fontSize:12,color:'rgba(242,232,213,0.5)'}}>{b.hotel_location}</div>
                          </div>
                          <span className={`chip chip-${b.status==='confirmed'?'green':b.status==='pending'?'gold':'red'}`}>{b.status}</span>
                        </div>
                      </div>
                      <div className="dt-card-body">
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8}}>
                          {[
                            ['Room',b.room_name],
                            ['Check-in',D(b.check_in)],
                            ['Check-out',D(b.check_out)],
                            ['Nights',b.nights],
                            ['Total',R2(b.total_cost)],
                            ['Points used',b.points_used>0?`${Number(b.points_used).toLocaleString()} pts`:'None'],
                            ['Cash due',b.cash_due>0?R2(b.cash_due):'Covered'],
                          ].map(([l,v])=>(
                            <div key={l} style={{padding:'8px 10px',background:'var(--off-white)',borderRadius:'var(--r-xs)',border:'1px solid var(--border)'}}>
                              <div style={{fontSize:9,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                              <div style={{fontSize:12,fontWeight:600,color:'var(--maroon)'}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {b.cash_due>0&&b.status==='pending'&&(
                          <div style={{marginTop:12,padding:'10px 14px',background:'var(--gold-bg)',borderRadius:'var(--r-xs)',border:'1px solid var(--gold-border)',fontSize:12,color:'var(--text-sub)'}}>
                            <strong style={{color:'var(--maroon)'}}>Payment pending</strong> — EFT {R2(b.cash_due)} to Vollard Black · Ref: <strong>{b.booking_ref}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {toast&&<div className="toast">{toast}</div>}
    </>
  );
}
