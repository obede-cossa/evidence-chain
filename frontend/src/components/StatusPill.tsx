export function StatusPill({ status }: { status?: string | null }) {
  if (!status) return <span className="pill neutral">SEM REGISTO</span>;
  const label =
    status === 'CONFIRMED' ? 'CONFIRMADA' : status === 'PENDING' ? 'PENDENTE' : 'FALHOU';
  return <span className={'pill ' + status}>{label}</span>;
}
