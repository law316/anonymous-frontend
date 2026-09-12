import { useCallback, useEffect, useRef, useState } from 'react'
import { api, WS_URL } from '../api'
import type { SocketEvent } from '../types'

export function useChatSocket(token: string | null, onEvent: (event: SocketEvent) => void) {
  const socketRef = useRef<WebSocket | null>(null)
  const eventRef = useRef(onEvent)
  const [connected, setConnected] = useState(false)
  eventRef.current = onEvent

  useEffect(() => {
    if (!token) return
    let cancelled = false
    let retry: number | undefined

    const connect = async () => {
      try {
        const { ticket } = await api.wsTicket(token)
        if (cancelled) return
        const ws = new WebSocket(`${WS_URL}/ws?ticket=${encodeURIComponent(ticket)}`)
        socketRef.current = ws
        ws.onopen = () => setConnected(true)
        ws.onmessage = e => {
          try { eventRef.current(JSON.parse(e.data) as SocketEvent) } catch { /* ignore malformed frame */ }
        }
        ws.onclose = () => {
          setConnected(false)
          if (!cancelled) retry = window.setTimeout(connect, 1800)
        }
        ws.onerror = () => ws.close()
      } catch {
        if (!cancelled) retry = window.setTimeout(connect, 2500)
      }
    }

    connect()
    return () => {
      cancelled = true
      if (retry) window.clearTimeout(retry)
      socketRef.current?.close()
      socketRef.current = null
      setConnected(false)
    }
  }, [token])

  const send = useCallback((payload: object) => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(payload))
    return true
  }, [])

  return { connected, send }
}
