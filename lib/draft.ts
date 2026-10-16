// Turns what the model read off an invoice into a DRAFT for the form. Nothing here saves anything:
// a person confirms every invoice, because a plausible wrong figure looks exactly like a right one.
import { toIso, vatOf } from './vat';

export interface Extraction {
  document_type: 'TAX_INVOICE' | 'CREDIT_NOTE' | 'STATEMENT' | 'QUOTE_OR_OTHER';
  supplier: string | null;
  invoice_number: string | null;
  date: string | null;            // dd/mm/yyyy or yyyy-mm-dd as printed
  total_incl_vat: number | null;
  vat_amount: number | null;
  total_excl_vat: number | null;
  zero_rated_amount: number | null;
  currency: string | null;
  unreadable: string[];
}

export interface Draft {
  supplier: string; invoice: string; date: string;  // date is yyyy-mm-dd or ''
  incl: string; zero: string; vat: string; excl: string;
  notes: string[];
  blocked: boolean;   // not a document that can be captured as a purchase
}

const TOL = 0.05;   // rand: VAT printed on an invoice is rounded to the cent
const n = (v: number | null) => (v == null ? '' : String(v));

export function draftFromExtraction(x: Extraction): Draft {
  const notes: string[] = [];
  let blocked = false;
  if (x.document_type === 'CREDIT_NOTE') { notes.push('This is a CREDIT NOTE. Do not capture it as a purchase — ask your accountant how credits are handled.'); blocked = true; }
  if (x.document_type === 'STATEMENT') { notes.push('This looks like a STATEMENT, not an invoice. Capture the individual invoices instead.'); blocked = true; }
  if (x.document_type === 'QUOTE_OR_OTHER') { notes.push('This does not look like a tax invoice (quote or other document).'); blocked = true; }
  if (x.currency && x.currency.toUpperCase() !== 'ZAR') notes.push(`Amounts are in ${x.currency}, not rand. Check before saving.`);
  for (const f of x.unreadable) notes.push(`Could not read: ${f}.`);

  const iso = x.date ? toIso(x.date) : null;
  if (x.date && !iso) notes.push(`The date "${x.date}" could not be understood — enter it by hand.`);

  const incl = x.total_incl_vat ?? (x.total_excl_vat != null && x.vat_amount != null ? x.total_excl_vat + x.vat_amount : null);
  let vat = '', excl = '';
  if (incl != null && x.vat_amount != null) {
    const expect = vatOf(incl);
    if (Math.abs(x.vat_amount - expect) > TOL) {
      // The invoice's own VAT is not 15/115 of its total (part zero-rated, other rate, or misread).
      vat = String(x.vat_amount); excl = n(x.total_excl_vat ?? incl - x.vat_amount);
      notes.push(`Printed VAT ${x.vat_amount.toFixed(2)} is not 15% of the total (expected ${expect.toFixed(2)}). The printed figures were kept — check them against the invoice.`);
    }
  }
  if (incl != null && x.total_excl_vat != null && x.vat_amount != null && Math.abs(x.total_excl_vat + x.vat_amount - incl) > TOL)
    notes.push('The three amounts read from the invoice do not add up (excl + VAT ≠ total). One was probably misread.');
  if (incl == null) notes.push('No total was found — enter the amount including VAT.');

  return { supplier: x.supplier?.trim() ?? '', invoice: x.invoice_number?.trim() ?? '', date: iso ?? '', incl: n(incl), zero: n(x.zero_rated_amount), vat, excl, notes, blocked };
}
