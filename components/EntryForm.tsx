'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Draft } from '@/lib/draft';
import { TABS, exclOf, parseMoney, sameInvoice, toIso, vatFor, zar, monthOf, type Entry, type Tab } from '@/lib/vat';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });

export function EntryForm({ initial, defaultTab, prefill, onDone }: { initial?: Entry; defaultTab?: Tab; prefill?: Draft; onDone?: () => void }) {
  const { entries, save, month } = useStore();
  const [tab, setTab] = useState<Tab>(initial?.tab ?? defaultTab ?? 'SHOP');
  const [date, setDate] = useState(initial?.date ?? (prefill?.date || null) ?? (month === today().slice(0, 7) ? today() : `${month}-01`));
  const [supplier, setSupplier] = useState(initial?.supplier.trim() ?? prefill?.supplier ?? '');
  const [invoice, setInvoice] = useState(initial?.invoice ?? prefill?.invoice ?? '');
  const [incl, setIncl] = useState(initial ? String(initial.incl || '') : prefill?.incl ?? '');
  const [zero, setZero] = useState(initial ? String(initial.zero || '') : prefill?.zero ?? '');
  const [imp, setImp] = useState(initial ? String(initial.importVat || '') : '');
  const [tv, setTv] = useState(initial?.vat !== undefined ? String(initial.vat) : prefill?.vat ?? '');
  const [tx, setTx] = useState(initial?.excl !== undefined ? String(initial.excl) : prefill?.excl ?? '');
  const [period, setPeriod] = useState(initial?.period ?? '');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const suppliers = useMemo(() => Array.from(new Set(entries.map(e => e.supplier.trim()))).sort(), [entries]);

  const inclN = incl === '' ? 0 : parseMoney(incl);
  const vat = inclN == null ? 0 : vatFor({ incl: inclN } as Entry);

  function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    const iso = toIso(date);
    const z = zero === '' ? 0 : parseMoney(zero), im = imp === '' ? 0 : parseMoney(imp);
    if (!iso) return setErr('Enter a valid date.');
    if (!supplier.trim()) return setErr('Enter the supplier.');
    if (!invoice.trim()) return setErr('Enter the invoice number.');
    if (inclN == null || z == null || im == null) return setErr('An amount is not a number. Use a full stop for decimals, e.g. 1234.50.');
    if (inclN < 0 || z < 0 || im < 0) return setErr('Amounts cannot be negative. Enter a credit note as a separate positive line only if your accountant agrees.');
    const v2 = tv === '' ? undefined : parseMoney(tv), x2 = tx === '' ? undefined : parseMoney(tx);
    if (v2 === null || x2 === null) return setErr('The typed VAT or excl. amount is not a number.');
    if ((v2 ?? 0) < 0 || (x2 ?? 0) < 0) return setErr('Amounts cannot be negative.');
    if (!inclN && !z && v2 === undefined && x2 === undefined) return setErr('Enter the amount including VAT, or the zero-rated amount.');
    const entry: Entry = { id: initial?.id ?? crypto.randomUUID(), tab, date: iso, supplier: supplier.trim(), invoice: invoice.trim(), incl: inclN, zero: z, importVat: im, ...(period && period !== monthOf(iso) ? { period } : {}), ...(v2 !== undefined ? { vat: v2 } : {}), ...(x2 !== undefined ? { excl: x2 } : {}) };
    const dup = entries.find(x => sameInvoice(entry, x));
    if (dup) return setErr(`${entry.supplier} invoice ${entry.invoice} is already captured (${dup.date}). It was not saved twice.`);
    setErr(''); save(entry);
    if (initial) return onDone?.();
    setMsg(`Saved ${entry.supplier} ${entry.invoice}: VAT ${zar(vatFor(entry))}.`);
    setInvoice(''); setIncl(''); setZero(''); setImp(''); setTv(''); setTx(''); setPeriod('');
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-4 sm:grid-cols-2">
      <div><label className="lbl">Type</label>
        <select className="input" value={tab} onChange={e => setTab(e.target.value as Tab)}>{TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
      <div><label className="lbl">Date</label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div className="sm:col-span-2"><label className="lbl">Claim in VAT month (only if different from the invoice date)</label><input className="input !w-auto" type="month" value={period} onChange={e => setPeriod(e.target.value)} /></div>
      <div><label className="lbl">Supplier</label><input className="input" list="sup" value={supplier} onChange={e => setSupplier(e.target.value)} /><datalist id="sup">{suppliers.map(s => <option key={s} value={s} />)}</datalist></div>
      <div><label className="lbl">Invoice number</label><input className="input" value={invoice} onChange={e => setInvoice(e.target.value)} /></div>
      <div><label className="lbl">Amount incl. VAT</label><input className="input num" inputMode="decimal" value={incl} onChange={e => setIncl(e.target.value)} placeholder="0.00" /></div>
      <div><label className="lbl">Zero rated (no VAT)</label><input className="input num" inputMode="decimal" value={zero} onChange={e => setZero(e.target.value)} placeholder="0.00" /></div>
      <div><label className="lbl">VAT on imports</label><input className="input num" inputMode="decimal" value={imp} onChange={e => setImp(e.target.value)} placeholder="0.00" /></div>
      <div className="sm:col-span-2 rounded-lg border border-dashed border-border p-3">
        <p className="mb-2 text-xs opacity-70">Only if the invoice shows VAT separately and you have no total including VAT (e.g. a shipping agent): type the amounts as printed. They are used instead of 15/115.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="lbl">VAT as printed</label><input className="input num" inputMode="decimal" value={tv} onChange={e => setTv(e.target.value)} placeholder="0.00" /></div>
          <div><label className="lbl">Amount excl. as printed</label><input className="input num" inputMode="decimal" value={tx} onChange={e => setTx(e.target.value)} placeholder="0.00" /></div>
        </div>
      </div>
      <div className="rounded-lg bg-surface p-3 text-sm num">
        <div className="flex justify-between"><span>Amount incl.</span><b>{zar(inclN ?? 0)}</b></div>
        <div className="flex justify-between"><span>VAT @ 15%</span><b>{zar(vat)}</b></div>
        <div className="flex justify-between"><span>Amount excl.</span><b>{zar(inclN == null ? 0 : exclOf(inclN))}</b></div>
      </div>
      {err && <p className="sm:col-span-2 rounded-lg bg-red-100 p-2 text-sm text-red-800">{err}</p>}
      {msg && <p className="sm:col-span-2 rounded-lg bg-green-100 p-2 text-sm text-green-800">{msg}</p>}
      <div className="sm:col-span-2 flex gap-2"><button className="btn" type="submit">{initial ? 'Save changes' : 'Save invoice'}</button>{initial && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}</div>
    </form>
  );
}
