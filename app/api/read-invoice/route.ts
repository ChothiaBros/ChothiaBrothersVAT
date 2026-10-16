import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { NextResponse } from 'next/server';
import { ExtractionSchema, SYSTEM } from '@/lib/invoice-schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 4_000_000;   // Vercel functions accept about 4.5 MB of request body

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  // Fails closed: with no access code configured nobody can spend the API credit.
  const code = process.env.VAT_ACCESS_CODE;
  if (!code) return fail('Invoice reading is not switched on: VAT_ACCESS_CODE is not set on the server.', 503);
  if (!process.env.ANTHROPIC_API_KEY) return fail('Invoice reading is not switched on: ANTHROPIC_API_KEY is not set on the server.', 503);
  if (req.headers.get('x-access-code') !== code) return fail('Wrong access code.', 401);

  let form: FormData;
  try { form = await req.formData(); } catch { return fail('The upload could not be read.', 400); }
  const file = form.get('file');
  if (!(file instanceof File)) return fail('No file was sent.', 400);
  if (!TYPES.includes(file.type as (typeof TYPES)[number])) return fail('Only PDF, JPG, PNG or WebP files can be read.', 415);
  if (file.size > MAX_BYTES) return fail('That file is too large (limit about 4 MB). Photos are shrunk automatically; for a big PDF, send a smaller scan.', 413);

  const data = Buffer.from(await file.arrayBuffer()).toString('base64');
  const block = file.type === 'application/pdf'
    ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } } as const)
    : ({ type: 'image', source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp', data } } as const);

  try {
    const client = new Anthropic();
    const res = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low', format: zodOutputFormat(ExtractionSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: [block, { type: 'text', text: 'Read this document.' }] }],
    });
    if (res.stop_reason === 'refusal') return fail('The reader declined this document. Enter it by hand.', 422);
    if (!res.parsed_output) return fail('The reader could not produce a result for this document. Enter it by hand.', 422);
    return NextResponse.json({ extraction: res.parsed_output });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail('The reader is busy. Wait a moment and try again.', 429);
    if (e instanceof Anthropic.AuthenticationError) return fail('The ANTHROPIC_API_KEY on the server was refused. Check it in Vercel.', 502);
    if (e instanceof Anthropic.APIError) return fail(`The reader failed (${e.status}). Try again or enter it by hand.`, 502);
    return fail('The reader failed unexpectedly. Try again or enter it by hand.', 500);
  }
}
