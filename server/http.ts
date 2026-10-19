import type { IncomingMessage, ServerResponse } from 'node:http';
import { ZodError } from 'zod';
import { Store, AppError } from './database.ts';
import { isResource } from '../shared/domain.ts';
import {
  csvCell,
  briefing,
  snapshot,
  money,
  dayKey,
  projectProgress,
} from '../shared/analytics.ts';
import { integrations } from './providers.ts';
import { seed } from './seed.ts';

export function trustedRequest(req: IncomingMessage): boolean {
  const host = req.headers.host || '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  if (req.headers.origin && req.headers.origin !== `http://${host}`) return false;
  return true;
}
async function jsonBody(req: IncomingMessage): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json'))
    throw new AppError('Content-Type must be application/json', 415);
  let body = '';
  for await (const chunk of req) {
    body += chunk.toString();
    if (Buffer.byteLength(body) > 128000) throw new AppError('Request too large', 413);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError('Invalid JSON');
  }
}
export function apiHandler(store: Store) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (!trustedRequest(req))
        throw new AppError(
          'Local access only. Remote access requires authentication, which is not implemented.',
          403,
        );
      const path = new URL(req.url || '/', 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/api/dashboard') return send(200, store.dashboard());
      if (req.method === 'GET' && path === '/api/integrations') return send(200, integrations);
      if (req.method === 'GET' && path === '/api/export') {
        const rows = [
          [
            'id',
            'date',
            'description',
            'amount',
            'currency',
            'category',
            'recurring',
            'demo',
            'createdAt',
            'updatedAt',
          ],
          ...store
            .list('expenses')
            .map((e) => [
              e.id,
              e.date,
              e.description,
              (e.amountMinor / 100).toFixed(2),
              e.currency,
              e.category,
              e.recurring,
              String(e.demo),
              e.createdAt,
              e.updatedAt,
            ]),
        ];
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="orbit-expenses.csv"',
          'Cache-Control': 'no-store',
        });
        res.end('\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'));
        return;
      }
      if (req.method === 'GET' && path === '/api/backup')
        return send(200, {
          exportedAt: new Date().toISOString(),
          version: 1,
          records: store.dashboard(),
        });
      if (req.method === 'POST' && path === '/api/demo') {
        const input = await jsonBody(req);
        if (!(input && typeof input === 'object' && 'confirm' in input && input.confirm === true))
          throw new AppError('Explicit confirmation required');
        return send(200, { seeded: seed(store) });
      }
      if (req.method === 'POST' && path === '/api/assistant') {
        const input = await jsonBody(req);
        const prompt = input && typeof input === 'object' && 'prompt' in input ? input.prompt : '';
        if (typeof prompt !== 'string' || prompt.length > 2000 || !prompt.trim())
          throw new AppError('Enter a question (maximum 2000 characters)');
        const data = store.dashboard();
        const currency = data.settings[0].currency;
        const s = snapshot(data, dayKey(), currency);
        let text = briefing(data);
        if (/spend|expense|financ|budget/i.test(prompt))
          text = `Recorded spending this week: ${money(
            s.weekSpending,
            currency,
          )}. This total includes only ${currency} records. ${
            data.expenses.length
          } expense records are saved across all currencies. Review category budgets on the Finances page. This is a summary of your records, not financial advice.`;
        else if (/research|project|develop/i.test(prompt))
          text = data.projects.length
            ? data.projects
                .map(
                  (p) =>
                    `${p.name}: ${projectProgress(data, p.id)}% of tasks complete.${
                      p.blocker ? ` Blocker: ${p.blocker}` : ''
                    }${p.nextStep ? ` Next: ${p.nextStep}` : ''}`,
                )
                .join('\n\n') +
              '\n\nBased on saved project records only; no repositories or test runners were queried.'
            : 'No projects yet. Create one in Tasks & Projects.';
        else if (/week|review|progress/i.test(prompt))
          text = `${s.completed} tasks completed this calendar week. ${
            s.open.length
          } remain open, including ${s.overdue.length} overdue. Weekly recorded spending: ${money(
            s.weekSpending,
            currency,
          )}.\n\n${briefing(data)}`;
        return send(200, { text, provider: 'Local rules', generated: false });
      }
      const match = path.match(/^\/api\/([a-z]+)(?:\/([a-zA-Z0-9-]+))?$/);
      if (!match || !isResource(match[1])) throw new AppError('Endpoint not found', 404);
      const resource = match[1];
      const id = match[2];
      if (req.method === 'GET')
        return send(200, id ? store.get(resource, id) : store.list(resource));
      if (req.method === 'POST' && !id)
        return send(201, store.create(resource, await jsonBody(req)));
      if (req.method === 'PUT' && id)
        return send(200, store.update(resource, id, await jsonBody(req)));
      if (req.method === 'DELETE' && id) {
        const input = await jsonBody(req);
        if (!(input && typeof input === 'object' && 'confirm' in input && input.confirm === true))
          throw new AppError('Explicit deletion confirmation required');
        store.remove(resource, id);
        return send(200, { deleted: true });
      }
      throw new AppError('Method not allowed', 405);
    } catch (error) {
      if (error instanceof ZodError)
        return send(400, {
          error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
      if (error instanceof AppError) return send(error.status, { error: error.message });
      console.error('Request failed:', error);
      send(500, { error: 'An internal error occurred. Your change was not saved.' });
    }
  };
}
