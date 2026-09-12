import { useRef, useState } from 'react'
import { Camera, ChevronLeft, MapPin, ShieldAlert, Trash2 } from 'lucide-react'
import { api } from '../api'
import { NIGERIAN_STATES } from '../constants'
import type { Profile } from '../types'
import { Avatar } from './Avatar'

export function ProfilePanel({
  token,
  profile,
  onProfile,
  onBack
}: {
  token: string
  profile: Profile
  onProfile: (profile: Profile) => void
  onBack: () => void
}) {
  const [state, setState] = useState(profile.state || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const saveState = async () => {
    setBusy(true)
    setMessage('')
    try {
      const updated = await api.updateProfile(token, state || null)
      onProfile(updated)
      setMessage('Profile updated')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      const updated = await api.uploadAvatar(token, file)
      onProfile(updated)
      setMessage('Anonymous avatar updated')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not upload image')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async () => {
    setBusy(true)
    setMessage('')
    try {
      await api.removeAvatar(token)
      const updated = { ...profile, avatarUrl: null }
      onProfile(updated)
      setMessage('Avatar removed')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not remove avatar')
    } finally {
      setBusy(false)
    }
  }

  return <div className="panel-page">
    <header className="panel-header">
      <button className="panel-back" onClick={onBack}><ChevronLeft size={19}/></button>
      <div>
        <span>Anonymous profile</span>
        <h2>Keep it generic.</h2>
      </div>
    </header>

    <div className="profile-layout">
      <section className="profile-card">
        <Avatar username={profile.username} imageUrl={profile.avatarUrl} size="lg"/>
        <div>
          <b>@{profile.username}</b>
          <span>{profile.state || 'No state added'}</span>
        </div>
      </section>

      <section className="privacy-warning">
        <ShieldAlert size={20}/>
        <div>
          <b>Do not upload your face.</b>
          <span>Use an object, artwork, scenery, symbol or other non-identifying image. Your avatar and state are persistent profile information.</span>
        </div>
      </section>

      <section className="settings-card">
        <label>Anonymous avatar</label>
        <p>This image stays beside your username until you change or remove it.</p>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={e=>upload(e.target.files?.[0])}
        />
        <div className="settings-actions">
          <button className="soft-btn" onClick={()=>fileInput.current?.click()} disabled={busy}>
            <Camera size={16}/> Choose image
          </button>
          {profile.avatarUrl && <button className="danger-soft" onClick={remove} disabled={busy}>
            <Trash2 size={15}/> Remove
          </button>}
        </div>
      </section>

      <section className="settings-card">
        <label><MapPin size={15}/> State</label>
        <p>State is optional and manually selected. Anonymous never needs your GPS or exact address.</p>
        <select value={state} onChange={e=>setState(e.target.value)}>
          <option value="">Prefer not to say</option>
          {NIGERIAN_STATES.map(item=><option key={item} value={item}>{item}</option>)}
        </select>
        <button className="primary-small" onClick={saveState} disabled={busy}>
          {busy ? 'Savingâ€¦' : 'Save profile'}
        </button>
      </section>

      {message && <div className="panel-message">{message}</div>}
    </div>
  </div>
}