'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  ['/', 'Dashboard'],
  ['/pipeline', 'Pipeline'],
  ['/interviews', 'Interviews'],
  ['/observations', 'Observations'],
  ['/clusters', 'Clusters'],
  ['/data', 'Import / Export'],
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <>
      {NAV.map(([href, label]) => {
        const active = href === '/' ? path === '/' : path.startsWith(href) || (href === '/pipeline' && path.startsWith('/contacts'));
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1 transition ${
              active
                ? 'bg-gradient-to-r from-cyan-500/25 to-fuchsia-500/25 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15),0_0_16px_-4px_rgba(34,211,238,0.6)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
