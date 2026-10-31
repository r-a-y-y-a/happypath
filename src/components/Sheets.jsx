import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, ImagePlus, MapPin, Send } from 'lucide-react'
import { Button, Field, Sheet } from './ui'
import { get, post, uploadPhoto, resizeImage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { jumpTo, resetClock, isJumped, getOffset, nodeState, now } from '../lib/clock'
import { fmtTime } from '../lib/fmt'

const EMOJIS = ['🍽️', '🧗', '🌅', '☕', '🎬', '🏖️', '🎤', '🛍️']

// Venue box that suggests real places as you type. Picking one saves its exact coordinates for travel times.
function PlaceField({ value, picked, onText, onPick }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const q = value.trim()
    if (!open || q.length < 3) return setResults([])
    let live = true
    setBusy(true)
    const id = setTimeout(() => {
      get(`/places?q=${encodeURIComponent(q)}`).then((r) => live && setResults(r)).catch(() => live && setResults([])).finally(() => live && setBusy(false))
    }, 350)
    return () => { live = false; clearTimeout(id) }
  }, [value, open])
  return (
    <div className="relative">
      <Field label="Where" placeholder="Search any place in Singapore" value={value} autoComplete="off"
        onChange={(e) => { onText(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} />
      {!picked && value.trim().length > 2 && !open && (
        <p className="mt-1.5 text-[11px] text-muted">Pick a suggestion for exact travel times.</p>
      )}
      {open && (busy || results.length > 0) && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-surface-2 bg-surface-2 py-1 shadow-2xl shadow-black/50">
          {busy && results.length === 0 && <li className="px-4 py-3 text-[13px] text-muted">Searching...</li>}
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button type="button" onClick={() => { onPick(r); setOpen(false); setResults([]) }}
                className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left active:bg-surface">
                <MapPin size={15} className="mt-0.5 shrink-0 text-coral-ink" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{r.name}</span>
                  {r.address && <span className="block truncate text-[12px] text-muted">{r.address}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AddNodeSheet({ open, onClose, day, onAdded }) {
  const [f, setF] = useState({ title: '', venue: '', lat: null, lng: null, emoji: '🌅', start: '18:00', end: '19:30' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  // Stop times are entered in Singapore time (UTC+8).
  const iso = (hhmm) => new Date(`${day.date}T${hhmm}:00+08:00`).toISOString()
  const submit = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return setErr('Give it a name')
    if (f.end <= f.start) return setErr('End must be after start')
    setBusy(true); setErr('')
    try {
      await post(`/days/${day.id}/nodes`, { title: f.title.trim(), venue: f.venue.trim(), lat: f.lat ?? undefined, lng: f.lng ?? undefined, emoji: f.emoji, starts_at: iso(f.start), ends_at: iso(f.end) })
      onAdded(); onClose()
      setF({ ...f, title: '', venue: '', lat: null, lng: null })
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Add a stop">
      <form onSubmit={submit} className="space-y-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {EMOJIS.map((e) => (
            <button type="button" key={e} onClick={() => setF({ ...f, emoji: e })}
              className={`h-12 w-12 shrink-0 rounded-2xl text-2xl ${f.emoji === e ? 'bg-coral/25 ring-2 ring-coral' : 'bg-surface-2'}`}>{e}</button>
          ))}
        </div>
        <Field label="What" placeholder="Sunset at Marina Barrage" value={f.title} onChange={set('title')} />
        <PlaceField value={f.venue} picked={f.lat != null} onText={(venue) => setF({ ...f, venue, lat: null, lng: null })}
          onPick={(r) => setF({ ...f, venue: r.name, lat: r.lat, lng: r.lng })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" type="time" value={f.start} onChange={set('start')} />
          <Field label="Ends" type="time" value={f.end} onChange={set('end')} />
        </div>
        {err && <p className="text-sm font-medium text-coral-ink">{err}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Adding...' : 'Add to the day'}</Button>
      </form>
    </Sheet>
  )
}

export function InviteSheet({ open, onClose, day }) {
  const [copied, setCopied] = useState(false)
  const url = `${location.origin}/join/${day.id}${isJumped() ? `?co=${Math.round(getOffset())}` : ''}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Invite friends">
      <div className="flex flex-col items-center gap-5">
        <div className="rounded-[28px] bg-cloud p-5 shadow-xl shadow-amber-900/15 ring-1 ring-surface-2">
          <QRCodeSVG value={url} size={220} bgColor="#fff8e6" fgColor="#3b2710" level="M" />
        </div>
        <p className="text-center text-sm text-muted">Scan to join <b className="text-fg">{day.title}</b></p>
        <button onClick={copy} className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left">
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{url}</span>
          {copied ? <Check size={18} className="text-mint-ink" /> : <Copy size={18} />}
        </button>
      </div>
    </Sheet>
  )
}

export function CameraSheet({ node, file, onClose, onPosted }) {
  const { userId } = useAuth()
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState(null)
  const [lastFile, setLastFile] = useState(null)
  if (file && file !== lastFile) { setLastFile(file); setPreview(URL.createObjectURL(file)) }

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const blob = await resizeImage(file)
      const photo_path = await uploadPhoto(blob, userId)
      const p = await post('/posts', { node_id: node.id, photo_path, caption: caption.trim() || undefined, created_at: isJumped() ? new Date(now()).toISOString() : undefined })
      onPosted(p)
      setCaption('')
    } catch (x) { setErr(x.message || 'Upload failed') } finally { setBusy(false) }
  }
  return (
    <Sheet open={!!node && !!file} onClose={onClose} title={node ? `${node.emoji || ''} ${node.title}` : ''}>
      <div className="space-y-4">
        {preview && <img src={preview} alt="Your moment" className="max-h-[50dvh] w-full rounded-3xl object-cover" />}
        <Field label="Caption" placeholder="What is happening?" value={caption} onChange={(e) => setCaption(e.target.value)} />
        {err && <p className="text-sm font-medium text-coral-ink">{err}</p>}
        <Button onClick={submit} disabled={busy} className="w-full"><Send size={18} />{busy ? 'Posting...' : 'Post to my diary'}</Button>
      </div>
    </Sheet>
  )
}

export function ClockSheet({ open, onClose, nodes }) {
  const jump = (n) => { jumpTo(new Date(n.starts_at).getTime() + 5 * 60000); onClose() }
  return (
    <Sheet open={open} onClose={onClose} title="Demo clock">
      <p className="mb-3 text-sm text-muted">Now is <b className="text-fg">{fmtTime(now())}</b>. Jump to 5 minutes into a stop.</p>
      <div className="space-y-2">
        {nodes.map((n) => (
          <button key={n.id} onClick={() => jump(n)} className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left">
            <span className="text-2xl">{n.emoji}</span>
            <span className="flex-1 font-semibold">{n.title}</span>
            <span className="text-xs text-muted">{fmtTime(n.starts_at)}</span>
          </button>
        ))}
      </div>
      {isJumped() && <Button variant="ghost" className="mt-4 w-full" onClick={() => { resetClock(); onClose() }}>Back to real time</Button>}
    </Sheet>
  )
}
