'use client';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { api, fmtDate } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <Shell>
      <div className="eyebrow">Visao geral</div>
      <h1>Dashboard</h1>
      {error && <div className="error">{error}</div>}
      {stats && (
        <>
          <div className="grid kpi">
            <div className="card">
              <div className="n">{stats.activeCases}</div>
              <div className="l">Casos activos</div>
            </div>
            <div className="card">
              <div className="n">{stats.totalEvidences}</div>
              <div className="l">Evidencias registadas</div>
            </div>
            <div className="card">
              <div className="n">{stats.totalTransfers}</div>
              <div className="l">Transferencias de custodia</div>
            </div>
            <div className="card">
              <div className="n" style={{ color: stats.failedTx > 0 ? 'var(--err)' : undefined }}>
                {stats.pendingTx + stats.failedTx}
              </div>
              <div className="l">Transaccoes pendentes/falhadas</div>
            </div>
          </div>
          <h2>Actividade recente</h2>
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Utilizador</th>
                <th>Accao</th>
                <th>Entidade</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentActivity.map((a: any) => (
                <tr key={a.id}>
                  <td>{fmtDate(a.timestamp)}</td>
                  <td>{a.user?.name ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{a.action}</td>
                  <td>{a.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Shell>
  );
}
