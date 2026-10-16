'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { monthLabel } from '@/components/Shell';
import { exportMonth } from '@/lib/excel';
import { periodOf, parseMoney, report, zar, type Sales } from '@/lib/vat';

export default function Report() {
  const { entries, sales, month, setSales } = useStore();
  const saved: Sales = sales[month] ?? { gross: 0, vat: 0, zero: 0 };
  const [f, setF] = useState({ gross: '', vat: '', zero: '' });
  const [err, setErr] = useState('');
  useEffect(() => { setF({ gross: saved.gross ? String(saved.gross) : '', vat: saved.vat ? String(saved.vat) : '', zero: saved.zero ? String(saved.zero) : '' }); setErr(''); }, [month]); // eslint-disable-line
  const rows = entries.filter(e => periodOf(e) === month);
  const r = report(saved, rows);
  const known = sales[month] !== undefined;

  function commit() {
    const g = f.gross === '' ? 0 : parseMoney(f.gross), v = f.vat === '' ? 0 : parseMoney(f.vat), z = f.zero === '' ? 0 : parseMoney(f.zero);
    if (g == null || v == null || z == null) return setErr('A sales figure is not a number. Use a full stop for decimals.');
    setErr(''); setSales(month, { gross: g, vat: v, zero: z });
  }
  const Row = ({ l, a }: { l: string; a: ReturnType<typeof report>['shop'] }) => (
    <tr className="border-b border-border/60"><td className="px-3 py-2">{l}</td>{[a.incl, a.vat, a.excl, a.zero, a.importVat].map((x, i) => <td key={i} className="px-3 py-2 text-right">{zar(x)}</td>)}</tr>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-xl font-bold">VAT report</h2><p className="text-sm opacity-70">{monthLabel(month)}</p></div>
        <button className="btn" onClick={() => exportMonth(month, entries, saved)}>Download Excel</button>
      </div>

      <section className="card p-4">
        <h3 className="mb-3 font-semibold">Sales (output VAT)</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          {(['gross', 'vat', 'zero'] as const).map(k => (
            <div key={k}><label className="lbl">{k === 'gross' ? 'Gross (incl. VAT)' : k === 'vat' ? 'VAT on sales' : 'Zero rated'}</label>
              <input className="input num" inputMode="decimal" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} onBlur={commit} placeholder="0.00" /></div>
          ))}
          <div><label className="lbl">Net (excl.)</label><div className="input num bg-surface">{zar(saved.gross - saved.vat)}</div></div>
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        {!known && <p className="mt-2 text-sm text-amber-700">No sales figures entered for {monthLabel(month)} yet, so the result below treats sales VAT as R0.00.</p>}
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm num whitespace-nowrap">
          <thead><tr className="border-b border-border text-left text-xs uppercase opacity-70"><th className="px-3 py-2">Input</th>{['Incl.', 'VAT', 'Excl.', 'Zero rated', 'Import VAT'].map(h => <th key={h} className="px-3 py-2 text-right">{h}</th>)}</tr></thead>
          <tbody><Row l="Shop purchases" a={r.shop} /><Row l="Operating expenses" a={r.op} /><Row l="Improvements" a={r.imp} /></tbody>
        </table>
      </section>

      <section className={`card p-5 ${r.payable >= 0 ? 'border-primary' : 'border-green-600'}`}>
        <div className="text-xs font-semibold uppercase opacity-70">{r.payable >= 0 ? 'VAT payable to SARS' : 'VAT claimable from SARS'}</div>
        <div className="text-3xl font-bold num">{zar(Math.abs(r.payable))}</div>
        <p className="mt-2 text-sm opacity-70 num">Sales VAT {zar(saved.vat)} − (input VAT {zar(r.inputVat)} + import VAT {zar(r.importVat)})</p>
      </section>
    </div>
  );
}
