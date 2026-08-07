'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const PRODUCTS = [
  { id: 'bugisu-250g', name: 'Uganda Bugisu AA', size: '250g', price: 100, origin: 'Mt Elgon · Uganda', notes: 'Washed · SCA 83.0 · Cocoa, stone fruit, brown sugar' },
  { id: 'bugisu-1kg',  name: 'Uganda Bugisu AA', size: '1kg',  price: 365, origin: 'Mt Elgon · Uganda', notes: 'Washed · SCA 83.0 · Cocoa, stone fruit, brown sugar' },
];

export default function Home() {
  const [cart, setCart] = useState({});
  const [step, setStep] = useState('shop');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const add = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));
  const items = PRODUCTS.filter(p => cart[p.id] > 0).map(p => ({ ...p, qty: cart[p.id] }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function placeOrder() {
    if (!form.name || !form.email) return flash('Name and email required');
    setBusy(true);
    const { error } = await supabase.from('retail_orders').insert({
      customer_name: form.name, customer_email: form.email, customer_phone: form.phone,
      items: items.map(i => ({ id: i.id, name: i.name, size: i.size, qty: i.qty, price: i.price })),
      subtotal: total, total, status: 'pending',
    });
    setBusy(false);
    if (error) { flash('Order failed'); return; }
    setStep('done'); setCart({});
  }

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="site-logo">OHMI<span>.</span></div>
          <nav className="site-nav">
            <a href="/" className="active">Shop</a>
            <a href="/join">Join</a>
            <a href="/dashboard">Dashboard</a>
            <Link href="/join" className="nav-btn">Join — R2,500</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero" style={{ borderBottom: '1px solid rgba(0,0,0,0.12)', background: 'var(--primary)' }}>
        <div className="container">
          <div className="kicker">Single Origin · Uganda</div>
          <h1 className="hero-title">Coffee roasted<br />with <em>purpose.</em></h1>
          <div className="gold-rule" />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.8, maxWidth: '48ch', marginTop: 4 }}>
            Uganda Bugisu AA from the slopes of Mount Elgon. Contract-roasted in small batches by Wiara Coffee.
            Every kilogram puts R15 toward feeding children in the Bitou region.
          </p>
        </div>
      </section>

      {step === 'shop' && (
        <section className="section">
          <div className="container">
            <div className="kicker" style={{ marginBottom: 20 }}>The roast</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
              {PRODUCTS.map(p => (
                <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '32px 24px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 56, fontWeight: 600, color: 'var(--amber)', lineHeight: 1 }}>{p.size}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 8 }}>{p.origin}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{p.name} — {p.size}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>{p.notes}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, color: 'var(--amber)' }}>R{p.price}</span>
                      {cart[p.id] ? (
                        <div className="pkg-qty">
                          <button className="qty-btn" onClick={() => add(p.id, -1)}>−</button>
                          <span className="qty-num">{cart[p.id]}</span>
                          <button className="qty-btn" onClick={() => add(p.id, 1)}>+</button>
                        </div>
                      ) : (
                        <button className="btn btn-gold btn-sm" onClick={() => add(p.id, 1)}>Add to order</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="cart-bar">
                <div className="cart-stat">
                  <span className="cart-stat-label">Order total</span>
                  <span className="cart-stat-val">R{total}</span>
                </div>
                <div className="cart-divider" />
                <div className="cart-stat">
                  <span className="cart-stat-label">Items</span>
                  <span className="cart-stat-val">{items.reduce((a,i)=>a+i.qty,0)}</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCart({})}>Clear</button>
                  <button className="btn btn-gold" onClick={() => setStep('checkout')}>Checkout →</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {step === 'checkout' && (
        <section className="section">
          <div className="container" style={{ maxWidth: 520 }}>
            <div className="kicker" style={{ marginBottom: 20 }}>Your order</div>
            <div className="card" style={{ marginBottom: 16 }}>
              {items.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i.name} {i.size} × {i.qty}</span>
                  <span style={{ color: 'var(--amber)', fontWeight: 500 }}>R{i.price * i.qty}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600 }}>
                <span>Total</span><span style={{ color: 'var(--amber)' }}>R{total}</span>
              </div>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="field">
                <label className="field-label">Full name *</label>
                <input className="field-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Your full name" />
              </div>
              <div className="field">
                <label className="field-label">Email *</label>
                <input className="field-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="you@email.com" />
              </div>
              <div className="field">
                <label className="field-label">Phone</label>
                <input className="field-input" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="+27 000 000 0000" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setStep('shop')}>← Back</button>
                <button className="btn btn-gold" style={{ flex: 1 }} onClick={placeOrder} disabled={busy}>
                  {busy ? 'Placing order…' : 'Place order'}
                </button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.6 }}>
              Payment on delivery or EFT. We'll confirm your order by email within 24 hours.
            </p>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className="section">
          <div className="container" style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>☕</div>
            <div className="kicker">Order received</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 32, marginBottom: 14 }}>We roast on Tuesdays.</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 24 }}>
              Your order is confirmed. We'll be in touch within 24 hours to arrange delivery. Your coffee ships fresh within 48 hours of roasting.
            </p>
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 24, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              R15 from this order feeds children in the Bitou region. Thank you.
            </div>
            <button className="btn btn-gold" onClick={() => setStep('shop')}>Order more</button>
          </div>
        </section>
      )}

      <footer style={{ background: 'var(--primary)', borderTop: '1px solid var(--border)', padding: '28px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
          <span>© {new Date().getFullYear()} OHMI COFFEE CO. (PTY) LTD · WESTERN CAPE</span>
          <span>ONE TEAM. ONE DREAM. ONE LEGACY.</span>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
