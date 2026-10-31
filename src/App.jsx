import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Layout from './components/Layout'
import SignIn from './pages/SignIn'
import Join from './pages/Join'
import Day, { Home } from './pages/Day'
import Profile, { PostDetail } from './pages/Profile'
import { Skeleton } from './components/ui'

function Gate({ children }) {
  const { userId, profile, loading } = useAuth()
  if (loading) return <div className="p-5"><Skeleton className="h-40" /></div>
  if (!userId || !profile) return <SignIn />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join/:dayId" element={<Join />} />
          <Route element={<Gate><Layout /></Gate>}>
            <Route path="/" element={<Home />} />
            <Route path="/day/:id" element={<Day />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/profile/:id/post/:postId" element={<PostDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
