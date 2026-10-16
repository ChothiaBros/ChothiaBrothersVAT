// Pure VAT rules. Same arithmetic as AUGUST_VAT.xlsx: VAT = incl * 15/115, excl = incl - VAT.
export const VAT_RATE = 0.15;

export type Tab = 'SHOP' | 'OPERATING' | 'IMPROVEMENTS';
export const TABS: { key: Tab; label: string; sheet: string; path: string }[] = [
  { key: 'SHOP', label: 'Shop purchases', sheet: 'SHOP PURCHASES', path: '/shop' },
  { key: 'OPERATING', label: 'Operating expenses', sheet: ' OPERATING EXP & DEBIT ORDERS', path: '/operating' },
  { key: 'IMPROVEMENTS', label: 'Improvements', sheet: 'IMPROVEMENTS', path: '/improvements' },
];

export interface Entry {
  id: string;
  tab: Tab;
  date: string;       // yyyy-mm-dd
  supplier: string;
  invoice: string;
  incl: number;       // VAT-inclusive amount (standard rated)
  zero: number;       // zero rated / non-vatable amount
  importVat: number;  // VAT paid on imports
  period?: string;    // yyyy-mm VAT period it is claimed in, when not the month of the invoice date
  vat?: number;       // VAT typed from the invoice itself (when it shows VAT separately)
  excl?: number;      // amount excl. typed from the invoice itself
}
export interface Sales { gross: number; vat: number; zero: number }

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const vatOf = (incl: number) => (incl * 15) / 115;
export const exclOf = (incl: number) => incl - vatOf(incl);

// A typed VAT / excl wins; otherwise they are worked out from the amount incl. (15/115).
export const vatFor = (e: Entry) => e.vat ?? vatOf(e.incl);
export const exclFor = (e: Entry) => e.excl ?? e.incl - vatFor(e);

export function totals(rows: Entry[]) {
  let incl = 0, vat = 0, excl = 0, zero = 0, importVat = 0;
  for (const r of rows) { incl += r.incl; vat += vatFor(r); excl += exclFor(r); zero += r.zero; importVat += r.importVat; }
  return { incl, vat, excl, zero, importVat };
}

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);
// The VAT month an invoice belongs to: the one typed, else the month of its date.
export const periodOf = (e: Entry) => e.period ?? monthOf(e.date);

export function report(sales: Sales, rows: Entry[]) {
  const by = (t: Tab) => totals(rows.filter(r => r.tab === t));
  const shop = by('SHOP'), op = by('OPERATING'), imp = by('IMPROVEMENTS');
  const inputVat = shop.vat + op.vat + imp.vat;
  const importVat = shop.importVat + op.importVat + imp.importVat;
  const payable = sales.vat - (inputVat + importVat);
  return { shop, op, imp, inputVat, importVat, payable, salesNet: sales.gross - sales.vat };
}

// dd/mm/yyyy, yyyy-mm-dd or a JS Date -> yyyy-mm-dd (null when unreadable or impossible)
export function toIso(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let y: number, m: number, d: number;
  let x = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s);
  if (x) { d = +x[1]; m = +x[2]; y = +x[3]; }
  else if ((x = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return t.toISOString().slice(0, 10);
}
export const showDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// Money is read leniently ("1 234,50" is refused as ambiguous only when both , and . appear oddly).
export function parseMoney(v: string): number | null {
  const s = v.replace(/\s/g, '').replace(/^R/i, '');
  if (s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^-?\d+,\d{1,2}$/.test(s)) return Number(s.replace(',', '.'));
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
  return null;
}

export const zar = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n).replace(/ /g, ' ');

export const sameInvoice = (a: Entry, b: Entry) =>
  a.id !== b.id && a.supplier.trim().toLowerCase() === b.supplier.trim().toLowerCase() &&
  a.invoice.trim().toLowerCase() === b.invoice.trim().toLowerCase() && a.invoice.trim() !== '';
