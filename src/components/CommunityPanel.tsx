import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ImagePlus, MapPin, MessageCircle, RefreshCw, Send, ShieldAlert, Trash2 } from 'lucide-react'
import { api } from '../api'
import { NIGERIAN_STATES } from '../constants'
import type { CommunityPost, UserResult } from '../types'
import { Avatar } from './Avatar'

export function CommunityPanel({
  token,
  username,
  currentState,
  onChat,
  onBack
}: {
  token: string
  username: string
  currentState: string | null
  onChat: (user: UserResult) => void
  onBack: () => void
}) {
  const [state, setState] = useState(currentState || '')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | undefined>()
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      setPosts(await api.communityFeed(token, state || undefined))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load community')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [state])

  const post = async () => {
    if (!text.trim() && !file) return

    if (file && file.size > 25 * 1024 * 1024) {
      setMessage('Image/video must be 25MB or smaller')
      return
    }

    setPosting(true)
    setMessage('')

    try {
      await api.createCommunityPost(token, text.trim(), file)
      setText('')
      setFile(undefined)
      if (fileInput.current) fileInput.current.value = ''
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not publish post')
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id: number) => {
    try {
      await api.deleteCommunityPost(token, id)
      setPosts(prev=>prev.filter(p=>p.id !== id))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not delete post')
    }
  }

  return <div className="panel-page community-page">
    <header className="panel-header">
      <button className="panel-back" onClick={onBack}><ChevronLeft size={19}/></button>
      <div>
        <span>Public anonymous space</span>
        <h2>Community</h2>
      </div>
      <button className="panel-refresh" onClick={load}><RefreshCw size={16}/></button>
    </header>

    <div className="community-notice">
      <ShieldAlert size={17}/>
      <span><b>Community posts are stored.</b> Private chats are still live-only and disappear after reading. Never post your face, address or identifying details if you want to remain anonymous.</span>
    </div>

    <section className="community-compose">
      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        maxLength={500}
        placeholder="Post something to the Anonymous communityâ€¦"
      />
      <div className="community-compose-row">
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-m4v"
          onChange={e=>setFile(e.target.files?.[0])}
        />
        <button className="soft-btn" onClick={()=>fileInput.current?.click()}>
          <ImagePlus size={16}/> Image / video
        </button>
        {file && <span className="picked-file">{file.name}</span>}
        <button className="community-send" onClick={post} disabled={posting || (!text.trim() && !file)}>
          <Send size={16}/>{posting ? 'Postingâ€¦' : 'Post'}
        </button>
      </div>
    </section>

    <div className="directory-tools">
      <MapPin size={16}/>
      <select value={state} onChange={e=>setState(e.target.value)}>
        <option value="">All states</option>
        {NIGERIAN_STATES.map(item=><option key={item} value={item}>{item}</option>)}
      </select>
    </div>

    {message && <div className="panel-message">{message}</div>}

    <div className="community-feed">
      {loading && <div className="panel-empty">Loading communityâ€¦</div>}
      {!loading && posts.length === 0 && <div className="panel-empty">No community posts here yet.</div>}

      {!loading && posts.map(post=><article className="community-post" key={post.id}>
        <div className="post-head">
          <Avatar username={post.username} imageUrl={post.avatarUrl} online={post.online}/>
          <div>
            <b>@{post.username}</b>
            <span>{post.state || 'State not shared'} Â· {new Date(post.createdAt).toLocaleString()}</span>
          </div>
          {post.username === username && <button className="post-delete" onClick={()=>remove(post.id)} title="Delete post"><Trash2 size={15}/></button>}
        </div>

        {post.text && <p>{post.text}</p>}

        {post.mediaKind === 'image' && post.mediaUrl && <img className="community-media" src={post.mediaUrl} alt="" loading="lazy"/>}
        {post.mediaKind === 'video' && post.mediaUrl && <video className="community-media" src={post.mediaUrl} controls playsInline preload="metadata"/>}

        {post.username !== username && <button className="post-chat" onClick={()=>onChat({
          username: post.username,
          online: post.online,
          state: post.state,
          avatarUrl: post.avatarUrl
        })}>
          <MessageCircle size={15}/> Start private chat
        </button>}
      </article>)}
    </div>
  </div>
}