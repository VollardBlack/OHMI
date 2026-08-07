'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [pass, setPass]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');

  async function login(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data: admin } = await supabase.from('members').select('id,status,role').eq('email', email.trim()).eq('role', 'admin').single();
      if (admin) {
        localStorage.setItem('ohmi_member_id', admin.id);
        localStorage.setItem('ohmi_role', 'admin');
        window.location.href = '/admin';
        return;
      }
      const { data: member } = await supabase.from('members').select('id,status').eq('email', email.trim()).single();
      if (member) {
        localStorage.setItem('ohmi_member_id', member.id);
        localStorage.setItem('ohmi_role', 'member');
        window.location.href = '/dashboard';
        return;
      }
      setErr('No account found with that email.');
    } catch { setErr('Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"/>
      <div className="login-hero">

        {/* Ambient background circles */}
        <div style={{position:'absolute',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,151,58,0.06) 0%,transparent 70%)',top:-200,right:-100,pointerEvents:'none'}}/>
        <div style={{position:'absolute',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,151,58,0.04) 0%,transparent 70%)',bottom:-100,left:-100,pointerEvents:'none'}}/>

        <div className="login-card">
          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:36}}>
            <div style={{fontFamily:'var(--display)',fontSize:36,fontWeight:700,color:'var(--cream)',letterSpacing:'0.02em',marginBottom:4}}>
              OHMI<span style={{color:'var(--gold)'}}>.</span>
            </div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.24em',textTransform:'uppercase',color:'var(--gold)'}}>
              Coffee · Lifestyle · Legacy
            </div>
            <div style={{width:40,height:1,background:'var(--gold-border)',margin:'16px auto 0'}}/>
          </div>

          <div style={{marginBottom:28,textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:700,color:'var(--cream)',marginBottom:6}}>Welcome back</div>
            <div style={{fontSize:13,color:'var(--cream-muted)'}}>Sign in to your OHMI account</div>
          </div>

          <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="field" style={{marginBottom:0}}>
              <label className="field-label">Email address</label>
              <input className="field-input" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@email.com" required autoComplete="email"/>
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label className="field-label">Password</label>
              <input className="field-input" type="password" value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="••••••••" required/>
            </div>

            {err && (
              <div style={{padding:'10px 14px',background:'var(--red-bg)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--red-text)',display:'flex',alignItems:'center',gap:8}}>
                <i className="ti ti-alert-circle" style={{fontSize:14,flexShrink:0}}/>
                {err}
              </div>
            )}

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={busy} style={{marginTop:6,borderRadius:'var(--r-full)',letterSpacing:'0.08em',textTransform:'uppercase'}}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo access */}
          <div style={{marginTop:24,padding:'16px',background:'var(--gold-bg)',border:'1px solid var(--gold-border)',borderRadius:'var(--r-sm)'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--gold)',marginBottom:8}}>Demo access</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                ['Member portal','brandon@ohmicoffee.co.za','/dashboard'],
                ['Admin panel','admin@ohmicoffee.co.za','/admin'],
              ].map(([label,em,path])=>(
                <button key={label} onClick={()=>{
                  localStorage.setItem('ohmi_role', path==='/admin'?'admin':'member');
                  window.location.href = path;
                }} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'rgba(201,151,58,0.06)',border:'1px solid var(--gold-border)',borderRadius:'var(--r-xs)',cursor:'pointer',fontFamily:'inherit',width:'100%'}}>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--cream)'}}>{label}</span>
                  <span style={{fontSize:10,color:'var(--gold)',fontWeight:700,letterSpacing:'0.04em'}}>Enter →</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{marginTop:20,textAlign:'center',fontSize:11,color:'var(--cream-dim)'}}>
            New to OHMI? <a href="/join" style={{color:'var(--gold)',fontWeight:600}}>Join the network →</a>
          </div>
        </div>
      </div>
    </>
  );
}
