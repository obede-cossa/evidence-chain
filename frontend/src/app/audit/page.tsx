'use client';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { api, fmtDate } from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/audit').then(setLogs).catch((e) => setError(e.message));
  }, []);

  return (
    <Shell>
      <div className="eyebrow">Conformidade</div>
      <h1>Auditoria</h1>
      {error && <div className="error">{error}</div>}
      <table>
        <thead>
          <tr>
            <th>Quando</th>
            <th>Utilizador</th>
            <th>Accao</th>
            <th>Entidade</th>
            <th>Id</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{fmtDate(l.timestamp)}</td>
              <td>{l.user?.name ?? '—'}</td>
              <td className="mono" style={{ fontSize: 12.5 }}>{l.action}</td>
              <td>{l.entity}</td>
              <td className="mono" style={{ fontSize: 12 }}>{l.entityId.slice(0, 8)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
