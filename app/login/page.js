'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  async function login(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data: member } = await supabase
        .from('members').select('id,status,email')
        .eq('email', email.trim().toLowerCase()).single();
      if (member) {
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
    supabase.from('members').select('id').eq('status','active').limit(1).single()
      .then(({ data }) => {
        const id = data?.id || '00000000-0000-0000-0000-000000000001';
        localStorage.setItem('ohmi_member_id', id);
        localStorage.setItem('ohmi_role', role);
        window.location.href = path;
      }).catch(() => {
        localStorage.setItem('ohmi_member_id', '00000000-0000-0000-0000-000000000001');
        localStorage.setItem('ohmi_role', role);
        window.location.href = path;
      });
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
        input:focus { outline: none; border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
      `}</style>

      {/* Full-screen hero */}
      <div style={{
        minHeight: '100vh',
        backgroundImage: 'url(/ohmi-hero.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Subtle overlay — just enough to read text */}
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)'}}/>

        {/* Top nav */}
        <div style={{position:'relative',zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px'}}>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.02em',color:'#fff',textShadow:'0 1px 8px rgba(0,0,0,0.3)'}}>OHMI</div>
          
          {/* Dropdown menu */}
          <div style={{position:'relative'}}>
            <button onClick={()=>setMenuOpen(v=>!v)} style={{
              background:'rgba(255,255,255,0.15)',backdropFilter:'blur(12px)',
              border:'1px solid rgba(255,255,255,0.3)',borderRadius:999,
              padding:'9px 18px',color:'#fff',fontWeight:600,fontSize:13,
              cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8,
              transition:'all 0.2s',
            }}>
              Menu
              <span style={{fontSize:10,transition:'transform 0.2s',display:'inline-block',transform:menuOpen?'rotate(180deg)':'rotate(0deg)'}}>▼</span>
            </button>

            {menuOpen && (
              <div style={{
                position:'absolute',top:'calc(100% + 8px)',right:0,
                background:'#fff',borderRadius:16,
                boxShadow:'0 8px 40px rgba(0,0,0,0.18)',
                border:'1px solid #E5E7EB',
                overflow:'hidden',minWidth:220,zIndex:100,
              }} onClick={()=>setMenuOpen(false)}>
                {[
                  ['☕','Member Portal',()=>quickAccess('member','/dashboard')],
                  ['⚡','Admin Panel',()=>quickAccess('admin','/admin')],
                  ['🌳','Join the Network',()=>window.location.href='/join'],
                  ['✈️','Travel',()=>window.location.href='/travel'],
                ].map(([icon,label,fn])=>(
                  <button key={label} onClick={fn} style={{
                    display:'flex',alignItems:'center',gap:12,
                    width:'100%',padding:'14px 18px',
                    background:'none',border:'none',
                    borderBottom:'1px solid #F3F4F6',
                    cursor:'pointer',fontFamily:'inherit',
                    fontSize:14,fontWeight:600,color:'#111827',
                    textAlign:'left',transition:'background 0.1s',
                  }}
                    onMouseEnter={e=>e.currentTarget.style.background='#F9FAFB'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <span style={{fontSize:18,width:24,textAlign:'center'}}>{icon}</span>
                    {label}
                    <span style={{marginLeft:'auto',color:'#9CA3AF',fontSize:12}}>→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Login card — bottom of screen */}
        <div style={{position:'relative',zIndex:10,marginTop:'auto',padding:'0 16px 40px'}}>
          <div style={{
            background:'#fff',borderRadius:24,
            padding:'32px 28px',maxWidth:420,margin:'0 auto',
            boxShadow:'0 24px 80px rgba(0,0,0,0.25)',
          }}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:4}}>Welcome back</div>
              <div style={{fontSize:14,color:'#6B7280'}}>Sign in to your OHMI member portal</div>
            </div>

            <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',display:'block',marginBottom:6}}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@email.com" required autoComplete="email"
                  style={{width:'100%',padding:'13px 16px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit'}}/>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <label style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Password</label>
                  <span style={{fontSize:12,color:'#6366F1',fontWeight:600,cursor:'pointer'}}>Forgot password?</span>
                </div>
                <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
                  placeholder="••••••••" required
                  style={{width:'100%',padding:'13px 16px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit'}}/>
              </div>

              {err && (
                <div style={{padding:'12px 14px',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,fontSize:13,color:'#DC2626'}}>
                  ⚠ {err}
                </div>
              )}

              <button type="submit" disabled={busy} style={{
                background:'linear-gradient(135deg,#6366F1,#0EA5E9)',color:'#fff',
                padding:'15px',borderRadius:12,fontSize:15,fontWeight:700,
                border:'none',cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 4px 20px rgba(99,102,241,0.35)',marginTop:4,
                opacity:busy?0.7:1,
              }}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div style={{marginTop:20,textAlign:'center',fontSize:13,color:'#9CA3AF'}}>
              Not a member yet?{' '}
              <a href="/join" style={{color:'#6366F1',fontWeight:700,textDecoration:'none'}}>Join OHMI — R2,500 activation</a>
            </div>
          </div>

          <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'rgba(255,255,255,0.5)'}}>
            © 2026 OHMI Coffee Co. (Pty) Ltd · Western Cape
          </div>
        </div>
      </div>
    </>
  );
}
