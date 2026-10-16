'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '@/lib/store';
import { TABS } from '@/lib/vat';

const NAV = [
  { href: '/report', label: 'VAT report' },
  { href: '/add', label: 'Add invoice' },
  ...TABS.map(t => ({ href: t.path, label: t.label })),
  { href: '/import', label: 'Import / export' },
];
export const monthLabel = (m: string) =>
  new Date(`${m}-01T12:00:00Z`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function Sidebar({ onNav }: { onNav?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 px-2 pt-2"><img src="/logo.png" alt="Chothia Bros" className="h-12 w-auto" /></div>
      {NAV.map(n => {
        const on = path === n.href;
        return (
          <Link key={n.href} href={n.href} onClick={onNav}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${on ? 'bg-primary/10 text-primary' : 'hover:bg-surface'}`}>{n.label}</Link>
        );
      })}
      <p className="mt-auto px-3 pb-2 text-[11px] opacity-60">Johannesburg Zips CC t/a Chothia Bros<br />VAT at 15% — rates in this app are fixed</p>
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { month, setMonth, months, storageOk, ready } = useStore();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => { try { setDark(localStorage.getItem('cbvat-dark') === '1'); } catch {} }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); try { localStorage.setItem('cbvat-dark', dark ? '1' : '0'); } catch {} }, [dark]);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surfaceRaised lg:block"><div className="sticky top-0 h-screen"><Sidebar /></div></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute left-0 top-0 h-full w-64 bg-surfaceRaised" onClick={e => e.stopPropagation()}><Sidebar onNav={() => setOpen(false)} /></aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surfaceRaised/95 px-4 py-3 backdrop-blur">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
          <h1 className="whitespace-nowrap text-base font-bold text-primaryDark dark:text-primary">Chothia Bros VAT</h1>
          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="m">Month</label>
            <select id="m" className="input !w-auto" value={month} onChange={e => setMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button className="btn-ghost" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{dark ? '☀' : '☾'}</button>
          </div>
        </header>
        {!storageOk && <div className="m-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">This browser would not save your data. Export to Excel before closing, or nothing is kept.</div>}
        <main className="mx-auto max-w-6xl p-4 pb-16">{ready ? children : <p className="text-sm opacity-60">Loading…</p>}</main>
      </div>
    </div>
  );
}
