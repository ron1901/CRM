'use client';
import Papa from 'papaparse';
import { useState, useTransition } from 'react';
import { importContacts, type ImportResult } from '@/app/data/actions';
import { normalizeContact } from '@/lib/contactCsv';

type Parsed = { raw: Record<string, unknown>; name: string | null; company: string | null; status: string | null; errors: string[] };

export function ContactImport() {
  const [rows, setRows] = useState<Parsed[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const valid = rows.filter((r) => r.errors.length === 0);

  function onFile(file: File) {
    setResult(null);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (res) =>
        setRows(
          res.data.map((raw) => {
            const { row, errors } = normalizeContact(raw);
            return { raw, name: row.fields.name, company: row.fields.company, status: row.fields.status, errors };
          }),
        ),
    });
  }

  return (
    <div className="space-y-3">
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {rows.length > 0 && (
        <>
          <p>
            {rows.length} rows · <span className="text-emerald-300">{valid.length} valid</span>
            {rows.length - valid.length > 0 && <span className="text-rose-300"> · {rows.length - valid.length} with errors (will be skipped)</span>}
          </p>
          <div className="max-h-80 overflow-auto rounded border">
            <table className="tbl">
              <thead><tr><th>Row</th><th>Name</th><th>Company</th><th>Status</th><th>Problems</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.errors.length ? 'bg-rose-500/10' : ''}>
                    <td>{i + 2}</td><td>{r.name}</td><td>{r.company}</td><td>{r.status}</td>
                    <td className="text-xs text-rose-300">{r.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn"
            disabled={pending || valid.length === 0}
            onClick={() => start(async () => { setResult(await importContacts(valid.map((v) => v.raw))); setRows([]); })}
          >
            {pending ? 'Importing…' : `Import ${valid.length} valid rows`}
          </button>
        </>
      )}
      {result && (
        <div className={`rounded p-2 ${result.error ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
          {result.error ?? `Imported ${result.inserted} new, updated ${result.updated}.`}
          {!!result.skipped?.length && (
            <ul className="mt-1 list-disc pl-5 text-amber-200">{result.skipped.map((s) => <li key={s}>{s}</li>)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
