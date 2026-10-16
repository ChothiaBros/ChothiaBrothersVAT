import { z } from 'zod';

export const ExtractionSchema = z.object({
  document_type: z.enum(['TAX_INVOICE', 'CREDIT_NOTE', 'STATEMENT', 'QUOTE_OR_OTHER']),
  supplier: z.string().nullable(),
  invoice_number: z.string().nullable(),
  date: z.string().nullable(),
  total_incl_vat: z.number().nullable(),
  vat_amount: z.number().nullable(),
  total_excl_vat: z.number().nullable(),
  zero_rated_amount: z.number().nullable(),
  currency: z.string().nullable(),
  unreadable: z.array(z.string()),
});

export const SYSTEM = `You read South African supplier tax invoices for a VAT return.
Extract only what is printed on the document. If a value is missing, cut off, blurred or you are not sure, return null and add its field name to "unreadable". Never estimate, calculate or invent a value — a plausible wrong figure is worse than an empty one.

- supplier: the company that ISSUED the invoice (the seller), not the customer. The customer is usually Johannesburg Zips CC t/a Chothia Bros; that is never the supplier.
- invoice_number: the document's own invoice / tax invoice number exactly as printed (keep letters, zeros and slashes). Not an order, PO, account, customer or delivery-note number.
- date: the invoice date as printed, dd/mm/yyyy (South African order). If printed as text such as "5 Aug 2026", convert it. Not the due date.
- total_incl_vat: the final amount payable including VAT. vat_amount: the VAT amount. total_excl_vat: the subtotal before VAT. Plain numbers, no currency symbols or thousands separators.
- zero_rated_amount: the value of any lines explicitly zero-rated or VAT-exempt, else null.
- currency: ISO code as shown (ZAR for rand).
- document_type: TAX_INVOICE, CREDIT_NOTE (credit note / refund), STATEMENT (list of several invoices or an account summary) or QUOTE_OR_OTHER.
If the file holds several invoices, read only the first and add "multiple invoices in one file" to unreadable.`;
