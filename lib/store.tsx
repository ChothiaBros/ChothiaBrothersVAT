'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { periodOf, type Entry, type Sales } from './vat';

const KEY = 'cbvat-v1';
interface Saved { entries: Entry[]; sales: Record<string, Sales> }
interface Ctx {
  ready: boolean; entries: Entry[]; sales: Record<string, Sales>; month: string; setMonth: (m: string) => void;
  months: string[]; save: (e: Entry) => void; remove: (id: string) => void; setSales: (m: string, s: Sales) => void;
  addMany: (es: Entry[], sales?: Record<string, Sales>) => void; storageOk: boolean;
}
const C = createContext<Ctx | null>(null);
export const useStore = () => { const c = useContext(C); if (!c) throw new Error('no store'); return c; };
const nowMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' }).slice(0, 7);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Saved>({ entries: [], sales: {} });
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [month, setMonth] = useState(nowMonth());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as Saved;
        setData({ entries: d.entries ?? [], sales: d.sales ?? {} });
        const ms = (d.entries ?? []).map(periodOf).sort();
        if (ms.length && !ms.includes(nowMonth())) setMonth(ms[ms.length - 1]);
      }
    } catch { setStorageOk(false); }
    setReady(true);
  }, []);

  const persist = useCallback((d: Saved) => {
    setData(d);
    try { localStorage.setItem(KEY, JSON.stringify(d)); setStorageOk(true); } catch { setStorageOk(false); }
  }, []);

  const value = useMemo<Ctx>(() => ({
    ready, entries: data.entries, sales: data.sales, month, setMonth, storageOk,
    months: Array.from(new Set([...data.entries.map(periodOf), ...Object.keys(data.sales), month])).sort().reverse(),
    save: e => persist({ ...data, entries: data.entries.some(x => x.id === e.id) ? data.entries.map(x => x.id === e.id ? e : x) : [...data.entries, e] }),
    remove: id => persist({ ...data, entries: data.entries.filter(x => x.id !== id) }),
    setSales: (m, s) => persist({ ...data, sales: { ...data.sales, [m]: s } }),
    addMany: (es, s) => persist({ entries: [...data.entries, ...es], sales: { ...data.sales, ...(s ?? {}) } }),
  }), [data, ready, month, persist, storageOk]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
