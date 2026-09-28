'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Re-fetches the server-rendered page every few seconds while AI suggestions are being generated.
export function Poll({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
