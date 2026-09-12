import { useEffect, useState } from 'react'
import { api } from './api'
import { AuthScreen } from './components/AuthScreen'
import { ChatShell } from './components/ChatShell'
import type { AuthResponse } from './types'

const TOKEN_KEY = 'anonymous_session_token'

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) { setChecking(false); return }
    api.me(token).then(me=>setSession({token,username:me.username})).catch(()=>sessionStorage.removeItem(TOKEN_KEY)).finally(()=>setChecking(false))
  }, [])

  const onAuth = (next:AuthResponse) => { sessionStorage.setItem(TOKEN_KEY,next.token); setSession(next) }
  const logout = () => { sessionStorage.removeItem(TOKEN_KEY); setSession(null) }

  if (checking) return <div className="boot-screen"><div className="boot-mark">A</div><span>ANONYMOUS</span></div>
  return session ? <ChatShell token={session.token} username={session.username} onLogout={logout}/> : <AuthScreen onAuth={onAuth}/>
}
