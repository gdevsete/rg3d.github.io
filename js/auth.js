(()=>{'use strict';
const LOGIN='login.html', url=window.RG_SUPABASE_URL, key=window.RG_SUPABASE_PUBLISHABLE_KEY;
if(!window.supabase||!url||!key){console.error('Supabase não carregado ou configuração ausente.');return;}
const client=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.rgSupabase=client;
const path=location.pathname.split('/').pop()||'index.html';
function showError(msg){const el=document.getElementById('loginError');if(el){el.textContent=msg;el.hidden=false;}}
async function syncLocalToCloud(user){
  // Sincroniza os dados locais da aplicação por chave, vinculados ao usuário autenticado.
  const keys=['rgforge3d_stock_v1','rgforge3d_calc_v1','rgforge3d-tools-v1','rgforge3d_finance_v1','rgforge3d_business_v1'];
  for(const dataKey of keys){const raw=localStorage.getItem(dataKey);
    const {data:existing,error:readError}=await client.from('app_data').select('id,updated_at,payload').eq('user_id',user.id).eq('data_key',dataKey).maybeSingle();
    if(readError) throw readError;
    if(!existing){if(raw!==null){const {error}=await client.from('app_data').insert({user_id:user.id,data_key:dataKey,payload:JSON.parse(raw)});if(error)throw error;}}
    else if(raw===null){localStorage.setItem(dataKey,JSON.stringify(existing.payload));localStorage.setItem(dataKey+'__updated',String(Date.parse(existing.updated_at)||Date.now()));}
    else {const cloudTime=Date.parse(existing.updated_at||0);const localTime=Number(localStorage.getItem(dataKey+'__updated')||0);if(localTime>cloudTime){const {error}=await client.from('app_data').update({payload:JSON.parse(raw),updated_at:new Date().toISOString()}).eq('id',existing.id);if(error)throw error;}else{localStorage.setItem(dataKey,JSON.stringify(existing.payload));localStorage.setItem(dataKey+'__updated',String(cloudTime||Date.now()));}}
  }
}
// Guarda localStorage e envia alterações para a nuvem com debounce, sem bloquear a interface.
const originalSet=Storage.prototype.setItem;let timer;
Storage.prototype.setItem=function(k,v){originalSet.call(this,k,v);if(['rgforge3d_stock_v1','rgforge3d_calc_v1','rgforge3d-tools-v1','rgforge3d_finance_v1','rgforge3d_business_v1'].includes(k)){originalSet.call(this,k+'__updated',String(Date.now()));clearTimeout(timer);timer=setTimeout(async()=>{try{const {data:{user}}=await client.auth.getUser();if(!user)return;const payload=JSON.parse(v);const {data,error}=await client.from('app_data').select('id').eq('user_id',user.id).eq('data_key',k).maybeSingle();if(error)throw error;if(data){const r=await client.from('app_data').update({payload,updated_at:new Date().toISOString()}).eq('id',data.id);if(r.error)throw r.error;}else{const r=await client.from('app_data').insert({user_id:user.id,data_key:k,payload});if(r.error)throw r.error;}}catch(e){console.error('Falha ao sincronizar dados com Supabase:',e.message);}},700);}};
async function init(){
 if(path==='login.html'){
   const form=document.getElementById('loginForm');if(form)form.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type=submit]');btn.disabled=true;showError('');try{const username=document.getElementById('username').value.trim().toLowerCase();const password=document.getElementById('password').value;if(username!=='ray')throw new Error('Usuário ou senha inválidos.');const {data,error}=await client.auth.signInWithPassword({email:'ray@rgforge3d.local',password});if(error)throw error;await syncLocalToCloud(data.user);location.replace('index.html');}catch(err){showError(err.message==='Invalid login credentials'?'Usuário ou senha inválidos.':(err.message||'Não foi possível entrar.'));}finally{btn.disabled=false;}});
   const {data:{session}}=await client.auth.getSession();if(session)location.replace('index.html');return;
 }
 document.documentElement.style.visibility='hidden';
 const {data:{session},error}=await client.auth.getSession();
 if(error||!session){location.replace('login.html');return;}
 try{await syncLocalToCloud(session.user);window.dispatchEvent(new CustomEvent('rg-data-synced'));}catch(e){console.error('Supabase sync:',e);alert('Login realizado, mas a sincronização falhou. Confira se executou o SQL de setup no Supabase.');}
 document.documentElement.style.visibility='';
 const header=document.querySelector('.app-header');if(header&&!document.getElementById('logoutBtn')){const b=document.createElement('button');b.id='logoutBtn';b.className='small-btn';b.textContent='Sair';b.style.marginLeft='12px';b.onclick=async()=>{await client.auth.signOut();location.replace('login.html')};header.appendChild(b);}
 client.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT')location.replace('login.html');});
}
init();})();