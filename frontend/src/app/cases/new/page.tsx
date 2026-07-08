'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';

export default function NewCasePage() {
  const router = useRouter();
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const created = await api('/cases', {
        method: 'POST',
        body: JSON.stringify({ number, title, description }),
      });
      router.push('/cases/' + created.id);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="eyebrow">Processos</div>
      <h1>Novo caso</h1>
      <div className="card">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label>Numero do processo</label>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="PRC-2026-001" />
          </div>
          <div>
            <label>Titulo</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label>Descricao</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={loading}>
            {loading ? 'A criar…' : 'Criar caso'}
          </button>
        </form>
      </div>
    </Shell>
  );
}
