import { draftFromExtraction, type Extraction } from '../lib/draft';
let fail = 0;
const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const base: Extraction = { document_type: 'TAX_INVOICE', supplier: 'AF TEXTILE ', invoice_number: 'IN216951', date: '04/08/2026', total_incl_vat: 49450, vat_amount: 6450, total_excl_vat: 43000, zero_rated_amount: null, currency: 'ZAR', unreadable: [] };

let d = draftFromExtraction(base);
ok(d.supplier === 'AF TEXTILE' && d.invoice === 'IN216951' && d.date === '2026-08-04' && d.incl === '49450', 'clean invoice fills date, supplier, number, total');
ok(d.vat === '' && d.excl === '' && d.notes.length === 0 && !d.blocked, 'VAT that is exactly 15/115 is left to the formula, no warning');

d = draftFromExtraction({ ...base, vat_amount: 5000, total_excl_vat: 44450 });
ok(d.vat === '5000' && d.excl === '44450' && d.notes.some(n => /not 15%/.test(n)), 'printed VAT that is not 15% is kept and flagged');

d = draftFromExtraction({ ...base, document_type: 'CREDIT_NOTE' });
ok(d.blocked && d.notes.some(n => /CREDIT NOTE/.test(n)), 'credit note is blocked, not captured as a purchase');
ok(draftFromExtraction({ ...base, document_type: 'STATEMENT' }).blocked, 'statement is blocked');

d = draftFromExtraction({ ...base, date: null, invoice_number: null, total_incl_vat: null, vat_amount: null, total_excl_vat: null, unreadable: ['date', 'invoice_number'] });
ok(d.date === '' && d.invoice === '' && d.incl === '' && d.notes.some(n => /No total/.test(n)) && d.notes.some(n => /date/.test(n)), 'unreadable fields stay empty and are named, never guessed');

d = draftFromExtraction({ ...base, date: '31/02/2026' });
ok(d.date === '' && d.notes.some(n => /could not be understood/.test(n)), 'impossible date is refused');

d = draftFromExtraction({ ...base, total_incl_vat: null, total_excl_vat: 100, vat_amount: 15 });
ok(d.incl === '115', 'total derived only from the two printed figures when the total itself is missing');

d = draftFromExtraction({ ...base, total_excl_vat: 40000 });
ok(d.notes.some(n => /do not add up/.test(n)), 'amounts that do not add up are flagged');

d = draftFromExtraction({ ...base, currency: 'USD' });
ok(d.notes.some(n => /USD/.test(n)), 'foreign currency is flagged');
process.exit(fail ? 1 : 0);
