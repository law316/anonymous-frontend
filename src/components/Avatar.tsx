function hash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = Math.imul(31, h) + text.charCodeAt(i) | 0
  return Math.abs(h)
}

export function Avatar({ username, online, size = 'md' }: { username: string; online?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const initials = username.slice(0, 2).toUpperCase()
  return <div className={`avatar avatar--${size} avatar-tone-${hash(username) % 6}`}>
    <span>{initials}</span>{online !== undefined && <i className={online ? 'online' : ''} />}
  </div>
}
