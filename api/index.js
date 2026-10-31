import express from 'express'

const app = express()
app.use(express.json())

app.get('/api/health', async (req, res) => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return res.json({ ok: true, supabase: 'not configured' })
  try {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } })
    res.json({ ok: true, supabase: r.ok ? 'connected' : `error ${r.status}` })
  } catch (e) {
    res.status(500).json({ ok: false, supabase: String(e) })
  }
})

export default app
