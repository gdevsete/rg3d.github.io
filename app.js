(() => {
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

  function render() {
    $('outNumber').textContent = $('quoteNumber').value || '—';
    $('outDate').textContent = dateBR($('quoteDate').value);
    $('outValidity').textContent = $('validity').value;
    $('outClient').textContent = $('clientName').value.trim() || 'Nome do cliente';
    $('outStatus').textContent = $('clientStatus').value;
    $('outProduction').textContent = $('productionTime').value || 'A combinar';
    $('previewTagline').textContent = ($('tagline').value || 'Soluções em impressão 3D para sua ideia sair do papel').toUpperCase();
    $('outWhatsapp').textContent = $('whatsapp').value || 'WhatsApp não informado';
    $('outInstagram').textContent = $('instagram').value || 'Instagram não informado';
    $('outEmail').textContent = $('email').value || 'E-mail não informado';
    $('outWebsite').textContent = $('website').value || 'Site não informado';
    const items = getItems();
    let subtotal = 0;
    $('outItems').innerHTML = '';
    items.forEach((item, index) => {
      const total = item.qty * item.price; subtotal += total;
      const tr = document.createElement('tr');
      const tdVisual = document.createElement('td');
      tdVisual.innerHTML = `<div class="product-visual"><div class="keychain-drawing">R&amp;G<br>FORGE<span>3D</span></div></div>`;
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
    const total = Math.max(0, subtotal - discount + shipping);
    $('outTotal').textContent = money(total);
    const parts = [];
    if (discount > 0) parts.push(`Desconto: −${money(discount)}`);
    if (shipping > 0) parts.push(`Frete: ${money(shipping)}`);
    $('outBreakdown').textContent = parts.join(' · ');
    const notes = $('notes').value.split('\n').map(s => s.trim()).filter(Boolean);
    $('outNotes').innerHTML = '';
    notes.forEach(note => { const li = document.createElement('li'); li.textContent = note; $('outNotes').appendChild(li); });
    if (!notes.length) $('outNotes').innerHTML = '<li>Condições a combinar com o cliente.</li>';
    if (logoDataUrl) {
      $('logoBox').innerHTML = `<img src="${logoDataUrl}" alt="Logomarca R&G Forge 3D" style="max-width:100%;max-height:100%;object-fit:contain">`;
    }
  }

  const today = new Date();
  $('quoteDate').value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  addItem({name:'Chaveiro personalizado', description:'Personalizado em impressão 3D', qty:30, price:200/30});
  document.querySelectorAll('.editor input:not([type=file]), .editor select, .editor textarea').forEach(el => el.addEventListener('input', render));
  $('addItem').addEventListener('click', () => addItem({name:'Novo produto', description:'Descrição do produto', qty:1, price:0}));
  $('printBtn').addEventListener('click', () => window.print());
  $('logoUpload').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem.'); return; }
    const reader = new FileReader();
    reader.onload = () => { logoDataUrl = reader.result; render(); };
    reader.readAsDataURL(file);
  });
  $('removeLogo').addEventListener('click', () => { logoDataUrl = ''; $('logoUpload').value = ''; $('logoBox').innerHTML = '<div class="filament-symbol"><i></i><i></i><i></i><i></i><i></i></div><div class="logo-words"><div class="logo-rg">R<span>&amp;</span>G</div><div class="logo-forge">FORGE<span>3D</span></div><div class="logo-slogan">IMPRESSÃO <b>•</b> DESIGN <b>•</b> PERSONALIZAÇÃO</div></div>'; render(); });
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Restaurar os dados do exemplo?')) return;
    $('quoteNumber').value = 'RG-2026-001'; $('clientName').value = ''; $('clientStatus').value = 'Aguardando confirmação'; $('validity').value = '7 dias'; $('productionTime').value = 'Até 19 horas'; $('discount').value = '0'; $('shipping').value = '0'; $('notes').value = 'Produto conforme modelo aprovado pelo cliente.\nFrete não incluso, caso haja envio.\nAlterações no modelo podem impactar o valor final.'; $('tagline').value = 'Soluções em impressão 3D para sua ideia sair do papel'; $('whatsapp').value = '(XX) XXXXX-XXXX'; $('instagram').value = '@rgforge3d'; $('email').value = 'contato@rgforge3d.com'; $('website').value = 'www.rgforge3d.com'; $('itemsEditor').innerHTML = ''; addItem({name:'Chaveiro personalizado', description:'Personalizado em impressão 3D', qty:30, price:200/30}); logoDataUrl = ''; $('logoUpload').value = ''; $('removeLogo').click(); render();
  });
  render();
})();
