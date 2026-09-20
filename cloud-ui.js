(()=>{
const cloud=new GitHubConcepts(),by=id=>document.getElementById(id);let busy=false;
function status(message){by('cloudStatus').textContent=message}
function lock(value){busy=value;for(const id of ['cloudSave','cloudLoad','cloudRefresh','cloudConnect','cloudDisconnect'])by(id).disabled=value}
async function refresh(){const rows=await cloud.list();const select=by('cloudList'),previous=select.value;select.replaceChildren(new Option('Оберіть концепт',''));for(const row of rows)select.add(new Option(row.name.replace(/\.json$/,'').replace(/--[a-f0-9-]+$/,''),row.name));if(rows.some(x=>x.name===previous))select.value=previous;status('На GitHub: '+rows.length+' концептів. '+(cloud.connected?'Ключ підключено в цій вкладці.':'Читання без входу; для запису підключи ключ.'));return rows}
async function action(fn){if(busy)return;lock(true);try{await fn()}catch(e){status(e.message);toast(e.message)}finally{lock(false)}}
by('cloudRefresh').onclick=()=>action(refresh);
by('cloudConnect').onclick=()=>action(async()=>{const input=by('cloudToken'),token=input.value.trim();input.value='';if(!token)throw Error('Встав fine-grained ключ лише для room-planner');cloud.connect(token);try{await refresh();by('cloudAccess').open=false}catch(e){cloud.disconnect();throw e}});
by('cloudDisconnect').onclick=()=>{cloud.disconnect();by('cloudToken').value='';status('Ключ видалено з пам’яті вкладки. Публічні концепти залишаються доступними.')};
by('cloudLoad').onclick=()=>action(async()=>{const filename=by('cloudList').value;if(!filename)throw Error('Спочатку обери концепт');const doc=await cloud.load(filename);window.roomEditor.importData(doc);by('cloudName').value=doc.name||filename.replace(/\.json$/,'');status('Відкрито з GitHub: '+by('cloudName').value)});
by('cloudSave').onclick=()=>action(async()=>{if(!cloud.connected){by('cloudAccess').open=true;throw Error('Підключи ключ GitHub у розділі доступу нижче')}const name=by('cloudName').value.trim();if(!name)throw Error('Дай концепту назву');const slug=name.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,60)||'concept';const filename=slug+'--'+crypto.randomUUID()+'.json';const doc={...window.roomEditor.exportData(),name:name.slice(0,80),savedAt:new Date().toISOString()};status('Збереження на GitHub…');await cloud.save(filename,doc);await refresh();by('cloudList').value=filename;status('Збережено на GitHub і перевірено: '+doc.name);toast('Концепт збережено на GitHub')});
// Token stays in a private JS field, never in storage, exports, or the repository.
window.addEventListener('pagehide',()=>cloud.disconnect());
action(refresh);
})();
