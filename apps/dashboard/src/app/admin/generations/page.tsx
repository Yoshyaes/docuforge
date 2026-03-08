import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { getCurrentUser, getPlanLimit } from '@/lib/data';
import { GenerationsClient } from './generations-client';

export default async function AdminGenerationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'admin') redirect('/');

  const limit = getPlanLimit(user.plan);

  return (
    <div className="flex min-h-screen">
      <Sidebar usageCount={0} usageLimit={limit} isAdmin />
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-[22px] font-bold text-text-primary tracking-tight mb-6">
          All Generations
        </h1>
        <GenerationsClient />
      </main>
    </div>
  );
}
