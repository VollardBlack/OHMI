import { NextResponse } from 'next/server';

const AMADEUS_ID     = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_SECRET = process.env.AMADEUS_CLIENT_SECRET;
const AMADEUS_BASE   = 'https://test.api.amadeus.com'; // change to api.amadeus.com for production

// Cache the OAuth token in memory (expires in 30 min)
let _token = null;
let _tokenExpiry = 0;

async function getAmadeusToken() {
  if (_token && Date.now() < _tokenExpiry - 60000) return _token;
  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     AMADEUS_ID,
      client_secret: AMADEUS_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Amadeus auth failed');
  _token = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _token;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const origin      = searchParams.get('origin');      // IATA e.g. CPT
  const destination = searchParams.get('destination'); // IATA e.g. JNB
  const date        = searchParams.get('date');        // YYYY-MM-DD
  const returnDate  = searchParams.get('return_date'); // YYYY-MM-DD or null
  const adults      = searchParams.get('adults') || '1';
  const travelClass = searchParams.get('cabin') || 'ECONOMY'; // ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST

  if (!origin || !destination || !date)
    return NextResponse.json({ error: 'Missing params: origin, destination, date' }, { status: 400 });

  if (!AMADEUS_ID || !AMADEUS_SECRET)
    return NextResponse.json({ flights: getMockFlights(origin, destination, date, returnDate, Number(adults)), mock: true });

  try {
    const token = await getAmadeusToken();

    const params = new URLSearchParams({
      originLocationCode:      origin.toUpperCase(),
      destinationLocationCode: destination.toUpperCase(),
      departureDate:           date,
      adults,
      travelClass,
      max:                     '15',
      currencyCode:            'ZAR',
    });
    if (returnDate) params.set('returnDate', returnDate);

    const res  = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 180 }, // cache 3 min
    });
    const data = await res.json();

    if (!res.ok || data.errors) {
      console.error('Amadeus error:', JSON.stringify(data.errors));
      return NextResponse.json({ flights: getMockFlights(origin, destination, date, returnDate, Number(adults)), mock: true, amadeus_error: data.errors?.[0]?.detail });
    }

    const dictionaries = data.dictionaries || {};

    const flights = (data.data || []).map(offer => {
      const itin0    = offer.itineraries[0];
      const itin1    = offer.itineraries[1]; // return leg if any
      const seg0     = itin0.segments[0];
      const lastSeg0 = itin0.segments[itin0.segments.length-1];
      const carrier  = dictionaries.carriers?.[seg0.carrierCode] || seg0.carrierCode;
      const price    = Math.round(Number(offer.price.grandTotal));

      return {
        id:            offer.id,
        airline:       carrier,
        airline_code:  seg0.carrierCode,
        flight_number: `${seg0.carrierCode}${seg0.number}`,
        from: {
          code: seg0.departure.iataCode,
          city: seg0.departure.iataCode,
          terminal: seg0.departure.terminal || '',
        },
        to: {
          code: lastSeg0.arrival.iataCode,
          city: lastSeg0.arrival.iataCode,
          terminal: lastSeg0.arrival.terminal || '',
        },
        departure:  seg0.departure.at?.slice(11,16) || '',
        arrival:    lastSeg0.arrival.at?.slice(11,16) || '',
        depart_dt:  seg0.departure.at || '',
        arrive_dt:  lastSeg0.arrival.at || '',
        duration:   itin0.duration?.replace('PT','').replace('H','h ').replace('M','m') || '',
        stops:      itin0.segments.length - 1,
        cabin_class: travelClass,
        baggage:    offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags?.quantity
          ? `${offer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags.quantity} x checked bag`
          : 'Check with airline',
        price,
        passengers: Number(adults),
        // Return leg summary
        return_leg: itin1 ? {
          departure: itin1.segments[0].departure.at?.slice(11,16) || '',
          arrival:   itin1.segments[itin1.segments.length-1].arrival.at?.slice(11,16) || '',
          duration:  itin1.duration?.replace('PT','').replace('H','h ').replace('M','m') || '',
          stops:     itin1.segments.length - 1,
        } : null,
        raw: offer, // keep for booking reference
      };
    });

    return NextResponse.json({ flights, mock: false });
  } catch(err) {
    console.error('Flight search failed:', err.message);
    return NextResponse.json({ flights: getMockFlights(origin, destination, date, returnDate, Number(adults)), mock: true, error: err.message });
  }
}

function getMockFlights(from, to, date, returnDate, pax) {
  const label = `${from.toUpperCase()}→${to.toUpperCase()}`;
  return [
    { id:'f1', airline:'FlySafair', airline_code:'FA', flight_number:'FA201', from:{code:from.toUpperCase(),city:from}, to:{code:to.toUpperCase(),city:to}, departure:'06:00', arrival:'08:05', depart_dt:`${date}T06:00:00`, arrive_dt:`${date}T08:05:00`, duration:'2h 05m', stops:0, cabin_class:'Economy', baggage:'1 x 23kg checked', price:980*pax, passengers:pax, return_leg:returnDate?{departure:'15:00',arrival:'17:10',duration:'2h 10m',stops:0}:null },
    { id:'f2', airline:'Kulula', airline_code:'MN', flight_number:'MN415', from:{code:from.toUpperCase(),city:from}, to:{code:to.toUpperCase(),city:to}, departure:'09:30', arrival:'11:45', depart_dt:`${date}T09:30:00`, arrive_dt:`${date}T11:45:00`, duration:'2h 15m', stops:0, cabin_class:'Economy', baggage:'1 x 20kg checked', price:850*pax, passengers:pax, return_leg:returnDate?{departure:'18:00',arrival:'20:15',duration:'2h 15m',stops:0}:null },
    { id:'f3', airline:'South African Airways', airline_code:'SA', flight_number:'SA321', from:{code:from.toUpperCase(),city:from}, to:{code:to.toUpperCase(),city:to}, departure:'11:00', arrival:'13:10', depart_dt:`${date}T11:00:00`, arrive_dt:`${date}T13:10:00`, duration:'2h 10m', stops:0, cabin_class:'Business', baggage:'2 x 32kg checked', price:3200*pax, passengers:pax, return_leg:returnDate?{departure:'20:00',arrival:'22:10',duration:'2h 10m',stops:0}:null },
    { id:'f4', airline:'Airlink', airline_code:'4Z', flight_number:'4Z601', from:{code:from.toUpperCase(),city:from}, to:{code:to.toUpperCase(),city:to}, departure:'14:15', arrival:'16:30', depart_dt:`${date}T14:15:00`, arrive_dt:`${date}T16:30:00`, duration:'2h 15m', stops:0, cabin_class:'Economy', baggage:'1 x 23kg checked', price:1100*pax, passengers:pax, return_leg:returnDate?{departure:'07:00',arrival:'09:15',duration:'2h 15m',stops:0}:null },
  ];
}
