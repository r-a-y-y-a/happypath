import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, ImagePlus, Send } from 'lucide-react'
import { Button, Field, Sheet } from './ui'
import { post, uploadPhoto, resizeImage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { jumpTo, resetClock, isJumped, getOffset, nodeState, now } from '../lib/clock'
import { fmtTime } from '../lib/fmt'

const EMOJIS = ['🍽️', '🧗', '🌅', '☕', '🎬', '🏖️', '🎤', '🛍️']

export function AddNodeSheet({ open, onClose, day, onAdded }) {
  const [f, setF] = useState({ title: '', venue: '', emoji: '🌅', start: '18:00', end: '19:30' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const iso = (hhmm) => {
    const d = new Date(day.date + 'T00:00:00')
    const [h, m] = hhmm.split(':')
    d.setHours(+h, +m, 0, 0)
    return d.toISOString()
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return setErr('Give it a name')
    if (f.end <= f.start) return setErr('End must be after start')
    setBusy(true); setErr('')
    try {
      await post(`/days/${day.id}/nodes`, { title: f.title.trim(), venue: f.venue.trim(), emoji: f.emoji, starts_at: iso(f.start), ends_at: iso(f.end) })
      onAdded(); onClose()
      setF({ ...f, title: '', venue: '' })
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
        <Field label="Where" placeholder="Marina Barrage" value={f.venue} onChange={set('venue')} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" type="time" value={f.start} onChange={set('start')} />
          <Field label="Ends" type="time" value={f.end} onChange={set('end')} />
        </div>
        {err && <p className="text-sm font-medium text-coral">{err}</p>}
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
          <QRCodeSVG value={url} size={220} bgColor="#f8f5ff" fgColor="#0f0b1a" level="M" />
        </div>
        <p className="text-center text-sm text-muted">Scan to join <b className="text-ink">{day.title}</b></p>
        <button onClick={copy} className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left">
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{url}</span>
          {copied ? <Check size={18} className="text-mint-deep" /> : <Copy size={18} />}
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
        {err && <p className="text-sm font-medium text-coral">{err}</p>}
        <Button onClick={submit} disabled={busy} className="w-full"><Send size={18} />{busy ? 'Posting...' : 'Post to my diary'}</Button>
      </div>
    </Sheet>
  )
}

export function ClockSheet({ open, onClose, nodes }) {
  const jump = (n) => { jumpTo(new Date(n.starts_at).getTime() + 5 * 60000); onClose() }
  return (
    <Sheet open={open} onClose={onClose} title="Demo clock">
      <p className="mb-3 text-sm text-muted">Now is <b className="text-ink">{fmtTime(now())}</b>. Jump to 5 minutes into a stop.</p>
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
