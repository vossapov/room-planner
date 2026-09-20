import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
let mod={};try{mod=await import('./cloud.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
test('save publishes UTF-8 concept and verifies exact remote readback',async()=>{assert.equal(typeof mod.GitHubConcepts,'function','cloud client missing');let stored,calls=[];const api=async(url,opt={})=>{calls.push([url,opt]);if(opt.method==='PUT'){stored=JSON.parse(opt.body);return new Response(JSON.stringify({content:{sha:'abc'}}),{status:201})}return new Response(JSON.stringify({content:stored.content,encoding:'base64'}),{status:200})};const c=new mod.GitHubConcepts({fetch:api});c.connect('test-only-not-a-real-credential');const doc={name:'Мій концепт',layout:{x:42}};await c.save('мій-план-123.json',doc);assert.equal(calls.length,2);assert.match(calls[0][0],/^https:\/\/api.github.com\/repos\/vossapov\/room-planner\/contents\/concepts\//);assert.deepEqual(JSON.parse(Buffer.from(stored.content,'base64').toString()),doc);assert.equal(stored.branch,'main');assert.equal(calls[0][1].headers.Authorization,'Bearer test-only-not-a-real-credential')});

test('writes require explicit connection and token cannot be serialized',async()=>{let calls=0;const c=new mod.GitHubConcepts({fetch:async()=>{calls++;return new Response('{}')}});await assert.rejects(()=>c.save('plan.json',{}),/Підключи/);assert.equal(calls,0);c.connect('test-private');assert.equal(c.connected,true);assert.ok(!JSON.stringify(c).includes('test-private'));c.disconnect();assert.equal(c.connected,false)});

test('public concept library restricts paths to JSON and sorts files',async()=>{const c=new mod.GitHubConcepts({fetch:async()=>new Response(JSON.stringify([{name:'z.json',type:'file'},{name:'a.json',type:'file'},{name:'nested',type:'dir'},{name:'readme.md',type:'file'}]))});assert.equal(typeof c.list,'function');assert.deepEqual((await c.list()).map(x=>x.name),['a.json','z.json']);await assert.rejects(()=>c.load('../secret.json'),/ім’я/)});

test('standalone page exposes cloud save/load and transient password entry',()=>{const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');for(const id of ['cloudSave','cloudList','cloudLoad','cloudRefresh','cloudToken','cloudConnect','cloudDisconnect'])assert.ok(html.includes('id="'+id+'"'),id+' missing');assert.match(html,/<input[^>]*id="cloudToken"[^>]*type="password"/);assert.ok(html.includes('new GitHubConcepts'))});

test('native browser fetch is called with the global receiver',async()=>{const c=new mod.GitHubConcepts({fetch:async function(){assert.equal(this,globalThis);return new Response('[]')}});assert.deepEqual(await c.list(),[])});

test('public reads use the CDN, so browsing is not capped by the 60/hour API limit',async()=>{const urls=[];const body=JSON.stringify({name:'A'});
 const c=new mod.GitHubConcepts({fetch:async(u)=>{urls.push(u);
  if(u.includes('api.github.com')&&u.includes('/a.json'))return new Response(JSON.stringify({content:Buffer.from(body).toString('base64'),encoding:'base64'}));
  if(u.includes('api.github.com'))return new Response('[{"name":"a.json","type":"file"}]');
  return new Response(body)}});
 await c.list();await c.load('a.json');
 assert.ok(urls.some(u=>u.startsWith('https://raw.githubusercontent.com/vossapov/room-planner/main/concepts/a.json')),'concept body must come from raw.githubusercontent.com, got '+JSON.stringify(urls));
 c.connect('test-key');urls.length=0;await c.load('a.json');
 assert.ok(urls.every(u=>!u.startsWith('https://raw')),'an authenticated reader must use the API for fresh data');});
