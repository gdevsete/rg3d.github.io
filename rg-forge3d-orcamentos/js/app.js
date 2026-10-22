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
    $('quoteNumber').value = 'RG-2026-001'; $('clientName').value = ''; $('clientStatus').value = 'Aguardando confirmação'; $('validity').value = '7 dias'; $('productionTime').value = 'Até 19 horas'; $('discount').value = '0'; $('shipping').value = '0'; $('manualTotal').value = '200.00'; $('notes').value = 'Produto conforme modelo aprovado pelo cliente.\nFrete não incluso, caso haja envio.\nAlterações no modelo podem impactar o valor final.'; $('tagline').value = 'Soluções em impressão 3D para sua ideia sair do papel'; $('whatsapp').value = '(XX) XXXXX-XXXX'; $('instagram').value = '@rgforge3d'; $('email').value = 'contato@rgforge3d.com'; $('website').value = 'www.rgforge3d.com'; $('itemsEditor').innerHTML = ''; addItem({name:'Chaveiro personalizado', description:'Personalizado em impressão 3D', qty:30, price:200/30}); logoDataUrl = ''; $('logoUpload').value = ''; $('removeLogo').click(); render();
  });
  render();
})();
