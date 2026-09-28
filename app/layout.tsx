import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/supabase/server';
import { logout } from './login/actions';

export const metadata: Metadata = { title: 'Discovery CRM', robots: { index: false, follow: false } };

const NAV = [
  ['/', 'Dashboard'],
  ['/pipeline', 'Pipeline'],
  ['/interviews', 'Interviews'],
  ['/observations', 'Observations'],
  ['/clusters', 'Clusters'],
  ['/data', 'Import / Export'],
] as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <html lang="en">
      <body>
        {user && (
          <header className="border-b border-slate-200 bg-white">
            <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
              <span className="font-semibold">Discovery CRM</span>
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="text-slate-600 hover:text-indigo-600">{label}</Link>
              ))}
              <form action={logout} className="ml-auto flex items-center gap-2 text-slate-500">
                <span className="hidden sm:inline">{user.email}</span>
                <button className="btn-ghost">Log out</button>
              </form>
            </nav>
          </header>
        )}
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
