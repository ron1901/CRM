import { ContactImport } from '@/components/ContactImport';
import { CONTACT_CSV_COLUMNS } from '@/lib/contactCsv';

export default function DataPage() {
  return (
    <div className="space-y-4">
      <h1 className="h1">Import / Export</h1>
      <div className="card space-y-2">
        <h2 className="h2">Export CSV</h2>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost" href="/api/export/contacts">Contacts</a>
          <a className="btn-ghost" href="/api/export/interviews">Interviews</a>
          <a className="btn-ghost" href="/api/export/interviews?transcripts=1">Interviews + transcripts</a>
          <a className="btn-ghost" href="/api/export/observations">Observations</a>
          <a className="btn-ghost" href="/api/export/clusters">Clusters</a>
        </div>
        <p className="text-xs text-slate-400">Exports contain personal data. Keep downloaded files out of shared drives and delete them when done.</p>
      </div>
      <div className="card space-y-2">
        <h2 className="h2">Import contacts</h2>
        <p className="text-slate-300">
          CSV with a header row. Recognised columns: <code className="text-xs">{CONTACT_CSV_COLUMNS.join(', ')}</code>. Only <b>name</b> is required.{' '}
          <a className="link" href="/api/export/contacts-template">Download empty template</a>.
        </p>
        <ul className="list-disc pl-5 text-xs text-slate-400">
          <li>Pick-list values must match the app’s options (case-insensitive), e.g. status “Contacted”, owner “Ronica”.</li>
          <li>Rows with an <b>id</b> of an existing contact update that contact, so you can export, edit in a spreadsheet, and re-import.</li>
          <li>New rows whose LinkedIn URL already exists are skipped as duplicates.</li>
          <li><b>referred_by_name</b> is matched to an existing contact by exact name.</li>
        </ul>
        <ContactImport />
      </div>
    </div>
  );
}
