"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AIHelpPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the modern chat interface
    router.replace('/dashboard/parent/dash-chat');
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      color: 'var(--muted)',
      fontSize: 16
    }}>
      Redirecting to Dash Chat...
    </div>
  );
}
