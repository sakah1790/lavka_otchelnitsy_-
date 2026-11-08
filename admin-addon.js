
(() => {
  const SUPABASE_URL = 'https://yilqkywwmatebbejmhny.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_YheIRsETgK-gBxhgiE8HOA_KORyOMhN';
  const ADMIN_CODE = '6548';
  const BUCKET = 'product-images';

  let db;
  let isAdmin = false;
  let products = [];
  let editingId = null;
  let clickTimer = null;
  let clickCount = 0;

  const $ = id => document.getElementById(id);

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function notify(message) {
    alert(message);
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #forestAdmin {
        position:fixed; inset:0; z-index:100000;
        display:none; overflow-y:auto;
        padding:25px 15px;
        background:rgba(5,10,7,.97);
        backdrop-filter:blur(18px);
        color:#fefae0;
        font-family:Montserrat,sans-serif;
      }
      #forestAdmin.open {display:block}
      .admin-shell {
        max-width:1050px;margin:20px auto;
        padding:25px;background:#172019;
        border:1px solid #6ab088;border-radius:22px;
        box-shadow:0 0 40px #000;
      }
      .admin-heading {
        display:flex;justify-content:space-between;
        align-items:center;gap:12px;flex-wrap:wrap;
        border-bottom:1px solid #405344;
        padding-bottom:18px;margin-bottom:22px;
      }
      .admin-heading h2 {
        font-family:Cinzel,serif;color:#e9c46a;
      }
      .admin-btn {
        background:#294936;color:#fff;
        border:1px solid #6ab088;padding:10px 16px;
        border-radius:10px;cursor:pointer;
        font:inherit;margin:3px;
      }
      .admin-btn:hover {background:#426b4d}
      .admin-danger {background:#642e2b;border-color:#b56b62}
      .admin-field {margin:13px 0}
      .admin-field label {
        display:block;margin-bottom:7px;color:#c9d5bd;
      }
      .admin-field input,.admin-field textarea,
      .admin-field select {
        width:100%;padding:12px;
        background:#0d140f;color:#fff;
        border:1px solid #526b55;border-radius:9px;
        font:inherit;
      }
      .admin-field textarea {min-height:90px;resize:vertical}
      .admin-form {
        background:#202d23;padding:20px;
        border-radius:15px;margin-bottom:25px;
      }
      .admin-products {
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
        gap:15px;
      }
      .admin-product {
        background:#202d23;border:1px solid #526b55;
        border-radius:14px;padding:13px;
      }
      .admin-product img {
        width:100%;height:145px;object-fit:contain;
        background:#0b100d;border-radius:9px;
      }
      .admin-product h4 {margin:10px 0;color:#e9c46a}
      .admin-status {color:#b5c4ad;margin:12px 0}
      @media(max-width:600px) {
        .admin-shell {padding:15px}
      }
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'forestAdmin';

    panel.innerHTML = `
      <div class="admin-shell">
        <div class="admin-heading">
          <h2>✦ Лавка отшельницы — Админка</h2>
          <button class="admin-btn" id="adminClose">На главную ✕</button>
        </div>

        <div id="adminLogin">
          <h3>Авторизация администратора</h3>
          <p class="admin-status">
            Войди в Supabase под учётной записью администратора.
          </p>
          <form id="adminLoginForm">
            <div class="admin-field">
              <label>Email</label>
              <input id="adminEmail" type="email" required>
            </div>
            <div class="admin-field">
              <label>Пароль Supabase</label>
              <input id="adminPassword" type="password" required>
            </div>
            <button class="admin-btn" type="submit">Войти</button>
          </form>
        </div>

        <div id="adminWorkspace" hidden>
          <h3>Управление товарами</h3>
          <p class="admin-status" id="adminStatus">
            Загрузка товаров...
          </p>

          <form class="admin-form" id="productForm">
            <h3 id="productFormTitle">✦ Добавить новый товар</h3>

            <div class="admin-field">
              <label>Название товара</label>
              <input id="productName" required maxlength="120">
            </div>

            <div class="admin-field">
              <label>Описание</label>
              <textarea id="productDescription" required></textarea>
            </div>

            <div class="admin-field">
              <label>Цена</label>
              <input id="productPrice" type="number"
                min="0" step="0.01" required>
            </div>

            <div class="admin-field">
              <label>Категория</label>
              <select id="productCategory">
                <option value="accessories">Аксессуары</option>
                <option value="decor">Декор</option>
              </select>
            </div>

            <div class="admin-field">
              <label>Фотография товара</label>
              <input id="productImage" type="file"
                accept="image/*">
            </div>

            <div class="admin-field">
              <label>
                <input id="productStock" type="checkbox" checked>
                Товар в наличии
              </label>
            </div>

            <button class="admin-btn" type="submit">
              Сохранить товар
            </button>
            <button class="admin-btn" type="button"
              id="cancelEdit" hidden>
              Отменить редактирование
            </button>
          </form>

          <h3>✦ Все товары</h3>
          <div class="admin-products" id="adminProducts"></div>

          <div style="margin-top:25px">
            <button class="admin-btn" id="refreshProducts">
              Обновить список
            </button>
            <button class="admin-btn admin-danger" id="adminLogout">
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    $('adminClose').onclick = closeAdmin;
    $('adminLoginForm').onsubmit = login;
    $('productForm').onsubmit = saveProduct;
    $('cancelEdit').onclick = resetForm;
    $('refreshProducts').onclick = loadProducts;
    $('adminLogout').onclick = logout;
  }

  function openAdmin() {
    $('forestAdmin').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeAdmin() {
    $('forestAdmin').classList.remove('open');
    document.body.style.overflow = '';
    switchPage('home');
  }

  async function login(e) {
    e.preventDefault();

    const email = $('adminEmail').value.trim();
    const password = $('adminPassword').value;

    try {
      $('adminStatus').textContent = 'Проверка доступа...';

      const { data, error } =
        await db.auth.signInWithPassword({ email, password });

      if (error) throw error;

      const { data: admin, error: adminError } = await db
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        await db.auth.signOut();
        throw new Error('Этот аккаунт не является администратором.');
      }

      isAdmin = true;
      $('adminLogin').hidden = true;
      $('adminWorkspace').hidden = false;

      await loadProducts();

    } catch (error) {
      notify('Ошибка входа: ' + error.message);
      $('adminStatus').textContent = 'Не удалось войти.';
    }
  }

  async function checkAdmin() {
    const { data } = await db.auth.getSession();

    if (!data.session) return false;

    const { data: admin, error } = await db
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.session.user.id)
      .maybeSingle();

    if (error || !admin) return false;

    isAdmin = true;
    $('adminLogin').hidden = true;
    $('adminWorkspace').hidden = false;

    await loadProducts();
    return true;
  }

  async function logout() {
    await db.auth.signOut();
    isAdmin = false;
    $('adminLogin').hidden = false;
    $('adminWorkspace').hidden = true;
    resetForm();
    notify('Вы вышли из админ-панели.');
  }

  async function loadProducts() {
    $('adminStatus').textContent = 'Загружаем каталог...';

    const { data, error } = await db
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      $('adminStatus').textContent = error.message;
      return;
    }

    products = data || [];
    renderAdminProducts();
    renderCatalogProducts();

    $('adminStatus').textContent =
      'Товаров в облачной базе: ' + products.length;
  }

  function renderAdminProducts() {
    $('adminProducts').innerHTML = products.map(p => `
      <div class="admin-product">
        ${p.image_url
          ? `<img src="${escapeHTML(p.image_url)}" alt="">`
          : ''}
        <h4>${escapeHTML(p.name)}</h4>
        <p>${escapeHTML(p.description)}</p>
        <p>${Number(p.price).toFixed(2)} Бун</p>
        <p>${p.in_stock ? 'В наличии' : 'Нет в наличии'}</p>
        <button class="admin-btn" data-edit="${escapeHTML(p.id)}">
          Изменить
        </button>
        <button class="admin-btn admin-danger"
          data-delete="${escapeHTML(p.id)}">
          Удалить
        </button>
      </div>
    `).join('');

    $('adminProducts').querySelectorAll('[data-edit]')
      .forEach(btn => btn.onclick = () => editProduct(btn.dataset.edit));

    $('adminProducts').querySelectorAll('[data-delete]')
      .forEach(btn => btn.onclick = () => deleteProduct(btn.dataset.delete));
  }

  function renderCatalogProducts() {
    const grid = $('catalog-grid');
    if (!grid) return;

    grid.querySelectorAll('.cloud-product-card')
      .forEach(card => card.remove());

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card cloud-product-card';
      card.dataset.category = p.category;

      const img = p.image_url
        ? `<img src="${escapeHTML(p.image_url)}"
             alt="${escapeHTML(p.name)}" loading="lazy">`
        : '';

      card.innerHTML = `
        <div class="product-img-wrap">${img}</div>
        <div class="product-info">
          <h3 class="product-title">${escapeHTML(p.name)}</h3>
          <p class="product-desc">${escapeHTML(p.description)}</p>
          <div class="stock ${p.in_stock ? 'in-stock' : 'out-stock'}">
            ${p.in_stock ? 'В наличии!!!' : 'На данный момент не в наличии'}
          </div>
          <div class="product-footer">
            <span class="product-price">
              ${Number(p.price).toFixed(2)} Бун
            </span>
            <a class="btn-order-item" href="#order">
              Написать мастеру
            </a>
          </div>
        </div>
      `;

      card.querySelector('.btn-order-item').onclick = () => {
        selectForOrder(p.name);
      };

      grid.appendChild(card);
    });
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!isAdmin) return;

    const button = $('productForm').querySelector('[type="submit"]');
    button.disabled = true;

    try {
      let imageUrl = editingId
        ? products.find(p => p.id === editingId)?.image_url || ''
        : '';

      const file = $('productImage').files[0];

      if (file) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Выбери файл изображения.');
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Размер изображения не должен превышать 5 МБ.');
        }

        const extension = file.name.split('.').pop().toLowerCase();
        const path = `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await db.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = db.storage
          .from(BUCKET)
          .getPublicUrl(path);

        imageUrl = urlData.publicUrl;
      }

      const product = {
        name: $('productName').value.trim(),
        description: $('productDescription').value.trim(),
        price: Number($('productPrice').value),
        category: $('productCategory').value,
        image_url: imageUrl,
        in_stock: $('productStock').checked
      };

      if (!product.name || !product.description ||
          !Number.isFinite(product.price) || product.price < 0) {
        throw new Error('Проверь название, описание и цену.');
      }

      let result;

      if (editingId) {
        result = await db.from('products')
          .update(product).eq('id', editingId);
      } else {
        result = await db.from('products').insert(product);
      }

      if (result.error) throw result.error;

      resetForm();
      await loadProducts();
      notify('Товар успешно сохранён!');

    } catch (error) {
      notify('Ошибка: ' + error.message);
    } finally {
      button.disabled = false;
    }
  }

  function editProduct(id) {
    const p = products.find(item => item.id === id);
    if (!p) return;

    editingId = id;
    $('productName').value = p.name;
    $('productDescription').value = p.description;
    $('productPrice').value = p.price;
    $('productCategory').value = p.category;
    $('productStock').checked = p.in_stock;
    $('productFormTitle').textContent = '✦ Редактирование товара';
    $('cancelEdit').hidden = false;

    $('productForm').scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteProduct(id) {
    if (!confirm('Точно удалить этот товар из каталога?')) return;

    const { error } = await db.from('products')
      .delete().eq('id', id);

    if (error) {
      notify('Не удалось удалить товар: ' + error.message);
      return;
    }

    await loadProducts();
    notify('Товар удалён.');
  }

  function resetForm() {
    editingId = null;
    $('productForm').reset();
    $('productFormTitle').textContent = '✦ Добавить новый товар';
    $('cancelEdit').hidden = true;
  }

  function setupLogo() {
    const logo = $('siteLogo');
    if (!logo) return;

    logo.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();

      clickCount++;

      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
          closeAdmin();
          switchPage('home');
        }, 300);
      } else if (clickCount === 2) {
        clearTimeout(clickTimer);
        clickCount = 0;

        const code = prompt('Введите код доступа к админ-панели:');

        if (code === ADMIN_CODE) {
          openAdmin();
          checkAdmin();
        } else if (code !== null) {
          notify('Неверный код доступа.');
        }
      }
    });
  }

  async function init() {
    addStyles();
    createPanel();

    if (!window.supabase) {
      notify('Не удалось загрузить библиотеку Supabase.');
      return;
    }

    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    setupLogo();

    // Загружаем товары из общей базы для всех посетителей.
    const { data, error } = await db
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      products = data || [];
      renderCatalogProducts();
    } else {
      console.error('Supabase products:', error);
    }

    // Обновление каталога при изменениях на сервере.
    db.channel('public-products')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, loadProducts)
      .subscribe();
  }

  // Ждём загрузки страницы.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
