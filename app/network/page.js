'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function Node({ node, childrenMap }) {
  const kids = childrenMap[node.id] || [];
  const left = kids.find(k => k.leg === 'L');
  const right = kids.find(k => k.leg === 'R');
  return (
    <div className="tnode">
      <div className={`tcard ${node.subscribed ? 'sub' : ''}`}>
        <div className="tname">{node.display_name}</div>
        <div className="ttier">{node.subscribed ? (node.tier_id === 'priority' ? 'Priority' : 'Standard') : 'Inactive'}</div>
      </div>
      {(left || right) && (
        <div className="tlegs">
          <div className="tleg">
            <span className="tleg-label">L</span>
            {left ? <Node node={left} childrenMap={childrenMap} /> : <div className="topen">Open</div>}
          </div>
          <div className="tleg">
            <span className="tleg-label">R</span>
            {right ? <Node node={right} childrenMap={childrenMap} /> : <div className="topen">Open</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Network() {
  const [nodes, setNodes] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    supabase.from('network_tree_view').select('*').then(({ data }) => setNodes(data || []));
    supabase.rpc('pool_stats').then(({ data }) => setStats(data?.[0] || null));
  }, []);

  const childrenMap = {};
  let root = null;
  (nodes || []).forEach(n => {
    if (!n.parent_id) root = n;
    else (childrenMap[n.parent_id] = childrenMap[n.parent_id] || []).push(n);
  });

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="wordmark">OHMI<span>.</span> COFFEE CO.</div>
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/network" className="active">Network</Link>
          </nav>
        </div>
      </header>

      <section className="hero" style={{ padding: '64px 0 56px' }}>
        <div className="container">
          <div className="eyebrow">The OHMI Network</div>
          <h1 style={{ fontSize: 'clamp(36px,5vw,60px)' }}>Built on <em>coffee sold,</em><br />not people signed.</h1>
          <p className="lede">
            Every commission below traces to a real subscription billed or a real bag
            sold. 30% of the pool flows to representatives; 70% funds operations and
            the Atlas experience bonus — exactly as our actuarial model guarantees.
          </p>
        </div>
      </section>

      {stats && (
        <section className="section" style={{ paddingBottom: 40 }}>
          <div className="container">
            <div className="kicker">This period — {stats.period}</div>
            <div className="stat-row">
              <div className="stat"><div className="stat-num">{stats.active_members}</div><div className="stat-label">Active subscriptions</div></div>
              <div className="stat"><div className="stat-num">R{Number(stats.pool_total).toLocaleString()}</div><div className="stat-label">Commission pool</div></div>
              <div className="stat"><div className="stat-num">R{Number(stats.rep_share).toLocaleString()}</div><div className="stat-label">Rep share (30%)</div></div>
              <div className="stat"><div className="stat-num">R{Number(stats.ohmi_retention).toLocaleString()}</div><div className="stat-label">OHMI retention (70%)</div></div>
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="kicker">Binary genealogy</div>
          <h2>The tree.</h2>
          <div className="tree-wrap">
            {nodes === null ? (
              <p style={{ color: 'var(--muted)' }}>Loading network…</p>
            ) : root ? (
              <Node node={root} childrenMap={childrenMap} />
            ) : (
              <p style={{ color: 'var(--muted)' }}>No network yet — the first subscription plants the tree.</p>
            )}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div>© {new Date().getFullYear()} OHMI Coffee Co.</div>
          <div>Commissions on product sales only — CPA s43 compliant by design.</div>
        </div>
      </footer>
    </>
  );
}
