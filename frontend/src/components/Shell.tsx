'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getUser, logout, roleLabel, SessionUser } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cases', label: 'Casos' },
  { href: '/audit', label: 'Auditoria', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/admin', label: 'Administracao', roles: ['ADMIN'] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          EVIDENCE<span>CHAIN</span>
        </div>
        {NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role))).map((n) => (
          <Link key={n.href} href={n.href} className={pathname.startsWith(n.href) ? 'active' : ''}>
            {n.label}
          </Link>
        ))}
        <div className="spacer" />
        {user && (
          <div className="who">
            <b>{user.name}</b>
            {roleLabel[user.role]}
          </div>
        )}
        <button className="logout" onClick={logout}>
          Terminar sessao
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
