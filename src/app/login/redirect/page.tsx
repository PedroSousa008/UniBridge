import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ROLE_HOME } from '@/lib/roles';

export default async function LoginRedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect('/login');
  redirect(ROLE_HOME[session.user.role]);
}
