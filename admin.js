/**
 * ==========================================================================
 * COMANDERA MÓVIL - LA BRASA
 * Lógica en tiempo real, alarmas con sonido y gestión de cocina
 * ==========================================================================
 */

let allOrders = [];
let currentFilter = 'NUEVO';
let audioCtx = null;

// ==========================================================================
// SINTETIZADOR DE TIMBRE DE COCINA (Web Audio API)
// No necesita archivos MP3 externos, suena fuerte y claro en cualquier celular.
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

  // Secuencia de dos campanas "Ding - Dong" de restaurante
  const notes = [
    { freq: 880, start: 0, dur: 0.8 },    // La5
    { freq: 1174.66, start: 0.18, dur: 1.2 } // Re6
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);

    // Envolvente de volumen de campana metálica
    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.4, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now + start);
    osc.stop(now + start + dur);
  });

  // Si el celular soporta vibración, vibrar 2 veces
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

  const eventSource = new EventSource('/api/stream');

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
    statusPill.className = 'app-status-pill offline';
    statusText.textContent = 'Reconectando...';
  };
}

function formatMoney(val) {
  if (typeof val !== 'number' || isNaN(val)) return '$0';
  return '$' + Math.round(val).toLocaleString('es-CL');
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
// RENDERIZADO DE COMANDAS
// ==========================================================================
function renderOrders() {
  const container = document.getElementById('ordersList');
  const filtered = allOrders.filter(o => o.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-feed">
        <div class="empty-icon">🍳</div>
        <p>No hay pedidos en la sección <strong>${getFilterTitle(currentFilter)}</strong>.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    return `
      <div class="order-card status-${order.status}" id="card-${order.id}">
        
        <!-- Encabezado de la comanda -->
        <div class="order-card-header">
          <div class="order-num-block">
            <span class="order-num">#${order.number || '001'}</span>
            <span class="order-time">${order.createdAtFormatted || 'Hace instantes'}</span>
          </div>
          <span class="delivery-badge">${order.deliveryType === 'Delivery' ? '🛵 Delivery' : '🥡 Retiro'}</span>
        </div>

        <!-- Cuerpo con datos del cliente y comida -->
        <div class="order-card-body">
          <div class="customer-info">
            <div class="cust-name">👤 ${order.customerName}</div>
            <div class="cust-addr">📍 ${order.customerAddress}</div>
            <div class="cust-pay">💵 Pago: ${order.paymentMethod}</div>
          </div>

          <!-- Platos solicitados -->
          <div class="items-list">
            ${order.items.map(item => `
              <div class="order-item-row">
                <div>
                  <div class="order-item-title">${item.qty}x ${item.name}</div>
                  <div class="order-item-specs">
                    ${item.cookingPoint ? `• Punto: ${item.cookingPoint}` : ''}
                    ${item.extras && item.extras.length > 0 ? ` • Extras: ${item.extras.join(', ')}` : ''}
                    ${item.notes ? ` • <em>"${item.notes}"</em>` : ''}
                  </div>
                </div>
                <div class="order-item-price">${formatMoney(item.unitPrice * item.qty)}</div>
              </div>
            `).join('')}
          </div>

          <!-- Total a cobrar -->
          <div class="order-total-bar">
            <span>Total a Cobrar:</span>
            <span class="order-total-amount">${formatMoney(order.total)}</span>
          </div>

          <!-- Botones de Acción de Cocina -->
          <div class="order-actions">
            ${renderActionButtons(order)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderActionButtons(order) {
  if (order.status === 'NUEVO') {
    return `
      <button class="btn-action-main btn-kitchen" onclick="changeStatus('${order.id}', 'PREPARANDO')">
        🍳 Aceptar y Pasar a Cocina
      </button>
      <button class="btn-cancel" onclick="changeStatus('${order.id}', 'ENTREGADO')">
        Marcar como cerrado
      </button>
    `;
  }
  if (order.status === 'PREPARANDO') {
    return `
      <button class="btn-action-main btn-ready" onclick="changeStatus('${order.id}', 'LISTO')">
        🛵 Listo para Enviar / Entregar
      </button>
    `;
  }
  if (order.status === 'LISTO') {
    return `
      <button class="btn-action-main btn-deliver" onclick="changeStatus('${order.id}', 'ENTREGADO')">
        ✅ Pedido Entregado al Cliente
      </button>
    `;
  }
  return `
    <span style="font-size:0.8rem; color:#86efac; text-align:center; padding: 4px;">✓ Pedido completado</span>
  `;
}

function getFilterTitle(status) {
  switch (status) {
    case 'NUEVO': return 'Nuevos';
    case 'PREPARANDO': return 'En Cocina';
    case 'LISTO': return 'Listos para Reparto';
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
    if (counts[o.status] !== undefined) counts[o.status]++;
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
// SIMULACIÓN DE PRUEBA
// ==========================================================================
async function sendTestOrder() {
  initAudio();
  const testData = {
    customerName: 'Prueba desde el Celular',
    customerAddress: 'Mesa 4 / Calle Falsa 123',
    deliveryType: 'Delivery',
    paymentMethod: 'Efectivo',
    items: [
      { name: 'Doble Bacon & Queso Fundido', qty: 2, unitPrice: 8.50, cookingPoint: 'Jugosa', extras: ['Queso Cheddar Extra'] },
      { name: 'Papas Rústicas con Cheddar', qty: 1, unitPrice: 4.80 }
    ],
    total: 21.80
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
// EVENTOS Y NAVEGACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadInitialOrders();
  startRealtimeConnection();

  // Cambio de pestañas
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

  // Botón simular orden
  document.getElementById('simOrderBtn').addEventListener('click', sendTestOrder);

  // Desbloquear audio al primer toque en la pantalla
  document.body.addEventListener('touchstart', initAudio, { once: true });
  document.body.addEventListener('click', initAudio, { once: true });
});
