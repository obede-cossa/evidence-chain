'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';

export default function NewEvidencePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('FOTO');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!file) {
      setError('Seleccione um ficheiro');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('caseId', id);
      form.append('name', name || file.name);
      form.append('type', type);
      const created = await api('/evidences', { method: 'POST', body: form });
      router.push('/evidences/' + created.id);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="eyebrow">Processos / Nova evidencia</div>
      <h1>Registar evidencia</h1>
      <div className="card">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label>Ficheiro</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label>Nome descritivo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fotografia do local" />
          </div>
          <div>
            <label>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option>FOTO</option>
              <option>VIDEO</option>
              <option>DOCUMENTO</option>
              <option>AUDIO</option>
              <option>OUTRO</option>
            </select>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={loading}>
            {loading ? 'A calcular hash e registar na blockchain…' : 'Registar evidencia'}
          </button>
          <div className="notice">
            O SHA-256 do ficheiro e calculado no servidor e registado no smart contract. O hash
            nunca muda: alteracoes futuras criam uma nova versao com novo hash.
          </div>
        </form>
      </div>
    </Shell>
  );
}
