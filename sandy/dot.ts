/** Sandy control-plane adapter. Reuses the upstream hardened Docker executor;
 * no model, scheduler, connector credentials or approval authority lives here. */
import { DockerComputer } from '../apps/server/src/computer-backend.ts';
import { computerIdentity, runDocker, workspacePath } from '../apps/server/src/computer.ts';
import type { Config } from '../apps/server/src/config.ts';
import { z } from 'zod';

const request = z.object({
  scope: z.string().regex(/^[a-f0-9]{64}$/),
  deployment: z.string().min(1).max(128),
  image: z.string().min(1).max(250),
  operation: z.enum(['inspect', 'start', 'stop', 'execute']),
  command: z.string().max(16000).optional(),
  cwd: z.string().default('/workspace'),
}).strict();
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 20000) throw new Error('Request too large');
}
try {
  const q = request.parse(JSON.parse(input));
  const config = { computerImage: q.image, computerDeploymentId: q.deployment } as Config;
  const backend = new DockerComputer(config, runDocker);
  let result: unknown;
  if (q.operation === 'start') await backend.start(q.scope);
  if (q.operation === 'stop') await backend.stop(q.scope);
  if (q.operation === 'execute') {
    if (!q.command) throw new Error('Command required');
    result = await (await backend.running(q.scope)).exec(q.command, workspacePath(q.cwd));
  }
  process.stdout.write(JSON.stringify({ state: await backend.state(q.scope),
    identity: computerIdentity(config, q.scope), result }));
} catch {
  process.stderr.write('Task environment refused or unavailable');
  process.exitCode = 1;
}
