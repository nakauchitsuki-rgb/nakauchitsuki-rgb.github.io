
"use strict";

// ===== 初期商品設定 =====
const defaultProducts = [
  { id: 1, name: "きなこ", price: 200 },
  { id: 2, name: "さとう", price: 200 },
  { id: 3, name: "ココア", price: 200 },
  { id: 4, name: "抹茶", price: 200 },
  { id: 5, name: "きなこハーフ", price: 120 },
  { id: 6, name: "さとうハーフ", price: 120 },
  { id: 7, name: "ココアハーフ", price: 120 },
  { id: 8, name: "抹茶ハーフ", price: 120 }
];

const PRODUCT_KEY = "agepan_products_v1";
const ORDER_KEY = "agepan_orders_v1";
const NEXT_ID_KEY = "agepan_next_product_id_v1";

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error("読み込みエラー", error);
    return fallback;
  }
}

let products = loadData(
  PRODUCT_KEY,
  defaultProducts.map(p => ({ ...p }))
);

let orders = loadData(ORDER_KEY, []);
let cart = [];

let nextProductId = Math.max(
  Number(localStorage.getItem(NEXT_ID_KEY)) || 1,
  1 + Math.max(0, ...products.map(p => Number(p.id) || 0)),
  1 + Math.max(0, ...defaultProducts.map(p => p.id))
);

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("保存エラー", error);
    alert("データの保存に失敗しました");
    return false;
  }
}

// ===== 画面要素 =====
const productsElement = document.getElementById("products");
const cartElement = document.getElementById("cart");
const totalElement = document.getElementById("total");
const paymentElement = document.getElementById("payment");
const changeElement = document.getElementById("change");

// ===== タブ切り替え =====
document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.remove("active");
    });

    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    button.classList.add("active");
    document.getElementById(button.dataset.page)
      .classList.add("active");

    renderCooking();
    renderHistory();

    if (button.dataset.page === "settings") {
      renderSettings();
    }
  });
});

// ===== 商品ボタン =====
function renderProducts() {
  productsElement.innerHTML = "";

  products.forEach(product => {
    const button = document.createElement("button");
    button.className = "product";
    const photoId = ((Number(product.id) - 1) % 8 + 8) % 8 + 1;
    button.style.setProperty("--product-photo", `url("./assets/products/product-${photoId}.jpg")`);
    const name = document.createElement("span");
    name.className = "product-name";
    name.textContent = product.name;
    const price = document.createElement("span");
    price.className = "product-price";
    price.textContent = `${product.price.toLocaleString()}円`;
    button.append(name, price);

    button.addEventListener("click", () => {
      addProduct(product.id);
    });

    productsElement.appendChild(button);
  });
}

// ===== カート =====
function addProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const item = cart.find(p => p.id === id);

  if (item) {
    item.quantity++;
  } else {
    cart.push({
      ...product,
      quantity: 1
    });
  }

  updateCart();
}

function changeQuantity(id, amount) {
  const item = cart.find(p => p.id === id);
  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(p => p.id !== id);
  }

  updateCart();
}

function getTotal() {
  return cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

function updateCart() {
  cartElement.innerHTML = "";

  cart.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const name = document.createElement("span");
    name.textContent = item.name;

    const quantity = document.createElement("div");
    quantity.className = "quantity";

    const minus = document.createElement("button");
    minus.textContent = "－";
    minus.addEventListener("click", () => {
      changeQuantity(item.id, -1);
    });

    const count = document.createElement("span");
    count.textContent = item.quantity;

    const plus = document.createElement("button");
    plus.textContent = "＋";
    plus.addEventListener("click", () => {
      changeQuantity(item.id, 1);
    });

    quantity.append(minus, count, plus);
    row.append(name, quantity);
    cartElement.appendChild(row);
  });

  totalElement.textContent = getTotal().toLocaleString();
  calculateChange();
}

// ===== お釣り =====
function calculateChange() {
  const total = getTotal();
  const value = paymentElement.value;
  const payment = Number(value);

  if (
    value.trim() === "" ||
    !Number.isFinite(payment) ||
    payment < total
  ) {
    changeElement.textContent = "0";
    return;
  }

  changeElement.textContent =
    (payment - total).toLocaleString();
}

paymentElement.addEventListener("input", calculateChange);

// ===== 会計確定 =====
document.getElementById("checkout")
  .addEventListener("click", () => {
    const total = getTotal();
    const payment = Number(paymentElement.value);

    if (cart.length === 0) {
      alert("商品を選択してください");
      return;
    }

    if (
      paymentElement.value.trim() === "" ||
      !Number.isInteger(payment) ||
      payment < total
    ) {
      alert("お預かり金額を確認してください");
      return;
    }

    const items = [];

    cart.forEach(product => {
      for (let i = 0; i < product.quantity; i++) {
        items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          provided: false
        });
      }
    });

    const nextNumber = orders.reduce(
      (max, order) =>
        Math.max(max, Number(order.number) || 0),
      0
    ) + 1;

    const order = {
      id: `${Date.now()}-${nextNumber}`,
      number: nextNumber,
      date: new Date().toISOString(),
      total,
      payment,
      change: payment - total,
      items
    };

    orders.push(order);

    if (!saveData(ORDER_KEY, orders)) {
      orders.pop();
      return;
    }

    alert(
      `注文番号：${nextNumber}\n` +
      `合計：${total}円\n` +
      `お釣り：${payment - total}円`
    );

    cart = [];
    paymentElement.value = "";

    updateCart();
    renderCooking();
    renderHistory();
  });

// ===== 注文クリア =====
document.getElementById("clear")
  .addEventListener("click", () => {
    if (confirm("注文をクリアしますか？")) {
      cart = [];
      paymentElement.value = "";
      updateCart();
    }
  });

// ===== 提供済み管理 =====
function setProvided(orderId, index, provided) {
  const order = orders.find(o => o.id === orderId);
  if (!order || !order.items[index]) return;

  const oldValue = order.items[index].provided;
  order.items[index].provided = provided;

  if (!saveData(ORDER_KEY, orders)) {
    order.items[index].provided = oldValue;
    return;
  }

  renderCooking();
  renderHistory();
}

function createOrderCard(order, historyMode) {
  const card = document.createElement("div");
  card.className = "order-card";

  const header = document.createElement("div");
  header.className = "order-header";

  const title = document.createElement("strong");
  title.textContent =
    `注文番号 ${String(order.number).padStart(3, "0")}`;

  const date = document.createElement("span");
  date.textContent =
    new Date(order.date).toLocaleString("ja-JP");

  header.append(title, date);
  card.appendChild(header);

  order.items.forEach((item, index) => {
    if (!historyMode && item.provided) return;

    const row = document.createElement("div");
    row.className = "order-item";

    const name = document.createElement("span");
    name.textContent = `${item.name}（1個）`;

    const button = document.createElement("button");

    if (item.provided) {
      button.className = "undo-button";
      button.textContent = "提供済み ↩";
    } else {
      button.className = "status-button";
      button.textContent = "1個提供 ✓";
    }

    button.addEventListener("click", () => {
      setProvided(order.id, index, !item.provided);
    });

    row.append(name, button);
    card.appendChild(row);
  });

  const doneCount = order.items.filter(
    item => item.provided
  ).length;

  const footer = document.createElement("p");
  footer.textContent =
    `提供済み ${doneCount}/${order.items.length}個` +
    `　合計 ${order.total.toLocaleString()}円`;

  card.appendChild(footer);

  return card;
}

// ===== 作成中一覧 =====
function renderCooking() {
  const container =
    document.getElementById("cooking-list");

  container.innerHTML = "";

  const pendingOrders = orders.filter(order =>
    order.items.some(item => !item.provided)
  );

  const pendingCount = orders.reduce(
    (sum, order) =>
      sum + order.items.filter(item => !item.provided).length,
    0
  );

  document.getElementById("pending-count")
    .textContent = pendingCount;

  if (pendingOrders.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "作成中の商品はありません";
    container.appendChild(p);
    return;
  }

  pendingOrders.forEach(order => {
    container.appendChild(createOrderCard(order, false));
  });
}

// ===== 注文履歴 =====
function renderProductSales() {
  const totals = new Map(products.map(product => [
    product.id, { name: product.name, count: 0 }
  ]));

  orders.forEach(order => {
    order.items.forEach(item => {
      // 商品IDで集計するため、名前や価格を変更しても個数を引き継ぐ。
      const key = item.productId ?? `legacy:${item.name}`;
      if (!totals.has(key)) {
        totals.set(key, { name: item.name, count: 0 });
      }
      totals.get(key).count++;
    });
  });

  const container = document.getElementById("product-sales-list");
  container.innerHTML = "";
  let totalCount = 0;
  totals.forEach(product => {
    const row = document.createElement("tr");
    const name = document.createElement("th");
    name.scope = "row";
    name.textContent = product.name;
    const count = document.createElement("td");
    count.textContent = `${product.count.toLocaleString()}個`;
    row.append(name, count);
    container.appendChild(row);
    totalCount += product.count;
  });
  document.getElementById("sales-count").textContent = totalCount.toLocaleString();
}

function renderHistory() {
  renderProductSales();
  const container =
    document.getElementById("history-list");

  container.innerHTML = "";

  const salesTotal = orders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  document.getElementById("sales-total")
    .textContent = salesTotal.toLocaleString();

  if (orders.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "注文履歴はありません";
    container.appendChild(p);
    return;
  }

  [...orders].reverse().forEach(order => {
    container.appendChild(createOrderCard(order, true));
  });
}

// ===== 商品設定 =====
function renderSettings() {
  const container =
    document.getElementById("settings-list");

  container.innerHTML = "";

  products.forEach(product => {
    const row = document.createElement("div");
    row.className = "settings-item";

    const nameInput = document.createElement("input");
    nameInput.className = "settings-name";
    nameInput.type = "text";
    nameInput.value = product.name;

    const priceInput = document.createElement("input");
    priceInput.className = "settings-price";
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.value = product.price;

    const saveButton = document.createElement("button");
    saveButton.className = "save-button";
    saveButton.textContent = "保存";

    saveButton.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const price = Number(priceInput.value);

      if (
        !name ||
        priceInput.value.trim() === "" ||
        !Number.isInteger(price) ||
        price < 0
      ) {
        alert("商品名と価格を正しく入力してください");
        return;
      }

      const oldName = product.name;
      const oldPrice = product.price;

      product.name = name;
      product.price = price;

      if (!saveData(PRODUCT_KEY, products)) {
        product.name = oldName;
        product.price = oldPrice;
        return;
      }

      const cartItem = cart.find(
        item => item.id === product.id
      );

      if (cartItem) {
        cartItem.name = name;
        cartItem.price = price;
      }

      renderProducts();
      updateCart();
      renderSettings();

      alert("商品情報を保存しました");
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "削除";

    deleteButton.addEventListener("click", () => {
      if (!confirm(`${product.name}を削除しますか？`)) {
        return;
      }

      const oldProducts = [...products];

      products = products.filter(
        p => p.id !== product.id
      );

      if (!saveData(PRODUCT_KEY, products)) {
        products = oldProducts;
        return;
      }

      cart = cart.filter(
        item => item.id !== product.id
      );

      renderProducts();
      updateCart();
      renderSettings();
    });

    row.append(
      nameInput,
      priceInput,
      saveButton,
      deleteButton
    );

    container.appendChild(row);
  });
}

// ===== 新しい商品を追加 =====
document.getElementById("add-product-button")
  .addEventListener("click", () => {
    const nameInput =
      document.getElementById("new-name");

    const priceInput =
      document.getElementById("new-price");

    const name = nameInput.value.trim();
    const price = Number(priceInput.value);

    if (
      !name ||
      priceInput.value.trim() === "" ||
      !Number.isInteger(price) ||
      price < 0
    ) {
      alert("商品名と価格を正しく入力してください");
      return;
    }

    const product = {
      id: nextProductId,
      name,
      price
    };

    products.push(product);

    if (!saveData(PRODUCT_KEY, products)) {
      products.pop();
      return;
    }

    nextProductId++;
    localStorage.setItem(
      NEXT_ID_KEY,
      String(nextProductId)
    );

    nameInput.value = "";
    priceInput.value = "";

    renderProducts();
    renderSettings();
  });

// ===== 初期表示 =====
renderProducts();
updateCart();
renderCooking();
renderHistory();
renderSettings();

// ===== オフライン対応 =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => {
        console.log("オフライン機能を登録しました");
      })
      .catch(error => {
        console.error("登録失敗:", error);
      });
  });
}
