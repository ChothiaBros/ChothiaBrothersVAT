'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { monthLabel } from '@/components/Shell';
import { EntryForm } from '@/components/EntryForm';
import { TABS, exclFor, periodOf, showDate, totals, vatFor, zar, type Tab } from '@/lib/vat';

export function PurchaseTab({ tab }: { tab: Tab }) {
  const { entries, month, remove } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const t = TABS.find(x => x.key === tab)!;
  const rows = entries.filter(e => e.tab === tab && periodOf(e) === month).sort((a, b) => a.date.localeCompare(b.date) || a.supplier.localeCompare(b.supplier));
  const tot = totals(rows);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-xl font-bold">{t.label}</h2><p className="text-sm opacity-70">{monthLabel(month)} · {rows.length} invoice{rows.length === 1 ? '' : 's'}</p></div>
        <Link href="/add" className="btn">+ Add invoice</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm num whitespace-nowrap">
          <thead><tr className="border-b border-border text-left text-xs uppercase opacity-70">
            {['Date', 'Supplier', 'Invoice', 'Incl.', 'VAT @ 15%', 'Excl.', 'Zero rated', 'Import VAT', ''].map((h, i) => <th key={i} className={`px-3 py-2 ${i > 2 ? 'text-right' : ''}`}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center opacity-60">No {t.label.toLowerCase()} captured for {monthLabel(month)}. This is a statement about this month, not about the supplier.</td></tr>}
            {rows.map(r => editing === r.id ? (
              <tr key={r.id}><td colSpan={9} className="p-3"><EntryForm initial={r} onDone={() => setEditing(null)} /></td></tr>
            ) : (
              <tr key={r.id} className="border-b border-border/60">
                <td className="px-3 py-2">{showDate(r.date)}</td><td className="px-3 py-2">{r.supplier}</td><td className="px-3 py-2">{r.invoice}</td>
                <td className="px-3 py-2 text-right">{r.incl ? zar(r.incl) : ''}</td><td className="px-3 py-2 text-right">{zar(vatFor(r))}</td><td className="px-3 py-2 text-right">{zar(exclFor(r))}</td>
                <td className="px-3 py-2 text-right">{r.zero ? zar(r.zero) : ''}</td><td className="px-3 py-2 text-right">{r.importVat ? zar(r.importVat) : ''}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button className="text-primary" onClick={() => setEditing(r.id)}>Edit</button>{' · '}
                  <button className="text-red-600" onClick={() => { if (confirm(`Delete ${r.supplier} ${r.invoice}?`)) remove(r.id); }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && <tfoot><tr className="font-bold">
            <td className="px-3 py-2" colSpan={3}>TOTAL</td><td className="px-3 py-2 text-right">{zar(tot.incl)}</td><td className="px-3 py-2 text-right">{zar(tot.vat)}</td><td className="px-3 py-2 text-right">{zar(tot.excl)}</td><td className="px-3 py-2 text-right">{zar(tot.zero)}</td><td className="px-3 py-2 text-right">{zar(tot.importVat)}</td><td />
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}
