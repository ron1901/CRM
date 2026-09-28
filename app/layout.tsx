import './globals.css';
import type { Metadata } from 'next';
import { Exo_2, Orbitron, Space_Grotesk } from 'next/font/google';
import { db } from '@/lib/supabase/server';
import { NavLinks } from '@/components/NavLinks';
import { logout } from './login/actions';

const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans' });
const display = Exo_2({ subsets: ['latin'], variable: '--font-display' });
const logo = Orbitron({ subsets: ['latin'], variable: '--font-logo' });

export const metadata: Metadata = { title: 'Discovery CRM', robots: { index: false, follow: false } };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${logo.variable}`}>
      <body className="font-sans">
        {user && (
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2.5">
              <span className="mr-3 flex items-center gap-2 font-logo text-sm font-bold tracking-[0.2em]">
                <span className="h-2.5 w-2.5 rotate-45 bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">DISCOVERY</span>
              </span>
              <NavLinks />
              <form action={logout} className="ml-auto flex items-center gap-2 text-slate-400">
                <span className="hidden text-xs sm:inline">{user.email}</span>
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
