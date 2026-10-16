'use client';
import { useEffect, useRef, useState } from 'react';
import { EntryForm } from '@/components/EntryForm';
import { draftFromExtraction, type Draft, type Extraction } from '@/lib/draft';

type Item = { id: string; name: string; status: 'reading' | 'ready' | 'failed'; draft?: Draft; error?: string };
const CODE_KEY = 'cbvat-code';

// Phone photos are 5-10 MB; the server accepts about 4 MB. Shrink to 1800 px JPEG before sending.
async function prepare(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.85));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
}

export function InvoiceReader() {
  const [code, setCode] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [top, setTop] = useState('');
  const pick = useRef<HTMLInputElement>(null);
  useEffect(() => { try { setCode(localStorage.getItem(CODE_KEY) ?? ''); } catch {} }, []);

  async function readOne(file: File, id: string) {
    const patch = (p: Partial<Item>) => setItems(xs => xs.map(x => x.id === id ? { ...x, ...p } : x));
    try {
      const f = await prepare(file);
      const fd = new FormData(); fd.append('file', f);
      const r = await fetch('/api/read-invoice', { method: 'POST', body: fd, headers: { 'x-access-code': code } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return patch({ status: 'failed', error: j.error ?? `Failed (${r.status}).` });
      patch({ status: 'ready', draft: draftFromExtraction(j.extraction as Extraction) });
    } catch { patch({ status: 'failed', error: 'The file could not be sent. Check your connection.' }); }
  }

  function onFiles(list: FileList | null) {
    setTop('');
    if (!list || !list.length) return;
    if (!code.trim()) return setTop('Enter the access code first.');
    try { localStorage.setItem(CODE_KEY, code.trim()); } catch {}
    const fresh = Array.from(list).map(f => ({ f, id: crypto.randomUUID() }));
    setItems(xs => [...xs, ...fresh.map(({ f, id }) => ({ id, name: f.name, status: 'reading' as const }))]);
    // One at a time: kind to the API rate limit, and the first result is ready soonest.
    (async () => { for (const { f, id } of fresh) await readOne(f, id); })();
    if (pick.current) pick.current.value = '';
  }

  const cur = items.find(i => i.id === open);
  return (
    <section className="card space-y-3 p-4">
      <div>
        <h3 className="font-semibold">Read invoices from a photo or PDF</h3>
        <p className="text-sm opacity-70">Choose one or more files. The date, supplier, invoice number and amounts are read for you and put into the form below to <b>check</b>. Nothing is saved until you press Save.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div><label className="lbl">Access code</label><input className="input" type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Set in Vercel as VAT_ACCESS_CODE" /></div>
        <div className="flex items-end"><button className="btn w-full" onClick={() => pick.current?.click()}>Choose files</button></div>
      </div>
      <input ref={pick} type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={e => onFiles(e.target.files)} />
      {top && <p className="rounded-lg bg-red-100 p-2 text-sm text-red-800">{top}</p>}

      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {items.map(i => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              {i.status === 'reading' && <span className="opacity-60">Reading…</span>}
              {i.status === 'failed' && <><span className="text-red-700">{i.error}</span><button className="text-red-600" onClick={() => setItems(xs => xs.filter(x => x.id !== i.id))}>Remove</button></>}
              {i.status === 'ready' && <><span className="text-green-700">{i.draft?.supplier || 'Read'}{i.draft?.invoice ? ` · ${i.draft.invoice}` : ''}</span><button className="btn-ghost !py-1" onClick={() => setOpen(i.id)}>Check &amp; save</button></>}
            </li>
          ))}
        </ul>
      )}

      {cur?.draft && (
        <div className="space-y-2">
          {cur.draft.notes.length > 0 && (
            <ul className="list-disc rounded-lg bg-amber-100 p-3 pl-7 text-sm text-amber-900">{cur.draft.notes.map(n => <li key={n}>{n}</li>)}</ul>
          )}
          {cur.draft.blocked
            ? <button className="btn-ghost" onClick={() => { setItems(xs => xs.filter(x => x.id !== cur.id)); setOpen(null); }}>Discard this file</button>
            : <EntryForm key={cur.id} prefill={cur.draft} onDone={() => { setItems(xs => xs.filter(x => x.id !== cur.id)); setOpen(null); }} />}
        </div>
      )}
    </section>
  );
}
