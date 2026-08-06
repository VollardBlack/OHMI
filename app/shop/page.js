'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const PRODUCTS = [
  {
    id: 'bugisu-250',
    name: 'Bugisu AA — 250g',
    kg: 0.25,
    price: 100,
    notes: 'Cocoa, stone fruit, brown sugar finish. Whole bean or ground — the perfect trial bag.',
    tag: 'Uganda · Mt Elgon',
    label: '250g',
  },
  {
    id: 'bugisu-1kg',
    name: 'Bugisu AA — 1kg',
    kg: 1,
    price: 365,
    notes: 'The house kilo. Roasted to order, sealed same day. Best value for daily drinkers.',
    tag: 'Uganda · Mt Elgon',
    label: '1KG',
  },
];

const TIERS = [
  {
    id: 'standard',
    name: 'Standard Subscription',
    price: 1000,
    blurb: 'Fresh coffee monthly plus R400 in Atlas travel points accrued to your account every cycle.',
  },
  {
    id: 'priority',
    name: 'Priority Subscription',
    price: 2000,
    blurb: 'Double the coffee, concierge support, and R1,100 in Atlas travel points every month.',
  },
];

export default function Shop() {
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');

  async function order(p) {
    setBusy(p.id);
    const { error } = await supabase.from('retail_orders').insert({
      item_name: p.name,
      kg: p.kg,
      price: p.price,
    });
    setBusy('');
    if (error) {
      setToast('Could not place order — please try again.');
    } else {
      setToast(`Added: ${p.name} · R${p.price}`);
    }
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="wordmark">OHMI<span>.</span> COFFEE CO.</div>
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/shop" className="active">Shop</Link>
            <Link href="#subscribe">Subscribe</Link>
          </nav>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <div className="kicker">Retail — no membership required</div>
          <h2>The roast, straight up.</h2>
          <div className="product-grid">
            {PRODUCTS.map((p) => (
              <div className="product-card" key={p.id}>
                <div className="product-visual">
                  <span className="origin-tag">{p.tag}</span>
                  <span className="bag">{p.label}</span>
                </div>
                <div className="product-body">
                  <h3>{p.name}</h3>
                  <p className="notes">{p.notes}</p>
                  <div className="product-foot">
                    <div className="price">R{p.price}<small> / bag</small></div>
                    <button
                      className="btn primary"
                      style={{ borderColor: 'var(--ink)' }}
                      onClick={() => order(p)}
                      disabled={busy === p.id}
                    >
                      {busy === p.id ? 'Adding…' : 'Order'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="subscribe" style={{ background: 'var(--paper-deep)' }}>
        <div className="container">
          <div className="kicker">Membership</div>
          <h2>Subscribe monthly, travel eventually.</h2>
          <div className="product-grid">
            {TIERS.map((t) => (
              <div className="product-card" key={t.id}>
                <div className="product-body">
                  <h3>{t.name}</h3>
                  <p className="notes">{t.blurb}</p>
                  <div className="product-foot">
                    <div className="price">R{t.price.toLocaleString()}<small> / month</small></div>
                    <button className="btn ghost" style={{ borderColor: 'var(--ink)' }} disabled>
                      Coming soon
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div>© {new Date().getFullYear()} OHMI Coffee Co.</div>
          <div>Secure checkout &amp; member sign-in launching shortly.</div>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
