import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleUserRound, ImagePlus, LogOut, Menu, MessageCirclePlus, MoreHorizontal, Search, Send, ShieldCheck, Sparkles, UserRoundSearch, X } from 'lucide-react'
import { api } from '../api'
import { useChatSocket } from '../hooks/useChatSocket'
import type { ChatMessage, SocketEvent, UserResult } from '../types'
import { Avatar } from './Avatar'
import { EphemeralImage } from './EphemeralImage'
import { Logo } from './Logo'

const BURN_MS = 10_000
const makeId = () => crypto.randomUUID().replaceAll('-', '')

export function ChatShell({ token, username, onLogout }:{token:string;username:string;onLogout:()=>void}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [recents, setRecents] = useState<UserResult[]>([])
  const [active, setActive] = useState<UserResult | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [typingPeer, setTypingPeer] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const activeRef = useRef<UserResult | null>(null)
  const typingTimer = useRef<number | null>(null)
  activeRef.current = active

  const upsertRecent = useCallback((name:string, online=true) => {
    setRecents(prev => [{ username:name, online }, ...prev.filter(x=>x.username!==name)].slice(0,20))
  }, [])

  const scheduleBurn = useCallback((id:string) => {
    const burnAt = Date.now() + BURN_MS
    setMessages(prev => prev.map(m => m.id === id ? { ...m, burnAt, status:'read' } : m))
    window.setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), BURN_MS + 80)
  }, [])

  const onSocketEvent = useCallback((event:SocketEvent) => {
    if (event.type === 'TEXT' && event.from && event.messageId) {
      const msg: ChatMessage = { id:event.messageId, peer:event.from, direction:'in', kind:'text', body:event.body || '', sentAt:Date.now(), status:'delivered' }
      setMessages(prev => [...prev, msg]); upsertRecent(event.from, true)
      if (activeRef.current?.username === event.from) {
        window.setTimeout(() => { sendRef.current?.({type:'READ',to:event.from,messageId:event.messageId}); scheduleBurn(event.messageId!) }, 350)
      } else setToast(`New live message from @${event.from}`)
    }
    if (event.type === 'IMAGE' && event.from && event.messageId && event.mediaId) {
      setMessages(prev => [...prev, {id:event.messageId!,peer:event.from!,direction:'in',kind:'image',mediaId:event.mediaId,sentAt:Date.now(),status:'delivered'}]); upsertRecent(event.from, true)
      if (activeRef.current?.username !== event.from) setToast(`View-once image from @${event.from}`)
    }
    if (event.type === 'DELIVERED' && event.messageId) setMessages(prev=>prev.map(m=>m.id===event.messageId?{...m,status:'delivered'}:m))
    if (event.type === 'READ' && event.messageId) scheduleBurn(event.messageId)
    if (event.type === 'IMAGE_VIEWED' && event.messageId) setMessages(prev=>prev.filter(m=>m.id!==event.messageId))
    if (event.type === 'TYPING' && event.from) { setTypingPeer(event.active ? event.from : null) }
    if (event.type === 'ERROR') {
      setMessages(prev=>prev.map(m=>m.id===event.messageId?{...m,status:'failed'}:m)); setToast(event.message || 'Message could not be delivered')
    }
  }, [scheduleBurn, upsertRecent])

  const { connected, send } = useChatSocket(token, onSocketEvent)
  const sendRef = useRef(send); sendRef.current = send

  useEffect(() => { if (!toast) return; const t=window.setTimeout(()=>setToast(''),3500); return()=>window.clearTimeout(t) }, [toast])

  useEffect(() => {
    const t = window.setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return }
      try { setResults(await api.searchUsers(token, query.trim())) } catch { setResults([]) }
    }, 260)
    return () => window.clearTimeout(t)
  }, [query, token])

  useEffect(() => {
    if (!active) return
    messages.filter(m=>m.peer===active.username && m.direction==='in' && m.kind==='text' && !m.burnAt).forEach(m => {
      send({type:'READ',to:active.username,messageId:m.id}); scheduleBurn(m.id)
    })
  }, [active, messages, scheduleBurn, send])

  const peerMessages = useMemo(() => active ? messages.filter(m=>m.peer===active.username) : [], [messages, active])

  const choose = (u:UserResult) => { setActive(u); upsertRecent(u.username,u.online); setQuery(''); setResults([]); setSidebarOpen(false) }

  const submit = (e:React.FormEvent) => {
    e.preventDefault(); if (!active || !draft.trim() || !connected) return
    const id = makeId(); const body = draft.trim()
    setMessages(prev=>[...prev,{id,peer:active.username,direction:'out',kind:'text',body,sentAt:Date.now(),status:'sending'}]); setDraft('')
    send({type:'TEXT',to:active.username,messageId:id,body}); send({type:'TYPING',to:active.username,active:false})
  }

  const onDraft = (value:string) => {
    setDraft(value); if (!active || !connected) return
    send({type:'TYPING',to:active.username,active:true})
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(()=>send({type:'TYPING',to:active.username,active:false}),900)
  }

  const uploadImage = async (file?:File) => {
    if (!file || !active || !connected) return
    const id = makeId(); setToast('Preparing view-once image…')
    try {
      const {mediaId} = await api.uploadImage(token, active.username, file)
      setMessages(prev=>[...prev,{id,peer:active.username,direction:'out',kind:'image',mediaId,sentAt:Date.now(),status:'sending'}])
      send({type:'IMAGE',to:active.username,messageId:id,mediaId}); setToast('Image sent — it will be destroyed when opened')
    } catch(err) { setToast(err instanceof Error ? err.message : 'Image upload failed') }
    finally { if (fileInput.current) fileInput.current.value='' }
  }

  const imageViewed = (m:ChatMessage) => {
    setMessages(prev=>prev.filter(x=>x.id!==m.id)); if (active) send({type:'IMAGE_VIEWED',to:active.username,messageId:m.id})
  }

  return <main className="chat-app" onCopy={e=>{if ((e.target as HTMLElement).closest('.messages')) e.preventDefault()}} onCut={e=>{if ((e.target as HTMLElement).closest('.messages')) e.preventDefault()}}>
    {toast && <div className="toast"><ShieldCheck size={16}/>{toast}</div>}
    <aside className={`sidebar ${sidebarOpen?'open':''}`}>
      <div className="sidebar-head"><Logo/><button className="mobile-close" onClick={()=>setSidebarOpen(false)}><X size={20}/></button></div>
      <div className="me-card"><Avatar username={username} online={connected}/><div><b>@{username}</b><span><i className={connected?'online':''}/>{connected?'Live & ready':'Reconnecting…'}</span></div><button title="Sign out" onClick={onLogout}><LogOut size={18}/></button></div>
      <div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a username"/><kbd>@</kbd></div>
      {query.trim().length>=2 ? <div className="contact-section"><div className="section-label">Search results</div>{results.length ? results.map(u=><button className="contact" key={u.username} onClick={()=>choose(u)}><Avatar username={u.username} online={u.online}/><div><b>@{u.username}</b><span>{u.online?'Online now':'Offline · live messages unavailable'}</span></div></button>) : <div className="empty-search"><UserRoundSearch size={22}/><span>No matching username yet.</span></div>}</div> : <div className="contact-section grow"><div className="section-label"><span>Recent live chats</span><MessageCirclePlus size={15}/></div>{recents.length ? recents.map(u=><button className={`contact ${active?.username===u.username?'selected':''}`} key={u.username} onClick={()=>choose(u)}><Avatar username={u.username} online={u.online}/><div><b>@{u.username}</b><span>Nothing saved after it disappears</span></div></button>) : <div className="empty-list"><div className="empty-orb"><Sparkles size={23}/></div><b>No conversation history.</b><p>Search a username above. Anonymous deliberately does not rebuild old chats.</p></div>}</div>}
      <div className="sidebar-privacy"><ShieldCheck size={15}/><span>Messages are not written to the chat database.</span></div>
    </aside>

    <section className="chat-stage">
      {!active ? <div className="welcome-stage"><button className="hamburger" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button><div className="hero-lock"><Logo compact/><div className="pulse-ring r1"/><div className="pulse-ring r2"/></div><span className="eyebrow"><ShieldCheck size={14}/> Ephemeral by design</span><h2>Pick a username.<br/><em>Start a conversation.</em></h2><p>Nothing here is a permanent inbox. Messages are live-only, and read messages burn away.</p><div className="welcome-cards"><div><b>01</b><span>Search</span><small>Find someone by username only.</small></div><div><b>02</b><span>Talk</span><small>Send live text or a view-once image.</small></div><div><b>03</b><span>Gone</span><small>Read messages erase from the interface.</small></div></div><div className="reality-note">Screenshots and external cameras cannot be technically prevented on the open web.</div></div> : <>
        <header className="chat-header"><button className="hamburger" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button><Avatar username={active.username} online={active.online}/><div className="peer-title"><b>@{active.username}</b><span>{typingPeer===active.username?'typing…':active.online?'online · live delivery only':'offline · messages will not queue'}</span></div><div className="burn-pill"><span className="burn-dot"/>10s after read</div><button className="header-more"><MoreHorizontal size={20}/></button></header>
        <div className="privacy-banner"><ShieldCheck size={15}/><span>This room has no server-side message history.</span><b>LIVE ONLY</b></div>
        <div className="messages" onContextMenu={e=>e.preventDefault()}>
          <div className="day-chip">PRIVATE SESSION</div>
          {peerMessages.length===0 && <div className="session-empty"><CircleUserRound size={24}/><b>Start fresh with @{active.username}</b><span>There is no previous message history to load.</span></div>}
          {peerMessages.map(m=><div key={m.id} className={`message-row ${m.direction}`}>
            <div className={`bubble ${m.kind==='image'?'bubble-image':''} ${m.status==='failed'?'failed':''}`}>
              {m.kind==='text' && <p>{m.body}</p>}
              {m.kind==='image' && m.mediaId && <EphemeralImage token={token} mediaId={m.mediaId} mine={m.direction==='out'} onViewed={()=>imageViewed(m)}/>} 
              <div className="bubble-meta"><span>{new Date(m.sentAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>{m.direction==='out' && <span className="delivery">{m.status==='sending'?'·':m.status==='failed'?'failed':m.status==='read'?'seen • burning':m.status==='delivered'?'delivered':'viewed'}</span>}{m.burnAt && <BurnTimer at={m.burnAt}/>}</div>
            </div>
          </div>)}
        </div>
        <form className="composer" onSubmit={submit}><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e=>uploadImage(e.target.files?.[0])}/><button type="button" className="attach" onClick={()=>fileInput.current?.click()} disabled={!connected} title="View-once image"><ImagePlus size={21}/></button><div className="compose-input"><input value={draft} onChange={e=>onDraft(e.target.value)} placeholder={connected?'Type a disappearing message…':'Reconnecting…'} maxLength={4000} disabled={!connected}/><span>{draft.length>0?`${draft.length}/4000`:'burns after read'}</span></div><button className="send-btn" disabled={!draft.trim()||!connected}><Send size={18}/></button></form>
      </>}
    </section>
  </main>
}

function BurnTimer({at}:{at:number}) {
  const [left,setLeft]=useState(Math.max(0,Math.ceil((at-Date.now())/1000)))
  useEffect(()=>{const t=window.setInterval(()=>setLeft(Math.max(0,Math.ceil((at-Date.now())/1000))),250);return()=>window.clearInterval(t)},[at])
  return <span className="burn-count">{left}s</span>
}
