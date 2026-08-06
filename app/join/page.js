'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Join() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', id_number: '', sponsor_code: '' });
  const [step, setStep] = useState('form'); // form | confirm | done
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [memberId, setMemberId] = useState(null);

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3500); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function register() {
    if (!form.name || !form.email || !form.phone) return flash('Name, email and phone are required.');
    setBusy(true);

    // Check email not already registered
    const { data: existing } = await supabase.from('members').select('id').eq('email', form.email).maybeSingle();
    if (existing) { setBusy(false); flash('This email is already registered.'); return; }

    // Find sponsor node if code provided
    let sponsorId = null;
    let placementNodeId = null;

    if (form.sponsor_code) {
      const { data: sponsor } = await supabase.from('members')
        .select('id').eq('id', form.sponsor_code).maybeSingle();
      if (sponsor) sponsorId = sponsor.id;
    }

    // Default sponsor = Brandon (root) if none
    if (!sponsorId) {
      const { data: root } = await supabase.from('members')
        .select('id').eq('email', 'brandon@ohmicoffee.co.za').maybeSingle();
      if (root) sponsorId = root.id;
    }

    // Find the sponsor's node to get placement
    const { data: sponsorNode } = await supabase.from('network_nodes')
      .select('id, left_count, right_count').eq('member_id', sponsorId).maybeSingle();
    placementNodeId = sponsorNode?.id;

    // Create member
    const newId = crypto.randomUUID();
    const { error: memberErr } = await supabase.from('members').insert({
      id: newId,
      full_name: form.name,
      email: form.email,
      phone: form.phone,
      id_number: form.id_number || null,
      sponsor_id: sponsorId,
      status: 'pending',
    });
    if (memberErr) { setBusy(false); flash('Registration failed — ' + memberErr.message); return; }

    // Place in binary tree
    const leg = sponsorNode && sponsorNode.left_count <= sponsorNode.right_count ? 'L' : 'R';
    const { error: nodeErr } = await supabase.from('network_nodes').insert({
      member_id: newId,
      parent_id: placementNodeId,
      leg,
      depth: 1,
    });
    if (nodeErr) { setBusy(false); flash('Tree placement failed — ' + nodeErr.message); return; }

    // Create activation record
    await supabase.from('activations').insert({
      member_id: newId,
      amount: 2500,
      status: 'pending',
    });

    setMemberId(newId);
    setBusy(false);
    setStep('done');
  }

  return (
    <>
      <header className="ohmi-header">
        <div className="container">
          <div className="ohmi-logo">OHMI<span>.</span></div>
          <nav className="ohmi-nav">
            <Link href="/">Shop</Link>
            <a href="/join" className="active">Join</a>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section style={{ background: 'var(--dark)', borderBottom: '1px solid #1e1e1e', padding: '60px 0 48px' }}>
        <div className="container">
          <div className="kicker">Join OHMI Coffee Co.</div>
          <h1 className="section-title" style={{ maxWidth: '18ch' }}>
            Your journey starts <span>here.</span>
          </h1>
          <div className="gold-line" />
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8, maxWidth: '52ch', marginTop: 8 }}>
            Activate your membership for R2,500 and start building your legacy.
            Monthly subscription of R1,500 keeps you active and earning.
          </p>
        </div>
      </section>

      {step === 'form' && (
        <section className="section">
          <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
            {/* Form */}
            <div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, marginBottom: 24 }}>Register your details</h2>
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email address *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone number *</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+27 000 000 0000" />
              </div>
              <div className="form-group">
                <label className="form-label">SA ID number (optional)</label>
                <input className="form-input" value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="13-digit ID number" />
              </div>
              <div className="form-group">
                <label className="form-label">Sponsor member ID (optional)</label>
                <input className="form-input" value={form.sponsor_code} onChange={e => set('sponsor_code', e.target.value)} placeholder="Your sponsor's member ID" />
                <span style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Leave blank if you were approached by OHMI directly.</span>
              </div>
              <button className="btn btn-gold btn-full" onClick={register} disabled={busy} style={{ marginTop: 8 }}>
                {busy ? 'Registering…' : 'Register — Activation R2,500'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 12, lineHeight: 1.7 }}>
                By registering you agree to OHMI's terms. R2,500 activation includes real coffee product.
                R1,500/month maintains your active status. Commission on product sales only — CPA s43 compliant.
              </p>
            </div>

            {/* What you get */}
            <div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, marginBottom: 24 }}>What you get</h2>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="kicker" style={{ marginBottom: 10 }}>Activation — R2,500</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
                  One-time fee that includes premium OHMI coffee product. Places you in the binary network.
                  Your position is secured from day one.
                </p>
              </div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="kicker" style={{ marginBottom: 10 }}>Monthly — R1,500/month</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
                  R500 enters the binary commission pool. R1,000 covers your monthly coffee product.
                  Stay active to earn and maintain your rank.
                </p>
              </div>
              {/* Rank journey */}
              <div className="card">
                <div className="kicker" style={{ marginBottom: 14 }}>The OHMI journey</div>
                {[
                  ['Bronze', '2/2', 'R750 PM'],
                  ['Silver', '5/5', 'R2,000 PM'],
                  ['Gold', '20/20', 'R6,000 + R4,000 DB'],
                  ['Platinum', '50/50', 'R15,000 + R10,000 DB'],
                  ['Emerald', '100/100', 'R30,000 + R15,000 DB'],
                  ['Diamond', '500/500', 'R150,000 + R35,000 DB'],
                  ['Imperial Diamond', '5,000/5,000', 'R1,500,000 PM'],
                ].map(([rank, req, earn]) => (
                  <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e1e1e', fontSize: 12 }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 700, minWidth: 120 }}>{rank}</span>
                    <span style={{ color: 'var(--muted)', minWidth: 60, textAlign: 'center' }}>{req}</span>
                    <span style={{ color: 'var(--white)', textAlign: 'right', fontSize: 11 }}>{earn}</span>
                  </div>
                ))}
                <p style={{ fontSize: 10, color: 'var(--dim)', marginTop: 10, lineHeight: 1.7 }}>
                  DB = Discretionary bonus. Pool earnings based on 30% of active member pool (R500/member/month). Actuarially proven solvent — OHMI-ACT-2026-002.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className="section">
          <div className="container" style={{ maxWidth: 560 }}>
            <div className="card card-gold">
              <div className="kicker" style={{ marginBottom: 12 }}>Registration complete</div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, marginBottom: 16 }}>Welcome to OHMI.</h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                Your account has been created and you've been placed in the binary network.
                To activate your membership, complete your R2,500 activation payment.
              </p>
              <div style={{ background: 'var(--dark3)', padding: 16, marginBottom: 20, borderLeft: '3px solid var(--gold)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Your member ID</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)', wordBreak: 'break-all' }}>{memberId}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Save this — share it as your referral code.</div>
              </div>
              <div style={{ background: 'var(--dark3)', padding: 16, marginBottom: 24, borderLeft: '3px solid #333' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
                  <strong style={{ color: 'var(--white)' }}>Payment details</strong><br />
                  Bank: FNB · Account: OHMI Coffee Co. (Pty) Ltd<br />
                  Amount: <strong style={{ color: 'var(--gold)' }}>R2,500</strong><br />
                  Reference: <strong style={{ color: 'var(--gold)' }}>{memberId?.slice(0, 8)?.toUpperCase()}</strong><br />
                  <span style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, display: 'block' }}>
                    Send proof of payment to activate@ohmicoffee.co.za
                  </span>
                </div>
              </div>
              <Link href="/dashboard" className="btn btn-gold btn-full">Go to your dashboard</Link>
            </div>
          </div>
        </section>
      )}

      <footer style={{ background: 'var(--dark)', borderTop: '1px solid #1e1e1e', padding: '28px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--dim)', letterSpacing: '0.1em' }}>
          <span>© {new Date().getFullYear()} OHMI COFFEE CO. (PTY) LTD</span>
          <span>COMMISSION ON PRODUCT SALES ONLY — CPA S43 COMPLIANT</span>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
