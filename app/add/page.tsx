'use client';
import { EntryForm } from '@/components/EntryForm';
import { InvoiceReader } from '@/components/InvoiceReader';
export default function Add() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Add invoice</h2>
      <p className="text-sm opacity-70">VAT and the amount excluding VAT are worked out for you at 15/115 of the amount including VAT, the same as your spreadsheet. A supplier and invoice number already captured is refused, not saved twice.</p>
      <InvoiceReader />
      <h3 className="pt-2 font-semibold">Or type one in</h3>
      <EntryForm />
    </div>
  );
}
