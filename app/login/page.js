'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.email||!form.password){setError('Please enter your email and password');return;}
    setBusy(true);setError('');
    const {data:member,error:mErr}=await supabase
      .from('members').select('*').eq('email',form.email.toLowerCase().trim()).maybeSingle();
    if(mErr||!member){setError('No account found with that email address.');setBusy(false);return;}
    if(member.status==='suspended'){setError('Your account has been suspended. Contact support.');setBusy(false);return;}
    if(typeof window!=='undefined'){
      localStorage.setItem('ohmi_member_id',member.id);
      localStorage.setItem('ohmi_member_email',member.email);
      localStorage.setItem('ohmi_is_admin',member.email==='brandon@ohmicoffee.co.za'?'true':'false');
    }
    setBusy(false);
    if(member.email==='brandon@ohmicoffee.co.za')router.push('/admin');
    else router.push('/dashboard');
  }

  async function handleForgot(e) {
    e.preventDefault();
    if(!form.email){setError('Enter your email address');return;}
    setBusy(true);setError('');
    await new Promise(r=>setTimeout(r,800));
    setBusy(false);
    setSuccess('If an account exists for that email, a reset link has been sent.');
  }

  const inputStyle = {
    width:'100%',padding:'12px 14px',
    background:'#F9FAFB',border:'1.5px solid #E5E7EB',
    borderRadius:10,fontSize:16,outline:'none',color:'#111827',
    boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
    fontFamily:"'Inter',-apple-system,sans-serif",
    transition:'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight:'100vh',position:'relative',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
      fontFamily:"'Inter',-apple-system,sans-serif",
    }}>
      {/* Hero background */}
      <div style={{
        position:'fixed',inset:0,zIndex:0,
        backgroundImage:'url(/ohmi-hero.png)',
        backgroundSize:'cover',backgroundPosition:'center top',
        backgroundRepeat:'no-repeat',
      }}/>
      {/* Gradient overlay */}
      <div style={{
        position:'fixed',inset:0,zIndex:1,
        background:'linear-gradient(to bottom,rgba(0,0,0,0.02) 0%,rgba(0,0,0,0.1) 35%,rgba(0,0,0,0.65) 65%,rgba(0,0,0,0.88) 100%)',
      }}/>

      {/* Login panel */}
      <div style={{position:'relative',zIndex:2,width:'100%',maxWidth:420,padding:'0 20px 44px'}}>

        {/* Tagline above card */}
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{
            fontSize:11,fontWeight:700,letterSpacing:'0.28em',
            textTransform:'uppercase',color:'#C8913A',
          }}>
            COFFEE WILL TAKE YOU THERE
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(255,255,255,0.97)',
          borderRadius:20,padding:'28px 28px 24px',
          boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
          backdropFilter:'blur(8px)',
        }}>
          {mode==='login'?<>
            <h1 style={{fontSize:22,fontWeight:800,color:'#111827',letterSpacing:'-0.02em',marginBottom:3}}>Welcome back</h1>
            <p style={{fontSize:13,color:'#6B7280',marginBottom:22}}>Sign in to your OHMI member portal</p>

            {error&&<div style={{padding:'10px 14px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,fontSize:12,color:'#DC2626',marginBottom:16,fontWeight:500}}>{error}</div>}

            <form onSubmit={handleLogin}>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',display:'block',marginBottom:6}}>Email</label>
                <input type="email" autoComplete="email" required value={form.email}
                  onChange={e=>set('email',e.target.value)} placeholder="you@email.com"
                  style={inputStyle}
                  onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
              </div>
              <div style={{marginBottom:6}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',display:'block',marginBottom:6}}>Password</label>
                <input type="password" autoComplete="current-password" required value={form.password}
                  onChange={e=>set('password',e.target.value)} placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
              </div>
              <div style={{textAlign:'right',marginBottom:20}}>
                <button type="button" onClick={()=>{setMode('forgot');setError('');}}
                  style={{background:'none',border:'none',fontSize:12,color:'#6366F1',fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0}}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={busy} style={{
                width:'100%',padding:'13px',
                background:'linear-gradient(135deg,#6366F1 0%,#0EA5E9 100%)',
                color:'#fff',border:'none',borderRadius:10,
                fontSize:14,fontWeight:700,
                cursor:busy?'not-allowed':'pointer',
                opacity:busy?0.7:1,letterSpacing:'0.02em',
                boxShadow:'0 4px 16px rgba(99,102,241,0.35)',
                transition:'opacity 0.15s,transform 0.15s',
                fontFamily:'inherit',
              }}
                onMouseEnter={e=>{if(!busy)e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>e.currentTarget.style.transform=''}>
                {busy?'Signing in…':'Sign in'}
              </button>
            </form>

            <div style={{borderTop:'1px solid #F3F4F6',marginTop:22,paddingTop:18,textAlign:'center'}}>
              <p style={{fontSize:12,color:'#9CA3AF',marginBottom:12}}>Not a member yet?</p>
              <a href="/join" style={{
                display:'inline-block',padding:'11px 22px',
                background:'#F3F4F6',color:'#374151',
                borderRadius:10,fontSize:13,fontWeight:600,
                textDecoration:'none',transition:'background 0.15s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='#E5E7EB'}
                onMouseLeave={e=>e.currentTarget.style.background='#F3F4F6'}>
                Join OHMI — R2,500 activation
              </a>
            </div>
          </>:<>
            <button onClick={()=>{setMode('login');setError('');setSuccess('');}}
              style={{background:'none',border:'none',fontSize:13,color:'#6B7280',cursor:'pointer',marginBottom:16,display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',padding:0}}>
              ← Back to sign in
            </button>
            <h2 style={{fontSize:20,fontWeight:800,color:'#111827',marginBottom:6}}>Reset password</h2>
            <p style={{fontSize:13,color:'#6B7280',marginBottom:20}}>Enter your email and we'll send a reset link.</p>
            {error&&<div style={{padding:'10px 14px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,fontSize:12,color:'#DC2626',marginBottom:14}}>{error}</div>}
            {success&&<div style={{padding:'10px 14px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,fontSize:12,color:'#059669',marginBottom:14,fontWeight:500}}>{success}</div>}
            {!success&&(
              <form onSubmit={handleForgot}>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',display:'block',marginBottom:6}}>Email</label>
                  <input type="email" required value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@email.com"
                    style={inputStyle}
                    onFocus={e=>e.target.style.borderColor='#6366F1'}
                    onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
                </div>
                <button type="submit" disabled={busy} style={{
                  width:'100%',padding:13,
                  background:'linear-gradient(135deg,#6366F1 0%,#0EA5E9 100%)',
                  color:'#fff',border:'none',borderRadius:10,
                  fontSize:14,fontWeight:700,
                  cursor:busy?'not-allowed':'pointer',
                  opacity:busy?0.7:1,fontFamily:'inherit',
                }}>
                  {busy?'Sending…':'Send reset link'}
                </button>
              </form>
            )}
            {success&&<button onClick={()=>setMode('login')} style={{width:'100%',padding:13,background:'#F3F4F6',color:'#374151',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Back to sign in</button>}
          </>}
        </div>

        <div style={{textAlign:'center',marginTop:18,fontSize:10,color:'rgba(255,255,255,0.38)',letterSpacing:'0.08em'}}>
          © 2026 OHMI COFFEE CO. (PTY) LTD · WESTERN CAPE
        </div>
      </div>
    </div>
  );
}
