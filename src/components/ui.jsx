import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'

const GRADS = [
  'from-coral to-amber', 'from-mint to-surface-2', 'from-amber to-coral', 'from-surface-2 to-mint',
]

export function Avatar({ p, size = 36, ring = false }) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  const idx = (p?.display_name?.charCodeAt(0) || 0) % GRADS.length
  return (
    <span
      style={style}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${GRADS[idx]} font-bold text-ink ${ring ? 'ring-2 ring-cloud' : ''}`}
      title={p?.display_name}
    >
      {p?.avatar_url ? (
        <img src={p.avatar_url} alt={p.display_name} className="h-full w-full object-cover" />
      ) : (
        (p?.display_name || '?')[0].toUpperCase()
      )}
    </span>
  )
}

export function AvatarStack({ people = [], size = 28, max = 4 }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <motion.span key={p.id} layout initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ marginLeft: i ? -size * 0.3 : 0 }}>
          <Avatar p={p} size={size} ring />
        </motion.span>
      ))}
      {extra > 0 && (
        <span style={{ width: size, height: size, marginLeft: -size * 0.3, fontSize: size * 0.38 }}
          className="inline-flex items-center justify-center rounded-full bg-surface-2 font-semibold text-muted ring-2 ring-cloud">
          +{extra}
        </span>
      )}
    </span>
  )
}

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-2xl bg-surface-2/60 ${className}`} />
)

export function Button({ variant = 'primary', className = '', ...p }) {
  const v = {
    primary: 'bg-gradient-to-r from-coral to-amber text-ink shadow-lg shadow-coral/25',
    ghost: 'bg-surface-2 text-ink',
    mint: 'bg-mint text-ink',
  }[variant]
  return (
    <motion.button whileTap={{ scale: 0.96 }}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold disabled:opacity-50 ${v} ${className}`}
      {...p} />
  )
}

export const Field = ({ label, ...p }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
    <input {...p} className="h-12 w-full rounded-2xl border border-surface-2 bg-surface px-4 text-[16px] text-ink outline-none placeholder:text-muted/60 focus:border-coral" />
  </label>
)

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="mx-5 mt-10 flex flex-col items-center gap-3 rounded-3xl bg-surface p-8 shadow-sm shadow-amber-900/10 text-center">
      <AlertTriangle className="text-amber" />
      <p className="text-sm text-muted">{message}</p>
      {onRetry && <Button variant="ghost" onClick={onRetry} className="h-10">Try again</Button>}
    </div>
  )
}

export function Empty({ emoji, title, body, children }) {
  return (
    <div className="mx-5 mt-8 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-surface-2 p-8 text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
      {children}
    </div>
  )
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-surface p-5 shadow-2xl pb-8"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => i.offset.y > 120 && onClose()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-surface-2" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-extrabold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-full bg-surface-2 p-2"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
