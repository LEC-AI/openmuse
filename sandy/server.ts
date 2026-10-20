import { serve } from '@hono/node-server';
import { ComputerService } from '../apps/server/src/computer.ts';
import { createStore } from '../apps/server/src/db.ts';
import { hostApp } from './host.ts';
const dataDir = process.env.SANDY_COMPUTER_DATA_DIR ?? './sandy-computer-data';
const port = Number(process.env.PORT ?? 18213);
const config = {mode:'live' as const,port,host:'127.0.0.1',publicUrl:`http://127.0.0.1:${port}`,
  dataDir,agentBackend:'sample' as const,googleRedirectUri:'',allowedOrigins:[],
  computerEnabled:true,computerProvider:'e2b-desktop' as const,
  computerDeploymentId:'sandy',e2bApiKey:process.env.E2B_API_KEY};
const store = await createStore({dataDir});
const app = hostApp(new ComputerService(store, config),process.env.SANDY_COMPUTER_TOKEN ?? '',process.env.SANDY_COMPUTER_OWNER ?? '');
serve({fetch:app.fetch,port,hostname:'127.0.0.1'});
