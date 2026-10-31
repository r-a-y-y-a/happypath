import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, LogOut, Moon, Sun, Check } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Avatar, Button, ErrorState, Skeleton } from '../components/ui'

const NAME_MAX = 30
const BIO_MAX = 120

const inputCls = 'w-full rounded-2xl border border-surface-2 bg-page px-4 text-[16px] text-fg outline-none placeholder:text-muted/60 focus:border-coral'

function ThemeSwitch() {
  const { theme, toggle } = useTheme()
  const night = theme === 'dark'
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2">
      <span id="theme-label" className="flex items-center gap-3 text-[15px] font-semibold">
        {night ? <Moon size={20} className="text-amber-ink" /> : <Sun size={20} className="text-amber-ink" />}
        {night ? 'Night mode' : 'Day mode'}
      </span>
      <button type="button" role="switch" aria-checked={night} aria-labelledby="theme-label" onClick={toggle}
        className="flex h-11 w-16 shrink-0 items-center justify-center">
        <span className={`relative block h-8 w-14 rounded-full transition-colors ${night ? 'bg-coral' : 'bg-surface-2'}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${night ? 'left-7' : 'left-1'}`} />
        </span>
      </button>
    </div>
  )
}

export default function Account() {
  const { userId, profile, loading, saveProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) { setName(profile.display_name || ''); setBio(profile.bio || '') }
  }, [profile])

  if (loading) {
    return <div className="space-y-4 px-5"><Skeleton className="h-9 w-40" /><Skeleton className="h-28" /><Skeleton className="h-56" /></div>
  }
  if (!profile) return <ErrorState message="We could not load your profile." onRetry={() => window.location.reload()} />

  const trimmed = name.trim()
  const dirty = trimmed !== (profile.display_name || '') || bio.trim() !== (profile.bio || '')
  const canSave = dirty && trimmed.length > 0 && !saving

  const onSave = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true); setError(''); setSaved(false)
    try { await saveProfile({ display_name: name, bio }); setSaved(true) }
    catch (err) { setError(err.message || 'Could not save. Try again.') }
    finally { setSaving(false) }
  }

  const onSignOut = async () => { await signOut(); navigate('/') }

  return (
    <div className="space-y-5 px-5 pb-6">
      <h1 className="font-display text-3xl font-extrabold">Account</h1>

      <section className="flex items-center gap-4 rounded-3xl bg-surface p-5">
        <Avatar p={profile} size={64} />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold">{profile.display_name}</p>
          <p className="line-clamp-2 text-sm text-muted">{profile.bio || 'No bio yet'}</p>
        </div>
      </section>

      <form onSubmit={onSave} className="space-y-4 rounded-3xl bg-surface p-5">
        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted">
            Display name <span>{name.length}/{NAME_MAX}</span>
          </span>
          <input value={name} maxLength={NAME_MAX} required autoComplete="nickname"
            onChange={(e) => { setName(e.target.value); setSaved(false) }}
            className={`${inputCls} h-12`} />
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted">
            Bio <span>{bio.length}/{BIO_MAX}</span>
          </span>
          <textarea value={bio} maxLength={BIO_MAX} rows={3} placeholder="A line about you"
            onChange={(e) => { setBio(e.target.value); setSaved(false) }}
            className={`${inputCls} resize-none py-3`} />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-coral-ink">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSave} className="min-w-28">{saving ? 'Saving...' : 'Save'}</Button>
          {saved && !dirty && <span role="status" className="flex items-center gap-1 text-sm font-semibold text-mint-ink"><Check size={16} /> Saved</span>}
        </div>
      </form>

      <Link to={`/profile/${userId}`} state={{ from: 'account' }}
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface px-4 text-[15px] font-semibold">
        <span className="flex items-center gap-3"><BookOpen size={20} className="text-coral-ink" /> My diary</span>
        <ChevronRight size={18} className="text-muted" />
      </Link>

      <ThemeSwitch />

      <Button variant="ghost" onClick={onSignOut} className="h-12 w-full text-coral-ink"><LogOut size={18} /> Sign out</Button>
    </div>
  )
}
