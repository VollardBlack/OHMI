'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const PRODUCTS = [
  {
    id: 'bugisu-250g',
    name: 'Uganda Bugisu AA',
    size: '250g',
    price: 100,
    cost: 59.72,
    origin: 'Mt Elgon · Uganda',
    notes: 'Washed process · SCA 83.0 · Cocoa, stone fruit, brown sugar',
    roaster: 'Contract roasted by Wiara Coffee · Johannesburg',
  },
  {
    id: 'bugisu-1kg',
    name: 'Uganda Bugisu AA',
    size: '1kg',
    price: 365,
    cost: 216,
    origin: 'Mt Elgon · Uganda',
    notes: 'Washed process · SCA 83.0 · Cocoa, stone fruit, brown sugar',
    roaster: 'Contract roasted by Wiara Coffee · Johannesburg',
  },
];

export default function Home() {
  const [cart, setCart] = useState({});
  const [step, setStep] = useState('shop'); // shop | checkout | done
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const add = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));
  const items = PRODUCTS.filter(p => cart[p.id] > 0).map(p => ({ ...p, qty: cart[p.id] }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function placeOrder() {
    if (!form.name || !form.email) return flash('Please fill in your name and email.');
    setBusy(true);
    const { error } = await supabase.from('retail_orders').insert({
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      items: items.map(i => ({ id: i.id, name: i.name, size: i.size, qty: i.qty, price: i.price })),
      subtotal: total,
      total: total,
      status: 'pending',
    });
    setBusy(false);
    if (error) { flash('Order failed — please try again.'); return; }
    setStep('done');
    setCart({});
  }

  return (
    <>
      <header className="ohmi-header">
        <div className="container">
          <div className="ohmi-logo">OHMI<span>.</span></div>
          <nav className="ohmi-nav">
            <a href="/" className="active">Shop</a>
            <a href="/join">Join</a>
            <a href="/dashboard">Dashboard</a>
            <Link href="/join" className="nav-cta">Join — R2,500</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: 'var(--dark)', padding: '80px 0 60px', borderBottom: '1px solid #1e1e1e' }}>
        <div className="container">
          <div className="kicker">Single Origin · Uganda</div>
          <h1 className="section-title" style={{ maxWidth: '14ch' }}>
            Coffee roasted with <span>purpose.</span>
          </h1>
          <div className="gold-line" />
          <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.8, maxWidth: '52ch', marginTop: 8 }}>
            Uganda Bugisu AA from the slopes of Mount Elgon. Contract-roasted in small batches by
            Wiara Coffee. Every kilogram puts R15 toward feeding children in the Bitou region.
          </p>
          <p style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 20 }}>
            One Team. One Dream. One Legacy.
          </p>
        </div>
      </section>

      {/* Shop */}
      {step === 'shop' && (
        <section className="section">
          <div className="container">
            <div className="kicker">The Roast</div>
            <h2 className="section-title" style={{ fontSize: 36, marginBottom: 32 }}>Order fresh coffee.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {PRODUCTS.map(p => (
                <div key={p.id} className="card">
                  <div style={{ background: '#0f0f0f', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1px solid #1e1e1e' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 48, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{p.size}</div>
                      <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 6 }}>{p.origin}</div>
                    </div>
                  </div>
                  <div className="kicker" style={{ marginBottom: 6 }}>{p.origin}</div>
                  <h3 style={{ fontSize: 22, marginBottom: 8 }}>{p.name} — {p.size}</h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 6 }}>{p.notes}</p>
                  <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 20 }}>{p.roaster}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>R{p.price}</span>
                    {cart[p.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => add(p.id, -1)} style={{ width: 34, height: 34, background: 'var(--dark3)', border: '1px solid #333', color: 'var(--white)', fontSize: 18, cursor: 'pointer' }}>−</button>
                        <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{cart[p.id]}</span>
                        <button onClick={() => add(p.id, 1)} style={{ width: 34, height: 34, background: 'var(--dark3)', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 18, cursor: 'pointer' }}>+</button>
                      </div>
                    ) : (
                      <button className="btn btn-gold btn-sm" onClick={() => add(p.id, 1)}>Add to order</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            {items.length > 0 && (
              <div className="card card-gold" style={{ marginTop: 32, maxWidth: 520 }}>
                <div className="kicker" style={{ marginBottom: 14 }}>Your order</div>
                {items.map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2a2a2a', fontSize: 14 }}>
                    <span>{i.name} {i.size} × {i.qty}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>R{i.price * i.qty}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 20px', fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--gold)' }}>R{total}</span>
                </div>
                <button className="btn btn-gold btn-full" onClick={() => setStep('checkout')}>
                  Proceed to checkout
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Checkout */}
      {step === 'checkout' && (
        <section className="section">
          <div className="container" style={{ maxWidth: 520 }}>
            <div className="kicker">Checkout</div>
            <h2 className="section-title" style={{ fontSize: 32, marginBottom: 28 }}>Your details</h2>
            <div className="card">
              {items.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e1e', fontSize: 13, color: 'var(--muted)' }}>
                  <span>{i.name} {i.size} × {i.qty}</span>
                  <span style={{ color: 'var(--gold)' }}>R{i.price * i.qty}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 20px', fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700 }}>
                <span>Total</span><span style={{ color: 'var(--gold)' }}>R{total}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+27 000 000 0000" />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-dark" onClick={() => setStep('shop')}>Back</button>
                <button className="btn btn-gold" style={{ flex: 1 }} onClick={placeOrder} disabled={busy}>
                  {busy ? 'Placing order…' : 'Place order — Payment on delivery'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 12, textAlign: 'center' }}>
                Secure online payment coming soon. We will confirm your order by email.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Done */}
      {step === 'done' && (
        <section className="section">
          <div className="container" style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>☕</div>
            <div className="kicker">Order received</div>
            <h2 className="section-title" style={{ fontSize: 32, marginBottom: 16 }}>We roast on Tuesdays.</h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28 }}>
              Your order is confirmed. We'll be in touch within 24 hours to arrange delivery.
              Your coffee ships within 48 hours of roasting.
            </p>
            <div style={{ padding: '16px', background: 'var(--dark2)', border: '1px solid #2a2a2a', fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>
              R15 from this order goes to feeding children in the Bitou region. Thank you.
            </div>
            <button className="btn btn-gold" onClick={() => setStep('shop')}>Order more coffee</button>
          </div>
        </section>
      )}

      {/* Foundation strip */}
      <section style={{ background: 'var(--dark2)', borderTop: '1px solid #1e1e1e', padding: '40px 0' }}>
        <div className="container" style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="kicker">OHMI Foundation</div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--gold)' }}>Every kilo feeds a child.</h3>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8, flex: 1, minWidth: 200 }}>
            R15 from every kilogram sold is allocated to feeding programmes in the Bitou region.
            It's not a marketing line — it's a fixed cost in our structure.
          </p>
        </div>
      </section>

      <footer style={{ background: 'var(--dark)', borderTop: '1px solid #1e1e1e', padding: '28px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--dim)', letterSpacing: '0.1em' }}>
          <span>© {new Date().getFullYear()} OHMI COFFEE CO. (PTY) LTD · HERMANUS, WESTERN CAPE</span>
          <span>ONE TEAM. ONE DREAM. ONE LEGACY.</span>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
