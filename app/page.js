'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [href, setHref] = useState('/login');

  useEffect(() => {
    const id   = localStorage.getItem('ohmi_member_id');
    const role = localStorage.getItem('ohmi_role');
    if (id) {
      const dest = role === 'admin' ? '/admin' : '/dashboard';
      window.location.href = dest;
    } else {
      setHref('/login');
    }
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundImage: 'url(/ohmi-hero.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: '10vh',
    }}>
      <a href={href} style={{
        display: 'block', textAlign: 'center',
        background: 'linear-gradient(135deg,#6366F1,#0EA5E9)',
        color: '#fff', padding: '16px 48px',
        borderRadius: 14, fontSize: 15, fontWeight: 700,
        letterSpacing: '0.04em', fontFamily: 'Inter, sans-serif',
        boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        textDecoration: 'none',
      }}>
        Enter
      </a>
    </div>
  );
}
