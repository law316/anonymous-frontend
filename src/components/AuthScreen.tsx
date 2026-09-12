import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, Zap } from 'lucide-react'
import { api } from '../api'
import type { AuthResponse } from '../types'
import { Logo } from './Logo'

export function AuthScreen({ onAuth }: { onAuth: (a: AuthResponse) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const result = mode === 'login' ? await api.login(username, password) : await api.register(username, password)
      onAuth(result)
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setBusy(false) }
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
          <div><Zap size={18}/><b>Live only</b><span>No offline message storage.</span></div>
          <div><LockKeyhole size={18}/><b>Burn after read</b><span>Messages vanish after they are seen.</span></div>
        </div>
      </div>
      <div className="auth-foot">Private by default · Minimal identity · Ephemeral media</div>
    </section>

    <section className="auth-panel-wrap">
      <div className="auth-panel">
        <div className="mobile-logo"><Logo /></div>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create username</button>
        </div>
        <div className="auth-title">
          <span>{mode === 'login' ? 'Welcome back' : 'Choose your identity'}</span>
          <h2>{mode === 'login' ? 'Enter quietly.' : 'No email. No phone.'}</h2>
          <p>{mode === 'login' ? 'Your conversations exist only while they need to.' : 'Create a unique username. That is all people need to find you.'}</p>
        </div>
        <form onSubmit={submit}>
          <label>Username</label>
          <div className="field"><UserRound size={18}/><input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. midnight.river" maxLength={24}/></div>
          <div className="field-hint">3–24 characters · letters, numbers, _ or .</div>
          <label>Password</label>
          <div className="field"><LockKeyhole size={18}/><input type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters"/><button type="button" className="icon-plain" onClick={()=>setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn" disabled={busy}>{busy ? 'Opening…' : mode === 'login' ? 'Enter Anonymous' : 'Create Anonymous account'}<span>→</span></button>
        </form>
        <div className="privacy-note"><ShieldCheck size={16}/><span><b>Identity rule:</b> never use your real name if you do not want it associated with this account.</span></div>
      </div>
    </section>
  </main>
}
