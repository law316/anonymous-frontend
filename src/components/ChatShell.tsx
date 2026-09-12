import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleUserRound,
  Copy,
  ImagePlus,
  LogOut,
  Menu,
  MessageCircle,
  MessageCirclePlus,
  MoreHorizontal,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  Users,
  X
} from 'lucide-react'
import { api } from '../api'
import { useChatSocket } from '../hooks/useChatSocket'
import type { ChatMessage, Profile, SocketEvent, UserResult } from '../types'
import { Avatar } from './Avatar'
import { CommunityPanel } from './CommunityPanel'
import { EphemeralImage } from './EphemeralImage'
import { Logo } from './Logo'
import { MemberDirectory } from './MemberDirectory'
import { ProfilePanel } from './ProfilePanel'

const BURN_MS = 10_000
const makeId = () => crypto.randomUUID().replaceAll('-', '')

type StageView = 'chats' | 'members' | 'community' | 'profile'

export function ChatShell({
  token,
  username,
  onLogout
}: {
  token: string
  username: string
  onLogout: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [recents, setRecents] = useState<UserResult[]>([])
  const [active, setActive] = useState<UserResult | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [typingPeer, setTypingPeer] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [view, setView] = useState<StageView>('chats')
  const [profile, setProfile] = useState<Profile>({ username, state: null, avatarUrl: null })

  const fileInput = useRef<HTMLInputElement>(null)
  const activeRef = useRef<UserResult | null>(null)
  const typingTimer = useRef<number | null>(null)
  const inviteHandled = useRef(false)

  activeRef.current = active

  const inviteUsername = new URLSearchParams(window.location.search).get('invite')?.trim() || ''

  const upsertRecent = useCallback((value: UserResult | string, online = true) => {
    const next: UserResult = typeof value === 'string'
      ? { username: value, online, state: null, avatarUrl: null }
      : value

    setRecents(prev => [
      next,
      ...prev.filter(item => item.username.toLowerCase() !== next.username.toLowerCase())
    ].slice(0, 20))
  }, [])

  useEffect(() => {
    api.profile(token).then(setProfile).catch(()=>{})
  }, [token])

  const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(username)}`
  const inviteText = `Let's chat on Anonymous. No phone number or email is needed. Private messages are live-only and disappear after they're read. Find me as @${username}.`

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${inviteText}\n${inviteUrl}`)
      setToast('Invite link copied')
    } catch {
      setToast('Could not copy the invite link')
    }
  }

  const shareInvite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Chat with me on Anonymous',
          text: inviteText,
          url: inviteUrl
        })
      } else {
        await copyInvite()
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      await copyInvite()
    }
  }

  const inviteFromContacts = async () => {
    type PickedContact = { name?: string[]; tel?: string[] }
    type ContactNavigator = Navigator & {
      contacts?: {
        getProperties: () => Promise<string[]>
        select: (properties: string[], options: { multiple: boolean }) => Promise<PickedContact[]>
      }
    }

    const contactApi = (navigator as ContactNavigator).contacts

    if (!contactApi) {
      await shareInvite()
      return
    }

    try {
      const supported = await contactApi.getProperties()
      const properties = ['name', 'tel'].filter(item => supported.includes(item))

      if (!properties.includes('tel')) {
        await shareInvite()
        return
      }

      const selected = await contactApi.select(properties, { multiple: false })
      const phone = selected[0]?.tel?.[0]?.replace(/\s+/g, '')

      if (!phone) {
        await shareInvite()
        return
      }

      window.location.href = `sms:${phone}?body=${encodeURIComponent(`${inviteText}\n${inviteUrl}`)}`
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      await shareInvite()
    }
  }

  const scheduleBurn = useCallback((id: string) => {
    const burnAt = Date.now() + BURN_MS
    setMessages(prev => prev.map(message =>
      message.id === id ? { ...message, burnAt, status: 'read' } : message
    ))
    window.setTimeout(
      () => setMessages(prev => prev.filter(message => message.id !== id)),
      BURN_MS + 80
    )
  }, [])

  const onSocketEvent = useCallback((event: SocketEvent) => {
    if (event.type === 'TEXT' && event.from && event.messageId) {
      const msg: ChatMessage = {
        id: event.messageId,
        peer: event.from,
        direction: 'in',
        kind: 'text',
        body: event.body || '',
        sentAt: Date.now(),
        status: 'delivered'
      }

      setMessages(prev => [...prev, msg])
      upsertRecent(event.from, true)

      if (activeRef.current?.username === event.from) {
        window.setTimeout(() => {
          sendRef.current?.({ type: 'READ', to: event.from, messageId: event.messageId })
          scheduleBurn(event.messageId!)
        }, 350)
      } else {
        setToast(`New live message from @${event.from}`)
      }
    }

    if (event.type === 'IMAGE' && event.from && event.messageId && event.mediaId) {
      setMessages(prev => [...prev, {
        id: event.messageId!,
        peer: event.from!,
        direction: 'in',
        kind: 'image',
        mediaId: event.mediaId,
        sentAt: Date.now(),
        status: 'delivered'
      }])
      upsertRecent(event.from, true)

      if (activeRef.current?.username !== event.from) {
        setToast(`View-once image from @${event.from}`)
      }
    }

    if (event.type === 'DELIVERED' && event.messageId) {
      setMessages(prev => prev.map(message =>
        message.id === event.messageId ? { ...message, status: 'delivered' } : message
      ))
    }

    if (event.type === 'READ' && event.messageId) scheduleBurn(event.messageId)

    if (event.type === 'IMAGE_VIEWED' && event.messageId) {
      setMessages(prev => prev.filter(message => message.id !== event.messageId))
    }

    if (event.type === 'TYPING' && event.from) {
      setTypingPeer(event.active ? event.from : null)
    }

    if (event.type === 'ERROR') {
      setMessages(prev => prev.map(message =>
        message.id === event.messageId ? { ...message, status: 'failed' } : message
      ))
      setToast(event.message || 'Message could not be delivered')
    }
  }, [scheduleBurn, upsertRecent])

  const { connected, send } = useChatSocket(token, onSocketEvent)
  const sendRef = useRef(send)
  sendRef.current = send

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(()=>setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([])
        return
      }

      try {
        setResults(await api.searchUsers(token, query.trim()))
      } catch {
        setResults([])
      }
    }, 260)

    return () => window.clearTimeout(timer)
  }, [query, token])

  useEffect(() => {
    if (!active) return

    messages
      .filter(message =>
        message.peer === active.username &&
        message.direction === 'in' &&
        message.kind === 'text' &&
        !message.burnAt
      )
      .forEach(message => {
        send({ type: 'READ', to: active.username, messageId: message.id })
        scheduleBurn(message.id)
      })
  }, [active, messages, scheduleBurn, send])

  useEffect(() => {
    if (
      inviteHandled.current ||
      !inviteUsername ||
      inviteUsername.toLowerCase() === username.toLowerCase()
    ) return

    inviteHandled.current = true

    api.searchUsers(token, inviteUsername)
      .then(users => {
        const match = users.find(user =>
          user.username.toLowerCase() === inviteUsername.toLowerCase()
        )

        if (match) {
          choose(match)
          setToast(`@${match.username} invited you to chat`)
        } else {
          setToast(`@${inviteUsername} invited you. Search their username when they are online.`)
        }
      })
      .catch(() => setToast(`Invite from @${inviteUsername}`))
  }, [inviteUsername, token, username])

  const peerMessages = useMemo(
    () => active ? messages.filter(message => message.peer === active.username) : [],
    [messages, active]
  )

  const choose = (user: UserResult) => {
    setActive(user)
    setView('chats')
    upsertRecent(user)
    setQuery('')
    setResults([])
    setSidebarOpen(false)
  }

  const openStage = (next: StageView) => {
    setActive(null)
    setView(next)
    setSidebarOpen(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!active || !draft.trim() || !connected) return

    const id = makeId()
    const body = draft.trim()

    setMessages(prev => [...prev, {
      id,
      peer: active.username,
      direction: 'out',
      kind: 'text',
      body,
      sentAt: Date.now(),
      status: 'sending'
    }])

    setDraft('')
    send({ type: 'TEXT', to: active.username, messageId: id, body })
    send({ type: 'TYPING', to: active.username, active: false })
  }

  const onDraft = (value: string) => {
    setDraft(value)
    if (!active || !connected) return

    send({ type: 'TYPING', to: active.username, active: true })

    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(
      () => send({ type: 'TYPING', to: active.username, active: false }),
      900
    )
  }

  const uploadImage = async (file?: File) => {
    if (!file || !active || !connected) return

    const id = makeId()
    setToast('Preparing view-once imageâ€¦')

    try {
      const { mediaId } = await api.uploadImage(token, active.username, file)

      setMessages(prev => [...prev, {
        id,
        peer: active.username,
        direction: 'out',
        kind: 'image',
        mediaId,
        sentAt: Date.now(),
        status: 'sending'
      }])

      send({ type: 'IMAGE', to: active.username, messageId: id, mediaId })
      setToast('Image sent â€” it will be destroyed when opened')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const imageViewed = (message: ChatMessage) => {
    setMessages(prev => prev.filter(item => item.id !== message.id))
    if (active) {
      send({ type: 'IMAGE_VIEWED', to: active.username, messageId: message.id })
    }
  }

  const renderHome = () => <div className="welcome-stage">
    <button className="hamburger" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button>
    <div className="hero-lock">
      <Logo compact/>
      <div className="pulse-ring r1"/>
      <div className="pulse-ring r2"/>
    </div>

    <span className="eyebrow"><ShieldCheck size={14}/> Ephemeral private chat</span>
    <h2>Find people.<br/><em>Talk without history.</em></h2>
    <p>Your profile can stay generic, while private messages remain live-only and burn after they are read.</p>

    <div className="home-actions">
      <button onClick={()=>openStage('members')}><Users size={18}/><span><b>Browse members</b><small>See Anonymous users and filter by state</small></span></button>
      <button onClick={()=>openStage('community')}><MessageCircle size={18}/><span><b>Community</b><small>Public posts, images and videos</small></span></button>
      <button onClick={shareInvite}><Share2 size={18}/><span><b>Invite someone</b><small>Share your personal Anonymous link</small></span></button>
      <button onClick={inviteFromContacts}><Users size={18}/><span><b>Phone contacts</b><small>Pick a contact or use your phone share sheet</small></span></button>
    </div>

    <div className="media-tip"><ImagePlus size={15}/><span>Open a private chat and the Photo button appears in the message bar.</span></div>

    <div className="welcome-cards">
      <div><b>01</b><span>Discover</span><small>Browse generic profiles or search a username.</small></div>
      <div><b>02</b><span>Talk</span><small>Live private text and view-once images.</small></div>
      <div><b>03</b><span>Gone</span><small>Read private messages erase from the interface.</small></div>
    </div>

    <div className="reality-note">Community/profile data can persist. Private chat history is not stored. Screenshots cannot be technically prevented on the open web.</div>
  </div>

  return <main
    className="chat-app"
    onCopy={e=>{if ((e.target as HTMLElement).closest('.messages')) e.preventDefault()}}
    onCut={e=>{if ((e.target as HTMLElement).closest('.messages')) e.preventDefault()}}
  >
    {toast && <div className="toast"><ShieldCheck size={16}/>{toast}</div>}

    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-head">
        <Logo/>
        <button className="mobile-close" onClick={()=>setSidebarOpen(false)}><X size={20}/></button>
      </div>

      <div className="me-card">
        <Avatar username={username} imageUrl={profile.avatarUrl} online={connected}/>
        <div>
          <b>@{username}</b>
          <span><i className={connected ? 'online' : ''}/>{connected ? 'Live & ready' : 'Reconnectingâ€¦'}</span>
          {profile.state && <small>{profile.state}</small>}
        </div>
        <button title="Edit profile" onClick={()=>openStage('profile')}><Settings size={17}/></button>
      </div>

      <div className="side-nav">
        <button className={view === 'chats' ? 'active' : ''} onClick={()=>openStage('chats')}><MessageCircle size={16}/> Chats</button>
        <button className={view === 'members' ? 'active' : ''} onClick={()=>openStage('members')}><Users size={16}/> Members</button>
        <button className={view === 'community' ? 'active' : ''} onClick={()=>openStage('community')}><Sparkles size={16}/> Community</button>
      </div>

      <div className="invite-actions">
        <button onClick={shareInvite}><Share2 size={15}/> Invite</button>
        <button onClick={inviteFromContacts}><Users size={15}/> Contacts</button>
        <button className="invite-copy" onClick={copyInvite} title="Copy invite link"><Copy size={14}/></button>
      </div>

      <div className="search-box">
        <Search size={17}/>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a username"/>
        <kbd>@</kbd>
      </div>

      {query.trim().length >= 2
        ? <div className="contact-section">
            <div className="section-label">Search results</div>
            {results.length
              ? results.map(user=><button className="contact" key={user.username} onClick={()=>choose(user)}>
                  <Avatar username={user.username} imageUrl={user.avatarUrl} online={user.online}/>
                  <div>
                    <b>@{user.username}</b>
                    <span>{user.state ? `${user.state} Â· ` : ''}{user.online ? 'Online now' : 'Offline'}</span>
                  </div>
                </button>)
              : <div className="empty-search"><UserRoundSearch size={22}/><span>No matching username yet.</span></div>}
          </div>
        : <div className="contact-section grow">
            <div className="section-label"><span>Recent live chats</span><MessageCirclePlus size={15}/></div>
            {recents.length
              ? recents.map(user=><button
                  className={`contact ${active?.username === user.username ? 'selected' : ''}`}
                  key={user.username}
                  onClick={()=>choose(user)}
                >
                  <Avatar username={user.username} imageUrl={user.avatarUrl} online={user.online}/>
                  <div>
                    <b>@{user.username}</b>
                    <span>Nothing saved after it disappears</span>
                  </div>
                </button>)
              : <div className="empty-list">
                  <div className="empty-orb"><Sparkles size={23}/></div>
                  <b>No private history.</b>
                  <p>Browse members, community posts or search a username to start.</p>
                </div>}
          </div>}

      <div className="sidebar-privacy">
        <ShieldCheck size={15}/>
        <span>Private messages are not written to the chat database.</span>
      </div>

      <button className="logout-bottom" onClick={onLogout}><LogOut size={15}/> Sign out</button>
    </aside>

    <section className="chat-stage">
      {!active && view === 'chats' && renderHome()}

      {!active && view === 'members' && <MemberDirectory
        token={token}
        currentState={profile.state}
        onChat={choose}
        onBack={()=>openStage('chats')}
      />}

      {!active && view === 'community' && <CommunityPanel
        token={token}
        username={username}
        currentState={profile.state}
        onChat={choose}
        onBack={()=>openStage('chats')}
      />}

      {!active && view === 'profile' && <ProfilePanel
        token={token}
        profile={profile}
        onProfile={setProfile}
        onBack={()=>openStage('chats')}
      />}

      {active && <>
        <header className="chat-header">
          <button className="hamburger" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button>
          <Avatar username={active.username} imageUrl={active.avatarUrl} online={active.online}/>
          <div className="peer-title">
            <b>@{active.username}</b>
            <span>{typingPeer === active.username
              ? 'typingâ€¦'
              : active.online
                ? `${active.state ? `${active.state} Â· ` : ''}online Â· live delivery only`
                : `${active.state ? `${active.state} Â· ` : ''}offline Â· messages will not queue`}</span>
          </div>
          <div className="burn-pill"><span className="burn-dot"/>10s after read</div>
          <button className="header-more"><MoreHorizontal size={20}/></button>
        </header>

        <div className="privacy-banner">
          <ShieldCheck size={15}/>
          <span>This room has no server-side message history.</span>
          <b>LIVE ONLY</b>
        </div>

        <div className="messages" onContextMenu={e=>e.preventDefault()}>
          <div className="day-chip">PRIVATE SESSION</div>

          {peerMessages.length === 0 && <div className="session-empty">
            <CircleUserRound size={24}/>
            <b>Start fresh with @{active.username}</b>
            <span>There is no previous private message history to load.</span>
          </div>}

          {peerMessages.map(message=><div key={message.id} className={`message-row ${message.direction}`}>
            <div className={`bubble ${message.kind === 'image' ? 'bubble-image' : ''} ${message.status === 'failed' ? 'failed' : ''}`}>
              {message.kind === 'text' && <p>{message.body}</p>}

              {message.kind === 'image' && message.mediaId && <EphemeralImage
                token={token}
                mediaId={message.mediaId}
                mine={message.direction === 'out'}
                onViewed={()=>imageViewed(message)}
              />}

              <div className="bubble-meta">
                <span>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {message.direction === 'out' && <span className="delivery">
                  {message.status === 'sending'
                    ? 'Â·'
                    : message.status === 'failed'
                      ? 'failed'
                      : message.status === 'read'
                        ? 'seen â€¢ burning'
                        : message.status === 'delivered'
                          ? 'delivered'
                          : 'viewed'}
                </span>}
                {message.burnAt && <BurnTimer at={message.burnAt}/>}
              </div>
            </div>
          </div>)}
        </div>

        <form className="composer" onSubmit={submit}>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={e=>uploadImage(e.target.files?.[0])}
          />

          <button
            type="button"
            className="attach"
            onClick={()=>fileInput.current?.click()}
            disabled={!connected}
            title="Send view-once photo"
          >
            <ImagePlus size={20}/><span>Photo</span>
          </button>

          <div className="compose-input">
            <input
              value={draft}
              onChange={e=>onDraft(e.target.value)}
              placeholder={connected ? 'Type a disappearing messageâ€¦' : 'Reconnectingâ€¦'}
              maxLength={4000}
              disabled={!connected}
            />
            <span>{draft.length > 0 ? `${draft.length}/4000` : 'burns after read'}</span>
          </div>

          <button className="send-btn" disabled={!draft.trim() || !connected}><Send size={18}/></button>
        </form>
      </>}
    </section>
  </main>
}

function BurnTimer({ at }: { at: number }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((at - Date.now()) / 1000)))

  useEffect(() => {
    const timer = window.setInterval(
      () => setLeft(Math.max(0, Math.ceil((at - Date.now()) / 1000))),
      250
    )
    return () => window.clearInterval(timer)
  }, [at])

  return <span className="burn-count">{left}s</span>
}