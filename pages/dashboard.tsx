// pages/dashboard.tsx
// -----------------------------------------------------------------------------
// This page displays a simple dashboard after the user logs in.  It queries
// Supabase for the current user's profile and shows a different set of
// navigation options depending on whether the role is client (Захиалагч) or
// freelancer (Гүйцэтгэгч).  In a real application you would expand these
// components into separate pages and secure access using middleware or
// route guards.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../utils/supabaseClient'

type Role = 'client' | 'freelancer' | 'admin'

const ClientDashboard = () => (
  <div className="space-y-4">
    <h1 className="text-2xl font-semibold">Захиалагчийн самбар</h1>
    <ul className="list-disc list-inside space-y-2">
      <li>Шинэ төсөл нэмэх</li>
      <li>Санал ирүүлсэн freelanceryг хянах</li>
      <li>Гэрээ, milestone болон төлбөрүүдийг удирдах</li>
    </ul>
  </div>
)

const FreelancerDashboard = () => (
  <div className="space-y-4">
    <h1 className="text-2xl font-semibold">Гүйцэтгэгчийн самбар</h1>
    <ul className="list-disc list-inside space-y-2">
      <li>Нээлттэй төслүүдэд санал илгээх</li>
      <li>Илгээсэн саналынхаа явцыг харах</li>
      <li>Гэрээ, milestone болон цагийн бүртгэлийг хянах</li>
    </ul>
  </div>
)

const Dashboard = () => {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      // Retrieve current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/signup')
        return
      }
      // Fetch the profile to get the role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profileError) {
        console.error(profileError)
      } else {
        setRole(profile?.role as Role)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [router])

  if (loading) {
    return <p>Уншиж байна...</p>
  }
  if (!role) {
    return <p>Хэрэглэгчийн мэдээлэл олдсонгүй.</p>
  }
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {role === 'client' && <ClientDashboard />}
      {role === 'freelancer' && <FreelancerDashboard />}
      {role === 'admin' && (
        <div>
          <h1 className="text-2xl font-semibold">Админы самбар</h1>
          <p>Удирдлагын сонголтууд энд байрлана.</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard
