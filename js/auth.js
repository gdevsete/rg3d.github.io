(()=>{'use strict';
const LOGIN='login.html';
const url=window.RG_SUPABASE_URL, key=window.RG_SUPABASE_PUBLISHABLE_KEY;
const KEYS=['rgforge3d_stock_v1','rgforge3d_calc_v1','rgforge3d-tools-v1','rgforge3d_finance_v1','rgforge3d_business_v1','rgforge3d_materials_v1'];
if(!window.supabase||!url||!key){document.body.innerHTML='<p style="padding:2rem;color:#fff;background:#111">Erro: Supabase não carregou. Atualize a página ou confira a configuração.</p>';throw new Error('Supabase config missing');}
// O cliente Auth é criado antes do adaptador de dados para que a sessão do Supabase continue funcionando.
const client=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.rgSupabase=client;
const path=location.pathname.split('/').pop()||'index.html';
const memory=new Map();let userId=null;const pending=new Map();let readyResolve,readyReject;
window.rgDataReady=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject});
function emitChange(k,oldValue,newValue){try{window.dispatchEvent(new CustomEvent('rg-cloud-change',{detail:{key:k,oldValue,newValue}}));window.dispatchEvent(new CustomEvent('rg-data-synced',{detail:{key:k}}));}catch(e){}}
function showCloudError(message){let el=document.getElementById('rgCloudStatus');if(!el){el=document.createElement('div');el.id='rgCloudStatus';el.style.cssText='position:fixed;z-index:99999;bottom:12px;left:12px;right:12px;padding:12px 16px;border:1px solid #b83b27;border-radius:8px;background:#321612;color:#fff;font:14px system-ui;box-shadow:0 4px 24px #0008';document.body.appendChild(el);}el.textContent='ERRO DE SINCRONIZAÇÃO: os dados não foram confirmados no Supabase. Não feche esta página antes de tentar salvar novamente. '+message;}
function showCloudOk(){const el=document.getElementById('rgCloudStatus');if(el)el.remove();}
async function saveRemote(k,value){if(!userId)throw new Error('Sessão Supabase ausente.');const payload=JSON.parse(value);const {error}=await client.from('app_data').upsert({user_id:userId,data_key:k,payload,updated_at:new Date().toISOString()},{onConflict:'user_id,data_key'});if(error)throw error;showCloudOk();}
function queueSave(k,value){const previous=pending.get(k)||Promise.resolve();const next=previous.catch(()=>{}).then(()=>saveRemote(k,value)).catch(e=>{console.error('Supabase save failed:',k,e);showCloudError(e.message||'Falha ao gravar registro.');throw e});pending.set(k,next);return next;}
// Adaptador compatível com o código legado, mas somente em memória: não lê nem grava localStorage/sessionStorage.
const cloudStore={get length(){return memory.size},key(i){return [...memory.keys()][i]??null},getItem(k){return memory.has(String(k))?memory.get(String(k)):null},setItem(k,v){k=String(k);v=String(v);const old=this.getItem(k);memory.set(k,v);emitChange(k,old,v);if(KEYS.includes(k))queueSave(k,v).catch(()=>{});},removeItem(k){k=String(k);const old=this.getItem(k);memory.delete(k);if(KEYS.includes(k)&&userId){const p=queueSave(k,'{}').then(()=>client.from('app_data').delete().eq('user_id',userId).eq('data_key',k));p.catch(e=>showCloudError(e.message||'Falha ao excluir'));}emitChange(k,old,null)},clear(){for(const k of [...memory.keys()])this.removeItem(k)}};
try{Object.defineProperty(window,'localStorage',{configurable:true,value:cloudStore});}catch(e){console.error('Could not install cloud-only storage adapter',e);}
window.rgCloudStore=cloudStore;
window.rgCloudFlush=async()=>{await Promise.all([...pending.values()]);};
async function hydrate(){const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;if(!session)throw new Error('Sessão não autenticada.');userId=session.user.id;
 const {data,error}=await client.from('app_data').select('data_key,payload').eq('user_id',userId).in('data_key',KEYS);if(error)throw error;
 memory.clear();for(const row of data||[])memory.set(row.data_key,JSON.stringify(row.payload??{}));
 // Real-time updates let other open pages/devices refresh their in-memory view from Supabase.
 try{client.channel('rgforge3d-app-data-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'app_data',filter:'user_id=eq.'+userId},async payload=>{
   if(payload.eventType==='DELETE'){const k=payload.old?.data_key;if(KEYS.includes(k)){const old=memory.get(k)??null;memory.delete(k);emitChange(k,old,null);}return;}
   const row=payload.new;if(!row||!KEYS.includes(row.data_key))return;const old=memory.get(row.data_key)??null;const value=JSON.stringify(row.payload??{});memory.set(row.data_key,value);emitChange(row.data_key,old,value);
 }).subscribe();}catch(e){console.warn('Realtime subscription could not start',e)}
}
function showAuthError(msg){const el=document.getElementById('loginError');if(el){el.textContent=msg;el.hidden=false;}}
async function init(){
 if(path===LOGIN){const form=document.getElementById('loginForm');if(form)form.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type=submit]');btn.disabled=true;showAuthError('');try{const username=document.getElementById('username').value.trim().toLowerCase();const password=document.getElementById('password').value;if(username!=='ray')throw new Error('Usuário ou senha inválidos.');const {error}=await client.auth.signInWithPassword({email:'ray@rgforge3d.local',password});if(error)throw error;location.replace('index.html');}catch(err){showAuthError(err.message==='Invalid login credentials'?'Usuário ou senha inválidos.':(err.message||'Não foi possível entrar.'));}finally{btn.disabled=false;}});const {data:{session}}=await client.auth.getSession();readyResolve();if(session)location.replace('index.html');return;}
 document.documentElement.style.visibility='hidden';
 try{await hydrate();readyResolve();}catch(e){console.error('Supabase initialization failed:',e);readyReject(e);location.replace('login.html?reason=cloud');return;}
 document.documentElement.style.visibility='';
 const header=document.querySelector('.app-header');if(header&&!document.getElementById('logoutBtn')){const b=document.createElement('button');b.id='logoutBtn';b.className='small-btn';b.textContent='Sair';b.style.marginLeft='12px';b.onclick=async()=>{await window.rgCloudFlush().catch(()=>{});await client.auth.signOut();location.replace('login.html')};header.appendChild(b);}
 client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')location.replace('login.html');});
}
init();
})();