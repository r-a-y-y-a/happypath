export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()
export const fmtRange = (n) => `${fmtTime(n.starts_at)} - ${fmtTime(n.ends_at)}`
export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
export const localDate = (d = new Date()) => d.toLocaleDateString('en-CA')
export const ago = (iso, t = Date.now()) => {
  const s = Math.max(0, (t - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return fmtDate(iso)
}
