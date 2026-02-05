// pages/jobs/[id].tsx
// -----------------------------------------------------------------------------
// Dynamic job details page.  When a freelancer clicks on a job in the browse
// list, they are taken to this route which loads the job information based on
// the ID parameter.  It also provides a form for submitting a proposal
// consisting of a bid amount and cover letter.  Only users with the
// `freelancer` role can see the form.  Proposals are stored in the
// `public.proposals` table with references to `project_id` and `freelancer_id`.

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabaseClient'

interface JobDetail {
  id: string
  title: string
  description: string | null
  budget: number | null
  category_id: string | null
  created_at: string
  client_id: string
  job_categories?: { name: string } | null
}

const JobDetailsPage = () => {
  const router = useRouter()
  const { id } = router.query

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loadingJob, setLoadingJob] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // If id is not ready (because of client side routing), wait
    if (!id || typeof id !== 'string') return

    const fetchJob = async () => {
      // Fetch job details and join category name
      const { data: jobData, error: jobError } = await supabase
        .from('projects')
        .select('id, title, description, budget, category_id, created_at, client_id, job_categories(name)')
        .eq('id', id)
        .single()
      if (jobError) {
        console.error(jobError)
        setJob(null)
      } else {
        setJob(jobData as JobDetail)
      }

      // Fetch user role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (!profileError && profile) {
          setRole(profile.role)
        }
      }
      setLoadingJob(false)
    }
    fetchJob()
  }, [id])

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setMessage('Үнийн санал буруу байна.')
      return
    }
    if (!job) {
      setMessage('Ажил олдсонгүй')
      return
    }
    setSubmitting(true)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setMessage('Нэвтрэх мэдээлэл алга байна.')
      setSubmitting(false)
      return
    }
    // Insert proposal
    const { error: proposalError } = await supabase.from('proposals').insert({
      project_id: job.id,
      freelancer_id: user.id,
      proposed_budget: parseFloat(bidAmount),
      cover_letter: coverLetter,
      status: 'pending',
    })
    if (proposalError) {
      setMessage(proposalError.message)
    } else {
      setMessage('Санал амжилттай илгээгдлээ!')
      setBidAmount('')
      setCoverLetter('')
    }
    setSubmitting(false)
  }

  if (loadingJob) {
    return <p className="p-4">Ажлын мэдээллийг ачааллаж байна...</p>
  }
  if (!job) {
    return <p className="p-4">Ажил олдсонгүй.</p>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{job.title}</h1>
      <p className="text-gray-700 mb-2"><span className="font-semibold">Төлөвлөсөн үнэ:</span> {job.budget?.toLocaleString()}₮</p>
      {job.job_categories?.name && (
        <p className="text-gray-700 mb-2"><span className="font-semibold">Ангилал:</span> {job.job_categories.name}</p>
      )}
      <p className="text-gray-700 mb-6 whitespace-pre-wrap">{job.description}</p>

      {role === 'freelancer' ? (
        <div className="bg-gray-50 p-4 rounded-md shadow">
          <h2 className="text-xl font-semibold mb-4">Санал илгээх</h2>
          <form onSubmit={handleSubmitProposal} className="space-y-4">
            <div>
              <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">
                Үнийн санал (₮)
              </label>
              <input
                id="bidAmount"
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min="1"
                step="0.01"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700">
                Тайлбар
              </label>
              <textarea
                id="coverLetter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {message && <p className="text-sm text-blue-600">{message}</p>}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {submitting ? 'Илгээж байна...' : 'Санал илгээх'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <p className="text-gray-500">Санал илгээх боломж зөвхөн гүйцэтгэгчдэд зориулагдсан.</p>
      )}
    </div>
  )
}

export default JobDetailsPage
