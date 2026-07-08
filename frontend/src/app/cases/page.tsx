'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { api, fmtDate, getUser } from '@/lib/api';

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [error, setError] = useState('');
  const user = typeof window !== 'undefined' ? getUser() : null;
  const canCreate = user && ['ADMIN', 'INVESTIGATOR'].includes(user.role);

  useEffect(() => {
    api('/cases').then(setCases).catch((e) => setError(e.message));
  }, []);

  return (
    <Shell>
      <div className="eyebrow">Processos</div>
      <h1 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Casos
        {canCreate && (
          <Link href="/cases/new">
            <button className="primary">Novo caso</button>
          </Link>
        )}
      </h1>
      {error && <div className="error">{error}</div>}
      <table>
        <thead>
          <tr>
            <th>Numero</th>
            <th>Titulo</th>
            <th>Estado</th>
            <th>Evidencias</th>
            <th>Criado por</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="click" onClick={() => router.push('/cases/' + c.id)}>
              <td className="mono">{c.number}</td>
              <td>{c.title}</td>
              <td>
                <span className={'pill ' + (c.status === 'OPEN' ? 'CONFIRMED' : 'neutral')}>
                  {c.status === 'OPEN' ? 'ABERTO' : c.status === 'CLOSED' ? 'FECHADO' : 'ARQUIVADO'}
                </span>
              </td>
              <td>{c._count.evidences}</td>
              <td>{c.createdBy.name}</td>
              <td>{fmtDate(c.createdAt)}</td>
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={6}>Sem casos registados. Crie o primeiro caso para comecar.</td>
            </tr>
          )}
        </tbody>
      </table>
    </Shell>
  );
}
