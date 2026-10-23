(async()=>{
'use strict';
await (window.rgDataReady||Promise.resolve());
const $=id=>document.getElementById(id), KEY='rgforge3d_stock_v1';
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const dateBR=s=>{if(!s)return'—';const p=String(s).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:s};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const uid=()=>crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const safeNum=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let db={spools:[],history:[]},ready=false,saveChain=Promise.resolve(),channel=null;
function setStatus(msg,kind=''){let el=$('stockSyncStatus');if(!el){el=document.createElement('div');el.id='stockSyncStatus';el.className='notice';$('spoolForm').before(el)}el.textContent=msg;el.dataset.state=kind}
function normalize(v){return {spools:Array.isArray(v?.spools)?v.spools.filter(s=>s&&s.id).map(s=>({...s,weight:Math.max(1,safeNum(s.weight)),remaining:safeNum(s.remaining),price:Math.max(0,safeNum(s.price)),threshold:Math.max(0,safeNum(s.threshold)),material:String(s.material||'PLA'),brand:String(s.brand||''),color:String(s.color||'')})):[],history:Array.isArray(v?.history)?v.history.filter(h=>h&&h.id).map(h=>({...h,grams:Math.max(0,safeNum(h.grams)),qty:Math.max(1,safeNum(h.qty)),cost:Math.max(0,safeNum(h.cost))})):[]}}
async function persist(label='Salvando no Supabase…'){
 if(!ready)throw new Error('Os dados ainda não terminaram de carregar.');
 const client=window.rgSupabase;if(!client)throw new Error('Cliente Supabase indisponível.');
 const snapshot=JSON.parse(JSON.stringify(db));setStatus(label,'saving');
 saveChain=saveChain.catch(()=>{}).then(async()=>{
  const {data:{user},error:userErr}=await client.auth.getUser();if(userErr)throw userErr;if(!user)throw new Error('Sessão não autenticada. Entre novamente.');
  const {error}=await client.from('app_data').upsert({user_id:user.id,data_key:KEY,payload:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id,data_key'});if(error)throw error;
  setStatus('Sincronizado e confirmado no Supabase ✓','ok');
 }).catch(err=>{setStatus('ERRO: não confirmado no Supabase — '+(err.message||'verifique a conexão/RLS'),'error');console.error('Falha ao salvar estoque:',err);throw err});
 return saveChain;
}
async function loadCloud(){
 setStatus('Carregando estoque do Supabase…','loading');
 const {data:{user},error:userErr}=await window.rgSupabase.auth.getUser();if(userErr)throw userErr;if(!user)throw new Error('Sessão ausente.');
 const {data,error}=await window.rgSupabase.from('app_data').select('payload').eq('user_id',user.id).eq('data_key',KEY).maybeSingle();if(error)throw error;
 db=normalize(data?.payload||{});ready=true;render();setStatus(data?.payload?'Estoque carregado do Supabase ✓':'Nenhum rolo na nuvem ainda.','ok');
 channel=window.rgSupabase.channel('rg-stock-page-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'app_data',filter:'user_id=eq.'+user.id},async p=>{
  if(p.eventType==='DELETE'&&p.old?.data_key===KEY){db={spools:[],history:[]};render();return}
  if(p.new?.data_key===KEY){const {data,error}=await window.rgSupabase.from('app_data').select('payload').eq('user_id',user.id).eq('data_key',KEY).maybeSingle();if(!error){db=normalize(data?.payload||{});render();setStatus('Atualizado pelo Supabase ✓','ok')}}
 }).subscribe();
}
function render(){
 const rows=$('spoolRows'),sel=$('projectSpool');rows.replaceChildren();sel.replaceChildren();
 let total=0,alerts=0;
 db.spools.forEach(s=>{
  total+=s.remaining;const low=s.remaining<=s.threshold,empty=s.remaining<=0;if(low)alerts++;
  const tr=document.createElement('tr');
  const cells=[`${s.material} · ${s.brand} · ${s.color} (${s.weight} g rolo)`,`${s.remaining.toLocaleString('pt-BR',{maximumFractionDigits:1})} g`,money(s.price),money(s.price/s.weight),empty?'ESGOTADO':low?'ESTOQUE BAIXO':'OK'];
  cells.forEach((v,i)=>{const td=document.createElement('td');if(i===4){const span=document.createElement('span');span.className='status '+(empty?'low':low?'warn':'ok');span.textContent=v;td.appendChild(span)}else td.textContent=v;tr.appendChild(td)});
  const td=document.createElement('td');
  const add=document.createElement('button');add.type='button';add.className='small-btn';add.textContent='＋ Entrada';add.addEventListener('click',async()=>{const raw=prompt(`Quantos gramas deseja adicionar ao rolo ${s.brand} ${s.color}?`);if(raw===null)return;const n=Number(raw);if(!(n>0))return alert('Informe uma quantidade maior que zero.');const old=db;db={...db,spools:db.spools.map(x=>x.id===s.id?{...x,remaining:x.remaining+n}:x)};render();try{await persist('Salvando entrada de estoque…')}catch(e){db=old;render();alert('Entrada NÃO confirmada no Supabase. '+e.message)}});td.appendChild(add);
  const del=document.createElement('button');del.type='button';del.className='small-btn danger-btn';del.textContent='Excluir';del.addEventListener('click',async()=>{if(!confirm(`Excluir o rolo ${s.brand} ${s.color}? O histórico de projetos será mantido.`))return;const old=db;db={...db,spools:db.spools.filter(x=>x.id!==s.id)};render();try{await persist('Excluindo rolo no Supabase…')}catch(e){db=old;render();alert('Exclusão não confirmada. '+e.message)}});td.appendChild(del);tr.appendChild(td);rows.appendChild(tr);
  const opt=document.createElement('option');opt.value=s.id;opt.textContent=`${s.material} · ${s.brand} · ${s.color} (${s.remaining.toLocaleString('pt-BR')} g)`;sel.appendChild(opt);
 });
 $('rollCount').textContent=db.spools.length;$('weightTotal').textContent=total.toLocaleString('pt-BR',{maximumFractionDigits:1})+' g';$('alertCount').textContent=alerts;$('emptyStock').style.display=db.spools.length?'none':'block';
 $('alerts').replaceChildren();if(alerts){const p=document.createElement('p');p.className='notice';p.textContent=`⚠️ Atenção: ${alerts} rolo(s) com estoque baixo ou esgotado. Confira os materiais sinalizados na tabela.`;$('alerts').appendChild(p)}
 const h=$('historyRows');h.replaceChildren();[...db.history].reverse().forEach(p=>{const tr=document.createElement('tr');[dateBR(p.date),p.name,p.spoolLabel,`${Number(p.grams).toLocaleString('pt-BR')} g`,String(p.qty),money(p.cost)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td)});h.appendChild(tr)});$('emptyHistory').style.display=db.history.length?'none':'block';
}
$('spoolForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!ready)return alert('Aguarde a conexão com o Supabase.');
 const weight=Number($('initialWeight').value),price=Number($('invoicePrice').value),brand=$('brand').value.trim(),color=$('color').value.trim();
 if(!(weight>0)||price<0||!brand||!color)return alert('Confira material, marca, cor, peso e preço.');
 const old=db;db={...db,spools:[...db.spools,{id:uid(),material:$('material').value,brand,color,weight,remaining:weight,price,threshold:Math.max(0,Number($('threshold').value)||0),createdAt:new Date().toISOString()}]};render();
 const btn=e.target.querySelector('button[type=submit]');btn.disabled=true;
 try{await persist('Salvando rolo no Supabase…');e.target.reset();$('initialWeight').value=1000;$('invoicePrice').value=100;$('threshold').value=150}
 catch(err){db=old;render();alert('O rolo NÃO foi salvo no Supabase. '+err.message)}finally{btn.disabled=false}
});
$('projectDate').value=today();
$('projectForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!ready)return alert('Aguarde a conexão com o Supabase.');
 const s=db.spools.find(x=>x.id===$('projectSpool').value),grams=Number($('projectGrams').value),qty=Math.max(1,Number($('projectQty').value)||1),name=$('projectName').value.trim();
 if(!s)return alert('Cadastre um rolo de filamento antes de registrar um projeto.');if(!(grams>0)||!name)return alert('Informe o projeto e o consumo em gramas.');
 if(grams>s.remaining&&!confirm(`O projeto consome ${grams} g, mas o rolo tem ${s.remaining.toLocaleString('pt-BR')} g. O saldo ficará negativo. Continuar?`))return;
 const old=db,entry={id:uid(),name,spoolId:s.id,spoolLabel:`${s.material} · ${s.brand} · ${s.color}`,grams,qty,date:$('projectDate').value||today(),cost:grams*s.price/s.weight};
 db={...db,spools:db.spools.map(x=>x.id===s.id?{...x,remaining:x.remaining-grams}:x),history:[...db.history,entry]};render();
 const btn=e.target.querySelector('button[type=submit]');btn.disabled=true;
 try{await persist('Salvando consumo e histórico no Supabase…');$('projectName').value='';$('projectGrams').value='';$('projectQty').value=1}
 catch(err){db=old;render();alert('Consumo NÃO confirmado no Supabase; estoque restaurado na tela. '+err.message)}finally{btn.disabled=false}
});
$('exportStock').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download='rgforge3d-backup-estoque.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
$('importStock').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const imported=normalize(JSON.parse(await f.text()));if(!confirm('Importar backup e substituir o estoque/histórico atual no Supabase?'))return;const old=db;db=imported;render();try{await persist('Importando backup para o Supabase…');alert('Backup importado e confirmado no Supabase.')}catch(err){db=old;render();throw err}}catch(err){alert('Não foi possível importar/salvar o backup: '+err.message)}finally{e.target.value=''}});
$('printStock').addEventListener('click',()=>window.print());
try{await loadCloud()}catch(e){console.error('Falha ao carregar estoque:',e);ready=false;setStatus('Erro ao carregar Supabase: '+(e.message||e),'error');const p=document.createElement('p');p.className='notice';p.textContent='Não foi possível carregar o estoque da nuvem. Verifique a sessão, a tabela app_data e as políticas RLS.';$('alerts').replaceChildren(p)}
})();
