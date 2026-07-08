'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { HashChip } from '@/components/HashChip';
import { StatusPill } from '@/components/StatusPill';
import { api, fmtDate, getUser } from '@/lib/api';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const user = typeof window !== 'undefined' ? getUser() : null;
  const canAdd = user && ['ADMIN', 'INVESTIGATOR', 'EXPERT'].includes(user.role);

  useEffect(() => {
    api('/cases/' + id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  return (
    <Shell>
      <div className="eyebrow">Processos / Detalhe</div>
      {error && <div className="error">{error}</div>}
      {data && (
        <>
          <h1 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span className="mono" style={{ color: 'var(--brand)' }}>{data.number}</span> — {data.title}
            </span>
            {canAdd && (
              <Link href={'/cases/' + id + '/new-evidence'}>
                <button className="primary">Nova evidencia</button>
              </Link>
            )}
          </h1>
          <div className="card" style={{ marginBottom: 18 }}>
            <p style={{ margin: 0 }}>{data.description}</p>
            <p className="t-meta" style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 0 }}>
              Criado por {data.createdBy.name} em {fmtDate(data.createdAt)}
            </p>
          </div>
          <h2>Evidencias ({data.evidences.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Versao</th>
                <th>SHA-256</th>
                <th>Custodiante</th>
                <th>Blockchain</th>
                <th>Registada em</th>
              </tr>
            </thead>
            <tbody>
              {data.evidences.map((ev: any) => (
                <tr key={ev.id} className="click" onClick={() => router.push('/evidences/' + ev.id)}>
                  <td>{ev.name}</td>
                  <td>v{ev.version}</td>
                  <td><HashChip hash={ev.sha256} /></td>
                  <td>{ev.currentCustodian.name}</td>
                  <td><StatusPill status={ev.transactions[0]?.status} /></td>
                  <td>{fmtDate(ev.createdAt)}</td>
                </tr>
              ))}
              {data.evidences.length === 0 && (
                <tr>
                  <td colSpan={6}>Sem evidencias neste caso.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </Shell>
  );
}
