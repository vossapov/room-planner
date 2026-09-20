export class GitHubConcepts {
 #token='';
 constructor({fetch:fetcher=globalThis.fetch}={}){this.fetch=fetcher;this.base='https://api.github.com/repos/vossapov/room-planner/contents/concepts'}
 connect(token){this.#token=String(token).trim()}
 disconnect(){this.#token=''}
 get connected(){return Boolean(this.#token)}
 async request(path='',options={}){const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...options.headers};if(this.#token)headers.Authorization='Bearer '+this.#token;const r=await this.fetch(this.base+path,{...options,headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok){const messages={401:'Ключ недійсний або прострочений',403:'Немає дозволу або вичерпано ліміт GitHub',404:'Репозиторій чи концепт недоступний',409:'Конфлікт версій. Збережи як новий концепт',422:'GitHub відхилив запис. Спробуй нову назву'};throw Error(messages[r.status]||'GitHub: HTTP '+r.status)}return r.json()}
 validName(filename){if(typeof filename!=='string'||filename.includes('..')||!/^[\p{L}\p{N}][\p{L}\p{N}._-]{0,140}\.json$/u.test(filename))throw Error('Некоректне ім’я концепту');return filename}
 async list(){const rows=await this.request('?ref=main');if(!Array.isArray(rows))throw Error('Некоректна бібліотека');return rows.filter(r=>r.type==='file'&&r.name.endsWith('.json')).sort((a,b)=>a.name.localeCompare(b.name))}
 async load(filename){this.validName(filename);const r=await this.request('/'+encodeURIComponent(filename)+'?ref=main');const bytes=Uint8Array.from(atob(r.content.replace(/\s/g,'')),c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}
 async save(filename,document){this.validName(filename);if(!this.connected)throw Error('Підключи ключ GitHub для запису');const content=btoa(Array.from(new TextEncoder().encode(JSON.stringify(document))).map(x=>String.fromCharCode(x)).join(''));await this.request('/'+encodeURIComponent(filename),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Save concept: '+String(document.name||filename).slice(0,80),content,branch:'main'})});const actual=await this.load(filename);if(JSON.stringify(actual)!==JSON.stringify(document))throw Error('Запис не підтверджено читанням GitHub');return actual}
}
