import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { getCurrentUser, getPlanLimit } from '@/lib/data';
import { UserDetailClient } from './user-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'admin') redirect('/');

  const { id } = await params;
  const limit = getPlanLimit(user.plan);

  return (
    <div className="flex min-h-screen">
      <Sidebar usageCount={0} usageLimit={limit} isAdmin />
      <main className="flex-1 p-6 overflow-y-auto">
        <UserDetailClient userId={id} />
      </main>
    </div>
  );
}
