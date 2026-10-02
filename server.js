// ==========================================================================
// SERVIDOR EN TIEMPO REAL - LA BRASA
// Node.js nativo (sin dependencias externas, arranca al instante)
// ==========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const ORDERS_FILE = path.join(__dirname, 'pedidos.json');

// Memoria de pedidos y clientes conectados (SSE)
let orders = [];
let sseClients = [];

// Cargar pedidos guardados si existen
try {
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  }
} catch (e) {
  orders = [];
}

function saveOrders() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error al guardar pedidos:', e);
  }
}

// Notificar a todos los celulares/pantallas conectadas vía SSE
function broadcastNewOrder(order) {
  const data = `data: ${JSON.stringify({ type: 'NEW_ORDER', order })}\n\n`;
  sseClients.forEach(client => client.res.write(data));
}

function broadcastStatusChange(orderId, status) {
  const data = `data: ${JSON.stringify({ type: 'STATUS_CHANGE', orderId, status })}\n\n`;
  sseClients.forEach(client => client.res.write(data));
}

// Obtener IP local de la máquina en Wi-Fi para que el usuario entre desde el cel
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // ------------------------------------------------------------------------
  // API: STREAM EN TIEMPO REAL (SSE) PARA EL CELULAR DEL COCINERO / DUEÑO
  // ------------------------------------------------------------------------
  if (pathname === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Conectado a La Brasa' })}\n\n`);

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    // Heartbeat cada 15 segundos para evitar que Render o proxies cierren la conexión
    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (e) {
        clearInterval(pingInterval);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
    return;
  }

  // ------------------------------------------------------------------------
  // API: OBTENER TODOS LOS PEDIDOS
  // ------------------------------------------------------------------------
  if (pathname === '/api/orders' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(orders));
    return;
  }

  // ------------------------------------------------------------------------
  // API: CREAR UN NUEVO PEDIDO (DESDE LA CARTA DEL CLIENTE)
  // ------------------------------------------------------------------------
  if (pathname === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const orderData = JSON.parse(body);
        const orderNumber = (orders.length + 1).toString().padStart(3, '0');
        
        const newOrder = {
          id: 'ORD-' + Date.now(),
          number: orderNumber,
          customerName: orderData.customerName || 'Cliente Anónimo',
          customerAddress: orderData.customerAddress || 'Retiro en Local',
          customerPhone: orderData.customerPhone || '',
          deliveryType: orderData.deliveryType || 'Delivery',
          paymentMethod: orderData.paymentMethod || 'Efectivo',
          items: orderData.items || [],
          total: orderData.total || 0,
          status: 'NUEVO', // NUEVO -> PREPARANDO -> LISTO -> ENTREGADO
          timestamp: new Date().toISOString(),
          createdAtFormatted: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        };

        orders.unshift(newOrder); // Guardar arriba
        saveOrders();
        broadcastNewOrder(newOrder);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, order: newOrder }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Datos de pedido inválidos' }));
      }
    });
    return;
  }

  // ------------------------------------------------------------------------
  // API: ACTUALIZAR ESTADO DEL PEDIDO (DESDE EL CELULAR)
  // ------------------------------------------------------------------------
  if (pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
    const orderId = pathname.replace('/api/orders/', '');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { status } = JSON.parse(body);
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = status;
          saveOrders();
          broadcastStatusChange(orderId, status);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, order }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Pedido no encontrado' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error al actualizar estado' }));
      }
    });
    return;
  }

  // ------------------------------------------------------------------------
  // SERVIR ARCHIVOS ESTÁTICOS (HTML, CSS, JS, MANIFEST)
  // ------------------------------------------------------------------------
  let filePath = pathname === '/' ? '/index.html' : pathname;
  if (pathname === '/admin' || pathname === '/admin/') {
    filePath = '/admin.html';
  }

  const safePath = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Acceso denegado');
    return;
  }

  const ext = path.extname(safePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.apk': 'application/vnd.android.package-archive'
  };

  if (pathname === '/descargar-app' || pathname === '/descargar') {
    filePath = '/LaBrasa_Cocina.apk';
  }

  fs.readFile(safePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Archivo no encontrado');
      } else {
        res.writeHead(500);
        res.end('Error interno del servidor');
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('========================================================');
  console.log('🔥 SERVIDOR DE LA BRASA ACTIVO');
  console.log('--------------------------------------------------------');
  console.log(`📱 APP PARA EL CELULAR:  http://${localIp}:${PORT}/admin`);
  console.log(`💻 CARTA DE CLIENTES:    http://${localIp}:${PORT}/`);
  console.log('========================================================');
});
