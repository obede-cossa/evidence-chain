'use client';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { api, roleLabel } from '@/lib/api';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'INVESTIGATOR' });
  const [loading, setLoading] = useState(false);

  function load() {
    api('/users').then(setUsers).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function submit() {
    setError('');
    setOk('');
    setLoading(true);
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      setOk('Utilizador criado');
      setForm({ name: '', email: '', password: '', role: 'INVESTIGATOR' });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="eyebrow">Administracao</div>
      <h1>Utilizadores</h1>
      {error && <div className="error">{error}</div>}
      {ok && <div className="notice">{ok}</div>}
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Perfil</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="mono" style={{ fontSize: 13 }}>{u.email}</td>
                <td>{roleLabel[u.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card">
          <div className="eyebrow">Novo utilizador</div>
          <form
            className="stack"
            style={{ marginTop: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div>
              <label>Nome</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label>Perfil</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="INVESTIGATOR">Investigador</option>
                <option value="EXPERT">Perito</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <button className="primary" disabled={loading}>
              {loading ? 'A criar…' : 'Criar utilizador'}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
