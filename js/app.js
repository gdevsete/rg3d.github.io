(async () => {
  await (window.rgDataReady || Promise.resolve());
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  const dateBR = (value) => { if (!value) return '—'; const [y,m,d] = value.split('-'); return `${d}/${m}/${y}`; };
  const itemTemplate = $('itemTemplate');
  let logoDataUrl = '';

  function addItem(data = {}) {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    if (data.name) node.querySelector('.item-name').value = data.name;
    if (data.description) node.querySelector('.item-description').value = data.description;
    if (data.qty != null) node.querySelector('.item-qty').value = data.qty;
    if (data.price != null) node.querySelector('.item-price').value = data.price;
    node.querySelectorAll('input').forEach(input => input.addEventListener('input', render));
    node.querySelector('.remove-item').addEventListener('click', () => { node.remove(); if (!$('itemsEditor').children.length) addItem({name:'Produto personalizado', description:'Produzido em impressão 3D', qty:1, price:0}); render(); });
    $('itemsEditor').appendChild(node);
    render();
  }

  function getItems() {
    return [...$('itemsEditor').querySelectorAll('.item-editor')].map(node => ({
      name: node.querySelector('.item-name').value.trim() || 'Produto personalizado',
      description: node.querySelector('.item-description').value.trim(),
      qty: Math.max(0, Number(node.querySelector('.item-qty').value) || 0),
      price: Math.max(0, Number(node.querySelector('.item-price').value) || 0)
    }));
  }

  function updatePrintPages(items) {
    const container = $('printPages');
    if (!container) return;
    container.innerHTML = '';

    // Até dois produtos por folha; a partir de três, o PDF é dividido automaticamente.
    const pageSize = 2;
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const source = $('quote');
    const sourceRows = [...$('outItems').querySelectorAll('tr')];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = source.cloneNode(true);
      page.removeAttribute('id');
      page.classList.add('print-quote-page');
      page.classList.toggle('print-continuation-page', pageIndex > 0);
      page.dataset.printPage = String(pageIndex + 1);

      const body = page.querySelector('.product-table tbody');
      body.innerHTML = '';
      const start = pageIndex * pageSize;
      const end = Math.min(start + pageSize, items.length);
      sourceRows.slice(start, end).forEach((row, rowIndex) => {
        const clonedRow = row.cloneNode(true);
        const number = clonedRow.querySelector('.item-number');
        if (number) number.textContent = String(start + rowIndex + 1).padStart(2, '0');
        body.appendChild(clonedRow);
      });

      if (pageIndex > 0) {
        const title = page.querySelector('.quote-title h1');
        const tagline = page.querySelector('.quote-title p');
        if (title) title.textContent = 'CONTINUAÇÃO';
        if (tagline) tagline.textContent = `ORÇAMENTO ${$('quoteNumber').value || '—'} · PÁGINA ${pageIndex + 1} DE ${pageCount}`;
      }

      // IDs internos são removidos dos clones para evitar colisões com o formulário.
      page.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      container.appendChild(page);
    }
  }

  function render() {
    $('outNumber').textContent = $('quoteNumber').value || '—';
    $('outDate').textContent = dateBR($('quoteDate').value);
    $('outValidity').textContent = $('validity').value;
    $('outClient').textContent = $('clientName').value.trim() || 'Nome do cliente';
    $('outStatus').textContent = $('clientStatus').value;
    const contactParts = [$('clientWhatsapp')?.value.trim(), $('clientCity')?.value.trim()].filter(Boolean);
    if ($('outClientContact')) $('outClientContact').textContent = contactParts.join(' · ');
    $('outProduction').textContent = $('productionTime').value || 'A combinar';
    $('previewTagline').textContent = ($('tagline').value || 'Soluções em impressão 3D para sua ideia sair do papel').toUpperCase();
    $('outWhatsapp').textContent = $('whatsapp').value || 'WhatsApp não informado';
    $('outInstagram').textContent = $('instagram').value || 'Instagram não informado';
    $('outEmail').textContent = $('email').value || 'E-mail não informado';
    $('outWebsite').textContent = $('website').value || 'Site não informado';
    const items = getItems();
    const quoteSheet = $('quote');
    quoteSheet.dataset.itemCount = String(items.length);
    quoteSheet.style.setProperty('--item-count', String(Math.max(items.length, 1)));
    quoteSheet.classList.toggle('quote-many-items', items.length > 4);
    let subtotal = 0;
    $('outItems').innerHTML = '';
    items.forEach((item, index) => {
      const total = item.qty * item.price; subtotal += total;
      const tr = document.createElement('tr');
      const tdVisual = document.createElement('td');
      tdVisual.innerHTML = `<span class="item-number">${String(index + 1).padStart(2, '0')}</span>`;
      const tdDesc = document.createElement('td');
      const name = document.createElement('div'); name.className = 'product-name'; name.textContent = item.name;
      const desc = document.createElement('div'); desc.className = 'product-desc'; desc.textContent = item.description || 'Produto personalizado em impressão 3D.';
      const features = document.createElement('div'); features.className = 'product-features';
      ['Design personalizado','Impressão 3D de qualidade','Produção sob encomenda'].forEach(feature => { const span = document.createElement('span'); span.textContent = feature; features.appendChild(span); });
      tdDesc.append(name, desc, features);
      const tdQty = document.createElement('td'); tdQty.innerHTML = `${item.qty}<br><small style="font-size:.6em;font-weight:500">${item.qty === 1 ? 'unidade' : 'unidades'}</small>`;
      const tdPrice = document.createElement('td'); tdPrice.textContent = money(item.price);
      const tdTotal = document.createElement('td'); tdTotal.textContent = money(total);
      tr.append(tdVisual, tdDesc, tdQty, tdPrice, tdTotal); $('outItems').appendChild(tr);
    });
    if (!items.length) $('outItems').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Adicione um produto no painel.</td></tr>';
    const discount = Math.max(0, Number($('discount').value) || 0);
    const shipping = Math.max(0, Number($('shipping').value) || 0);
    const total = Math.max(0, Number($('manualTotal').value) || 0);
    $('outTotal').textContent = money(total);
    const parts = [];
    if (discount > 0) parts.push(`Desconto: −${money(discount)}`);
    if (shipping > 0) parts.push(`Frete: ${money(shipping)}`);
    $('outBreakdown').textContent = parts.join(' · ');
    const notes = $('notes').value.split('\n').map(s => s.trim()).filter(Boolean);
    $('outNotes').innerHTML = '';
    notes.forEach(note => { const li = document.createElement('li'); li.textContent = note; $('outNotes').appendChild(li); });
    if (!notes.length) $('outNotes').innerHTML = '<li>Condições a combinar com o cliente.</li>';
    const logoSrc = logoDataUrl || 'assets/images/logo.png';
    $('logoBox').innerHTML = `<img src="${logoSrc}" alt="Logomarca R&G Forge 3D" class="brand-logo-image">`;
    const footerLogo = document.querySelector('.footer-logo-image');
    if (footerLogo) footerLogo.src = logoSrc;
    updatePrintPages(items);
  }

  const today = new Date();
  $('quoteDate').value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  addItem({name:'Chaveiro personalizado', description:'Personalizado em impressão 3D', qty:30, price:200/30});
  document.querySelectorAll('.editor input:not([type=file]), .editor select, .editor textarea').forEach(el => el.addEventListener('input', render));
  $('addItem').addEventListener('click', () => addItem({name:'Novo produto', description:'Descrição do produto', qty:1, price:0}));
  $('autoCalculateBtn').addEventListener('click', () => {
    const subtotal = getItems().reduce((sum, item) => sum + item.qty * item.price, 0);
    const discount = Math.max(0, Number($('discount').value) || 0);
    const shipping = Math.max(0, Number($('shipping').value) || 0);
    $('manualTotal').value = Math.max(0, subtotal - discount + shipping).toFixed(2);
    render();
  });

  // Salva o orçamento como pedido na base compartilhada (sincronizada com Supabase pelo auth.js).
  $('saveOrderBtn')?.addEventListener('click', () => {
    const clientName = $('clientName').value.trim();
    const city = $('clientCity').value.trim();
    if (!clientName || !city) { alert('Informe o nome do cliente e a cidade do pedido. O endereço é opcional.'); return; }
    const items = getItems();
    const total = Math.max(0, Number($('manualTotal').value) || 0);
    const cost = Math.max(0, Number($('internalCost')?.value) || 0);
    let business = {orders:[], customers:[]};
    try { business = JSON.parse(localStorage.getItem('rgforge3d_business_v1') || '{"orders":[],"customers":[]}'); } catch(e) {}
    if (!Array.isArray(business.orders)) business.orders = [];
    if (!Array.isArray(business.customers)) business.customers = [];
    const now = new Date().toISOString();
    const order = {
      id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      quoteNumber: $('quoteNumber').value.trim() || `RG-${Date.now()}`,
      date: $('quoteDate').value || new Date().toISOString().slice(0,10),
      clientName, whatsapp: $('clientWhatsapp').value.trim(), city,
      address: $('clientAddress').value.trim(), status: $('clientStatus').value,
      items, discount: Math.max(0, Number($('discount').value)||0),
      shipping: Math.max(0, Number($('shipping').value)||0), total, internalCost: cost,
      profit: total - cost, notes: $('notes').value, updatedAt: now, createdAt: now
    };
    const existingIndex = business.orders.findIndex(o => o.quoteNumber === order.quoteNumber);
    if (existingIndex >= 0) {
      if (!confirm(`O orçamento ${order.quoteNumber} já existe. Deseja atualizar o pedido salvo?`)) return;
      order.id = business.orders[existingIndex].id; order.createdAt = business.orders[existingIndex].createdAt || now;
      business.orders[existingIndex] = order;
    } else business.orders.push(order);
    const customerIndex = business.customers.findIndex(c => c.name.toLowerCase() === clientName.toLowerCase() && c.city.toLowerCase() === city.toLowerCase());
    const customer = {name:clientName, whatsapp:order.whatsapp, city, address:order.address, updatedAt:now};
    if (customerIndex >= 0) business.customers[customerIndex] = {...business.customers[customerIndex], ...customer}; else business.customers.push(customer);
    localStorage.setItem('rgforge3d_business_v1', JSON.stringify(business));
    alert(`Pedido ${order.quoteNumber} salvo. Lucro estimado: ${money(order.profit)}. Acesse Pedidos para consultar os registros.`);
  });

  $('printBtn').addEventListener('click', () => window.print());
  $('toggleBackgroundBtn').addEventListener('click', () => {
    const isLight = $('quote').classList.toggle('quote-light');
    $('toggleBackgroundBtn').setAttribute('aria-pressed', String(isLight));
    $('toggleBackgroundBtn').textContent = isLight ? '◐ Voltar ao fundo preto' : '☼ Testar fundo branco';
    updatePrintPages(getItems());
  });
  $('logoUpload').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem.'); return; }
    const reader = new FileReader();
    reader.onload = () => { logoDataUrl = reader.result; render(); };
    reader.readAsDataURL(file);
  });
  $('removeLogo').addEventListener('click', () => { logoDataUrl = ''; $('logoUpload').value = ''; render(); });
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Restaurar os dados do exemplo?')) return;
    $('quoteNumber').value = 'RG-2026-001'; $('clientName').value = ''; if($('clientWhatsapp'))$('clientWhatsapp').value=''; if($('clientCity'))$('clientCity').value=''; if($('clientAddress'))$('clientAddress').value=''; if($('internalCost'))$('internalCost').value='0'; $('clientStatus').value = 'Aguardando confirmação'; $('validity').value = '7 dias'; $('productionTime').value = 'Até 19 horas'; $('discount').value = '0'; $('shipping').value = '0'; $('manualTotal').value = '200.00'; $('notes').value = 'Produto conforme modelo aprovado pelo cliente.\nFrete não incluso, caso haja envio.\nAlterações no modelo podem impactar o valor final.'; $('tagline').value = 'Soluções em impressão 3D para sua ideia sair do papel'; $('whatsapp').value = '(XX) XXXXX-XXXX'; $('instagram').value = '@rgforge3d'; $('email').value = 'contato@rgforge3d.com'; $('website').value = 'www.rgforge3d.com'; $('itemsEditor').innerHTML = ''; addItem({name:'Chaveiro personalizado', description:'Personalizado em impressão 3D', qty:30, price:200/30}); logoDataUrl = ''; $('logoUpload').value = ''; $('removeLogo').click(); render();
  });
  render();
})();


/* Ferramentas de gestão: precificação, estoque e projetos (sem backend). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
  const num = id => Math.max(0, Number($(id)?.value) || 0);
  const STORE_KEY = 'rgforge3d-tools-v1';
  const blankState = () => ({spools:[], projects:[], lastCalc:null});
  let state = blankState();
  try { state = {...blankState(), ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}')}; } catch(e) {}
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = msg => { const el=$('toolToast'); if(!el)return; el.textContent=msg; el.classList.add('show'); window.setTimeout(()=>el.classList.remove('show'),4200); };
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch(e) { toast('Não foi possível salvar: armazenamento do navegador cheio. Exporte um backup.'); } };
  document.querySelectorAll('.tool-tab').forEach(btn => btn.addEventListener('click',()=>{
    document.querySelectorAll('.tool-tab').forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('.tool-panel').forEach(p=>p.classList.toggle('active',p.id===`tool-${btn.dataset.tool}`));
  }));

  function calculate() {
    const qty = Math.max(1, Math.floor(num('pQty') || 1));
    const spoolWeight = Math.max(1,num('pSpoolWeight') || 1000);
    const grams = num('pGrams');
    const filament = num('pSpoolPrice') / spoolWeight * grams * (1 + num('pWaste')/100);
    const energy = (num('pWatts')/1000) * num('pHours') * num('pEnergy');
    const wear = num('pHours') * num('pWear');
    const accessories = num('pKeychain')+num('pRing')+num('pPackaging')+num('pOther');
    const shared = (num('pLabor')+num('pFreight')+num('pInvoice'))/qty;
    const unitCost = filament+energy+wear+accessories+shared;
    const fees = Math.min(99,num('pFees'))/100, margin = Math.min(95,num('pMargin'))/100;
    const suggested = unitCost / Math.max(.01,1-fees-margin);
    const profit = suggested*(1-fees)-unitCost;
    const result = {name:$('pName').value.trim()||'Projeto sem nome',filamentName:$('pFilament').value.trim(),qty,grams,hours:num('pHours'),unitCost,suggested,profit,batch:unitCost*qty,createdAt:new Date().toISOString()};
    state.lastCalc = result; persist();
    $('rUnitCost').textContent=money(unitCost);
    $('rSuggested').textContent=money(suggested);
    $('rProfit').textContent=money(profit);
    $('rBatch').textContent=money(unitCost*qty);
    return result;
  }
  $('calcPriceBtn')?.addEventListener('click',()=>{const r=calculate();toast(`Cálculo concluído: preço sugerido ${money(r.suggested)} por unidade.`);});
  ['pSpoolPrice','pSpoolWeight','pGrams','pHours','pWatts','pEnergy','pWear','pLabor','pKeychain','pRing','pPackaging','pOther','pFreight','pInvoice','pWaste','pFees','pMargin','pQty'].forEach(id=>$(id)?.addEventListener('change',calculate));
  $('clearPriceBtn')?.addEventListener('click',()=>{['pName','pFilament'].forEach(id=>$(id).value='');['pSpoolPrice','pSpoolWeight','pGrams','pHours','pWatts','pEnergy','pWear','pLabor','pKeychain','pRing','pPackaging','pOther','pFreight','pInvoice','pWaste','pFees','pMargin','pQty'].forEach(id=>$(id).value='0');$('pSpoolWeight').value='1000';$('pQty').value='1';calculate();toast('Campos limpos. Confira os valores antes de calcular.');});
  $('saveCostProjectBtn')?.addEventListener('click',()=>{
    const r=calculate();
    state.projects.push({id:uid(),name:r.name,spoolId:'',grams:r.grams,qty:r.qty,date:'',note:`Preço sugerido ${money(r.suggested)} / unidade; custo ${money(r.unitCost)} / unidade.`,status:'Planejado',cost:r.unitCost,price:r.suggested,createdAt:r.createdAt});
    persist();renderProjects();toast('Projeto salvo na lista. Selecione o rolo e ajuste o consumo na lista de projetos se necessário.');
  });

  function spoolCost(spool){return spool.initial>0?spool.price/spool.initial:0;}
  function renderSpools(){
    const rows=$('stockRows'), select=$('jSpool'); if(!rows||!select)return;
    rows.innerHTML=''; select.innerHTML='';
    if(!state.spools.length) select.innerHTML='<option value="">Cadastre um rolo primeiro</option>';
    state.spools.forEach(s=>{
      const status=s.remaining<=0?['ESGOTADO','status-empty']:s.remaining<=s.alert?['ESTOQUE BAIXO','status-low']:['OK','status-ok'];
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><span class="${status[1]}">${status[0]}</span></td><td><strong>${esc(s.material)} ${esc(s.color)}</strong><br><small>${esc(s.brand)} · ${esc(s.note)}</small></td><td>${s.remaining.toLocaleString('pt-BR')} g / ${s.initial.toLocaleString('pt-BR')} g</td><td>${money(spoolCost(s))}</td><td>${s.alert} g</td><td><button data-action="adjust" data-id="${s.id}">Ajustar saldo</button><button data-action="delete" data-id="${s.id}" class="danger">Excluir</button></td>`;
      rows.appendChild(tr);
      const opt=document.createElement('option');opt.value=s.id;opt.textContent=`${s.material} ${s.color} — ${s.brand} (${s.remaining} g)`;select.appendChild(opt);
    });
    const total=state.spools.reduce((a,s)=>a+s.remaining,0), low=state.spools.filter(s=>s.remaining<=s.alert).length;
    $('stockSummary').innerHTML=`<span class="stock-pill">Rolos cadastrados: <strong>${state.spools.length}</strong></span><span class="stock-pill">Saldo total: <strong>${total.toLocaleString('pt-BR')} g</strong></span><span class="stock-pill">Alertas: <strong>${low}</strong></span>`;
    rows.querySelectorAll('.project-spool-select').forEach(sel=>sel.addEventListener('change',()=>{const p=state.projects.find(x=>x.id===sel.dataset.id);if(p){p.spoolId=sel.value;persist();renderProjects();}}));
    rows.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
      const s=state.spools.find(x=>x.id===btn.dataset.id);if(!s)return;
      if(btn.dataset.action==='delete'){
        if(state.projects.some(p=>p.spoolId===s.id&&p.status!=='Produzido')){toast('Há projetos planejados usando este rolo. Remova ou altere esses projetos antes de excluir.');return;}
        if(confirm(`Excluir o rolo ${s.material} ${s.color}?`)){state.spools=state.spools.filter(x=>x.id!==s.id);persist();renderAll();}
      }else{
        const raw=prompt(`Saldo atual: ${s.remaining} g.\nDigite o novo saldo em gramas:`,String(s.remaining));
        if(raw===null)return;const v=Number(raw);if(!Number.isFinite(v)||v<0){toast('Informe um saldo válido em gramas.');return;}
        s.remaining=Math.round(v*10)/10;persist();renderAll();toast('Saldo atualizado.');
      }
    }));
  }
  $('addSpoolBtn')?.addEventListener('click',()=>{
    const initial=num('sInitial'),brand=$('sBrand').value.trim(),color=$('sColor').value.trim();
    if(!initial||!brand||!color){toast('Preencha marca, cor e peso inicial do rolo.');return;}
    state.spools.push({id:uid(),material:$('sMaterial').value,brand,color,initial,remaining:initial,price:num('sPrice'),alert:num('sAlert'),note:$('sNote').value.trim(),createdAt:new Date().toISOString()});
    persist();renderAll();$('sBrand').value='';$('sColor').value='';$('sNote').value='';toast('Rolo cadastrado e salvo neste navegador.');
  });

  function renderProjects(){
    const rows=$('projectRows');if(!rows)return;rows.innerHTML='';
    if(!state.projects.length){rows.innerHTML='<tr><td colspan="6">Nenhum projeto cadastrado ainda.</td></tr>';return;}
    state.projects.forEach(p=>{
      const spool=state.spools.find(s=>s.id===p.spoolId);
      const need=(Number(p.grams)||0)*(Number(p.qty)||0);
      const status=p.status==='Produzido'?'PRODUZIDO':spool&&spool.remaining<need?'FALTA FILAMENTO':p.status==='Cancelado'?'CANCELADO':'PLANEJADO';
      const cls=status==='PRODUZIDO'?'status-ok':status==='FALTA FILAMENTO'?'status-low':'';
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><span class="${cls}">${status}</span></td><td><strong>${esc(p.name)}</strong><br><small>${esc(p.note||'')}</small></td><td>${p.status!=='Produzido'?`<select class="project-spool-select" data-id="${p.id}"><option value="">Selecionar rolo</option>${state.spools.map(s=>`<option value="${s.id}" ${s.id===p.spoolId?'selected':''}>${esc(s.material)} ${esc(s.color)} — ${esc(s.brand)} (${s.remaining} g)</option>`).join('')}</select>`:esc(spool?`${spool.material} ${spool.color} — ${spool.brand}`:'Não selecionado')}</td><td>${need.toLocaleString('pt-BR')} g</td><td>${esc(p.date||'—')}</td><td>${p.status!=='Produzido'&&p.status!=='Cancelado'?`<button data-action="produce" data-id="${p.id}">Marcar produzido</button><button data-action="cancel" data-id="${p.id}">Cancelar</button>`:''}<button class="danger" data-action="delete" data-id="${p.id}">Excluir</button></td>`;
      rows.appendChild(tr);
    });
    rows.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
      const p=state.projects.find(x=>x.id===btn.dataset.id);if(!p)return;
      if(btn.dataset.action==='delete'){if(confirm('Excluir este projeto?')){state.projects=state.projects.filter(x=>x.id!==p.id);persist();renderAll();}return;}
      if(btn.dataset.action==='cancel'){if(confirm('Cancelar este projeto?')){p.status='Cancelado';persist();renderAll();}return;}
      const s=state.spools.find(x=>x.id===p.spoolId),need=(Number(p.grams)||0)*(Number(p.qty)||0);
      if(!s){toast('Selecione um rolo válido para este projeto.');return;}
      if(s.remaining<need){toast(`Saldo insuficiente: precisa de ${need} g e há ${s.remaining} g.`);return;}
      if(confirm(`Confirmar produção de "${p.name}"? Serão descontados ${need} g do rolo ${s.color}.`)){
        s.remaining=Math.round((s.remaining-need)*10)/10;p.status='Produzido';p.producedAt=new Date().toISOString();persist();renderAll();toast(`Produção registrada. ${need} g descontados do estoque.`);
      }
    }));
  }
  $('addProjectBtn')?.addEventListener('click',()=>{
    const name=$('jName').value.trim(),spoolId=$('jSpool').value,grams=num('jGrams'),qty=Math.max(1,Math.floor(num('jQty')));
    if(!name||!spoolId||!grams||!qty){toast('Preencha nome, rolo, consumo por unidade e quantidade.');return;}
    const s=state.spools.find(x=>x.id===spoolId),need=grams*qty;
    const project={id:uid(),name,spoolId,grams,qty,date:$('jDate').value,note:$('jNote').value.trim(),status:'Planejado',createdAt:new Date().toISOString()};
    state.projects.push(project);persist();renderAll();$('jName').value='';$('jNote').value='';
    toast(s&&s.remaining<need?`Projeto salvo, mas alerta: precisa ${need} g e o rolo tem ${s.remaining} g.`:'Projeto planejado e salvo.');
  });

  function exportBackup(){
    const blob=new Blob([JSON.stringify({format:'rgforge3d-backup-v1',exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rg-forge3d-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup JSON exportado.');
  }
  $('exportDataBtn')?.addEventListener('click',exportBackup);
  $('importDataInput')?.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(!Array.isArray(data.spools)||!Array.isArray(data.projects))throw new Error('Formato inválido');
      if(!confirm('Importar este backup substituirá o estoque e os projetos atuais deste navegador. Deseja continuar?'))return;
      state={spools:data.spools,projects:data.projects,lastCalc:data.lastCalc||null};persist();renderAll();toast('Backup importado com sucesso.');
    }catch(err){toast('Não foi possível importar: arquivo inválido ou incompatível.');}finally{e.target.value='';}
  });
  function printTool(id){
    document.querySelectorAll('.tool-panel').forEach(p=>p.classList.toggle('print-target',p.id===id));
    document.body.classList.add('tools-printing');
    window.print();
    setTimeout(()=>{document.body.classList.remove('tools-printing');document.querySelectorAll('.tool-panel').forEach(p=>p.classList.remove('print-target'));},500);
  }
  $('stockPdfBtn')?.addEventListener('click',()=>printTool('tool-stock'));
  $('projectsPdfBtn')?.addEventListener('click',()=>printTool('tool-projects'));
  window.addEventListener('afterprint',()=>{document.body.classList.remove('tools-printing');document.querySelectorAll('.tool-panel').forEach(p=>p.classList.remove('print-target'));});
  function renderAll(){renderSpools();renderProjects();}
  calculate();renderAll();
})();
