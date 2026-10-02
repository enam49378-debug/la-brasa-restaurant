/**
 * ==========================================================================
 * COMANDERA DE COCINA - COMIDA RÁPIDA STEFY (CANELA BAJA)
 * Diseñada para ser ultra simple, rápida y fácil de ver en el celular.
 * ==========================================================================
 */

let allOrders = [];
let currentFilter = 'NUEVO';
let audioCtx = null;
let eventSource = null;

function cleanPhone(phone) {
  if (!phone) return '';
  let p = phone.replace(/\D/g, '');
  if (p.length === 9) p = '56' + p;
  return p;
}

function formatMoney(val) {
  if (typeof val !== 'number' || isNaN(val)) return '$0';
  return '$' + Math.round(val).toLocaleString('es-CL');
}

// ==========================================================================
// SINTETIZADOR DE TIMBRE DE COCINA (Web Audio API)
// Suena como campana de cocina de restaurante "Ding - Dong"
// ==========================================================================
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playKitchenChime() {
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const notes = [
    { freq: 880, start: 0, dur: 0.8 },       // La5
    { freq: 1174.66, start: 0.18, dur: 1.2 } // Re6
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.4, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now + start);
    osc.stop(now + start + dur);
  });

  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 300]);
  }
}

// ==========================================================================
// CONEXIÓN EN TIEMPO REAL CON EL SERVIDOR (SSE)
// ==========================================================================
function startRealtimeConnection() {
  const statusPill = document.getElementById('connectionStatus');
  const statusText = document.getElementById('connectionText');

  if (eventSource) {
    eventSource.close();
  }

  statusText.textContent = 'Conectando...';

  // Cargar pedidos inmediatamente
  loadInitialOrders();

  try {
    eventSource = new EventSource('/api/stream');

    eventSource.onopen = () => {
      statusPill.className = 'app-status-pill online';
      statusText.textContent = 'En línea';
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'NEW_ORDER') {
          allOrders.unshift(data.order);
          playKitchenChime();
          renderOrders();
          updateBadges();
        }

        if (data.type === 'STATUS_CHANGE') {
          const order = allOrders.find(o => o.id === data.orderId);
          if (order) {
            order.status = data.status;
            renderOrders();
            updateBadges();
          }
        }
      } catch (e) {
        console.error('Error al procesar evento SSE:', e);
      }
    };

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CONNECTING) {
        statusPill.className = 'app-status-pill offline';
        statusText.textContent = 'Reconectando...';
      } else {
        statusPill.className = 'app-status-pill offline';
        statusText.textContent = 'Desconectado';
      }
    };
  } catch (err) {
    statusPill.className = 'app-status-pill offline';
    statusText.textContent = 'Error Conexión';
  }
}

// Cargar pedidos existentes al abrir
async function loadInitialOrders() {
  const statusPill = document.getElementById('connectionStatus');
  const statusText = document.getElementById('connectionText');
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      allOrders = await res.json();
      renderOrders();
      updateBadges();
      statusPill.className = 'app-status-pill online';
      statusText.textContent = 'En línea';
    }
  } catch (e) {
    console.error('Error al cargar pedidos iniciales:', e);
  }
}

// ==========================================================================
// RENDERIZADO DE COMANDAS (FÁCIL Y CLARO PARA LA MAMÁ)
// ==========================================================================
function renderOrders() {
  const container = document.getElementById('ordersList');
  const filtered = allOrders.filter(o => o.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-feed" style="text-align:center; padding: 40px 20px; color:#a8a29e;">
        <div style="font-size: 3rem; margin-bottom: 8px;">🍳</div>
        <p style="font-size: 1.1rem; font-weight:600;">No hay pedidos en <strong>${getFilterTitle(currentFilter)}</strong>.</p>
        <small style="color:#78716c;">Cuando entre una orden sonará el timbre de cocina.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const phoneClean = cleanPhone(order.customerPhone);
    const waMessage = encodeURIComponent(
      `¡Hola ${order.customerName}! Le avisamos de Comida Rápida Stefy que su Pedido #${order.number || ''} ya está LISTO para retirar en Estanislao Oyarzú 375, Canela Baja. ¡Le esperamos calentito!`
    );

    return `
      <div class="order-card status-${order.status}" id="card-${order.id}">
        
        <!-- Encabezado de la comanda -->
        <div class="order-card-header">
          <div class="order-num-block">
            <span class="order-num">#${order.number || '001'}</span>
            <span class="order-time">${order.createdAtFormatted || 'Hace instantes'}</span>
          </div>
          <span class="delivery-badge" style="background:#22c55e20; color:#22c55e; border-color:#22c55e60;">
            🥡 Retiro en Local
          </span>
        </div>

        <!-- Cuerpo con datos del cliente y comida -->
        <div class="order-card-body">
          <div class="customer-info">
            <div class="cust-name">👤 Cliente: <strong>${order.customerName}</strong></div>
            ${order.customerPhone ? `
              <div class="cust-addr" style="margin-top:4px;">
                📞 Teléfono: <a href="tel:${order.customerPhone}" style="color:#38bdf8; text-decoration:none; font-weight:700;">${order.customerPhone}</a>
              </div>
            ` : ''}
            <div class="cust-pay">💵 Pago: <strong>${order.paymentMethod || 'Efectivo al retirar'}</strong></div>
          </div>

          <!-- Platos solicitados -->
          <div class="items-list">
            ${(order.items || []).map(item => `
              <div class="order-item-row" style="padding: 6px 0; border-bottom: 1px dotted #332d20;">
                <div>
                  <div class="order-item-title" style="font-size:1.05rem; font-weight:700; color:#fff;">
                    • ${item.qty}x ${item.name}
                  </div>
                  ${item.notes ? `
                    <div style="background:#3b2d18; color:#fde047; padding:3px 8px; border-radius:4px; font-size:0.82rem; font-weight:700; margin-top:4px;">
                      ⚠️ Nota del cliente: "${item.notes}"
                    </div>
                  ` : ''}
                </div>
                <div class="order-item-price" style="font-size:1rem; font-weight:700;">
                  ${formatMoney(item.unitPrice * item.qty)}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Total a cobrar -->
          <div class="order-total-bar">
            <span>Total a Cobrar al Retirar:</span>
            <span class="order-total-amount">${formatMoney(order.total)}</span>
          </div>

          <!-- Botones de Acción para la Mamá -->
          <div class="order-actions">
            ${renderActionButtons(order, phoneClean, waMessage)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderActionButtons(order, phoneClean, waMessage) {
  if (order.status === 'NUEVO') {
    return `
      <button class="btn-action-main btn-kitchen" onclick="changeStatus('${order.id}', 'PREPARANDO')">
        🍳 EMPEZAR A PREPARAR (Pasar a Cocina)
      </button>
      <button class="btn-cancel" onclick="changeStatus('${order.id}', 'ENTREGADO')">
        Marcar como cerrado
      </button>
    `;
  }
  if (order.status === 'PREPARANDO') {
    return `
      <button class="btn-action-main btn-ready" onclick="changeStatus('${order.id}', 'LISTO')">
        ✅ ¡ESTÁ LISTO! (Avisar para Retiro)
      </button>
    `;
  }
  if (order.status === 'LISTO') {
    return `
      ${phoneClean ? `
        <a class="btn-action-main btn-wa" href="https://wa.me/${phoneClean}?text=${waMessage}" target="_blank" rel="noopener" style="background:#25D366; color:#fff; text-decoration:none; margin-bottom:6px;">
          💬 Avisar por WhatsApp al cliente que está listo
        </a>
      ` : ''}
      <button class="btn-action-main btn-deliver" onclick="changeStatus('${order.id}', 'ENTREGADO')">
        📦 ENTREGADO Y COBRADO (Cerrar)
      </button>
    `;
  }
  return `
    <div style="font-size:0.95rem; color:#86efac; text-align:center; padding: 8px; font-weight:700; background:#142918; border-radius:4px;">
      ✓ Pedido entregado y cobrado
    </div>
  `;
}

function getFilterTitle(status) {
  switch (status) {
    case 'NUEVO': return 'Nuevos';
    case 'PREPARANDO': return 'En Cocina';
    case 'LISTO': return 'Listos para Retiro';
    case 'ENTREGADO': return 'Entregados';
    default: return '';
  }
}

// Actualizar contadores de las pestañas
function updateBadges() {
  const counts = {
    NUEVO: 0,
    PREPARANDO: 0,
    LISTO: 0,
    ENTREGADO: 0
  };

  allOrders.forEach(o => {
    if (counts[o.status] !== undefined) {
      counts[o.status]++;
    }
  });

  document.getElementById('badgeNuevos').textContent = counts.NUEVO;
  document.getElementById('badgeCocina').textContent = counts.PREPARANDO;
  document.getElementById('badgeListo').textContent = counts.LISTO;
  document.getElementById('badgeEntregados').textContent = counts.ENTREGADO;
}

// Cambiar estado en el servidor
async function changeStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        order.status = newStatus;
        renderOrders();
        updateBadges();
      }
    }
  } catch (e) {
    console.error('Error al actualizar estado:', e);
  }
}

// ==========================================================================
// SIMULACIÓN DE PRUEBA RÁPIDA
// ==========================================================================
async function sendTestOrder() {
  initAudio();
  const testData = {
    customerName: 'Cliente de Prueba (Canela Baja)',
    customerPhone: '+56 9 5988 7847',
    customerAddress: 'Estanislao Oyarzú 375, Canela Baja',
    deliveryType: 'Retiro en Local',
    paymentMethod: 'Efectivo al retirar',
    items: [
      { name: 'Ass italiano', qty: 1, unitPrice: 4600 },
      { name: 'Completo italiano', qty: 2, unitPrice: 2800, notes: 'Sin mostaza' }
    ],
    total: 10200
  };

  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
  } catch (e) {
    console.error('Error al enviar pedido de prueba', e);
  }
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  startRealtimeConnection();

  // Control de pestañas
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.tab;
      renderOrders();
    });
  });

  // Botón probar sonido
  document.getElementById('testSoundBtn').addEventListener('click', () => {
    initAudio();
    playKitchenChime();
  });

  // Botón simular orden de prueba
  document.getElementById('simOrderBtn').addEventListener('click', sendTestOrder);

  // Desbloqueo de audio al primer toque
  document.body.addEventListener('touchstart', initAudio, { once: true });
  document.body.addEventListener('click', initAudio, { once: true });
});
