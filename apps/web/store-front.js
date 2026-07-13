const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
const productImages = {
  service_online: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=900&q=80',
  service_onsite: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80',
  physical: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80'
};

class StoreFront extends HTMLElement {
  constructor() {
    super();
    this.products = [];
    this.cart = JSON.parse(localStorage.getItem('solitaire-friend-cart') || '[]');
    this.query = '';
    this.category = 'ทั้งหมด';
    this.status = 'กำลังโหลดสินค้า…';
  }

  connectedCallback() {
    this.render();
    this.loadProducts();
  }

  async loadProducts() {
    const apiUrl = this.getAttribute('api-url') || window.ECOMMERCE_API_URL;
    try {
      if (!apiUrl) throw new Error('No API URL');
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Unable to load products');
      const payload = await response.json();
      this.products = Array.isArray(payload) ? payload : payload.products || [];
      this.status = this.products.length ? '' : 'ยังไม่มีสินค้าในฐานข้อมูล';
    } catch {
      this.products = [];
      this.status = 'ไม่สามารถเชื่อมต่อข้อมูลสินค้าได้ โปรดตรวจสอบว่า API ทำงานอยู่';
    }
    this.render();
  }

  get categories() {
    return ['ทั้งหมด', ...new Set(this.products.map((product) => product.category).filter(Boolean))];
  }

  get filteredProducts() {
    const keyword = this.query.trim().toLowerCase();
    return this.products.filter((product) =>
      (this.category === 'ทั้งหมด' || product.category === this.category) &&
      (!keyword || `${product.name} ${product.description || ''}`.toLowerCase().includes(keyword))
    );
  }

  get cartCount() { return this.cart.reduce((total, item) => total + item.quantity, 0); }
  get cartTotal() { return this.cart.reduce((total, item) => total + item.price * item.quantity, 0); }

  addToCart(productId) {
    const product = this.products.find((item) => String(item._id || item.id) === productId);
    if (!product || product.stock < 1) return;
    const item = this.cart.find((cartItem) => cartItem.id === productId);
    if (item) item.quantity = Math.min(item.quantity + 1, product.stock);
    else this.cart.push({ id: productId, name: product.name, price: product.price, image: product.image, quantity: 1, stock: product.stock });
    this.saveCart();
    this.render();
  }

  changeQuantity(id, delta) {
    const item = this.cart.find((cartItem) => cartItem.id === id);
    if (!item) return;
    item.quantity = Math.max(0, Math.min(item.quantity + delta, item.stock));
    this.cart = this.cart.filter((cartItem) => cartItem.quantity > 0);
    this.saveCart();
    this.render();
  }

  saveCart() { localStorage.setItem('solitaire-friend-cart', JSON.stringify(this.cart)); }

  render() {
    const products = this.filteredProducts.map((product) => {
      const id = String(product._id || product.id);
      const image = product.image || product.images?.[0] || productImages[product.product_type] || 'https://placehold.co/800x600?text=Solitaire+Friend';
      return `<article class="product-card">
        <img src="${image}" alt="${product.name}" loading="lazy" />
        <div class="product-info"><span class="tag">${product.category || 'สินค้า'}</span><h3>${product.name}</h3><p>${product.description || ''}</p>
          <div class="product-footer"><strong>${currency.format(product.price)}</strong><button data-add="${id}" ${product.stock < 1 ? 'disabled' : ''}>${product.stock < 1 ? 'สินค้าหมด' : 'เพิ่มลงตะกร้า'}</button></div>
        </div></article>`;
    }).join('') || `<p class="empty">${this.status || 'ไม่พบสินค้าที่ค้นหา ลองเปลี่ยนคำค้นหรือหมวดหมู่'}</p>`;

    const cartItems = this.cart.map((item) => `<li><img src="${item.image}" alt="" /><div><strong>${item.name}</strong><span>${currency.format(item.price)}</span><div class="quantity"><button data-quantity="${item.id}" data-delta="-1" aria-label="ลดจำนวน">−</button><b>${item.quantity}</b><button data-quantity="${item.id}" data-delta="1" aria-label="เพิ่มจำนวน">+</button></div></div><strong>${currency.format(item.price * item.quantity)}</strong></li>`).join('') || '<li class="empty">ตะกร้าของคุณยังว่างอยู่</li>';

    this.innerHTML = `<header class="site-header"><a class="brand" href="#top">Solitaire <em>Friend</em></a><nav><a href="#shop">บริการและสินค้า</a><a href="#story">เกี่ยวกับเรา</a><button class="cart-button" id="open-cart">ตะกร้า <span>${this.cartCount}</span></button></nav></header>
      <main id="top"><section class="hero"><div><p class="eyebrow">DIAMOND BUYING, WITH CONFIDENCE</p><h1>เลือกแหวนเพชรอย่างมั่นใจ ในแบบของคุณ</h1><p>เรียนรู้เรื่องเพชร รับคำแนะนำ และมีเพื่อนไปเลือกแหวนในวันที่สำคัญที่สุด</p><a class="primary-link" href="#shop">ดูบริการของเรา</a></div></section>
      <section class="shop" id="shop"><div class="section-heading"><div><p class="eyebrow">SOLITAIRE FRIEND SERVICES</p><h2>บริการและสินค้า</h2></div><small>${this.products.length ? `อัปเดตจากฐานข้อมูล ${this.products.length} รายการ` : this.status}</small></div><div class="filters"><input id="search" type="search" placeholder="ค้นหาบริการหรือสินค้า" value="${this.query}" /><div class="category-list">${this.categories.map((name) => `<button class="${name === this.category ? 'active' : ''}" data-category="${name}">${name}</button>`).join('')}</div></div><div class="product-grid">${products}</div></section>
      <section class="story" id="story"><p class="eyebrow">YOUR DIAMOND BUYING COMPANION</p><h2>ลดความกังวลในการเลือกแหวนเพชร</h2><p>Solitaire Friend ช่วยให้คุณเข้าใจเพชร เปรียบเทียบตัวเลือก และตัดสินใจได้เหมาะกับงบประมาณของคุณ</p></section></main>
      <aside class="cart-panel" id="cart-panel" aria-hidden="true"><div class="cart-header"><h2>ตะกร้าสินค้า</h2><button id="close-cart" aria-label="ปิดตะกร้า">×</button></div><ul>${cartItems}</ul><div class="cart-summary"><div><span>ยอดรวม</span><strong>${currency.format(this.cartTotal)}</strong></div><button class="checkout" ${this.cart.length ? '' : 'disabled'}>ดำเนินการสั่งซื้อ</button></div></aside><div class="backdrop" id="backdrop"></div><footer>© ${new Date().getFullYear()} Solitaire Friend</footer>`;
    this.bindEvents();
  }

  bindEvents() {
    this.querySelector('#search')?.addEventListener('input', (event) => { this.query = event.target.value; this.render(); });
    this.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { this.category = button.dataset.category; this.render(); }));
    this.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => this.addToCart(button.dataset.add)));
    this.querySelectorAll('[data-quantity]').forEach((button) => button.addEventListener('click', () => this.changeQuantity(button.dataset.quantity, Number(button.dataset.delta))));
    const panel = this.querySelector('#cart-panel');
    const toggleCart = (open) => { panel.classList.toggle('open', open); this.querySelector('#backdrop').classList.toggle('open', open); panel.setAttribute('aria-hidden', String(!open)); };
    this.querySelector('#open-cart')?.addEventListener('click', () => toggleCart(true));
    this.querySelector('#close-cart')?.addEventListener('click', () => toggleCart(false));
    this.querySelector('#backdrop')?.addEventListener('click', () => toggleCart(false));
  }
}

customElements.define('store-front', StoreFront);
