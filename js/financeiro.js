(async()=>{
  'use strict';
  await (window.rgDataReady || Promise.resolve());
  const $=id=>document.getElementById(id);
  const KEY='rgforge3d_finance_v1';
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const defaults={settings:{energyHour:.2,machineHour:.5,laborHour:5,wastePct:5,salesFee:0,targetMargin:40},expenses:[]};
  let state=structuredClone(defaults), saveChain=Promise.resolve(), dirty=false, ready=false;
  const safeNum=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:0};
  const status=(msg,kind='')=>{const el=$('syncStatus');if(el){el.textContent=msg;el.dataset.state=kind;}};
  function normalize(v){return {settings:{...defaults.settings,...(v&&v.settings||{})},expenses:Array.isArray(v&&v.expenses)?v.expenses.filter(e=>e&&e.id).map(e=>({...e,value:safeNum(e.value),grams:safeNum(e.grams),name:String(e.name||''),category:String(e.category||'Outros'),date:String(e.date||today()),note:String(e.note||'')})):[]};}
  function readSettings(){for(const k of Object.keys(state.settings)){const el=$(k);if(el)state.settings[k]=Math.max(0,Number(el.value)||0)}state.settings.wastePct=Math.min(100,state.settings.wastePct);state.settings.salesFee=Math.min(99,state.settings.salesFee);state.settings.targetMargin=Math.min(90,state.settings.targetMargin)}
  function getStockAverage(){try{const stock=JSON.parse(window.rgCloudStore?.getItem('rgforge3d_stock_v1')||'{}');const spools=Array.isArray(stock.spools)?stock.spools:[];const totalWeight=spools.reduce((a,x)=>a+Math.max(0,Number(x.initial||x.weight)||0),0);const totalCost=spools.reduce((a,x)=>a+Math.max(0,Number(x.price)||0),0);return totalWeight>0?totalCost/totalWeight:null}catch(e){return null}}
  function render(){
    const expenses=state.expenses;
    const total=expenses.reduce((s,e)=>s+safeNum(e.value),0);
    const filament=expenses.filter(e=>e.category==='Filamento');
    const filamentTotal=filament.reduce((s,e)=>s+safeNum(e.value),0);
    const grams=filament.reduce((s,e)=>s+safeNum(e.grams),0);
    const stockAvg=getStockAverage();
    const avg=stockAvg!==null?stockAvg:(grams>0?filamentTotal/grams:null);
    $('totalExpenses').textContent=money(total);$('filamentExpenses').textContent=money(filamentTotal);$('averageGram').textContent=avg===null?'Cadastre filamento':money(avg)+'/g';$('expenseCount').textContent=String(expenses.length);
    $('expenseRows').innerHTML='';
    expenses.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).forEach(e=>{
      const tr=document.createElement('tr');
      [e.date,e.name,e.category,money(e.value),e.grams?`${e.grams} g`:'—'].forEach(t=>{const td=document.createElement('td');td.textContent=t;tr.appendChild(td)});
      const td=document.createElement('td'),b=document.createElement('button');b.type='button';b.className='finance-delete';b.textContent='Excluir';b.addEventListener('click',async()=>{
        if(!confirm('Excluir esta despesa?'))return;
        const old=state;state={...state,expenses:state.expenses.filter(x=>x.id!==e.id)};render();
        try{await persist('Excluindo despesa…');}catch(err){state=old;render();alert('Não foi possível excluir na nuvem. O registro foi restaurado na tela. Confira sua conexão e tente novamente.');}
      });td.appendChild(b);tr.appendChild(td);$('expenseRows').appendChild(tr);
    });
    $('emptyExpenses').hidden=expenses.length>0;
    const costGram=avg===null?null:avg*(1+state.settings.wastePct/100);
    const denominator=1-state.settings.salesFee/100-state.settings.targetMargin/100;
    const saleGram=costGram!==null&&denominator>0?costGram/denominator:null;
    $('costPerGram').textContent=costGram===null?'Cadastre filamento':money(costGram)+'/g';$('salePerGram').textContent=saleGram===null?'—':money(saleGram)+'/g';$('marginShown').textContent=state.settings.targetMargin+'%';$('profit100').textContent=saleGram===null?'—':money(saleGram*100-costGram*100-(saleGram*100*state.settings.salesFee/100));
    $('priceRows').innerHTML='';[5,10,15,20,25,30,50,75,100,150,200,500,1000].forEach(g=>{const material=costGram===null?null:costGram*g;const cost=material;const sale=cost===null||denominator<=0?null:cost/denominator;const profit=sale===null?null:sale-cost-sale*state.settings.salesFee/100;const tr=document.createElement('tr');[`${g} g`,material===null?'—':money(material),'Depende do tempo',cost===null?'—':money(cost),sale===null?'—':money(sale),profit===null?'—':money(profit)].forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;if(i===5)td.className='profit-positive';tr.appendChild(td)});$('priceRows').appendChild(tr)});
  }
  async function persist(label='Salvando no Supabase…'){
    if(!ready)throw new Error('Os dados ainda estão carregando; tente novamente em instantes.');
    if(!window.rgSupabase)throw new Error('Cliente Supabase indisponível.');
    status(label,'saving');const snapshot=JSON.parse(JSON.stringify(state));
    saveChain=saveChain.catch(()=>{}).then(async()=>{
      const {data:{user},error:userErr}=await window.rgSupabase.auth.getUser();
      if(userErr)throw userErr;if(!user)throw new Error('Sessão ausente. Entre novamente no sistema.');
      const {error}=await window.rgSupabase.from('app_data').upsert({user_id:user.id,data_key:KEY,payload:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id,data_key'});
      if(error)throw error;
      status('Salvo e confirmado no Supabase ✓','ok');dirty=false;
    }).catch(err=>{console.error('Falha ao salvar financeiro no Supabase:',err);status('ERRO: não foi salvo no Supabase — '+(err.message||'verifique a conexão/RLS'),'error');throw err;});
    return saveChain;
  }
  async function loadCloud(){
    status('Carregando dados do Supabase…','loading');
    const {data:{user},error:userErr}=await window.rgSupabase.auth.getUser();if(userErr)throw userErr;if(!user)throw new Error('Sessão ausente. Entre novamente.');
    const {data,error}=await window.rgSupabase.from('app_data').select('payload').eq('user_id',user.id).eq('data_key',KEY).maybeSingle();if(error)throw error;
    state=data?.payload?normalize(data.payload):structuredClone(defaults);
    ready=true;fillSettings();render();status(data?.payload?'Dados carregados do Supabase ✓':'Pronto — ainda não há despesas salvas.','ok');
  }
  function fillSettings(){Object.entries(state.settings).forEach(([k,v])=>{if($(k))$(k).value=v})}
  $('expenseDate').value=today();
  $('costForm').addEventListener('submit',async e=>{e.preventDefault();readSettings();render();try{await persist('Salvando parâmetros…');}catch(err){alert('Os parâmetros não foram salvos. '+err.message)}});
  $('expenseForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!ready){alert('Aguarde o carregamento do Supabase antes de cadastrar.');return;}
    const btn=$('expenseForm').querySelector('button[type="submit"]');const value=safeNum($('expenseValue').value);if(value<=0){alert('Informe um valor maior que zero.');return;}
    const entry={id:window.crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,name:$('expenseName').value.trim(),category:$('expenseCategory').value,value,grams:safeNum($('expenseGrams').value),date:$('expenseDate').value||today(),note:$('expenseNote').value.trim()};if(!entry.name){alert('Informe a descrição.');return;}
    const previous=state;state={...state,expenses:[...state.expenses,entry]};render();btn.disabled=true;btn.textContent='Salvando…';
    try{await persist('Gravando despesa no Supabase…');$('expenseForm').reset();$('expenseDate').value=today();$('expenseGrams').value='0';}
    catch(err){state=previous;render();alert('A despesa NÃO foi confirmada no Supabase e foi removida da lista temporária. '+err.message);}
    finally{btn.disabled=false;btn.textContent='＋ Adicionar despesa';}
  });
  ['energyHour','machineHour','laborHour','wastePct','salesFee','targetMargin'].forEach(id=>$(id).addEventListener('change',async()=>{readSettings();render();try{await persist('Salvando parâmetros…')}catch(err){alert('Parâmetros não salvos: '+err.message)}}));
  $('printFinance').addEventListener('click',()=>window.print());
  $('exportFinance').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='rg-forge3d-financeiro-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
  $('importFinance').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{const imported=normalize(JSON.parse(await file.text()));state=imported;fillSettings();render();await persist('Importando backup para o Supabase…');alert('Backup importado e confirmado no Supabase.')}catch(err){alert('Não foi possível importar/salvar o backup: '+err.message)}finally{e.target.value=''}});
  window.addEventListener('beforeprint',()=>document.body.classList.add('tools-printing'));window.addEventListener('afterprint',()=>document.body.classList.remove('tools-printing'));
  try{await loadCloud()}catch(e){console.error(e);status('Erro ao carregar do Supabase: '+(e.message||'verifique a conexão/RLS'),'error');ready=false;}
  window.addEventListener('rg-cloud-change',e=>{if(e.detail?.key==='rgforge3d_stock_v1')render();});
})();
