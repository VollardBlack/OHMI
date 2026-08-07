'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    // Check if already logged in
    const id = typeof window !== 'undefined' ? localStorage.getItem('ohmi_member_id') : null;
    const isAdmin = typeof window !== 'undefined' ? localStorage.getItem('ohmi_is_admin') : null;
    if (id) {
      router.replace(isAdmin === 'true' ? '/admin' : '/dashboard');
    } else {
      router.replace('/login');
    }
  }, []);
  return (
    <div style={{
      minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'#0f0f0f',fontFamily:"'Inter',sans-serif",
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{
          fontSize:28,fontWeight:800,letterSpacing:'-0.02em',
          background:'linear-gradient(135deg,#6366F1,#0EA5E9)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
          backgroundClip:'text',marginBottom:12,
        }}>OHMI</div>
        <div style={{fontSize:12,color:'#555',letterSpacing:'0.1em',textTransform:'uppercase'}}>Loading…</div>
      </div>
    </div>
  );
}
