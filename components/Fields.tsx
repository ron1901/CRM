import type { ReactNode } from 'react';

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={'block ' + (className ?? '')}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Select({
  name,
  options,
  defaultValue,
  blank = true,
  required,
}: {
  name: string;
  options: readonly string[] | { value: string; label: string }[];
  defaultValue?: string | number | null;
  blank?: boolean;
  required?: boolean;
}) {
  return (
    <select name={name} className="input" defaultValue={defaultValue ?? ''} required={required}>
      {blank && <option value="">—</option>}
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        ),
      )}
    </select>
  );
}
