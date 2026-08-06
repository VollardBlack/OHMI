'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const PRODUCTS = [
  { id: 'bugisu-250', name: 'Bugisu AA — 250g', kg: 0.25, price: 100,
    notes: 'Cocoa, stone fruit, brown sugar finish. The perfect trial bag.',
    tag: 'Uganda · Mt Elgon', label: '250g' },
  { id: 'bugisu-1kg', name: 'Bugisu AA — 1kg', kg: 1, price: 365,
    notes: 'The house kilo. Roasted to order, sealed same day.',
    tag: 'Uganda · Mt Elgon', label: '1KG' },
  { id: 'plunger', name: 'OHMI Plunger — 600ml', kg: 0, price: 295,
    notes: 'Borosilicate French press, copper band. First-time buyer essential.',
    tag: 'Brew gear', label: 'PRESS' },
];

export default function Shop() {
  const [cart, setCart] = useState({});
  const [toast, setToast] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const items = useMemo(
    () => Object.entries(cart).filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ ...PRODUCTS.find(p => p.id === id), qty })),
    [cart]
  );
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const add = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));
  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3000); };

  async function checkout() {
    setPlacing(true);
    const rows = items.map(i => ({ item_name: `${i.name} × ${i.qty}`, kg: i.kg * i.qty, price: i.price * i.qty }));
    const { error } = await supabase.from('retail_orders').insert(rows);
    setPlacing(false);
    if (error) return flash('Order failed — please try again.');
    setCart({}); setPlaced(true);
    flash(`Order placed · R${total}`);
  }

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="wordmark">OHMI<span>.</span> COFFEE CO.</div>
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/shop" className="active">Shop</Link>
            <Link href="/network">Network</Link>
          </nav>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <div className="kicker">Retail — no membership required</div>
          <h2>The roast, straight up.</h2>
          <div className="product-grid">
            {PRODUCTS.map(p => (
              <div className="product-card" key={p.id}>
                <div className="product-visual">
                  <span className="origin-tag">{p.tag}</span>
                  <span className="bag">{p.label}</span>
                </div>
                <div className="product-body">
                  <h3>{p.name}</h3>
                  <p className="notes">{p.notes}</p>
                  <div className="product-foot">
                    <div className="price">R{p.price}</div>
                    {cart[p.id] ? (
                      <div className="qty">
                        <button onClick={() => add(p.id, -1)} aria-label="Remove one">−</button>
                        <span>{cart[p.id]}</span>
                        <button onClick={() => add(p.id, 1)} aria-label="Add one">+</button>
                      </div>
                    ) : (
                      <button className="btn primary" style={{ borderColor: 'var(--ink)' }} onClick={() => add(p.id, 1)}>
                        Add to order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper-deep)', paddingTop: 56, paddingBottom: 56 }}>
        <div className="container">
          <div className="kicker">Your order</div>
          {items.length === 0 ? (
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>
              {placed ? 'Order received — we roast on Tuesdays and ship within 48 hours.' : 'Nothing here yet. Add a bag above to start an order.'}
            </p>
          ) : (
            <div className="order-panel">
              {items.map(i => (
                <div className="order-row" key={i.id}>
                  <span>{i.name} × {i.qty}</span>
                  <span>R{i.price * i.qty}</span>
                </div>
              ))}
              <div className="order-row total">
                <span>Total</span><span>R{total}</span>
              </div>
              <button className="btn primary" style={{ borderColor: 'var(--ink)', marginTop: 18 }} onClick={checkout} disabled={placing}>
                {placing ? 'Placing order…' : 'Place order'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
                Payment on delivery for now — secure online payment launching shortly.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div>© {new Date().getFullYear()} OHMI Coffee Co.</div>
          <div>Roasted in Middelburg · R15 per kg feeds children in the Bitou region.</div>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
