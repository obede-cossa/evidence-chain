'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { HashChip } from '@/components/HashChip';
import { StatusPill } from '@/components/StatusPill';
import { api, fmtDate, getUser, roleLabel } from '@/lib/api';

export default function EvidenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ev, setEv] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [reason, setReason] = useState('');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const user = typeof window !== 'undefined' ? getUser() : null;

  const load = useCallback(() => {
    api('/evidences/' + id).then(setEv).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    api('/users').then(setUsers).catch(() => {});
  }, [load]);

  const isCustodian = ev && user && (ev.currentCustodianId === user.id || user.role === 'ADMIN');
  const canRetry = user && ['ADMIN', 'SUPERVISOR'].includes(user.role);

  async function verify() {
    setBusy('verify');
    setError('');
    try {
      setVerifyResult(await api('/evidences/' + id + '/verify', { method: 'POST' }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function transfer() {
    if (!toUserId || !reason) {
      setError('Seleccione o destinatario e indique o motivo');
      return;
    }
    setBusy('transfer');
    setError('');
    try {
      await api('/evidences/' + id + '/transfer', {
        method: 'POST',
        body: JSON.stringify({ toUserId, reason }),
      });
      setToUserId('');
      setReason('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function newVersion() {
    if (!versionFile) {
      setError('Seleccione o ficheiro da nova versao');
      return;
    }
    setBusy('version');
    setError('');
    try {
      const form = new FormData();
      form.append('file', versionFile);
      const created = await api('/evidences/' + id + '/version', { method: 'POST', body: form });
      window.location.href = '/evidences/' + created.id;
    } catch (e: any) {
      setError(e.message);
      setBusy('');
    }
  }

  async function retry(txId: string) {
    setBusy('retry');
    try {
      await api('/blockchain/transactions/' + txId + '/retry', { method: 'POST' });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  if (!ev)
    return (
      <Shell>
        {error ? <div className="error">{error}</div> : <p>A carregar…</p>}
      </Shell>
    );

  const lastTx = ev.transactions[0];

  return (
    <Shell>
      <div className="eyebrow">
        <Link href={'/cases/' + ev.case.id}>{ev.case.number}</Link> / Evidencia
      </div>
      <h1>
        {ev.name} <span className="pill neutral">v{ev.version}</span>
      </h1>
      {error && <div className="error">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="card">
            <div className="eyebrow">Identidade criptografica</div>
            <p style={{ margin: '8px 0 4px' }}>
              <HashChip hash={ev.sha256} full />
            </p>
            <div className="t-meta" style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
              SHA-256 · {ev.type} · {(ev.sizeBytes / 1024).toFixed(1)} KB · registada em{' '}
              {fmtDate(ev.createdAt)} por {ev.createdBy.name}
            </div>
            <div style={{ marginTop: 10 }}>
              Registo blockchain: <StatusPill status={lastTx?.status} />{' '}
              {lastTx?.txHash && <HashChip hash={lastTx.txHash} />}
            </div>
            {ev.parent && (
              <div style={{ marginTop: 8, fontSize: 13.5 }}>
                Substitui a <Link href={'/evidences/' + ev.parent.id}>versao v{ev.parent.version}</Link>
              </div>
            )}
            {ev.versions.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13.5 }}>
                Versoes posteriores:{' '}
                {ev.versions.map((v: any) => (
                  <Link key={v.id} href={'/evidences/' + v.id} style={{ marginRight: 8 }}>
                    v{v.version}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="eyebrow">Cadeia de custodia</div>
            <ul className="timeline" style={{ marginTop: 12 }}>
              <li>
                <div className="t-title">Registo inicial — {ev.createdBy.name}</div>
                <div className="t-meta">{fmtDate(ev.createdAt)}</div>
              </li>
              {ev.transfers.map((t: any) => (
                <li key={t.id}>
                  <div className="t-title">
                    {t.fromUser.name} → {t.toUser.name}
                  </div>
                  <div className="t-meta">
                    {roleLabel[t.toUser.role]} · {t.reason} · {fmtDate(t.transferredAt)}
                    {t.txHash && (
                      <>
                        {' '}· <HashChip hash={t.txHash} />
                      </>
                    )}
                  </div>
                </li>
              ))}
              <li>
                <div className="t-title">Custodiante actual: {ev.currentCustodian.name}</div>
                <div className="t-meta">{roleLabel[ev.currentCustodian.role]}</div>
              </li>
            </ul>
          </div>

          <div className="card">
            <div className="eyebrow">Transaccoes on-chain</div>
            <table style={{ border: 'none', marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Tx hash</th>
                  <th>Bloco</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ev.transactions.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.type === 'REGISTER' ? 'Registo' : 'Transferencia'}</td>
                    <td>
                      <StatusPill status={t.status} />
                      {t.error && (
                        <div style={{ fontSize: 12, color: 'var(--err)' }}>{t.error}</div>
                      )}
                    </td>
                    <td>{t.txHash ? <HashChip hash={t.txHash} /> : '—'}</td>
                    <td>{t.blockNumber ?? '—'}</td>
                    <td>
                      {t.status === 'FAILED' && canRetry && (
                        <button className="ghost" disabled={busy === 'retry'} onClick={() => retry(t.id)}>
                          Repetir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="card">
            <div className="eyebrow">Verificacao de integridade</div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
              Recalcula o hash do ficheiro e compara com a base de dados e com o smart contract.
            </p>
            <button className="primary" disabled={busy === 'verify'} onClick={verify}>
              {busy === 'verify' ? 'A verificar…' : 'Verificar agora'}
            </button>
            {verifyResult && (
              <div className="verify-result">
                <div className="row">
                  <span>Ficheiro ↔ Base de dados</span>
                  <StatusPill status={verifyResult.fileMatchesDb ? 'CONFIRMED' : 'FAILED'} />
                </div>
                <div className="row">
                  <span>Base de dados ↔ Blockchain</span>
                  <StatusPill
                    status={
                      !verifyResult.chain.available
                        ? 'PENDING'
                        : verifyResult.chain.match
                        ? 'CONFIRMED'
                        : 'FAILED'
                    }
                  />
                </div>
                <div className="row" style={{ fontWeight: 700 }}>
                  <span>Integridade global</span>
                  <StatusPill status={verifyResult.integrity ? 'CONFIRMED' : 'FAILED'} />
                </div>
                {verifyResult.chain.error && (
                  <div className="error">{verifyResult.chain.error}</div>
                )}
              </div>
            )}
          </div>

          {isCustodian && (
            <div className="card">
              <div className="eyebrow">Transferir custodia</div>
              <form
                className="stack"
                style={{ marginTop: 10 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  transfer();
                }}
              >
                <div>
                  <label>Destinatario</label>
                  <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {users
                      .filter((u) => u.id !== ev.currentCustodianId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({roleLabel[u.role]})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label>Motivo</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Envio para pericia" />
                </div>
                <button className="primary" disabled={busy === 'transfer'}>
                  {busy === 'transfer' ? 'A transferir…' : 'Transferir'}
                </button>
              </form>
            </div>
          )}

          {isCustodian && (
            <div className="card">
              <div className="eyebrow">Nova versao</div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                A evidencia original e imutavel. A nova versao recebe novo id, novo hash e novo
                registo on-chain, ligada a esta.
              </p>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  newVersion();
                }}
              >
                <input type="file" onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)} />
                <button className="primary" disabled={busy === 'version'}>
                  {busy === 'version' ? 'A registar…' : 'Criar nova versao'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
