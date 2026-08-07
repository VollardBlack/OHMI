import { NextResponse } from 'next/server';

const SERPAPI_KEY = process.env.SERPAPI_KEY;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q       = searchParams.get('q');
  const checkIn = searchParams.get('check_in');
  const checkOut= searchParams.get('check_out');
  const adults  = searchParams.get('adults') || '2';

  if (!q || !checkIn || !checkOut)
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const nights = Math.max(1, Math.round((new Date(checkOut)-new Date(checkIn))/86400000));

  if (!SERPAPI_KEY) {
    return NextResponse.json({ hotels: mock(q, nights), mock: true });
  }

  try {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine',         'google_hotels');
    url.searchParams.set('q',              `hotels in ${q}`);
    url.searchParams.set('check_in_date',  checkIn);
    url.searchParams.set('check_out_date', checkOut);
    url.searchParams.set('adults',         adults);
    url.searchParams.set('currency',       'ZAR');
    url.searchParams.set('gl',             'za');
    url.searchParams.set('hl',             'en');
    url.searchParams.set('api_key',        SERPAPI_KEY);

    const res  = await fetch(url.toString(), { next: { revalidate: 300 } });
    const data = await res.json();

    if (!res.ok || data.error)
      return NextResponse.json({ hotels: mock(q, nights), mock: true, serpapi_error: data.error });

    const hotels = (data.properties || []).slice(0,20).map(h => {
      const ppn = h.rate_per_night?.lowest
        ? Math.round(Number(String(h.rate_per_night.lowest).replace(/[^0-9.]/g,''))) : null;
      return {
        id:             h.property_token || crypto.randomUUID(),
        name:           h.name,
        location:       h.neighborhood || h.location || q,
        address:        h.address || '',
        stars:          h.hotel_class ? Number(h.hotel_class) : 3,
        rating:         h.overall_rating ? Number(h.overall_rating).toFixed(1) : null,
        reviews:        h.reviews || 0,
        image:          h.images?.[0]?.thumbnail || null,
        images:         (h.images||[]).slice(0,5).map(i=>i.thumbnail||i.original).filter(Boolean),
        amenities:      h.amenities || [],
        price_per_night: ppn,
        total:          ppn ? ppn * nights : null,
        free_cancel:    (h.essential_info||[]).some(s=>typeof s==='string'&&s.toLowerCase().includes('cancel')),
        check_in_time:  h.check_in_time || '14:00',
        check_out_time: h.check_out_time || '11:00',
        nights,
        property_token: h.property_token || null,
        room_types: [{
          id:'std', name:'Standard Room',
          price: ppn || 1500, beds:'Double bed', capacity:2,
        }],
      };
    }).filter(h => h.price_per_night);

    return NextResponse.json({ hotels, mock: false });
  } catch(err) {
    console.error('Hotel search failed:', err.message);
    return NextResponse.json({ hotels: mock(q, nights), mock: true, error: err.message });
  }
}

function mock(q, nights) {
  return [
    { id:'m1', name:`The ${q} Grand`, location:q, address:`Main Road, ${q}`, stars:5, rating:'9.1', reviews:1240, image:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70', images:['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70'], amenities:['WiFi','Pool','Gym','Spa','Restaurant'], price_per_night:2800, total:2800*nights, free_cancel:true, room_types:[{id:'dlx',name:'Deluxe Room',price:2800,beds:'King bed',capacity:2},{id:'ste',name:'Junior Suite',price:4200,beds:'King + sofa',capacity:3}], check_in_time:'14:00', check_out_time:'11:00', nights },
    { id:'m2', name:`${q} Boutique Hotel`, location:q, address:`Beach Road, ${q}`, stars:4, rating:'8.6', reviews:892, image:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=70', images:['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=70'], amenities:['WiFi','Pool','Restaurant'], price_per_night:1650, total:1650*nights, free_cancel:true, room_types:[{id:'std',name:'Standard Room',price:1650,beds:'Double',capacity:2},{id:'sea',name:'Sea View',price:2100,beds:'King',capacity:2}], check_in_time:'15:00', check_out_time:'11:00', nights },
    { id:'m3', name:`${q} Inn`, location:q, address:`Church Street, ${q}`, stars:3, rating:'7.9', reviews:456, image:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=70', images:['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=70'], amenities:['WiFi','Breakfast','Parking'], price_per_night:890, total:890*nights, free_cancel:false, room_types:[{id:'std',name:'Standard',price:890,beds:'Twin',capacity:2}], check_in_time:'14:00', check_out_time:'10:00', nights },
    { id:'m4', name:`${q} Safari Lodge`, location:q, address:`Reserve Road, ${q}`, stars:5, rating:'9.4', reviews:334, image:'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&q=70', images:['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&q=70'], amenities:['WiFi','Pool','Game Drives','All-inclusive','Spa'], price_per_night:6800, total:6800*nights, free_cancel:true, room_types:[{id:'tent',name:'Luxury Tent',price:6800,beds:'King',capacity:2},{id:'villa',name:'Private Villa',price:12000,beds:'King+Twin',capacity:4}], check_in_time:'12:00', check_out_time:'10:00', nights },
    { id:'m5', name:`${q} Guesthouse`, location:q, address:`Oak Ave, ${q}`, stars:3, rating:'8.2', reviews:178, image:'https://images.unsplash.com/photo-1630660664869-c9d3cc676880?w=600&q=70', images:['https://images.unsplash.com/photo-1630660664869-c9d3cc676880?w=600&q=70'], amenities:['WiFi','Breakfast','Garden'], price_per_night:650, total:650*nights, free_cancel:true, room_types:[{id:'std',name:'Garden Room',price:650,beds:'Double',capacity:2}], check_in_time:'14:00', check_out_time:'10:00', nights },
  ];
}
