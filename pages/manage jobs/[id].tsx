// pages/manage-jobs/[id].tsx
// -----------------------------------------------------------------------------
// Proposal review page for a specific job.  This page lists all proposals
// submitted by freelancers for the given job and allows the client to hire a
// freelancer.  When the client clicks the 'Hire' button, a new contract is
// created in `public.contracts` and the project's status is updated to
// `in_progress`.

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabaseClient'

interface Proposal {
  id: string
  freelancer_id: string
  proposed_budget: number | null
  cover_letter: string | null
  status: string
  created_at: string
  profiles?: {
    full_name: string | null
    username: string | null
  } | null
}

interface Project {
  id: string
  title: string
  status: string
  client_id: string
  budget: number | null
}

const ReviewProposalsPage = () => {
  const router = useRouter()
  const { id } = router.query
  const [project, setProject] = useState<Project | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // id of proposal being processed

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    const fetchData = async () => {
      // Fetch user and role
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/signup')
        return
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profileError || !profile) {
        setRole(null)
        setLoading(false)
        return
      }
      setRole(profile.role)
      // Fetch project details
      const { data: proj, error: projError } = await supabase
        .from('projects')
        .select('id, title, status, client_id, budget')
        .eq('id', id)
        .single()
      if (projError || !proj) {
        setProject(null)
        setLoading(false)
        return
      }
      setProject(proj as Project)
      // Ensure user is the owner (client) of this project
      if (profile.role === 'client' && proj.client_id === user.id) {
        // Fetch proposals and join profiles of freelancers
        const { data: props, error: propsError } = await supabase
          .from('proposals')
          .select('id, freelancer_id, proposed_budget, cover_letter, status, created_at, profiles(full_name, username)')
          .eq('project_id', id)
          .order('created_at', { ascending: false })
        if (!propsError && props) {
          setProposals(props as Proposal[])
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [id, router])

  const handleHire = async (proposal: Proposal) => {
    setMessage(null)
    setActionLoading(proposal.id)
    try {
      if (!project) {
        setMessage('Ажил олдсонгүй')
        return
      }
      // Create contract
      const { error: insertError } = await supabase.from('contracts').insert({
        project_id: project.id,
        client_id: project.client_id,
        freelancer_id: proposal.freelancer_id,
        start_date: new Date().toISOString().split('T')[0],
        total_amount: proposal.proposed_budget ?? project.budget,
        status: 'active',
      })
      if (insertError) {
        setMessage(insertError.message)
        return
      }
      // Update project status to in_progress
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'in_progress' })
        .eq('id', project.id)
      if (updateError) {
        setMessage(updateError.message)
        return
      }
      // Optionally update proposal statuses
      await supabase
        .from('proposals')
        .update({ status: 'accepted' })
        .eq('id', proposal.id)
      await supabase
        .from('proposals')
        .update({ status: 'rejected' })
        .neq('id', proposal.id)
        .eq('project_id', project.id)
      setMessage('Гэрээ амжилттай үүсэв!')
      // Refresh proposals list and project status
      setProject({ ...project, status: 'in_progress' })
      setProposals((prev) => prev.map((p) => {
        if (p.id === proposal.id) return { ...p, status: 'accepted' }
        return { ...p, status: 'rejected' }
      }))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <p className="p-4">Уншиж байна...</p>
  }
  if (!project || role !== 'client') {
    return <p className="p-4">Энэ хуудас зөвхөн захиалагчдад зориулагдсан.</p>
  }
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{project.title}</h1>
      <p className="text-gray-600 mb-6">Төлөв: {project.status === 'open' ? 'Нээлттэй' : project.status === 'in_progress' ? 'Явцын шатанд' : project.status === 'completed' ? 'Дууссан' : 'Цуцлагдсан'}</p>
      {message && <div className="mb-4 text-green-600">{message}</div>}
      {proposals.length === 0 ? (
        <p>Энэ ажилд ирсэн санал байхгүй байна.</p>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="border rounded-lg p-4 shadow-sm bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-lg">{proposal.profiles?.full_name || proposal.profiles?.username || 'Нэргүй хэрэглэгч'}</h2>
                  <p className="text-sm text-gray-600">Үнийн санал: {proposal.proposed_budget?.toLocaleString()}₮</p>
                  <p className="text-xs text-gray-500">Илгээсэн: {new Date(proposal.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {proposal.status === 'pending' && (
                    <button
                      onClick={() => handleHire(proposal)}
                      disabled={!!actionLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      {actionLoading === proposal.id ? 'Илгээж байна...' : 'Hire'}
                    </button>
                  )}
                  {proposal.status === 'accepted' && <span className="text-green-600 font-semibold">Accepted</span>}
                  {proposal.status === 'rejected' && <span className="text-gray-500">Rejected</span>}
                </div>
              </div>
              <p className="mt-2 text-gray-700 whitespace-pre-wrap">{proposal.cover_letter}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReviewProposalsPage
