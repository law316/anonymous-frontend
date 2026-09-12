export type AuthResponse = { token: string; username: string }
export type UserResult = { username: string; online: boolean }

export type ChatMessage = {
  id: string
  peer: string
  direction: 'in' | 'out'
  kind: 'text' | 'image' | 'system'
  body?: string
  mediaId?: string
  sentAt: number
  status?: 'sending' | 'delivered' | 'read' | 'failed' | 'viewed'
  burnAt?: number
}

export type SocketEvent = {
  type: string
  messageId?: string
  from?: string
  to?: string
  body?: string
  mediaId?: string
  sentAt?: string
  active?: boolean
  code?: string
  message?: string
}
