import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ComputerService} from '../apps/server/src/computer.ts';
import {createStore} from '../apps/server/src/db.ts';
import {hostApp} from './host.ts';
test('real ComputerService persists receipts behind host authentication',async()=>{
 const dataDir=await mkdtemp(join(tmpdir(),'sandy-computer-'));
 const store=await createStore();let inputs=0;
 const desktop={act:async (_labels:any,_action:any,before:()=>Promise<void>)=>{await before();inputs++;return {image:Buffer.from([255,216,255]),mimeType:'image/jpeg',width:20,height:20};}};
 const config:any={mode:'sample',computerEnabled:true,computerProvider:'e2b-desktop',computerDeploymentId:'fixture',dataDir};
 const app=hostApp(new ComputerService(store,config,undefined,desktop as any),'x'.repeat(32),'fixture-owner');
 const request=(token:string,key?:string,text='hello')=>app.request('/api/computer/desktop/actions',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify({action:'type',text})});
 try{
  assert.equal((await request('wrong','one')).status,401);
  assert.equal((await request('x'.repeat(32))).status,422);
  const first=await request('x'.repeat(32),'one');assert.equal(first.status,200);const result:any=await first.json();
  const replay:any=await (await request('x'.repeat(32),'one')).json();
  assert.equal(result.receipt.id,replay.receipt.id);assert.equal(inputs,1);
  assert.equal((await request('x'.repeat(32),'one','different')).status,503);assert.equal(inputs,1);
 }finally{await store.close();await rm(dataDir,{recursive:true,force:true});}
});
