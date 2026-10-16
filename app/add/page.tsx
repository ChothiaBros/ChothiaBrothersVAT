'use client';
import { EntryForm } from '@/components/EntryForm';
export default function Add() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Add invoice</h2>
      <p className="text-sm opacity-70">VAT and the amount excluding VAT are worked out for you at 15/115 of the amount including VAT, the same as your spreadsheet. A supplier and invoice number already captured is refused, not saved twice.</p>
      <EntryForm />
      <p className="card p-3 text-sm opacity-80">Reading the date, supplier and invoice number straight off a photo or PDF is the next step. It needs an Anthropic API key, so it is not switched on yet — until then type them above, or import your existing Excel sheet.</p>
    </div>
  );
}
