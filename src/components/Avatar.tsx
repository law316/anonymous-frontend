function hash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = Math.imul(31, h) + text.charCodeAt(i) | 0
  return Math.abs(h)
}

export function Avatar({
  username,
  online,
  imageUrl,
  size = 'md'
}: {
  username: string
  online?: boolean
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = username.slice(0, 2).toUpperCase()

  return <div className={`avatar avatar--${size} avatar-tone-${hash(username) % 6}`}>
    {imageUrl
      ? <img src={imageUrl} alt="" draggable={false}/>
      : <span>{initials}</span>
    }
    {online !== undefined && <i className={online ? 'online' : ''} />}
  </div>
}