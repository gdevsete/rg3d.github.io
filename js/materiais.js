(async()=>{
'use strict';
await (window.rgDataReady||Promise.resolve());
const $=id=>document.getElementById(id), KEY='rgforge3d_materials_v1';
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let records=[],ready=false,saveChain=Promise.resolve();
const status=(message,kind='')=>{const e=$('materialsStatus');e.textContent=message;e.dataset.state=kind};
const fail=message=>{const e=$('materialsError');e.hidden=false;e.textContent=message};
const clearFail=()=>{$('materialsError').hidden=true;$('materialsError').textContent=''};
const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:0};
const safeText=v=>String(v??'');
function normalize(list){return Array.isArray(list)?list.filter(x=>x&&x.id).map(x=>({...x,name:safeText(x.name),type:safeText(x.type||'Insumo'),category:safeText(x.category||'Outros insumos'),value:num(x.value),quantity:num(x.quantity),unit:safeText(x.unit||'un'),date:safeText(x.date||today()),supplier:safeText(x.supplier),invoice:safeText(x.invoice),remaining:x.remaining===''||x.remaining==null?null:num(x.remaining),notes:safeText(x.notes)})):[]}
function calcUnit(r){return r.quantity>0?r.value/r.quantity:null}
function visibleRecords(){const q=$('searchMaterials').value.trim().toLocaleLowerCase('pt-BR'),type=$('filterType').value,cat=$('filterCategory').value;return records.filter(r=>(!type||r.type===type)&&(!cat||r.category===cat)&&(!q||[r.name,r.category,r.supplier,r.invoice,r.notes].join(' ').toLocaleLowerCase('pt-BR').includes(q))).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function render(){
 const total=records.reduce((s,r)=>s+r.value,0),supplies=records.filter(r=>['Insumo','Embalagem','Acessório'].includes(r.type)).reduce((s,r)=>s+r.value,0),equipment=records.filter(r=>['Investimento','Ferramenta','Manutenção'].includes(r.type)).reduce((s,r)=>s+r.value,0);
 $('totalInvested').textContent=money(total);$('totalSupplies').textContent=money(supplies);$('totalEquipment').textContent=money(equipment);$('recordCount').textContent=String(records.length);
 const cats=[...new Set(records.map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')),select=$('filterCategory'),old=select.value;select.innerHTML='<option value="">Todas as categorias</option>';cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;select.appendChild(o)});if(cats.includes(old))select.value=old;
 const tbody=$('materialsRows');tbody.replaceChildren();const shown=visibleRecords();
 shown.forEach(r=>{
  const tr=document.createElement('tr');
  [r.date,r.name,`${r.type} · ${r.category}`,r.supplier||'—',r.quantity?`${r.quantity} ${r.unit}`:'—',money(r.value),calcUnit(r)!==null?money(calcUnit(r))+'/'+r.unit:'—'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td)});
  const td=document.createElement('td');td.className='materials-row-actions';
  const edit=document.createElement('button');edit.type='button';edit.className='materials-edit';edit.textContent='Editar';edit.addEventListener('click',()=>fillForm(r));td.appendChild(edit);
  const del=document.createElement('button');del.type='button';del.className='materials-delete';del.textContent='Excluir';del.addEventListener('click',()=>removeRecord(r.id));td.appendChild(del);tr.appendChild(td);tbody.appendChild(tr);
 });
 $('materialsEmpty').hidden=shown.length>0;
}
function readForm(){
 const quantity=num($('recordQuantity').value),value=num($('recordValue').value),remaining=$('recordRemaining').value.trim();
 return {id:$('recordId').value|| (crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`),name:$('recordName').value.trim(),type:$('recordType').value,category:$('recordCategory').value,value,quantity,unit:$('recordUnit').value,date:$('recordDate').value||today(),supplier:$('recordSupplier').value.trim(),invoice:$('recordInvoice').value.trim(),remaining:remaining===''?null:num(remaining),notes:$('recordNotes').value.trim(),updatedAt:new Date().toISOString()};
}
async function persist(snapshot,label){
 if(!ready)throw new Error('Aguarde o carregamento do Supabase.');
 const client=window.rgSupabase;if(!client)throw new Error('Cliente Supabase indisponível.');
 status(label,'saving');
 saveChain=saveChain.catch(()=>{}).then(async()=>{
  const {data:{user},error:userError}=await client.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Sessão não autenticada.');
  const {error}=await client.from('app_data').upsert({user_id:user.id,data_key:KEY,payload:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id,data_key'});if(error)throw error;
  status('Salvo e confirmado no Supabase ✓','ok');clearFail();
 });
 try{await saveChain}catch(e){status('ERRO: não confirmado no Supabase','error');fail(`A alteração não foi salva na nuvem: ${e.message||e}. Confira a tabela app_data, as políticas RLS e a conexão.`);throw e}
}
async function load(){
 status('Carregando dados do Supabase…','loading');
 const {data:{user},error:userError}=await window.rgSupabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Sessão não autenticada.');
 const {data,error}=await window.rgSupabase.from('app_data').select('payload').eq('user_id',user.id).eq('data_key',KEY).maybeSingle();if(error)throw error;
 records=normalize(data?.payload?.records||data?.payload||[]);ready=true;$('recordDate').value=today();render();status(data?.payload?'Dados carregados do Supabase ✓':'Nenhum registro na nuvem ainda.','ok');
 window.rgSupabase.channel('rg-materials-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'app_data',filter:'user_id=eq.'+user.id},async p=>{
  const row=p.new;if(p.eventType==='DELETE'&&p.old?.data_key===KEY){records=[];render();return}
  if(row?.data_key===KEY){const {data,error}=await window.rgSupabase.from('app_data').select('payload').eq('user_id',user.id).eq('data_key',KEY).maybeSingle();if(!error){records=normalize(data?.payload?.records||data?.payload||[]);render();status('Sincronizado com Supabase ✓','ok')}}
 }).subscribe();
}
function fillForm(r){
 $('recordId').value=r.id;$('recordName').value=r.name;$('recordType').value=r.type;$('recordCategory').value=r.category;$('recordValue').value=r.value;$('recordQuantity').value=r.quantity||1;$('recordUnit').value=r.unit;$('recordDate').value=r.date;$('recordSupplier').value=r.supplier;$('recordInvoice').value=r.invoice;$('recordRemaining').value=r.remaining??'';$('recordNotes').value=r.notes;
 $('formHeading').textContent='Editar material ou investimento';$('saveMaterialBtn').textContent='Salvar alterações no Supabase';$('cancelEditBtn').hidden=false;updateUnitCost();window.scrollTo({top:0,behavior:'smooth'});
}
function resetForm(){ $('materialForm').reset();$('recordId').value='';$('recordQuantity').value='1';$('recordDate').value=today();$('recordUnitCost').value='';$('formHeading').textContent='01 · Cadastrar material ou investimento';$('saveMaterialBtn').textContent='＋ Salvar no Supabase';$('cancelEditBtn').hidden=true}
function updateUnitCost(){const q=num($('recordQuantity').value),v=num($('recordValue').value);$('recordUnitCost').value=q>0&&v>0?money(v/q)+' por '+$('recordUnit').value:'Será calculado ao informar valor e quantidade'}
async function removeRecord(id){
 const item=records.find(r=>r.id===id);if(!item||!confirm(`Excluir "${item.name}"? Essa exclusão será gravada no Supabase.`))return;
 const old=records;records=records.filter(r=>r.id!==id);render();
 try{await persist({records},'Excluindo e confirmando no Supabase…')}catch(e){records=old;render();alert('Não foi possível excluir. O registro foi restaurado na tela.')}
}
$('materialForm').addEventListener('submit',async e=>{
 e.preventDefault();clearFail();if(!ready){alert('Aguarde o carregamento do Supabase.');return}
 const r=readForm();if(!r.name||r.value<=0){alert('Preencha a descrição e um valor maior que zero.');return}
 const old=records,editing=Boolean($('recordId').value);records=editing?records.map(x=>x.id===r.id?r:x):[r,...records];render();
 const btn=$('saveMaterialBtn');btn.disabled=true;const oldLabel=btn.textContent;btn.textContent='Salvando…';
 try{await persist({records},editing?'Atualizando material no Supabase…':'Gravando material no Supabase…');resetForm();render()}
 catch(err){records=old;render();alert('O registro NÃO foi confirmado no Supabase. '+err.message)}
 finally{btn.disabled=false;btn.textContent=oldLabel}
});
['recordQuantity','recordValue','recordUnit'].forEach(id=>$(id).addEventListener('input',updateUnitCost));
$('cancelEditBtn').addEventListener('click',resetForm);
$('searchMaterials').addEventListener('input',render);$('filterType').addEventListener('change',render);$('filterCategory').addEventListener('change',render);
$('exportMaterialsBtn').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({records},null,2)],{type:'application/json'}));a.download='rg-forge3d-materiais-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
$('printMaterialsBtn').addEventListener('click',()=>window.print());
try{await load()}catch(e){console.error('Falha ao carregar materiais:',e);status('Erro ao carregar Supabase','error');fail('Não foi possível carregar os materiais da nuvem. '+(e.message||e));}
})();