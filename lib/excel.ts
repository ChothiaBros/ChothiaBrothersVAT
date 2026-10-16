import * as XLSX from 'xlsx';
import { TABS, showDate, toIso, monthOf, periodOf, type Entry, type Sales, type Tab } from './vat';

const HEAD = ['DATE', 'SUPPLIER', 'INVOICE NUMBER', 'Amount Incl.', 'VAT @ 15%', 'Amount Excl', 'ZERO RATED', 'VAT on Imports '];

function sheetFor(title: string, rows: Entry[]) {
  const aoa: unknown[][] = [[], [title], [], [], [], HEAD];
  const first = aoa.length + 1;
  rows.forEach((r, i) => {
    const n = first + i;
    aoa.push([showDate(r.date), r.supplier, r.invoice, r.incl || undefined, r.vat !== undefined ? r.vat : { f: `E${n}*15/115` }, r.excl !== undefined ? r.excl : r.vat !== undefined ? { f: `E${n}-F${n}` } : { f: `E${n}-F${n}` }, r.zero || undefined, r.importVat || undefined]);
  });
  const last = first + rows.length - 1;
  const sum = (c: string) => (rows.length ? { f: `SUM(${c}${first}:${c}${last})` } : 0);
  aoa.push(['', 'TOTAL', '', sum('D'), sum('E'), sum('F'), sum('G'), sum('H')]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 34 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  return { ws, total: first + rows.length };
}

// Same layout as AUGUST_VAT.xlsx: a "vat report" summary plus one sheet per purchase type.
export function exportMonth(month: string, entries: Entry[], sales: Sales) {
  const wb = XLSX.utils.book_new();
  const rows = (t: Tab) => entries.filter(e => e.tab === t && periodOf(e) === month).sort((a, b) => a.date.localeCompare(b.date));
  const built = TABS.map(t => ({ t, ...sheetFor(t.label.toUpperCase(), rows(t.key)) }));
  const ref = (t: Tab, col: string) => { const b = built.find(x => x.t.key === t)!; return `'${b.t.sheet}'!${col}${b.total}`; };
  const rep: unknown[][] = [[], ['Vat Report'], [], [], ['SALES'],
    ['MONTH', 'GROSS', 'VAT ', 'NET', 'ZERO RATED'],
    [month, sales.gross, sales.vat, { f: 'B7-C7' }, sales.zero], [],
    ['INPUT', 'Amount Incl.', 'VAT', 'Amount Excl', 'ZERO RATED', 'VAT on Imports'],
    ...built.map(b => [b.t.label.toUpperCase(), { f: ref(b.t.key, 'D') }, { f: ref(b.t.key, 'E') }, { f: ref(b.t.key, 'F') }, { f: ref(b.t.key, 'G') }, { f: ref(b.t.key, 'H') }]),
    ['', { f: 'SUM(B10:B12)' }, { f: 'SUM(C10:C12)' }, { f: 'SUM(D10:D12)' }, { f: 'SUM(E10:E12)' }, { f: 'SUM(F10:F12)' }], [],
    ['VAT PAYABLE/CLAIMABLE', { f: 'C7-(C13+F13)' }]];
  const wsr = XLSX.utils.aoa_to_sheet(rep);
  wsr['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsr, 'vat report');
  built.forEach(b => XLSX.utils.book_append_sheet(wb, b.ws, b.t.sheet.trim()));
  XLSX.writeFile(wb, `VAT_${month}.xlsx`);
}

// sheet_to_json starts at the first used cell (B2 in the owner's file); force A1 so column letters line up.
function grid(ws: XLSX.WorkSheet): unknown[][] {
  const r = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const copy = { ...ws, '!ref': XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: r.e }) };
  return XLSX.utils.sheet_to_json<unknown[]>(copy, { header: 1, raw: true, defval: null });
}
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
const str = (v: unknown) => (v == null ? '' : String(v).trim());

export interface Imported { entries: Entry[]; sales: Record<string, Sales>; skipped: string[] }

// Reads a workbook in the AUGUST_VAT.xlsx layout. Anything it cannot read is listed, never guessed.
export function importWorkbook(buf: ArrayBuffer): Imported {
  const wb = XLSX.read(buf, { cellDates: true });
  const out: Imported = { entries: [], sales: {}, skipped: [] };
  const find = (name: string) => wb.SheetNames.find(n => n.trim().toUpperCase() === name);
  const spec: { tab: Tab; name: string; c: number; zero: number; imp: number }[] = [
    { tab: 'SHOP', name: 'SHOP PURCHASES', c: 1, zero: 7, imp: 8 },
    { tab: 'OPERATING', name: 'OPERATING EXP & DEBIT ORDERS', c: 1, zero: 7, imp: 8 },
    { tab: 'IMPROVEMENTS', name: 'IMPROVEMENTS', c: 2, zero: 8, imp: 9 },
  ];
  for (const s of spec) {
    const sn = find(s.name); if (!sn) continue;
    const rows = grid(wb.Sheets[sn]);
    rows.forEach((r, i) => {
      if (i < 6) return;
      const supplier = str(r[s.c + 1]), invoice = str(r[s.c + 2]);
      const incl = num(r[s.c + 3]), zero = num(r[s.zero]), importVat = num(r[s.imp]);
      const tv = num(r[s.c + 4]), tx = num(r[s.c + 5]);
      const typed = !incl && (tv !== 0 || tx !== 0);   // VAT and excl typed from the invoice, no incl figure
      // Blank, label and total rows are not invoices.
      if ((!supplier && !invoice) || /^(total|imports?$)/i.test(supplier) && !zero) return;
      if (!incl && !zero && !importVat && !typed) return;
      const date = toIso(r[s.c]);
      const isTotal = supplier.toUpperCase() === 'TOTAL';
      if (isTotal && !incl && zero) { out.entries.push({ id: crypto.randomUUID(), tab: s.tab, date: date ?? '', supplier: 'ZERO RATED / NON-VATABLE (month total)', invoice: '', incl: 0, zero, importVat }); return; }
      if (isTotal) return;
      if (!date) { out.skipped.push(`${sn} row ${i + 1}: ${supplier || invoice} (date unreadable)`); return; }
      out.entries.push({ id: crypto.randomUUID(), tab: s.tab, date, supplier, invoice, incl, zero, importVat, ...(typed ? { vat: tv, excl: tx } : {}) });
    });
  }
  // A "TOTAL" zero-rated line has no date of its own: give it the latest date in that tab.
  for (const e of out.entries) if (!e.date) {
    const d = out.entries.filter(x => x.tab === e.tab && x.date).map(x => x.date).sort().pop();
    if (d) e.date = d; else { out.skipped.push(`${e.supplier} (no date)`); }
  }
  out.entries = out.entries.filter(e => e.date);
  const rep = find('VAT REPORT');
  if (rep) {
    const g = grid(wb.Sheets[rep]);
    const row = g[6]; const d = row ? toIso(row[1]) : null;
    if (row && d) out.sales[monthOf(d)] = { gross: num(row[2]), vat: num(row[3]), zero: num(row[5]) };
  }
  // The workbook is one VAT month. An invoice dated in an earlier month but listed in it was claimed in it.
  const rm = Object.keys(out.sales)[0];
  if (rm) for (const e of out.entries) if (monthOf(e.date) < rm && !e.period) e.period = rm;
  return out;
}
