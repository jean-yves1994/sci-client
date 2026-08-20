'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';

export default function IndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [user, loading, router]);

  return <Spinner />;
}
