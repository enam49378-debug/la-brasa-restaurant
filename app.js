// Carta de Comida Rápida Stefy - Canela Baja, Coquimbo. Precios en pesos chilenos.
const WHATSAPP_PHONE = "56959887847";

const CATEGORIES = [
  { id: "ass", name: "Ass" },
  { id: "completos", name: "Completos" },
  { id: "hamburguesas", name: "Hamburguesas" },
  { id: "pizzas", name: "Pizzas individuales" },
  { id: "papas", name: "Papas & picoteo" },
  { id: "aves", name: "Sándwiches de ave" },
  { id: "churrascos", name: "Churrascos" },
  { id: "lomitos", name: "Lomitos" },
  { id: "empanadas", name: "Empanadas" },
  { id: "queso", name: "Queso caliente" },
  { id: "bebidas", name: "Bebidas calientes" },
  { id: "pollo", name: "Pollo" }
];

const MENU_ITEMS = [];
function addItems(category, entries) {
  entries.forEach((entry, index) => {
    const product = typeof entry === "string" ? { name: entry } : entry;
    MENU_ITEMS.push({
      id: category + "-" + (index + 1),
      category,
      name: product.name,
      desc: product.desc || "",
      price: null,
      options: Array.from({ length: product.prices || 0 }, (_, i) => ({
        label: "Opción " + (i + 1),
        price: null
      }))
    });
  });
}

addItems("ass", ["Ass italiano", "Ass queso", "Ass chacarero", "Ass dinámico"]);
addItems("completos", ["Completo (chucrut)", "Completo italiano", "Completo dinámico", "Completo español", "Papapleto"]);
addItems("hamburguesas", ["Hamburguesa clásica", "Hamburguesa Fefy", "Hamburguesa Piropito", "Hamburguesa italiana", "Hamburguesa chacarera", "Hamburguesa queso"]);
addItems("pizzas", [
  { name: "Pizza individual de jamón y queso", desc: "Pizza individual prehecha." },
  { name: "Pizza individual de peperoni", desc: "Pizza individual prehecha." }
]);
addItems("papas", [
  { name: "Salchipapas", prices: 3 },
  { name: "Salchicarne", prices: 2 },
  { name: "Salchipollo", prices: 2 },
  { name: "Nuggets de pollo (10 unidades)", desc: "Porción de 10 unidades" },
  { name: "Chorrillanas", prices: 3 },
  { name: "Pop corn de pollo + papas fritas", prices: 2 }
]);
addItems("aves", ["Ave mayo", "Ave mayo palta", "Ave italiana"]);
addItems("churrascos", [
  "Churrasco italiano",
  "Churrasco palta",
  "Churrasco tomate",
  "Churrasco simple",
  "Barros luco",
  "Chimilico",
  "Churrasco brasileño",
  "Churrasco turco",
  "Churrasco italiano con queso"
]);
addItems("lomitos", ["Lomito italiano", "Lomito palta", "Lomito tomate", "Lomito dinámico"]);
addItems("empanadas", ["Empanada de queso", "Empanada de jamón queso", "Empanada napolitana", "Empanada de carne queso", "Empanada de choclo queso", "Empanada de aceituna queso", "Empanada de pollo queso"]);
addItems("queso", ["Queso caliente"]);
addItems("bebidas", ["Té", "Café", "Cappuccino", "Té de hierbas", "Milo"]);
addItems("pollo", ["Pollo entero", "1/2 pollo", "1/4 pollo", "1/4 pollo + papas fritas"]);

// Precios leídos de las imágenes enviadas por el dueño del local.
// Los productos ausentes de esas imágenes conservan el precio pendiente.
const PRICES = {
  "Ass italiano": 4600,
  "Ass queso": 4200,
  "Ass chacarero": 5300,
  "Ass dinámico": 5000,
  "Completo (chucrut)": 3000,
  "Completo italiano": 2800,
  "Completo dinámico": 3400,
  "Completo español": 4500,
  "Papapleto": 2800,
  "Hamburguesa italiana": 5000,
  "Hamburguesa chacarera": 6000,
  "Nuggets de pollo (10 unidades)": 3000,
  "Churrasco italiano": 6000,
  "Churrasco palta": 6300,
  "Churrasco tomate": 5300,
  "Churrasco simple": 4800,
  "Barros luco": 5500,
  "Churrasco brasileño": 7000,
  "Churrasco turco": 6000,
  "Churrasco italiano con queso": 6800,
  "Empanada de queso": 2300,
  "Empanada de jamón queso": 2500,
  "Empanada napolitana": 2800,
  "Empanada de carne queso": 3000,
  "Empanada de choclo queso": 2800,
  "Empanada de aceituna queso": 2700,
  "Empanada de pollo queso": 3000,
  "Té": 800,
  "Café": 900,
  "Cappuccino": 1500,
  "Té de hierbas": 800
};
const VARIANT_PRICES = { "Salchipapas": [5500, 6500, 7500] };
MENU_ITEMS.forEach(item => {
  if (Object.hasOwn(PRICES, item.name)) item.price = PRICES[item.name];
  if (Object.hasOwn(VARIANT_PRICES, item.name)) {
    item.options.forEach((option, index) => { option.price = VARIANT_PRICES[item.name][index]; });
  }
});

const State = { category: "all", search: "", cart: [], selectedProduct: null, quantity: 1 };
const byId = id => document.getElementById(id);
const categoryName = id => CATEGORIES.find(cat => cat.id === id)?.name || id;
const money = value => "$" + value.toLocaleString("es-CL");
const fold = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function priceText(item) {
  if (item.options.length) {
    return item.options.every(option => typeof option.price === "number")
      ? "Desde " + money(Math.min(...item.options.map(option => option.price)))
      : item.options.length + " precios por definir";
  }
  return typeof item.price === "number" ? money(item.price) : "Precio por definir";
}

function priceKnown(item) {
  return item.options.length
    ? item.options.every(option => typeof option.price === "number")
    : typeof item.price === "number";
}

function renderCategories() {
  const list = [{ id: "all", name: "Toda la carta" }, ...CATEGORIES];
  byId("categoryButtons").innerHTML = list.map(cat =>
    '<button class="cat-btn' + (State.category === cat.id ? ' active' : '') +
    '" type="button" data-category="' + cat.id + '" aria-pressed="' + (State.category === cat.id) + '">' +
    escapeHtml(cat.name) + '</button>'
  ).join("");
}

function renderMenu() {
  const query = fold(State.search.trim());
  const filtered = MENU_ITEMS.filter(item =>
    (State.category === "all" || item.category === State.category) &&
    (!query || fold(item.name + " " + categoryName(item.category)).includes(query))
  );
  byId("currentCategoryTitle").textContent = State.category === "all" ? "Toda la carta" : categoryName(State.category);
  byId("itemsCount").textContent = filtered.length + (filtered.length === 1 ? " producto" : " productos");

  if (!filtered.length) {
    byId("menuGrid").innerHTML = '<div class="menu-empty">No encontramos ese antojo. Probá con otra búsqueda ♡</div>';
    return;
  }

  const groups = CATEGORIES.filter(cat => filtered.some(item => item.category === cat.id));
  byId("menuGrid").innerHTML = groups.map((cat, groupIndex) => {
    const items = filtered.filter(item => item.category === cat.id);
    const cards = items.map((item, index) =>
      '<article class="rustic-card">' +
      '<div class="card-top"><span class="card-number">' + String(index + 1).padStart(2, "0") + '</span><span class="card-flower" aria-hidden="true">✳</span></div>' +
      '<div class="card-body"><h4 class="card-title">' + escapeHtml(item.name) + '</h4>' +
      '<p class="card-ingredients">' + (item.options.length ? item.options.length + " opciones disponibles" : escapeHtml(item.desc || cat.name)) + '</p>' +
      '<div class="card-bottom"><span class="card-price' + (priceKnown(item) ? '' : ' pending') + '">' + priceText(item) + '</span>' +
      '<button class="btn-order-direct" type="button" data-product="' + item.id + '">+ Elegir</button></div></div></article>'
    ).join("");
    return '<section class="menu-group" aria-labelledby="group-' + cat.id + '">' +
      '<div class="group-heading"><div><span class="group-index">' + String(groupIndex + 1).padStart(2, "0") +
      ' / LA CARTA</span><h3 id="group-' + cat.id + '">' + escapeHtml(cat.name) +
      '</h3></div><span class="group-count">' + items.length + (items.length === 1 ? " opción" : " opciones") +
      '</span></div><div class="menu-grid">' + cards + '</div></section>';
  }).join("");
}

function openModal(id) {
  const product = MENU_ITEMS.find(item => item.id === id);
  if (!product) return;
  State.selectedProduct = product;
  State.quantity = 1;
  byId("modalCategory").textContent = categoryName(product.category);
  byId("modalName").textContent = product.name;
  byId("modalDesc").textContent = product.desc || (product.options.length
    ? "Seleccioná una de las " + product.options.length + " opciones disponibles."
    : "Consultá los detalles al hacer tu pedido.");
  byId("modalPrice").textContent = priceText(product);
  byId("modalQtyNum").textContent = "1";
  byId("modalNotes").value = "";
  byId("variantsGroup").hidden = !product.options.length;
  byId("variantOptions").innerHTML = product.options.map((option, index) =>
    '<label class="variant-option"><input type="radio" name="product_variant" value="' + index +
    '"' + (index === 0 ? ' checked' : '') + '><span>' + escapeHtml(option.label) +
    '</span><small>' + (typeof option.price === "number" ? money(option.price) : "Precio por definir") + '</small></label>'
  ).join("");
  updateModalTotal();
  byId("productModal").style.display = "flex";
  byId("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
  byId("closeModalBtn").focus();
}

function closeModal() {
  byId("productModal").style.display = "none";
  State.selectedProduct = null;
  if (!byId("cartDrawer").classList.contains("active")) {
    byId("overlay").classList.remove("active");
    document.body.style.overflow = "";
  }
}

function selectedOption() {
  const product = State.selectedProduct;
  if (!product || !product.options.length) return null;
  const index = Number(document.querySelector('input[name="product_variant"]:checked')?.value || 0);
  return product.options[index];
}

function updateModalTotal() {
  const product = State.selectedProduct;
  if (!product) return;
  const option = selectedOption();
  const price = option ? option.price : product.price;
  byId("modalTotalBtn").textContent = typeof price === "number" ? money(price * State.quantity) : "↗";
}

function addToCartFromModal() {
  const product = State.selectedProduct;
  if (!product) return;
  const option = selectedOption();
  State.cart.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2),
    name: product.name,
    variant: option ? option.label : "",
    unitPrice: option ? option.price : product.price,
    qty: State.quantity,
    notes: byId("modalNotes").value.trim()
  });
  closeModal();
  updateCartUI();
  openCart();
}

function cartTotal() {
  return State.cart.every(item => typeof item.unitPrice === "number")
    ? State.cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
    : null;
}

function updateCartUI() {
  const count = State.cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cartTotal();
  const totalLabel = total === null ? "Por confirmar" : money(total);
  byId("cartCount").textContent = count;
  byId("cartNavTotal").textContent = totalLabel;
  byId("mobileCount").textContent = count;
  byId("mobileTotal").textContent = totalLabel;
  byId("mobileBar").classList.toggle("has-items", count > 0);
  byId("cartEmptyNotice").style.display = count ? "none" : "";
  byId("cartFoot").style.display = count ? "" : "none";
  byId("cartGrandTotal").textContent = totalLabel;
  byId("cartItemsList").innerHTML = State.cart.map(item =>
    '<div class="cart-item-card"><div class="c-item-title">' + item.qty + ' × ' + escapeHtml(item.name) + '</div>' +
    '<div class="c-item-sub">' + (item.variant ? escapeHtml(item.variant) : '') +
    (item.notes ? (item.variant ? ' · ' : '') + 'Nota: ' + escapeHtml(item.notes) : '') + '</div>' +
    '<div class="c-item-bottom"><span class="c-item-price">' +
    (typeof item.unitPrice === "number" ? money(item.unitPrice * item.qty) : "Precio por definir") +
    '</span><div><button class="c-qty-btn" type="button" data-cart-id="' + item.id +
    '" data-delta="-1" aria-label="Quitar uno">−</button><button class="c-qty-btn" type="button" data-cart-id="' +
    item.id + '" data-delta="1" aria-label="Agregar uno">+</button></div></div></div>'
  ).join("");
}

function changeQty(id, delta) {
  const index = State.cart.findIndex(item => item.id === id);
  if (index < 0) return;
  State.cart[index].qty += delta;
  if (State.cart[index].qty <= 0) State.cart.splice(index, 1);
  updateCartUI();
}

function openCart() {
  byId("cartDrawer").classList.add("active");
  byId("cartDrawer").setAttribute("aria-hidden", "false");
  byId("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
  byId("closeCartBtn").focus();
}

function closeCart() {
  byId("cartDrawer").classList.remove("active");
  byId("cartDrawer").setAttribute("aria-hidden", "true");
  byId("overlay").classList.remove("active");
  document.body.style.overflow = "";
}

function sendOrderToKitchen() {
  if (!State.cart.length) {
    alert("Tu bolsita está vacía. Elegí algo rico de la carta para empezar.");
    return;
  }
  const name = byId("custName").value.trim();
  const phone = byId("custPhone") ? byId("custPhone").value.trim() : "";
  const payMethod = byId("custPay").value;

  if (!name) {
    alert("Por favor escribí tu nombre para saber quién retira el pedido.");
    byId("custName").focus();
    return;
  }

  const btn = byId("sendOrderBtn") || byId("sendWhatsappBtn");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Enviando pedido a cocina...</span> <span class="arrow">⏳</span>';
  }

  const orderPayload = {
    customerName: name,
    customerPhone: phone,
    customerAddress: "Estanislao Oyarzú 375, Canela Baja",
    deliveryType: "Retiro en Local",
    paymentMethod: payMethod,
    items: State.cart.map(item => ({
      name: item.name + (item.variant ? " (" + item.variant + ")" : ""),
      qty: item.qty,
      unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
      notes: item.notes || ""
    })),
    total: cartTotal() || 0
  };

  fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload)
  })
    .then(async res => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(data => {
      const order = data.order || { number: "001", total: orderPayload.total };
      State.cart = [];
      updateCartUI();
      closeCart();
      byId("custName").value = "";
      if (byId("custPhone")) byId("custPhone").value = "";
      showOrderSuccess(order, orderPayload);
    })
    .catch(err => {
      console.error("Error al enviar pedido:", err);
      alert("Hubo un inconveniente al enviar tu pedido. Por favor intenta nuevamente o llámanos al +56 9 5988 7847.");
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml || '<span>Confirmar Pedido para Retiro</span> <span class="arrow" aria-hidden="true">➔</span>';
      }
    });
}

function showOrderSuccess(order, payload) {
  const modal = byId("orderSuccessModal");
  if (!modal) {
    alert("¡Pedido #" + (order.number || "001") + " recibido con éxito en cocina!");
    return;
  }

  byId("successOrderNum").textContent = "Pedido #" + (order.number || "001");

  const itemsHtml = payload.items.map(it => 
    '<div style="display:flex; justify-content:space-between; margin-bottom:4px;">' +
      '<span>' + it.qty + 'x ' + escapeHtml(it.name) + '</span>' +
      '<strong>' + (it.unitPrice > 0 ? money(it.unitPrice * it.qty) : '') + '</strong>' +
    '</div>' + (it.notes ? '<div style="font-size:0.8rem; color:#786958; margin-bottom:4px;">Nota: ' + escapeHtml(it.notes) + '</div>' : '')
  ).join("");

  byId("successOrderDetails").innerHTML =
    '<div style="margin-bottom:8px; border-bottom:1px solid #ebd9c8; padding-bottom:6px;">' +
      '<div><strong>Cliente:</strong> ' + escapeHtml(payload.customerName) + '</div>' +
      '<div><strong>Retiro en:</strong> 📍 Estanislao Oyarzú 375, Canela Baja</div>' +
      '<div><strong>Pago al retirar:</strong> ' + escapeHtml(payload.paymentMethod) + '</div>' +
    '</div>' +
    '<div style="margin-bottom:8px;">' + itemsHtml + '</div>' +
    '<div style="border-top:1px solid #ebd9c8; padding-top:6px; display:flex; justify-content:space-between; font-weight:700; color:var(--rust-dark); font-size:1.05rem;">' +
      '<span>Total a pagar:</span><span>' + money(payload.total) + '</span>' +
    '</div>';

  const waBtn = byId("successWaBtn");
  if (waBtn) {
    const waText = encodeURIComponent("Hola Comida Rápida Stefy! Acabo de hacer el Pedido #" + (order.number || "") + " a nombre de " + payload.customerName + ". ¿Cuánto demora aprox para pasar a retirar? ¡Muchas gracias!");
    waBtn.href = "https://wa.me/" + WHATSAPP_PHONE + "?text=" + waText;
  }

  modal.style.display = "flex";
  byId("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSuccessModal() {
  const modal = byId("orderSuccessModal");
  if (modal) modal.style.display = "none";
  byId("overlay").classList.remove("active");
  document.body.style.overflow = "";
}

function setupEvents() {
  byId("categoryButtons").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    State.category = button.dataset.category;
    renderCategories();
    renderMenu();
  });
  byId("searchInput").addEventListener("input", event => {
    State.search = event.target.value;
    renderMenu();
  });
  byId("menuGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-product]");
    if (button) openModal(button.dataset.product);
  });
  byId("openCartBtn").addEventListener("click", openCart);
  byId("mobileCartBtn").addEventListener("click", openCart);
  byId("closeCartBtn").addEventListener("click", closeCart);
  byId("closeModalBtn").addEventListener("click", closeModal);
  const closeSuccessBtn = byId("closeSuccessBtn");
  if (closeSuccessBtn) closeSuccessBtn.addEventListener("click", closeSuccessModal);
  byId("overlay").addEventListener("click", () => { closeModal(); closeCart(); closeSuccessModal(); });
  byId("productModal").addEventListener("click", event => {
    if (event.target.id === "productModal") closeModal();
  });
  const orderSuccessModal = byId("orderSuccessModal");
  if (orderSuccessModal) {
    orderSuccessModal.addEventListener("click", event => {
      if (event.target.id === "orderSuccessModal") closeSuccessModal();
    });
  }
  byId("modalQtyMinus").addEventListener("click", () => {
    if (State.quantity > 1) { State.quantity--; byId("modalQtyNum").textContent = State.quantity; updateModalTotal(); }
  });
  byId("modalQtyPlus").addEventListener("click", () => {
    State.quantity++; byId("modalQtyNum").textContent = State.quantity; updateModalTotal();
  });
  byId("variantOptions").addEventListener("change", updateModalTotal);
  byId("confirmAddBtn").addEventListener("click", addToCartFromModal);
  byId("cartItemsList").addEventListener("click", event => {
    const button = event.target.closest("[data-cart-id]");
    if (button) changeQty(button.dataset.cartId, Number(button.dataset.delta));
  });

  const orderBtn = byId("sendOrderBtn") || byId("sendWhatsappBtn");
  if (orderBtn) orderBtn.addEventListener("click", sendOrderToKitchen);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (byId("productModal").style.display !== "none") closeModal();
    else if (orderSuccessModal && orderSuccessModal.style.display !== "none") closeSuccessModal();
    else if (byId("cartDrawer").classList.contains("active")) closeCart();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCategories();
  renderMenu();
  setupEvents();
  updateCartUI();
});
