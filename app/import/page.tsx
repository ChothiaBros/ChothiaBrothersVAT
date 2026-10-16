'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { exportMonth, importWorkbook } from '@/lib/excel';
import { sameInvoice, zar, type Entry } from '@/lib/vat';

export default function ImportPage() {
  const { entries, sales, month, addMany } = useStore();
  const [res, setRes] = useState<{ added: number; dup: number; skipped: string[]; sales: number } | null>(null);
  const [err, setErr] = useState('');

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr(''); setRes(null);
    try {
      const imp = importWorkbook(await f.arrayBuffer());
      const fresh: Entry[] = []; let dup = 0;
      for (const e of imp.entries) {
        if ([...entries, ...fresh].some(x => sameInvoice(e, x))) dup++; else fresh.push(e);
      }
      if (!fresh.length && !Object.keys(imp.sales).length && !dup) return setErr('Nothing readable was found. The file needs the tabs SHOP PURCHASES, OPERATING EXP & DEBIT ORDERS and IMPROVEMENTS as in your VAT sheet.');
      addMany(fresh, imp.sales);
      setRes({ added: fresh.length, dup, skipped: imp.skipped, sales: Object.keys(imp.sales).length });
    } catch (e) { setErr(`Could not read that file: ${(e as Error).message}`); }
  }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Import / export</h2>
      <section className="card p-4">
        <h3 className="font-semibold">Import an existing VAT workbook</h3>
        <p className="mb-3 text-sm opacity-70">Choose a file like AUGUST_VAT.xlsx. Invoices already captured (same supplier and invoice number) are skipped, not doubled. Rows it cannot read are listed, never guessed.</p>
        <input type="file" accept=".xlsx,.xls" className="input" onChange={e => onFile(e.target.files?.[0])} />
        {err && <p className="mt-3 rounded-lg bg-red-100 p-2 text-sm text-red-800">{err}</p>}
        {res && (
          <div className="mt-3 rounded-lg bg-green-100 p-3 text-sm text-green-900">
            Added {res.added} invoice{res.added === 1 ? '' : 's'}{res.sales ? ` and the month's sales figures` : ''}. {res.dup ? `${res.dup} already captured, skipped. ` : ''}
            {res.skipped.length > 0 && <ul className="mt-1 list-disc pl-5 text-amber-900">{res.skipped.map(s => <li key={s}>{s}</li>)}</ul>}
          </div>
        )}
      </section>
      <section className="card p-4">
        <h3 className="font-semibold">Export</h3>
        <p className="mb-3 text-sm opacity-70">Downloads the selected month ({month}) in the same layout as your sheet, with live formulas. Sales VAT currently {zar(sales[month]?.vat ?? 0)}.</p>
        <button className="btn" onClick={() => exportMonth(month, entries, sales[month] ?? { gross: 0, vat: 0, zero: 0 })}>Download Excel for {month}</button>
      </section>
      <p className="text-xs opacity-60">Data is kept in this browser only for now. Export regularly until the shared database is switched on.</p>
    </div>
  );
}
