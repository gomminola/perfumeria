(() => {
  const panel = document.querySelector('#chatPanel');
  const launcher = document.querySelector('#chatLaunch');
  const body = document.querySelector('#chatBody');
  const form = document.querySelector('#chatForm');
  const input = document.querySelector('#chatInput');
  const catalog = JSON.parse(document.querySelector('#catalogData').textContent);
  const watches = JSON.parse(document.querySelector('#watchData').textContent);
  const findItem = id => catalog.find(item => item.id === id) || watches.find(item => item.id === id);
  const PERFUME_PHONE = '573108048754';
  const WATCH_PHONE = '573127894040';
  let handoffStep = '';
  let customerName = '';
  let customerCity = '';
  let customerPayment = '';
  let preferredCategory = '';
  let currentLeadNeed = '';
  let pendingMessage = '';

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const money = value => fmt(value);
  const isCombo = product => !product.isWatch && product.page >= 105;
  const scrollToEnd = () => { body.scrollTop = body.scrollHeight; };

  function addText(text, sender = 'bot') {
    const bubble = document.createElement('div');
    bubble.className = `chat-message ${sender}`;
    bubble.textContent = text;
    body.appendChild(bubble);
    scrollToEnd();
    return bubble;
  }

  function addActions(actions) {
    const group = document.createElement('div');
    group.className = 'chat-quick';
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', () => handleMessage(action.value, true, action.label));
      group.appendChild(button);
    }
    body.appendChild(group);
    scrollToEnd();
  }

  function productCard(product) {
    const card = document.createElement('article');
    card.className = 'chat-product';
    const image = document.createElement('img');
    image.src = encodeURI(product.image);
    image.alt = (product.brand ? product.brand + ' ' : '') + product.name;
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = product.isWatch ? product.brand + ' · ' + product.name : product.name;
    const meta = document.createElement('small');
    meta.textContent = product.isWatch
      ? (product.promoBlackFriday ? product.brand + ' · ' + product.name + ' · ' + money(product.salePrice) + ' · 20% OFF' : product.brand + ' · ' + product.name + ' · Precio por consultar')
      : (product.brand ? product.brand + ' · ' : '') + (isCombo(product) ? 'Combo · ' : '') + product.category + ' · ' + (product.favoritePromo ? money(product.favoriteSalePrice) + ' · 20% OFF Black Friday + primera compra' : money(product.price));
    const description = document.createElement('small');
    description.className = 'chat-product-description';
    description.textContent = product.isWatch
      ? product.description + ' Garantía de 6 meses a 1 año según referencia. Envío gratis nacional.'
      : product.description || '';
    const profile = document.createElement('small');
    profile.className = 'chat-product-profile';
    profile.textContent = product.isWatch ? product.availability : (product.profileTags || []).slice(0, 3).join(' · ');
    const view = document.createElement('button');
    view.type = 'button';
    view.textContent = 'Ver detalle';
    view.addEventListener('click', () => showDetail(product.id));
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'chat-add';
    addButton.textContent = product.isWatch ? 'Añadir para cotizar' : 'Añadir';
    addButton.setAttribute('aria-label', 'Añadir ' + product.name + ' a la selección');
    addButton.addEventListener('click', () => {
      add(product.id);
      addText(product.name + ' quedó en tu selección. ' + (product.isWatch ? 'El precio y la garantía se confirman por referencia. ' : '') + '¿Quieres ver otra opción o preparar tu pedido?');
      addActions([
        { label: 'Ver mi selección', value: '__cart__' },
        { label: product.isWatch ? 'Ver relojes' : 'Ver combos', value: product.isWatch ? 'Quiero ver relojes' : 'Muéstrame los combos' },
        { label: 'Hablar con nuestros asesores', value: '__handoff__' }
      ]);
    });
    details.append(name, meta);
    if (profile.textContent) details.appendChild(profile);
    details.append(description, view, addButton);
    card.append(image, details);
    return card;
  }
  function showProducts(products) {
    const unique = [];
    for (const product of products) {
      if (product && !unique.some(item => item.id === product.id)) unique.push(product);
      if (unique.length === 4) break;
    }
    if (!unique.length) {
      addText('No encontré una coincidencia exacta. Prueba con el nombre del perfume, su referencia o una categoría como dama, caballero, unisex o combos.');
      addActions([
        { label: 'Ver combos', value: 'Muéstrame los combos' },
        { label: 'Perfumes para dama', value: 'Quiero ver perfumes para dama' },
        { label: 'Perfumes para caballero', value: 'Quiero ver perfumes para caballero' }
      ]);
      return;
    }
    const group = document.createElement('div');
    group.className = 'chat-products';
    unique.forEach(product => group.appendChild(productCard(product)));
    body.appendChild(group);
    scrollToEnd();
    addActions([
      { label: 'Ver más opciones', value: 'Muéstrame más opciones' },
      { label: 'Mi selección', value: '__cart__' },
      { label: 'Hablar con nuestros asesores', value: '__handoff__' }
    ]);
  }

  function findWatches(query) {
    const q = normalize(query);
    const stop = new Set(['reloj','relojes','quiero','busco','buscar','ver','muestrame','muestra','por','favor','un','una','de','la','el','los','las','marca','carpeta','catalogo','disponibles','disponibilidad','precio','precios','consultar','dama','caballero','hombre','mujer']);
    const terms = q.split(/[^a-z0-9]+/).filter(word => word.length > 1 && !stop.has(word));
    if (!terms.length) return watches.slice(0, 4);
    return watches.map(product => {
      const haystack = normalize(product.brand + ' ' + product.folder + ' ' + product.collection + ' ' + product.name + ' ' + product.code);
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? (haystack.startsWith(term) ? 4 : 2) : 0), 0);
      return { product, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.product.id.localeCompare(b.product.id)).slice(0, 4).map(item => item.product);
  }
  function findProducts(query, category = '', includeCombos = false, budget = null) {
    const stop = new Set(['quiero','busco','buscar','muestrame','muestra','recomiendame','recomienda','perfume','perfumes','fragancia','fragancias','para','por','favor','un','una','de','del','la','el','los','las','mi','hasta','dama','caballero','hombre','mujer','unisex','combo','combos','kit','kits']);
    const terms = normalize(query).split(/[^a-z0-9]+/).filter(word => word.length > 1 && !stop.has(word));
    return catalog.map(product => {
      if (!includeCombos && isCombo(product)) return null;
      if (includeCombos && !isCombo(product)) return null;
      if (category && product.category !== category) return null;
      if (budget != null && product.price > budget) return null;
      const haystack = normalize([product.name, product.brand, product.code, product.category, product.description, ...(product.profileTags || [])].join(' '));
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? (normalize(product.name).includes(term) ? 4 : 1) : 0), 0);
      return { product, score };
    }).filter(item => item && (!terms.length || item.score > 0))
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'))
      .map(item => item.product);
  }
  function extractBudget(text) {
    const match = normalize(text).match(/(?:hasta|menor(?:es)?\s+a|maximo|presupuesto\s+de)?\s*\$?\s*(\d[\d.,]*)\s*(mil|k)?\b/);
    if (!match) return null;
    const number = Number(match[1].replace(/[^0-9]/g, ''));
    if (!Number.isFinite(number) || number <= 0) return null;
    if (match[2]) return number * 1000;
    return number >= 50000 ? number : null;
  }

  function cartCounts() {
    return cart.reduce((counts, row) => {
      const product = findItem(row.id);
      if (!product) return counts;
      if (product.isWatch) counts.watches += row.qty;
      else if (isCombo(product)) counts.combos += row.qty;
      else counts.perfumes += row.qty;
      return counts;
    }, { combos: 0, perfumes: 0, watches: 0 });
  }
  function shippingStatus() {
    const counts = cartCounts();
    const free = counts.watches > 0 || counts.combos >= 1 || counts.perfumes >= 2;
    if (customerCity && normalize(customerCity).includes('bogota')) return counts.watches > 0 || free ? 'Entrega inmediata en Bogotá y envío gratis.' : 'Entrega inmediata en Bogotá; confirma el valor de entrega con nuestros asesores.';
    if (free) return 'Envío gratis a todo el país.';
    if (!customerCity) return 'Para relojes, el envío es gratis a todo el país y en Bogotá la entrega es inmediata. Para perfumes, un combo o dos perfumes dan envío gratis nacional; otros envíos fuera de Bogotá se calculan según destino.';
    return 'Destino ' + customerCity + ': los relojes tienen envío gratis a todo el país. Para perfumes, un combo o dos perfumes dan envío gratis nacional; otros envíos se calculan según destino.';
  }
  function shippingInformation() {
    return 'Estamos ubicados en Bogotá. Para relojes hay entrega inmediata en Bogotá y envío gratis a todo el país. Para perfumes, el envío nacional es gratis al comprar un combo o dos perfumes; otros envíos se calculan según el destino. Black Friday va hasta el 27 de noviembre de 2026: 10% de descuento Black Friday y 10% adicional en tu primera compra. Nuestros asesores confirman precio, garantía del reloj y total antes del pago.';
  }
  function promotionInformation() {
    return 'Black Friday está vigente del 19 al 27 de noviembre de 2026: 10% de descuento Black Friday y 10% adicional en tu primera compra. Los dos descuentos se acumulan en tu primera compra durante la campaña. Nuestros asesores confirman el total final antes de pagar.';
  }

  function paymentInformation() {
    return 'Puedes pagar por Nequi, Bancolombia o Llave. Nuestros asesores te confirman los datos de pago al cerrar el pedido.';
  }

  function welcomeMessage() {
    const hello = customerName ? '¡Hola de nuevo, ' + customerName + '!' : '¡Hola! Soy el asistente de Gomminola.';
    return hello + ' ' + shippingInformation() + ' ' + (customerName ? '¿Qué te interesa buscar?' : '¿Cómo te llamas? Puedo ayudarte con perfumes, relojes, precios, garantías y disponibilidad.');
  }
  function showCartInChat() {
    if (!cart.length) {
      addText('Tu selección aún está vacía. ' + shippingInformation() + ' Puedo mostrarte perfumes, combos o relojes.');
      addActions([
        { label: 'Ver relojes', value: 'Quiero ver relojes' },
        { label: 'Ver combos', value: 'Muéstrame los combos' },
        { label: 'Buscar un perfume', value: 'Quiero buscar un perfume' }
      ]);
      return;
    }
    const lines = cart.map(row => {
      const product = findItem(row.id);
      const name = product ? (product.brand ? product.brand + ' ' : '') + product.name : '';
      const price = !product ? '' : product.isWatch ? (product.promoBlackFriday ? money(product.salePrice * row.qty) + ' · 20% OFF' : 'Precio por consultar') : product.favoritePromo ? money(product.favoriteSalePrice * row.qty) + ' · 20% OFF Black Friday + primera compra' : money(product.price * row.qty);
      const code = product && product.code ? ' (' + product.code + ')' : '';
      return product ? '• ' + row.qty + ' × ' + name + code + ' — ' + price : '';
    }).filter(Boolean);
    const total = cart.reduce((sum, row) => {
      const product = findItem(row.id);
      return sum + (product ? (product.isWatch ? (product.promoBlackFriday ? product.salePrice : 0) : (product.favoritePromo ? product.favoriteSalePrice : product.price)) * row.qty : 0);
    }, 0);
    const hasWatches = cart.some(row => findItem(row.id) && findItem(row.id).isWatch);
    const hasQuoteWatches = cart.some(row => { const p = findItem(row.id); return p && p.isWatch && !p.promoBlackFriday; });
    const subtotal = hasQuoteWatches ? 'Subtotal de productos con precio: ' + money(total) + '\nOtros relojes: precio y garantía por consultar según referencia.\n' : 'Subtotal de productos con precio publicado: ' + money(total) + '\n';
    addText('Tu selección (' + cart.reduce((sum, row) => sum + row.qty, 0) + ' productos):\n' + lines.join('\n') + '\n' + subtotal + shippingStatus());
    addActions([
      { label: 'Preparar consulta', value: '__handoff__' },
      { label: 'Seguir explorando', value: hasWatches ? 'Quiero ver relojes' : 'Muéstrame los combos' }
    ]);
  }
  function parseCustomerIdentity(text) {
    const explicit = text.match(/\b(?:me llamo|mi nombre es|soy)\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*)?)/iu);
    if (explicit) {
      let name = explicit[1].trim();
      const parts = name.split(/\s+/);
      if (parts.length > 1 && /^(y|busco|quiero|tengo|necesito|estoy|me)$/i.test(parts[1])) name = parts[0];
      if (/^(mujer|hombre|dama|caballero|unisex|nequi|bancolombia|llave)$/i.test(normalize(name))) return null;
      if (/^(de|del|en)$/i.test(name) || /^de\s+(bogota|medellin|cali|colombia)$/i.test(name)) return null;
      const rest = text.slice(explicit.index + explicit[0].length).replace(/^\s*(?:hola|buenas)?[\s,.;:¡!¿?]*/i, '').trim();
      return { name, remainder: rest };
    }
    const candidate = text.trim().replace(/^[¡!¿?,.;:\s]+|[!?,.;:\s]+$/g, '');
    const words = candidate.split(/\s+/);
    const q = normalize(candidate);
    const hasIntent = /\b(hola|buenas|perfume|perfumes|fragancia|fragancias|busco|quiero|buscar|busca|ver|muestrame|recomienda|envio|envios|bogota|dama|caballero|hombre|mujer|unisex|combo|combos|carrito|pedido|precio|pago|pagos|nequi|bancolombia|llave|citricos?|amaderados?|dulces?|florales?|frescos?|acuaticos?|mas|populares|vendidos)\b/.test(q);
    if (candidate.length >= 2 && candidate.length <= 40 && words.length <= 2 && !hasIntent && findProducts(candidate).length === 0) {
      return { name: candidate, remainder: '' };
    }
    return null;
  }

  function askForCity() {
    handoffStep = 'city';
    addText(`Gracias, ${customerName}. ¿En qué ciudad recibirías el pedido? ${shippingInformation()} Indica solo la ciudad, no la dirección. También puedes escribir “prefiero no compartir”.`);
  }

  function askForPayment() {
    handoffStep = 'payment';
    addText(`${paymentInformation()} ¿Cuál prefieres?`);
    addActions([
      { label: 'Nequi', value: '__pay_nequi__' },
      { label: 'Bancolombia', value: '__pay_bancolombia__' },
      { label: 'Llave', value: '__pay_llave__' },
      { label: 'Que me asesore el equipo', value: '__pay_advisor__' }
    ]);
  }

  function beginHandoff() {
    customerCity = '';
    customerPayment = '';
    if (customerName) {
      askForCity();
      return;
    }
    handoffStep = 'name';
    addText('Puedo preparar un mensaje para nuestros asesores. ¿Cómo te llamas? Después te preguntaré la ciudad de entrega para informar el envío. Puedes escribir “cancelar” para salir.');
  }

  function makePendingMessage() {
    const productLines = cart.map(row => {
      const product = findItem(row.id);
      const name = product ? (product.brand ? product.brand + ' ' : '') + product.name : '';
      if (!product) return '';
      if (product.isWatch) return product.promoBlackFriday ? '- ' + row.qty + ' x ' + name + ' · ' + product.code + ': ' + money(product.salePrice * row.qty) + ' (20% OFF Black Friday + primera compra; antes ' + money(product.regularPrice * row.qty) + '). Confirmar disponibilidad.' : '- ' + row.qty + ' x ' + name + ' · ' + product.code + ': PRECIO POR COTIZAR; confirmar garantía y stock.';
      return '- ' + row.qty + ' x ' + name + ' (' + product.code + '): ' + (product.favoritePromo ? money(product.favoriteSalePrice * row.qty) + ' (20% OFF Black Friday + primera compra; antes ' + money(product.price * row.qty) + ')' : money(product.price * row.qty));
    }).filter(Boolean);
    const total = cart.reduce((sum, row) => {
      const product = findItem(row.id);
      return sum + (product ? (product.isWatch ? (product.promoBlackFriday ? product.salePrice : 0) : (product.favoritePromo ? product.favoriteSalePrice : product.price)) * row.qty : 0);
    }, 0);
    const hasWatches = cart.some(row => findItem(row.id) && findItem(row.id).isWatch);
    const selection = productLines.length
      ? 'Mi selección:\n' + productLines.join('\n') + '\nSubtotal de perfumes/combos antes de promociones: ' + money(total) + (hasWatches ? '\nRelojes: consultar precio, garantía de 6 a 12 meses según referencia y disponibilidad.' : '')
      : 'Quiero asesoría para elegir un perfume o un reloj.';
    return [
      'Hola, escribo desde Gomminola.',
      'Mi nombre es ' + customerName + '.',
      customerCity ? 'Ciudad de entrega: ' + customerCity + '.' : 'Ciudad de entrega: por confirmar.',
      'Medio de pago preferido: ' + (customerPayment || 'por definir con nuestros asesores') + ' (Nequi, Bancolombia o Llave).',
      selection,
      'Envío: ' + shippingStatus(),
      currentLeadNeed ? 'Mi consulta: ' + currentLeadNeed : '',
      'Promoción Black Friday: 10% (hasta el 27 de noviembre de 2026).',
      'Descuento adicional de primera compra: 10% (se acumula con Black Friday; los favoritos de perfumería y Fossil automáticos marcados llevan 20% OFF, hasta el 27 de noviembre).'
    ].filter(Boolean).join('\n\n');
  }
  function askForConsent() {
    pendingMessage = makePendingMessage();
    handoffStep = 'consent';
    addText('Este es el mensaje para nuestros asesores. Incluye tu nombre, ciudad, selección, precios por consultar, disponibilidad, garantía y forma de pago. Revísalo antes de continuar:');
    const preview = document.createElement('div');
    preview.className = 'chat-preview';
    preview.textContent = pendingMessage;
    body.appendChild(preview);
    addText('¿Autorizas abrir WhatsApp con este mensaje? No se envía automáticamente; podrás revisarlo y pulsar enviar desde WhatsApp.');
    addActions([
      { label: 'Sí, abrir WhatsApp', value: '__consent_yes__' },
      { label: 'No compartir', value: '__consent_no__' }
    ]);
  }

  function openWhatsAppDraft() {
    const link = document.createElement('a');
    link.className = 'chat-whatsapp';
    const watchesSelected = cart.some(row => { const product = findItem(row.id); return product && product.isWatch; });
    const watchIntent = /\b(reloj|relojes|casio|fossil|guess|swatch|invicta|mulco|tissot|nautica|festina|diesel|technomarine|tommy)\b/.test(normalize(currentLeadNeed));
    const destination = watchesSelected || watchIntent ? WATCH_PHONE : PERFUME_PHONE;
    link.href = `https://wa.me/${destination}?text=${encodeURIComponent(pendingMessage)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Revisar mensaje en WhatsApp';
    link.setAttribute('aria-label', destination === WATCH_PHONE ? 'Abrir WhatsApp para consultar relojería' : 'Abrir WhatsApp para consultar perfumería');
    const bubble = addText(destination === WATCH_PHONE ? 'Listo. Tu mensaje está preparado para nuestro asesor de relojería. Revísalo y envíalo desde WhatsApp.' : 'Listo. Tu mensaje está preparado para nuestros asesores de perfumería. Revísalo y envíalo desde WhatsApp.');
    bubble.appendChild(link);
    handoffStep = '';
  }

  function handleMessage(raw, fromButton = false, visibleText = '') {
    let text = String(raw || '').trim();
    if (!text) return;
    body.querySelectorAll('.chat-quick button').forEach(button => { button.disabled = true; });
    addText(visibleText || text, 'user');
    let q = normalize(text);

    if (handoffStep === 'name') {
      if (/^(cancelar|cancel|no)$/.test(q)) { handoffStep = ''; addText('De acuerdo, cancelé la preparación del pedido. Puedes seguir explorando el catálogo.'); return; }
      const identity = parseCustomerIdentity(text);
      customerName = identity ? identity.name : text;
      if (customerName.length < 2 || customerName.length > 60) {
        addText('Escribe un nombre de entre 2 y 60 caracteres para preparar el mensaje.');
        return;
      }
      askForCity();
      return;
    }
    if (handoffStep === 'city') {
      if (/^(cancelar|cancel|no|prefiero no compartir|prefiero no decir)$/.test(q)) {
        customerCity = '';
        askForPayment();
        return;
      }
      if (text.length > 60) {
        addText('Indica solo la ciudad (máximo 60 caracteres), o escribe “prefiero no compartir”.');
        return;
      }
      customerCity = text;
      askForPayment();
      return;
    }
    if (handoffStep === 'payment') {
      const methods = { '__pay_nequi__': 'Nequi', '__pay_bancolombia__': 'Bancolombia', '__pay_llave__': 'Llave', '__pay_advisor__': 'asesoría de nuestros asesores' };
      const chosen = methods[q] || (/nequi/.test(q) ? 'Nequi' : (/bancolombia/.test(q) ? 'Bancolombia' : (/llave/.test(q) ? 'Llave' : (/asesor|no se|no sé/.test(q) ? 'asesoría de nuestros asesores' : ''))));
      if (!chosen) { addText('Elige Nequi, Bancolombia, Llave o pide asesoría a nuestro equipo.'); return; }
      customerPayment = chosen;
      askForConsent();
      return;
    }
    if (handoffStep === 'consent') {
      if (q === '__consent_yes__' || /^(si|sí|autorizo|acepto|de acuerdo)$/.test(q)) {
        openWhatsAppDraft();
      } else {
        handoffStep = '';
        pendingMessage = '';
        addText('De acuerdo. No compartiré el mensaje. Puedes seguir usando el catálogo y tu selección aquí.');
      }
      return;
    }
    if (q === '__consent_no__') {
      handoffStep = '';
      pendingMessage = '';
      addText('De acuerdo. No compartiré el mensaje.');
      return;
    }

    if (!customerName && !fromButton) {
      const identity = parseCustomerIdentity(text);
      if (identity) {
        customerName = identity.name;
        addText(`¡Mucho gusto, ${customerName}!`);
        if (identity.remainder) {
          text = identity.remainder;
          q = normalize(text);
        } else {
          addText('¿Qué fragancia te interesa? También puedo mostrarte combos o ayudarte con los envíos.');
          addActions([
            { label: 'Perfumes para dama', value: 'Quiero ver perfumes para dama' },
            { label: 'Perfumes para caballero', value: 'Quiero ver perfumes para caballero' },
            { label: 'Ver combos', value: 'Muéstrame los combos' },
            { label: 'Envíos', value: '¿Cómo funcionan los envíos?' }
          ]);
          return;
        }
      }
    }

    if (q === '__handoff__' || /hablar con (?:nuestros )?asesores|hablar con la asesora|preparar pedido|finalizar pedido|pasar mi pedido|hacer mi pedido|quiero comprar/.test(q)) {
      beginHandoff();
      return;
    }
    if (q === '__cart__' || /carrito|mi seleccion|mi pedido|cuenta mis|cuantos productos|cuanto llevo/.test(q)) {
      showCartInChat();
      return;
    }
    if (/black friday|descuento|promocion|promociones|oferta|ofertas/.test(q)) {
      addText(promotionInformation());
      addActions([{ label: 'Ver combos', value: 'Muéstrame los combos' }, { label: 'Ver mi selección', value: '__cart__' }, { label: 'Hablar con nuestros asesores', value: '__handoff__' }]);
      return;
    }
    if (/pago|pagos|nequi|bancolombia|llave|transferencia/.test(q)) {
      addText(paymentInformation());
      addActions([{ label: 'Mi selección', value: '__cart__' }, { label: 'Hablar con nuestros asesores', value: '__handoff__' }]);
      return;
    }
    if (/envio|envios|ubicad|ubicacion|donde estan|donde queda|bogota|gratis/.test(q)) {
      addText(shippingInformation());
      addActions([
        { label: 'Ver combos', value: 'Muéstrame los combos' },
        { label: 'Mi selección', value: '__cart__' },
        { label: 'Hablar con nuestros asesores', value: '__handoff__' }
      ]);
      return;
    }
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|holi)[!. ]*$/.test(q)) {
      addText(welcomeMessage());
      addActions([
        { label: 'Perfumes para dama', value: 'Quiero ver perfumes para dama' },
        { label: 'Perfumes para caballero', value: 'Quiero ver perfumes para caballero' },
        { label: 'Ver combos', value: 'Muéstrame los combos' },
        { label: 'Más populares', value: '¿Cuáles son los más comprados?' },
        { label: 'Perfil cítrico / amaderado', value: 'Recomiéndame un perfume cítrico y amaderado' },
        { label: 'Métodos de pago', value: '¿Qué métodos de pago aceptan?' },
        { label: 'Envíos', value: '¿Cómo funcionan los envíos?' },
        { label: 'Mi selección', value: '__cart__' }
      ]);
      return;
    }
    if (/\b(reloj|relojes|casio|fossil|guess|swatch|invicta|mulco|tissot|nautica|festina|diesel|technomarine|tommy|d mario)\b/.test(q)) {
      currentLeadNeed = text;
      const matches = findWatches(q);
      if (matches.length) addText('Encontré estas referencias de relojes. El precio, el stock y la garantía exacta se confirman por referencia. Tienen entrega inmediata en Bogotá y envío gratis a todo el país:');
      else addText('Puedo buscar relojes por marca o carpeta. Indica, por ejemplo, Casio, Tissot, acero dama o goma caballero.');
      showProducts(matches);
      return;
    }    const category = /\b(dama|mujer|ella)\b/.test(q) ? 'Dama' : (/\b(caballero|hombre|masculino)\b/.test(q) ? 'Caballero' : (/\bunisex\b/.test(q) ? 'Unisex' : ''));
    if (category) preferredCategory = category;
    const audience = category || preferredCategory;
    if (/mas comprad|mas vendidos|mas populares|popularidad|tendencias|favoritos/.test(q)) {
      const lists = {
        Dama: ['donna born in roma', 'yara', 'good girl', 'la vie est belle', 'idole', 'j adore', 'delina', 'cloud'],
        Caballero: ['odyssey mandarin sky', 'uomo born in roma', 'acqua di gio', 'eros flame', 'bharara king', 'asad bourbon', 'nautica voyage', 'club de nuit intense', 'sauvage'],
        Unisex: ['santal 33', 'erba pura', 'khamrah', 'baccarat rouge'],
        Todos: ['odyssey mandarin sky', 'sauvage', 'good girl', 'yara', 'uomo born in roma', 'la vie est belle', 'eros flame', 'santal 33', 'erba pura', 'khamrah']
      };
      const chosen = [];
      for (const term of lists[audience] || lists.Todos) {
        const product = catalog.find(item => !isCombo(item) && (!audience || audience === 'Unisex' || item.category === audience) && normalize(`${item.name} ${item.brand||''}`).includes(term));
        if (product && !chosen.some(item => item.id === product.id)) chosen.push(product);
      }
      addText(`No tengo historial de ventas propio de Gomminola todavía. Estas son referencias reconocidas y destacadas en el mercado colombiano; Nuestros asesores pueden confirmar la rotación actual de la tienda${audience ? ` para ${audience.toLowerCase()}` : ''}.`);
      showProducts(chosen);
      return;
    }
    const requestedStyles = [];
    if (/citric|bergamota|limon|naranja/.test(q)) requestedStyles.push('citrico');
    if (/amader|madera|cedro|sandal/.test(q)) requestedStyles.push('amaderado');
    if (/dulce|vainilla|gourmand|caramelo/.test(q)) requestedStyles.push('dulce');
    if (/floral|florales|flores|jazmin|rosa/.test(q)) requestedStyles.push('floral');
    if (/fresc|acuatic|marino|marina/.test(q)) requestedStyles.push('fresco');
    if (/especiad|especia|picante/.test(q)) requestedStyles.push('especiado');
    if (requestedStyles.length) {
      let matches = catalog.filter(product => !isCombo(product) && (!audience || audience === 'Unisex' || product.category === audience) && requestedStyles.every(style => (product.profileTags || []).includes(style)));
      if (!matches.length) matches = catalog.filter(product => !isCombo(product) && (!audience || audience === 'Unisex' || product.category === audience) && requestedStyles.some(style => (product.profileTags || []).includes(style)));
      currentLeadNeed = text;
      addText(matches.length ? `Por lo que te gusta${audience ? ` y pensando en ${audience.toLowerCase()}` : ''}, estas opciones tienen un perfil ${requestedStyles.join(' y ')}. Te muestro el estilo para que compares y elijas:` : `Aún no tengo suficientes perfiles olfativos confirmados para combinar ${requestedStyles.join(' y ')} con esa categoría. Si me dices qué buscas, puedo mostrarte los favoritos destacados o nuestros asesores pueden orientarte.`);
      showProducts(matches);
      return;
    }
    const comboOnly = /combo|combos|promocion|promociones|oferta|ofertas|kit|kits/.test(q);
    const budget = extractBudget(q);
    if (comboOnly) {
      currentLeadNeed = text;
      const matches = findProducts(q.replace(/\b(combos|combo|promociones|promocion|ofertas|oferta|kits|kit)\b/g, ''), category, true, budget);
      addText(matches.length ? `Estos son algunos combos disponibles${category ? ` para ${category.toLowerCase()}` : ''}${budget ? ` dentro de ${money(budget)}` : ''}:` : 'No encontré combos con ese filtro. Puedo mostrarte todo el catálogo o cambiar el presupuesto.');
      showProducts(matches);
      return;
    }
    const named = findProducts(q, category, false, budget);
    if (named.length) {
      currentLeadNeed = text;
      addText(`Encontré estas opciones${budget ? ` hasta ${money(budget)}` : ''}:`);
      showProducts(named);
      return;
    }
    if (!audience && budget == null && /recomiend|suger|regalo|elegir/.test(q) && !requestedStyles.length) {
      currentLeadNeed = text;
      addText('Con gusto. Para acertar mejor, ¿buscas perfume para dama, caballero o unisex? ¿Te atrae más un perfil cítrico y fresco, dulce, floral o amaderado?');
      addActions([
        { label: 'Dama', value: 'Recomiéndame perfumes para dama' },
        { label: 'Caballero', value: 'Recomiéndame perfumes para caballero' },
        { label: 'Unisex', value: 'Recomiéndame perfumes unisex' },
        { label: 'Cítrico y fresco', value: 'Quiero un perfume cítrico y fresco' },
        { label: 'Dulce y cálido', value: 'Quiero un perfume dulce y cálido' },
        { label: 'Amaderado', value: 'Quiero un perfume amaderado' }
      ]);
      return;
    }
    if (category || budget != null || /recomiend|suger|regalo|elegir|busco|buscar|opciones/.test(q)) {
      currentLeadNeed = text;
      let recommendations = findProducts('', audience, false, budget).filter(item => !isCombo(item));
      if (audience && budget == null) { const popular = catalog.filter(item => !isCombo(item) && item.marketPopular && (audience === 'Unisex' || item.category === audience)); if (popular.length) recommendations = popular; }
      const top = recommendations.slice(0, 4);
      const condition = [category && `de ${category.toLowerCase()}`, budget && `hasta ${money(budget)}`].filter(Boolean).join(' ');
      addText(top.length ? `Te comparto algunas opciones${condition ? ` ${condition}` : ''}. Si me dices un nombre o una referencia, también puedo buscarla directamente.` : `No encontré referencias${condition ? ` ${condition}` : ''}. Puedo mostrarte los combos disponibles o buscar por nombre.`);
      showProducts(top);
      return;
    }
    if (/precio|cuanto|vale|cuesta/.test(q)) {
      addText('Dime el nombre del perfume o su número de referencia y te muestro el precio que aparece en el catálogo.');
      return;
    }
    currentLeadNeed = text;
    addText('Puedo buscar por nombre, marca o referencia; recomendarte por género, perfil cítrico, fresco, dulce o amaderado; mostrar referencias populares, combos, métodos de pago y envíos. ¿Qué te gustaría descubrir?');
    addActions([
      { label: 'Ver combos', value: 'Muéstrame los combos' },
      { label: 'Recomiéndame algo', value: 'Recomiéndame perfumes' },
      { label: 'Información de envío', value: '¿Cómo funcionan los envíos?' },
      { label: 'Mi selección', value: '__cart__' },
      { label: 'Hablar con nuestros asesores', value: '__handoff__' }
    ]);
  }

  launcher.addEventListener('click', () => {
    const open = !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    if (open && !body.childElementCount) {
      addText(welcomeMessage());
      addActions([
        { label: 'Perfumes para dama', value: 'Quiero ver perfumes para dama' },
        { label: 'Perfumes para caballero', value: 'Quiero ver perfumes para caballero' },
        { label: 'Ver combos', value: 'Muéstrame los combos' },
        { label: 'Más populares', value: '¿Cuáles son los más comprados?' },
        { label: 'Perfil cítrico o amaderado', value: 'Recomiéndame un perfume cítrico y amaderado' },
        { label: 'Métodos de pago', value: '¿Qué métodos de pago aceptan?' },
        { label: 'Mi selección', value: '__cart__' }
      ]);
    }
    if (open) input.focus();
  });
  document.addEventListener('gomminola:handoff', () => {
    if (!panel.classList.contains('open')) {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      if (!body.childElementCount) addText(welcomeMessage());
    }
    beginHandoff();
    input.focus();
  });
  document.querySelector('#chatClose').addEventListener('click', () => {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    handleMessage(text);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('open')) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      launcher.focus();
    }
  });
})();





