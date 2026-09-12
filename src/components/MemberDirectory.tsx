import { useEffect, useState } from 'react'
import { ChevronLeft, MapPin, MessageCircle, RefreshCw, Users } from 'lucide-react'
import { api } from '../api'
import { NIGERIAN_STATES } from '../constants'
import type { UserResult } from '../types'
import { Avatar } from './Avatar'

export function MemberDirectory({
  token,
  currentState,
  onChat,
  onBack
}: {
  token: string
  currentState: string | null
  onChat: (user: UserResult) => void
  onBack: () => void
}) {
  const [state, setState] = useState(currentState || '')
  const [members, setMembers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setMembers(await api.directory(token, state || undefined))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [state])

  return <div className="panel-page">
    <header className="panel-header">
      <button className="panel-back" onClick={onBack}><ChevronLeft size={19}/></button>
      <div>
        <span>Discover anonymously</span>
        <h2>Anonymous members</h2>
      </div>
      <button className="panel-refresh" onClick={load}><RefreshCw size={16}/></button>
    </header>

    <div className="directory-tools">
      <MapPin size={16}/>
      <select value={state} onChange={e=>setState(e.target.value)}>
        <option value="">All states</option>
        {NIGERIAN_STATES.map(item=><option key={item} value={item}>{item}</option>)}
      </select>
    </div>

    <div className="privacy-strip">
      <Users size={16}/>
      <span>Only generic profile information is shown here. Phone numbers, emails and exact locations are never displayed.</span>
    </div>

    <div className="member-grid">
      {loading && <div className="panel-empty">Loading membersâ€¦</div>}
      {!loading && members.length === 0 && <div className="panel-empty">No members found in this view yet.</div>}
      {!loading && members.map(member=><article className="member-card" key={member.username}>
        <Avatar username={member.username} imageUrl={member.avatarUrl} online={member.online} size="lg"/>
        <div className="member-main">
          <b>@{member.username}</b>
          <span>{member.state || 'State not shared'}</span>
          <small>{member.online ? 'Online now' : 'Offline Â· live messages will not queue'}</small>
        </div>
        <button onClick={()=>onChat(member)}><MessageCircle size={16}/> Chat</button>
      </article>)}
    </div>
  </div>
}