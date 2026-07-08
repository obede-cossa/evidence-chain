'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('investigador@policia.gov.mz');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveSession(res.accessToken, res.user);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: 380 }}>
        <div className="eyebrow">Sistema de Gestao de Evidencias</div>
        <h1>
          Evidence<span style={{ color: 'var(--brand)' }}>Chain</span>
        </h1>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div>
            <label>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={loading}>
            {loading ? 'A autenticar…' : 'Entrar'}
          </button>
          <div className="notice">
            Contas de demonstracao (password123): admin@, investigador@, perito@,
            supervisor@policia.gov.mz
          </div>
        </form>
      </div>
    </div>
  );
}
