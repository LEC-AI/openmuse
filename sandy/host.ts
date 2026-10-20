import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import type { ComputerService } from '../apps/server/src/computer.ts';

/** Only computer execution. The authenticated host owns all approvals. */
export function hostApp(computer: ComputerService, token: string, owner: string) {
  if (token.length < 32 || !owner) throw new Error('Host owner and strong token required');
  const app = new Hono();
  app.use('*', async (c, next) => {
    const actual = Buffer.from(c.req.header('Authorization') ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return c.json({error:'Unauthorized'},401);
    await next();
  });
  app.onError((_err,c) => c.json({error:'Computer operation failed; inspect before retrying'},503));
  app.post('/api/computer/start', async c => c.json(await computer.start(owner)));
  app.post('/api/computer/stop', async c => c.json(await computer.stop(owner)));
  app.post('/api/computer/desktop/actions', async c => {
    const input = await c.req.json();
    const key = c.req.header('Idempotency-Key');
    if (input.action !== 'screenshot' && !key) return c.json({error:'Operation ID required'},422);
    const {receipt,width,height,warning} = await computer.desktopAction(owner,input,{idempotencyKey:key});
    return c.json({receipt,width,height,warning});
  });
  app.get('/api/computer/desktop/screenshot', async c => {
    const {mimeType,bytes} = await computer.latestScreenshot(owner,c.req.query('receipt'));
    c.header('Content-Type',mimeType); c.header('Cache-Control','no-store');
    return c.body(new Uint8Array(bytes));
  });
  return app;
}
