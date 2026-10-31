import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { post } from '../lib/api'
import { ErrorState, Skeleton } from '../components/ui'
import SignIn from './SignIn'

export default function Join() {
  const { dayId } = useParams()
  const { userId, profile, loading } = useAuth()
  const nav = useNavigate()
  const [err, setErr] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (loading || !userId || !profile || ran.current) return
    ran.current = true
    post(`/days/${dayId}/join`).then(() => nav(`/day/${dayId}`, { replace: true })).catch((e) => setErr(e.message))
  }, [loading, userId, profile, dayId, nav])

  if (err) return <ErrorState message={err} />
  if (loading || (userId && profile)) return <div className="space-y-4 p-5"><Skeleton className="h-32" /><Skeleton className="h-28" /></div>
  return <SignIn heading="You're invited." sub="Pick a name to join." />
}
