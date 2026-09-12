import { useEffect, useRef, useState } from 'react'
import { Eye, ImageOff, LoaderCircle, Shield } from 'lucide-react'
import { api } from '../api'

export function EphemeralImage({ token, mediaId, mine, onViewed }:{ token:string; mediaId:string; mine:boolean; onViewed:()=>void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'ready'|'loading'|'viewing'|'gone'>('ready')
  const [seconds, setSeconds] = useState(4)
  const viewedRef = useRef(onViewed)
  viewedRef.current = onViewed

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  useEffect(() => {
    if (state !== 'viewing') return
    const timer = window.setInterval(() => setSeconds(s => {
      if (s <= 1) { window.clearInterval(timer); setState('gone'); if (url) URL.revokeObjectURL(url); setUrl(null); viewedRef.current(); return 0 }
      return s - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [state, url])

  const open = async () => {
    if (mine || state !== 'ready') return
    setState('loading')
    try {
      const blob = await api.consumeImage(token, mediaId)
      const objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl); setSeconds(4); setState('viewing')
    } catch { setState('gone'); viewedRef.current() }
  }

  if (mine) return <div className="image-placeholder mine"><Shield size={18}/><div><b>View-once image</b><span>Destroyed when opened</span></div></div>
  if (state === 'gone') return <div className="image-placeholder gone"><ImageOff size={18}/><div><b>Image destroyed</b><span>It cannot be opened again</span></div></div>
  if (state === 'viewing' && url) return <div className="ephemeral-view" onContextMenu={e=>e.preventDefault()}><img src={url} draggable={false}/><span>{seconds}s</span></div>
  return <button className="image-placeholder view" onClick={open} disabled={state === 'loading'}>{state === 'loading' ? <LoaderCircle className="spin" size={20}/> : <Eye size={20}/>}<div><b>{state === 'loading' ? 'Opening…' : 'Tap to view once'}</b><span>Cloud copy is destroyed on open</span></div></button>
}
