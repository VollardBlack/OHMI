'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  async function login(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data: member } = await supabase
        .from('members').select('id,status,email')
        .eq('email', email.trim().toLowerCase()).single();
      if (member) {
        // brandon@ohmicoffee.co.za or any admin email gets admin role
        const isAdmin = ['brandon@ohmicoffee.co.za','admin@ohmicoffee.co.za'].includes(member.email);
        localStorage.setItem('ohmi_member_id', member.id);
        localStorage.setItem('ohmi_role', isAdmin ? 'admin' : 'member');
        window.location.href = isAdmin ? '/admin' : '/dashboard';
        return;
      }
      setErr('No account found with that email address.');
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function quickAccess(role, path) {
    // Find first active member by status
    supabase.from('members').select('id').eq('status', 'active').limit(1).single()
      .then(({ data }) => {
        const id = data?.id || '00000000-0000-0000-0000-000000000001';
        localStorage.setItem('ohmi_member_id', id);
        localStorage.setItem('ohmi_role', role);
        window.location.href = path;
      })
      .catch(() => {
        localStorage.setItem('ohmi_member_id', '00000000-0000-0000-0000-000000000001');
        localStorage.setItem('ohmi_role', role);
        window.location.href = path;
      });
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
      `}</style>
      <div style={{
        minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        backgroundImage:'url(/ohmi-hero.png)', backgroundSize:'cover', backgroundPosition:'center top',
        padding:'24px 16px',
      }}>
        {/* Overlay */}
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(2px)'}}/>

        {/* Card */}
        <div style={{
          position:'relative', zIndex:1,
          background:'#fff', borderRadius:24, padding:'40px 32px',
          width:'100%', maxWidth:420,
          boxShadow:'0 24px 80px rgba(0,0,0,0.3)',
        }}>
          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{fontSize:32,fontWeight:900,letterSpacing:'-0.03em',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:4}}>
              OHMI
            </div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.22em',textTransform:'uppercase',color:'#9CA3AF'}}>
              Coffee · Lifestyle · Legacy
            </div>
          </div>

          <div style={{marginBottom:24}}>
            <div style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:4}}>Welcome back</div>
            <div style={{fontSize:14,color:'#6B7280'}}>Sign in to your OHMI member portal</div>
          </div>

          <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',display:'block',marginBottom:6}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" required autoComplete="email"
                style={{width:'100%',padding:'13px 16px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',transition:'border-color 0.15s'}}
                onFocus={e=>e.target.style.borderColor='#6366F1'}
                onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',display:'block',marginBottom:6}}>Password</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required
                style={{width:'100%',padding:'13px 16px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',transition:'border-color 0.15s'}}
                onFocus={e=>e.target.style.borderColor='#6366F1'}
                onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
            </div>

            {err&&<div style={{padding:'12px 14px',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,fontSize:13,color:'#DC2626',display:'flex',alignItems:'center',gap:8}}>
              ⚠ {err}
            </div>}

            <button type="submit" disabled={busy} style={{
              background:'linear-gradient(135deg,#6366F1,#0EA5E9)', color:'#fff',
              padding:'15px', borderRadius:12, fontSize:15, fontWeight:700,
              border:'none', cursor:'pointer', fontFamily:'inherit',
              boxShadow:'0 4px 20px rgba(99,102,241,0.35)', marginTop:4,
              opacity:busy?0.7:1, transition:'all 0.2s',
            }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div style={{display:'flex',alignItems:'center',gap:12,margin:'24px 0'}}>
            <div style={{flex:1,height:1,background:'#F3F4F6'}}/>
            <span style={{fontSize:12,color:'#9CA3AF',fontWeight:500}}>Quick access</span>
            <div style={{flex:1,height:1,background:'#F3F4F6'}}/>
          </div>

          {/* Quick access buttons */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              ['Member portal', 'member', '/dashboard', '#6366F1'],
              ['Admin panel',   'admin',  '/admin',     '#0EA5E9'],
            ].map(([label, role, path, color])=>(
              <button key={label} onClick={()=>quickAccess(role, path)} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'13px 16px', background:'#F9FAFB',
                border:'1.5px solid #E5E7EB', borderRadius:12,
                cursor:'pointer', fontFamily:'inherit', width:'100%',
                transition:'all 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.background=`rgba(99,102,241,0.04)`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.background='#F9FAFB';}}>
                <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{label}</span>
                <span style={{fontSize:12,fontWeight:700,color}}>{label === 'Admin panel' ? '⚡' : '☕'} Enter →</span>
              </button>
            ))}
          </div>

          <div style={{marginTop:24,textAlign:'center',fontSize:13,color:'#9CA3AF'}}>
            New to OHMI?{' '}
            <a href="/join" style={{color:'#6366F1',fontWeight:700,textDecoration:'none'}}>Join the network →</a>
          </div>

          <div style={{marginTop:20,textAlign:'center',fontSize:11,color:'#D1D5DB'}}>
            © 2026 OHMI Coffee Co. (Pty) Ltd · Western Cape
          </div>
        </div>
      </div>
    </>
  );
}
