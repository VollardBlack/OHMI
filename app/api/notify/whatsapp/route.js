import { NextResponse } from 'next/server';

const WA_TOKEN    = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export async function POST(req) {
  const { to, message } = await req.json();
  if (!to || !message) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const phone = to.replace(/\D/g,'').replace(/^0/,'27');

  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log(`[WhatsApp MOCK] To: +${phone}\n${message}`);
    return NextResponse.json({ success: true, mock: true });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product:'whatsapp', to:phone, type:'text', text:{ body:message } }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data.messages?.[0]?.id });
  } catch(err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
