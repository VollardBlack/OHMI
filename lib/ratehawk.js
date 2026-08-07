// ── RateHawk API Client ──────────────────────────────────────────────────────
// MOCK MODE: Returns realistic data. When credentials arrive:
//   1. Set NEXT_PUBLIC_RATEHAWK_KEY and NEXT_PUBLIC_RATEHAWK_ID in Vercel env vars
//   2. Change MOCK_MODE to false
//   3. Done — all components use this client, nothing else changes.

const MOCK_MODE = true; // flip to false when API credentials arrive
const API_BASE  = 'https://api.ratehawk.com/hotel/v3';
const API_KEY   = process.env.NEXT_PUBLIC_RATEHAWK_KEY || '';
const PARTNER_ID= process.env.NEXT_PUBLIC_RATEHAWK_ID  || '';

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_HOTELS = [
  {
    id: 'h001', name: 'The Twelve Apostles Hotel & Spa', stars: 5,
    location: 'Cape Town, South Africa',
    address: 'Victoria Rd, Camps Bay, Cape Town',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    ],
    rating: 9.4, reviews: 1243,
    price_per_night: 4200, currency: 'ZAR',
    amenities: ['Pool','Spa','Ocean view','Restaurant','Bar','Free WiFi','Gym','Parking'],
    description: 'Nestled between the Twelve Apostles mountain range and the Atlantic Ocean, this iconic five-star hotel offers breathtaking views and world-class facilities.',
    room_types: [
      { id:'r1', name:'Mountain View Room', price: 4200, capacity: 2, beds: '1 King' },
      { id:'r2', name:'Ocean Suite', price: 6800, capacity: 2, beds: '1 King + Lounge' },
      { id:'r3', name:'Luxury Suite', price: 9500, capacity: 4, beds: '2 King' },
    ],
  },
  {
    id: 'h002', name: 'One&Only Cape Town', stars: 5,
    location: 'Cape Town, South Africa',
    address: 'Dock Rd, V&A Waterfront, Cape Town',
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    ],
    rating: 9.6, reviews: 892,
    price_per_night: 7800, currency: 'ZAR',
    amenities: ['Marina views','Spa','2 Pools','Fine dining','Bar','Concierge','Helipad'],
    description: 'Set on a private island in the V&A Waterfront with dramatic views of Table Mountain. One of Africa\'s most celebrated luxury hotels.',
    room_types: [
      { id:'r1', name:'Island Room', price: 7800, capacity: 2, beds: '1 King' },
      { id:'r2', name:'Marina Suite', price: 12500, capacity: 2, beds: '1 King + Lounge' },
    ],
  },
  {
    id: 'h003', name: 'Gondwana Game Reserve', stars: 5,
    location: 'Garden Route, South Africa',
    address: 'R327, Herbertsdale, Western Cape',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
      'https://images.unsplash.com/photo-1549366021-9f761d040a94?w=800&q=80',
    ],
    rating: 9.2, reviews: 654,
    price_per_night: 5600, currency: 'ZAR',
    amenities: ['Big 5 safari','Infinity pool','Bush spa','All meals','Game drives','Star gazing'],
    description: 'A private Big 5 game reserve on the Garden Route offering intimate safari experiences with breathtaking fynbos landscapes and incredible wildlife.',
    room_types: [
      { id:'r1', name:'Bush Chalet', price: 5600, capacity: 2, beds: '1 King' },
      { id:'r2', name:'Family Suite', price: 8900, capacity: 4, beds: '2 Queen' },
    ],
  },
  {
    id: 'h004', name: 'Singita Boulders Lodge', stars: 5,
    location: 'Sabi Sand, South Africa',
    address: 'Sabi Sand Game Reserve, Mpumalanga',
    image: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=800&q=80',
      'https://images.unsplash.com/photo-1546436836-07a91091f160?w=800&q=80',
    ],
    rating: 9.8, reviews: 421,
    price_per_night: 18500, currency: 'ZAR',
    amenities: ['Private safari','Plunge pool','Butler service','All-inclusive','Spa','Wine cellar'],
    description: 'One of the world\'s finest safari lodges, offering an exceptional Big 5 experience in the renowned Sabi Sand Game Reserve adjacent to Kruger National Park.',
    room_types: [
      { id:'r1', name:'Suite', price: 18500, capacity: 2, beds: '1 King + Private pool' },
    ],
  },
  {
    id: 'h005', name: 'The Silo Hotel', stars: 5,
    location: 'Cape Town, South Africa',
    address: 'Silo Square, V&A Waterfront, Cape Town',
    image: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
      'https://images.unsplash.com/photo-1540541338537-ab07be1d3b7f?w=800&q=80',
    ],
    rating: 9.5, reviews: 738,
    price_per_night: 8900, currency: 'ZAR',
    amenities: ['Rooftop pool','Art gallery','Spa','Restaurant','Bar','Table Mountain views'],
    description: 'Housed in the upper floors of a converted grain silo, this architectural masterpiece sits above the Zeitz MOCAA museum with unrivalled Table Mountain views.',
    room_types: [
      { id:'r1', name:'Grain Room', price: 8900, capacity: 2, beds: '1 King' },
      { id:'r2', name:'Loft Suite', price: 14500, capacity: 2, beds: '1 King + Mezzanine' },
    ],
  },
  {
    id: 'h006', name: 'Ellerman House', stars: 5,
    location: 'Cape Town, South Africa',
    address: '180 Kloof Rd, Bantry Bay, Cape Town',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    ],
    rating: 9.7, reviews: 312,
    price_per_night: 11200, currency: 'ZAR',
    amenities: ['Ocean views','Wine gallery','Pool','Art collection','Spa','Private chef'],
    description: 'Cape Town\'s most exclusive boutique hotel — a historic Edwardian mansion with panoramic Atlantic Ocean views and one of Africa\'s finest private wine collections.',
    room_types: [
      { id:'r1', name:'Classic Room', price: 11200, capacity: 2, beds: '1 King' },
      { id:'r2', name:'Panoramic Suite', price: 19800, capacity: 2, beds: '1 King + Terrace' },
    ],
  },
  {
    id: 'h007', name: 'Anantara Nairobi', stars: 5,
    location: 'Nairobi, Kenya',
    address: 'Kirawa Rd, Muthaiga, Nairobi',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
    ],
    rating: 8.9, reviews: 567,
    price_per_night: 2800, currency: 'ZAR',
    amenities: ['Pool','Spa','Safari desk','Restaurant','Bar','Airport transfer'],
    description: 'A sophisticated urban retreat in Nairobi\'s prestigious Muthaiga neighbourhood, perfect as a base for East African safari adventures.',
    room_types: [
      { id:'r1', name:'Deluxe Room', price: 2800, capacity: 2, beds: '1 King' },
      { id:'r2', name:'Pool Suite', price: 5200, capacity: 2, beds: '1 King + Private pool' },
    ],
  },
  {
    id: 'h008', name: 'Radisson Blu Waterfront', stars: 4,
    location: 'Cape Town, South Africa',
    address: 'Beach Rd, V&A Waterfront, Cape Town',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    ],
    rating: 8.4, reviews: 2104,
    price_per_night: 1650, currency: 'ZAR',
    amenities: ['Waterfront views','Pool','Restaurant','Bar','Gym','Parking'],
    description: 'Modern four-star hotel on the V&A Waterfront with spectacular views of Table Mountain and easy access to Cape Town\'s top attractions.',
    room_types: [
      { id:'r1', name:'Standard Room', price: 1650, capacity: 2, beds: '1 Queen' },
      { id:'r2', name:'Superior Waterfront', price: 2200, capacity: 2, beds: '1 King' },
      { id:'r3', name:'Junior Suite', price: 3400, capacity: 3, beds: '1 King + Sofa' },
    ],
  },
];

const DESTINATIONS = [
  'Cape Town', 'Johannesburg', 'Durban', 'Garden Route',
  'Kruger', 'Hermanus', 'Knysna', 'Nairobi', 'Zanzibar',
  'Mauritius', 'Dubai', 'London', 'Maldives',
];

// ── API Functions ─────────────────────────────────────────────────────────────

export async function searchHotels({ destination, checkIn, checkOut, guests = 2 }) {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 900)); // simulate network delay
    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
    return MOCK_HOTELS
      .filter(h => !destination || h.location.toLowerCase().includes(destination.toLowerCase()))
      .map(h => ({ ...h, nights, total: h.price_per_night * nights }));
  }

  // Real RateHawk API call
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${PARTNER_ID}:${API_KEY}`)}`,
    },
    body: JSON.stringify({
      query: destination,
      checkin: checkIn,
      checkout: checkOut,
      guests: [{ adults: guests }],
      currency: 'ZAR',
      language: 'en',
    }),
  });
  const data = await res.json();
  return data.hotels || [];
}

export async function getHotelDetails(hotelId) {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 400));
    return MOCK_HOTELS.find(h => h.id === hotelId) || null;
  }
  const res = await fetch(`${API_BASE}/hotel/${hotelId}`, {
    headers: { 'Authorization': `Basic ${btoa(`${PARTNER_ID}:${API_KEY}`)}` },
  });
  return (await res.json()).hotel || null;
}

export async function createBooking({ hotelId, roomId, checkIn, checkOut, guests, memberDetails, pointsUsed = 0 }) {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 1200));
    return {
      booking_id: 'VB-' + Date.now().toString(36).toUpperCase(),
      status: 'confirmed',
      hotel_id: hotelId,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      member: memberDetails,
      points_used: pointsUsed,
      confirmation_sent: memberDetails.email,
    };
  }
  const res = await fetch(`${API_BASE}/order/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${PARTNER_ID}:${API_KEY}`)}`,
    },
    body: JSON.stringify({ hotel_id: hotelId, room_id: roomId, checkin: checkIn, checkout: checkOut, guests }),
  });
  return await res.json();
}

export { DESTINATIONS, MOCK_HOTELS, MOCK_MODE };

// ── FLIGHTS MOCK DATA ─────────────────────────────────────────────────────────
const MOCK_FLIGHTS = [
  {
    id: 'f001', airline: 'FlySafair', airline_code: 'FA',
    flight_number: 'FA201',
    from: { code:'CPT', city:'Cape Town', name:'Cape Town International' },
    to:   { code:'JNB', city:'Johannesburg', name:'OR Tambo International' },
    departure: '06:00', arrival: '08:05', duration: '2h 05m',
    stops: 0, class: 'Economy',
    price: 980, baggage: '1 x 23kg checked + 7kg carry-on',
  },
  {
    id: 'f002', airline: 'Kulula', airline_code: 'MN',
    flight_number: 'MN415',
    from: { code:'CPT', city:'Cape Town', name:'Cape Town International' },
    to:   { code:'JNB', city:'Johannesburg', name:'OR Tambo International' },
    departure: '09:30', arrival: '11:45', duration: '2h 15m',
    stops: 0, class: 'Economy',
    price: 850, baggage: '1 x 20kg checked + 7kg carry-on',
  },
  {
    id: 'f003', airline: 'South African Airways', airline_code: 'SA',
    flight_number: 'SA321',
    from: { code:'CPT', city:'Cape Town', name:'Cape Town International' },
    to:   { code:'JNB', city:'Johannesburg', name:'OR Tambo International' },
    departure: '11:00', arrival: '13:10', duration: '2h 10m',
    stops: 0, class: 'Business',
    price: 3200, baggage: '2 x 32kg checked + 12kg carry-on',
  },
  {
    id: 'f004', airline: 'Emirates', airline_code: 'EK',
    flight_number: 'EK776',
    from: { code:'JNB', city:'Johannesburg', name:'OR Tambo International' },
    to:   { code:'DXB', city:'Dubai', name:'Dubai International' },
    departure: '22:30', arrival: '05:15+1', duration: '8h 45m',
    stops: 0, class: 'Economy',
    price: 8400, baggage: '2 x 23kg checked + 7kg carry-on',
  },
  {
    id: 'f005', airline: 'Kenya Airways', airline_code: 'KQ',
    flight_number: 'KQ101',
    from: { code:'JNB', city:'Johannesburg', name:'OR Tambo International' },
    to:   { code:'NBO', city:'Nairobi', name:'Jomo Kenyatta International' },
    departure: '13:20', arrival: '17:45', duration: '4h 25m',
    stops: 0, class: 'Economy',
    price: 3800, baggage: '1 x 23kg checked + 7kg carry-on',
  },
  {
    id: 'f006', airline: 'British Airways', airline_code: 'BA',
    flight_number: 'BA057',
    from: { code:'JNB', city:'Johannesburg', name:'OR Tambo International' },
    to:   { code:'LHR', city:'London', name:'London Heathrow' },
    departure: '19:35', arrival: '05:45+1', duration: '11h 10m',
    stops: 0, class: 'Economy',
    price: 12500, baggage: '1 x 23kg checked + 7kg carry-on',
  },
];

// ── CARS MOCK DATA ────────────────────────────────────────────────────────────
const MOCK_CARS = [
  {
    id: 'c001', category: 'Economy',
    name: 'Toyota Corolla', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80',
    seats: 5, doors: 4, transmission: 'Automatic', fuel: 'Petrol',
    ac: true, bags: 2,
    price_per_day: 320, provider: 'Europcar',
    features: ['Bluetooth', 'USB Charging', 'GPS Available'],
    free_cancellation: true,
  },
  {
    id: 'c002', category: 'Compact SUV',
    name: 'Hyundai Tucson', image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&q=80',
    seats: 5, doors: 4, transmission: 'Automatic', fuel: 'Petrol',
    ac: true, bags: 3,
    price_per_day: 520, provider: 'Avis',
    features: ['Bluetooth', 'Reverse Camera', 'Cruise Control', 'GPS'],
    free_cancellation: true,
  },
  {
    id: 'c003', category: 'Premium',
    name: 'BMW 3 Series', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80',
    seats: 5, doors: 4, transmission: 'Automatic', fuel: 'Petrol',
    ac: true, bags: 3,
    price_per_day: 980, provider: 'Hertz',
    features: ['Premium Sound', 'Heated Seats', 'Sunroof', 'GPS', 'Leather Interior'],
    free_cancellation: false,
  },
  {
    id: 'c004', category: 'Large SUV',
    name: 'Toyota Land Cruiser', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80',
    seats: 7, doors: 4, transmission: 'Automatic', fuel: 'Diesel',
    ac: true, bags: 5,
    price_per_day: 1200, provider: 'Tempest',
    features: ['4x4', 'GPS', 'Bull Bar', 'High Clearance', 'Safari Ready'],
    free_cancellation: true,
  },
  {
    id: 'c005', category: 'Minivan',
    name: 'Toyota HiAce', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    seats: 8, doors: 2, transmission: 'Manual', fuel: 'Diesel',
    ac: true, bags: 8,
    price_per_day: 680, provider: 'Europcar',
    features: ['Spacious', 'Roof Rack', 'Large Boot'],
    free_cancellation: true,
  },
  {
    id: 'c006', category: 'Economy',
    name: 'Volkswagen Polo', image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400&q=80',
    seats: 5, doors: 4, transmission: 'Manual', fuel: 'Petrol',
    ac: true, bags: 1,
    price_per_day: 260, provider: 'Budget',
    features: ['Fuel Efficient', 'Easy Parking'],
    free_cancellation: true,
  },
];

const AIRPORTS = [
  'Cape Town (CPT)', 'Johannesburg (JNB)', 'Durban (DUR)',
  'Port Elizabeth (PLZ)', 'Nairobi (NBO)', 'Dubai (DXB)',
  'London Heathrow (LHR)', 'Mauritius (MRU)',
];

const CAR_LOCATIONS = [
  'Cape Town Airport', 'Cape Town City Centre',
  'Johannesburg Airport', 'Sandton', 'Durban Airport',
  'George Airport', 'Hermanus', 'Knysna',
];

export async function searchFlights({ from, to, date, returnDate, passengers = 1, tripType = 'return' }) {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 800));
    return MOCK_FLIGHTS.filter(f =>
      (!from || f.from.code.toLowerCase().includes(from.toLowerCase()) || f.from.city.toLowerCase().includes(from.toLowerCase())) &&
      (!to   || f.to.code.toLowerCase().includes(to.toLowerCase())     || f.to.city.toLowerCase().includes(to.toLowerCase()))
    ).map(f => ({
      ...f,
      total: f.price * passengers * (tripType === 'return' ? 2 : 1),
      passengers,
      tripType,
    }));
  }
  // Real API call here
  const res = await fetch(`${API_BASE}/flight/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(`${PARTNER_ID}:${API_KEY}`)}` },
    body: JSON.stringify({ from, to, date, return_date: returnDate, passengers, currency: 'ZAR' }),
  });
  return (await res.json()).flights || [];
}

export async function searchCars({ location, pickupDate, dropoffDate }) {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 600));
    const days = Math.max(1, Math.round((new Date(dropoffDate) - new Date(pickupDate)) / 86400000));
    return MOCK_CARS.map(c => ({ ...c, days, total: c.price_per_day * days }));
  }
  const res = await fetch(`${API_BASE}/car/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(`${PARTNER_ID}:${API_KEY}`)}` },
    body: JSON.stringify({ location, pickup_date: pickupDate, dropoff_date: dropoffDate, currency: 'ZAR' }),
  });
  return (await res.json()).cars || [];
}

export { AIRPORTS, CAR_LOCATIONS, MOCK_CARS, MOCK_FLIGHTS };
