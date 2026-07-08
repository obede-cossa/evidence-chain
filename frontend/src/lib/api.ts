export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INVESTIGATOR' | 'EXPERT' | 'SUPERVISOR';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const res = await fetch(API + path, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Sessao expirada');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Erro ' + res.status);
  }
  return data as T;
}

export const roleLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  INVESTIGATOR: 'Investigador',
  EXPERT: 'Perito',
  SUPERVISOR: 'Supervisor',
};

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-PT');
}
