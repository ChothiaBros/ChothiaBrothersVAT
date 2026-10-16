# Chothia Bros VAT

Supplier-invoice VAT capture for Johannesburg Zips CC t/a Chothia Bros. Date, supplier, invoice number, amount incl., VAT @ 15% (incl × 15/115), amount excl., zero rated and VAT on imports — by month, with a VAT payable/claimable report and Excel export in the layout of `AUGUST_VAT.xlsx`.

Next.js 14 · Tailwind · xlsx. Same look as the textile inventory app. Deploy on Vercel (import the repo, no settings needed).

- `npm run dev` — local
- `npm test` — VAT arithmetic and invoice-draft checks
- Invoice reading: `/add` reads a photo or PDF with Claude (`claude-opus-5-5`) into a draft the person checks. Needs two environment variables on Vercel: `ANTHROPIC_API_KEY` and `VAT_ACCESS_CODE` (anyone using the reader types this code; with it unset the reader is off).
- Data is stored in the browser for now; a shared Supabase database and automatic reading of invoice photos/PDFs are the next steps.
