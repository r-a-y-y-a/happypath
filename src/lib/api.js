import { MOCK, supabase } from './supabase'
import { mockRequest } from './mock'

async function token() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

export async function api(method, path, body) {
  if (MOCK) return mockRequest(method, path, body)
  const t = await token()
  const res = await fetch('/api' + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const get = (p) => api('GET', p)
export const post = (p, b) => api('POST', p, b || {})
export const put = (p, b) => api('PUT', p, b)

export async function uploadPhoto(blob, userId) {
  if (MOCK) return URL.createObjectURL(blob)
  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from('posts').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

// Resize to about 1280px wide, return a JPEG blob.
export async function resizeImage(file, maxW = 1280) {
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file
  const scale = Math.min(1, maxW / bmp.width)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((r) => c.toBlob((b) => r(b || file), 'image/jpeg', 0.85))
}
