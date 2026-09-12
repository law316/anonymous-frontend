import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, Zap } from 'lucide-react'
import { api } from '../api'
import type { AuthResponse } from '../types'
import { Logo } from './Logo'

export function AuthScreen({ onAuth }: { onAuth: (a: AuthResponse) => void }) {
  const inviteUsername = new URLSearchParams(window.location.search).get('invite')?.trim() || ''
  const [mode, setMode] = useState<'login' | 'register'>(inviteUsername ? 'register' : 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    try {
      const result = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password)
      onAuth(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page">
    <div className="aurora aurora-a"/><div className="aurora aurora-b"/>

    <section className="auth-story">
      <Logo />
      <div className="auth-copy">
        <span className="eyebrow"><ShieldCheck size={14}/> Privacy by design</span>
        <h1>Talk freely.<br/><em>Leave nothing behind.</em></h1>
        <p>A quiet place for real-time conversations. No phone number. No email address. Just a username and a password.</p>
        <div className="feature-row">
          <div><Zap size={18}/><b>Live only</b><span>No offline private message storage.</span></div>
          <div><LockKeyhole size={18}/><b>Burn after read</b><span>Private messages vanish after they are seen.</span></div>
        </div>
      </div>
      <div className="auth-foot">Private chat Â· Minimal identity Â· Optional generic profile</div>
    </section>

    <section className="auth-panel-wrap">
      <div className="auth-panel">
        <div className="mobile-logo"><Logo /></div>

        {inviteUsername && <div className="invite-banner">
          <ShieldCheck size={17}/>
          <div>
            <b>@{inviteUsername} invited you to Anonymous</b>
            <span>Create a username or sign in. After that you can open a live private chat.</span>
          </div>
        </div>}

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create username</button>
        </div>

        <div className="auth-title">
          <span>{mode === 'login' ? 'Welcome back' : 'Choose your identity'}</span>
          <h2>{mode === 'login' ? 'Enter quietly.' : 'No email. No phone.'}</h2>
          <p>{mode === 'login'
            ? 'Private conversations exist only while they need to.'
            : 'Create a unique username. You can optionally add a state and an anonymous avatar later.'}</p>
        </div>

        <form onSubmit={submit}>
          <label>Username</label>
          <div className="field">
            <UserRound size={18}/>
            <input
              autoComplete="username"
              value={username}
              onChange={e=>setUsername(e.target.value)}
              placeholder="e.g. midnight.river"
              maxLength={24}
            />
          </div>
          <div className="field-hint">3â€“24 characters Â· letters, numbers, _ or .</div>

          <label>Password</label>
          <div className="field">
            <LockKeyhole size={18}/>
            <input
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
            <button type="button" className="icon-plain" onClick={()=>setShow(!show)}>
              {show ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="primary-btn" disabled={busy}>
            {busy ? 'Openingâ€¦' : mode === 'login' ? 'Enter Anonymous' : 'Create Anonymous account'}
            <span>â†’</span>
          </button>
        </form>

        <div className="privacy-note">
          <ShieldCheck size={16}/>
          <span><b>Identity rule:</b> do not use your real name, face or identifying details if you want to stay anonymous.</span>
        </div>
      </div>
    </section>
  </main>
}