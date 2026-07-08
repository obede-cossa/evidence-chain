export function HashChip({ hash, full = false }: { hash: string; full?: boolean }) {
  const text = full || hash.length <= 20 ? hash : hash.slice(0, 10) + '…' + hash.slice(-8);
  return (
    <span className="hash" title={hash}>
      {text}
    </span>
  );
}
