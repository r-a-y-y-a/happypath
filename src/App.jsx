import { useEffect, useState } from 'react'

export default function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealth({ ok: false, error: String(e) }))
  }, [])

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold">happypath</h1>
      <p className="text-slate-400">Plan the day. Catch the moment.</p>
      <pre className="text-xs text-left bg-slate-800 rounded-lg p-3">
        {health ? JSON.stringify(health, null, 2) : 'checking api...'}
      </pre>
    </main>
  )
}
