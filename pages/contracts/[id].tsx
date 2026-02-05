import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

/**
 * Contract dashboard page.
 *
 * This page lists all milestones associated with a given contract and exposes
 * actions based on the logged‑in user's role and relationship to the contract.
 *
 * Clients can fund a milestone (deposit funds into escrow) and release
 * payment once work is delivered. Freelancers can submit work when a
 * milestone has been funded. These actions update the milestone status in
 * the `public.milestones` table accordingly.
 */
export default function ContractDashboard() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  // Use Supabase client without providing a generic Database type.  If you
  // generated types via supabase codegen, you can import them here and
  // replace `any` accordingly.  For this example we leave it untyped.
  const supabase = useSupabaseClient();
  const session = useSession();

  // Local state for contract, milestones and profile
  const [contract, setContract] = useState<any | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Fetch contract and milestones once contract ID and session are ready
  useEffect(() => {
    if (id && session) {
      fetchProfile();
      fetchContractAndMilestones();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session]);

  /**
   * Load the current user's profile.  We store the user's role and
   * identifier in the `profiles` table separate from the built‑in auth
   * schema.  This enables role‑based logic on the frontend.
   */
  async function fetchProfile() {
    const user = session?.user;
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('Error loading profile:', error.message);
    }
    setProfile(data);
  }

  /**
   * Retrieve the contract record along with its milestones.  We keep
   * contract details in state to verify that the current user is either
   * the client or freelancer associated with the contract.
   */
  async function fetchContractAndMilestones() {
    setLoading(true);
    setError(null);
    try {
      // Fetch the contract record
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();
      if (contractError) throw contractError;
      setContract(contractData);

      // Fetch milestones associated with this contract, ordered by creation
      const { data: milestonesData, error: milestoneError } = await supabase
        .from('milestones')
        .select('*')
        .eq('contract_id', id)
        .order('created_at', { ascending: true });
      if (milestoneError) throw milestoneError;
      setMilestones(milestonesData || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Perform a status update on a milestone.  Accepts the milestone ID and
   * the new status string.  After updating, milestones are re‑fetched
   * to reflect the latest state.  A loading indicator is toggled during
   * the operation to prevent multiple simultaneous updates.
   */
  async function updateMilestoneStatus(milestoneId: string, newStatus: string) {
    setActionLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('milestones')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', milestoneId);
      if (updateError) throw updateError;
      // Reload milestones to reflect changes
      await fetchContractAndMilestones();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Milestone шинэчлэхэд алдаа гарлаа.');
    } finally {
      setActionLoading(false);
    }
  }

  // Handler wrappers for readability
  const handleFund = (mid: string) => updateMilestoneStatus(mid, 'funded');
  const handleRelease = (mid: string) => updateMilestoneStatus(mid, 'released');
  const handleSubmit = (mid: string) => updateMilestoneStatus(mid, 'in_review');

  // Simple role checks for conditional rendering
  const isClient = profile?.role === 'client' && contract?.client_id === profile?.id;
  const isFreelancer = profile?.role === 'freelancer' && contract?.freelancer_id === profile?.id;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Уншиж байна...</p>
      </div>
    );
  }

  // Authorization: ensure the user is part of the contract
  if (!contract || (!isClient && !isFreelancer)) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold mb-4">Нэвтрэх эрх олдоогүй</h2>
        <p>Та энэ гэрээтэй холбогдоогүй эсвэл нэвтрээгүй байна.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Гэрээний мэдээлэл</h1>
      {/* Contract summary */}
      <div className="bg-white shadow rounded-lg p-4 mb-8">
        <h2 className="text-xl font-semibold mb-2">{contract?.title || 'Milestone гэрээ'}</h2>
        <p className="text-gray-600 mb-1"><span className="font-semibold">Ажлын нэр:</span> {contract?.project_title || contract?.title || ''}</p>
        <p className="text-gray-600 mb-1"><span className="font-semibold">Нийт дүн:</span> {contract?.total_amount}</p>
        <p className="text-gray-600"><span className="font-semibold">Төлөв:</span> {contract?.status}</p>
      </div>
      {error && (
        <div className="mb-4 text-red-600">{error}</div>
      )}
      <h2 className="text-xl font-semibold mb-4">Milestones</h2>
      {milestones.length === 0 && (
        <p className="text-gray-600">Энэ гэрээнд хамаарах milestone байхгүй.</p>
      )}
      <div className="space-y-4">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="bg-white shadow border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="text-lg font-semibold mb-1">{m.title || m.name}</h3>
              <p className="text-gray-600 mb-1">{m.description}</p>
              <p className="text-gray-600 mb-1">Дүн: <span className="font-semibold">{m.amount}</span></p>
              <p className="text-gray-600">Төлөв: <span className="font-semibold capitalize">{m.status}</span></p>
            </div>
            <div className="mt-3 md:mt-0 md:ml-4 flex space-x-2">
              {/* Client actions */}
              {isClient && m.status === 'pending' && (
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  onClick={() => handleFund(m.id)}
                  disabled={actionLoading}
                >
                  Fund Milestone
                </button>
              )}
              {isClient && (m.status === 'funded' || m.status === 'in_review') && (
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                  onClick={() => handleRelease(m.id)}
                  disabled={actionLoading}
                >
                  Release Payment
                </button>
              )}
              {/* Freelancer actions */}
              {isFreelancer && m.status === 'funded' && (
                <button
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                  onClick={() => handleSubmit(m.id)}
                  disabled={actionLoading}
                >
                  Submit Work
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
