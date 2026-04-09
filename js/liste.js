let books = [];

function safeAttr(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function listeMesaj(text, type = 'success') {
  const el = document.getElementById('message');
  if (!el) return;
  el.className = 'message ' + type;
  el.innerHTML = guvenliYazi(text);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function listeMesajTemizle() {
  const el = document.getElementById('message');
  if (!el) return;
  el.className = 'message';
  el.innerHTML = '';
}

function kapakUrlOlustur(isbn) {
  const temiz = temizIsbn(isbn);
  if (!temiz) return '';
  return 'https://covers.openlibrary.org/b/isbn/' + encodeURIComponent(temiz) + '-M.jpg';
}

function kapakHtml(book) {
  const url = kapakUrlOlustur(book.isbn || '');

  if (!url) {
    return `<div class="coverPlaceholder">📘</div>`;
  }

  return `
    <img
      class="coverImg"
      src="${safeAttr(url)}"
      alt="Kapak"
      loading="lazy"
      referrerpolicy="no-referrer"
      onerror="this.outerHTML='<div class=&quot;coverPlaceholder&quot;>📘</div>'"
    >
  `;
}

async function loadBooks() {
  listeMesajTemizle();

  try {
    books = await tumKitaplariGetir();
    renderList();
  } catch (err) {
    listeMesaj('Liste hatası: ' + err.message, 'error');
  }
}

function renderList() {
  const q = (document.getElementById('search')?.value || '').trim().toLowerCase();
  const list = document.getElementById('list');
  if (!list) return;

  let filtered = books;

  if (q) {
    filtered = books.filter(book =>
      (book.kitapKodu || '').toLowerCase().includes(q) ||
      (book.kitapAdi || '').toLowerCase().includes(q) ||
      (book.yazar || '').toLowerCase().includes(q) ||
      (book.isbn || '').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    list.innerHTML = '<div class="empty">Kayıtlı kitap bulunamadı</div>';
    return;
  }

  list.innerHTML = filtered.map(book => {
    const durum = String(book.durum || 'RAFTA').toUpperCase();

    let statusClass = 'rafta';
    if (durum === 'ÖDÜNÇTE') statusClass = 'oduncte';
    if (durum === 'KAYIP') statusClass = 'kayip';

    const borrower = book.oduncAlan || '-';
    const loanDate = book.oduncTarihi || '-';
    const returnDate = book.iadeTarihi || '-';

    const loanButton = durum === 'RAFTA'
      ? `<button class="btn btnLoan" onclick="loanBook(${Number(book.id)})">Ödünç Ver</button>`
      : `<button class="btn btnLoan btnDisabled" disabled>Ödünç Verilemez</button>`;

    const returnButton = durum === 'ÖDÜNÇTE'
      ? `<button class="btn btnReturn" onclick="returnBook(${Number(book.id)})">İade Al</button>`
      : `<button class="btn btnReturn btnDisabled" disabled>İade Beklemiyor</button>`;

    return `
      <div class="card">
        <div class="cardTop">
          <div class="coverWrap">
            ${kapakHtml(book)}
          </div>

          <div class="cardBody">
            <div class="codeBadge">${guvenliYazi(book.kitapKodu || '-')}</div>
            <div class="title">${guvenliYazi(book.kitapAdi || '-')}</div>
            <div class="line"><strong>Yazar:</strong> ${guvenliYazi(book.yazar || '-')}</div>
            <div class="line"><strong>ISBN:</strong> ${guvenliYazi(book.isbn || '-')}</div>
            <div class="line"><strong>Yayınevi:</strong> ${guvenliYazi(book.yayinevi || '-')}</div>
            <div class="line"><strong>Yıl:</strong> ${guvenliYazi(book.yayinYili || '-')}</div>
            <div class="line"><strong>Ödünç Alan:</strong> ${guvenliYazi(borrower)}</div>
            <div class="line"><strong>Ödünç Tarihi:</strong> ${guvenliYazi(loanDate)}</div>
            <div class="line"><strong>İade Tarihi:</strong> ${guvenliYazi(returnDate)}</div>
            <div class="status ${statusClass}">${guvenliYazi(durum)}</div>
          </div>
        </div>

        <div class="actions">
          ${loanButton}
          ${returnButton}
        </div>
      </div>
    `;
  }).join('');
}

async function loanBook(id) {
  listeMesajTemizle();

  const borrower = prompt('Kitabı kime veriyorsun?');
  if (borrower === null) return;

  const cleanBorrower = borrower.trim();
  if (!cleanBorrower) {
    listeMesaj('Ödünç alan kişi adı zorunlu', 'warn');
    return;
  }

  try {
    const result = await apiPost({
      action: 'loanBook',
      id,
      borrower: cleanBorrower
    });

    if (!result.ok) {
      listeMesaj(result.error || 'Ödünç verme hatası', 'error');
      return;
    }

    listeMesaj(result.message || 'Kitap ödünç verildi', 'success');
    await loadBooks();
  } catch (err) {
    listeMesaj('Ödünç verme hatası: ' + err.message, 'error');
  }
}

async function returnBook(id) {
  listeMesajTemizle();

  try {
    const result = await apiPost({
      action: 'returnBook',
      id
    });

    if (!result.ok) {
      listeMesaj(result.error || 'İade hatası', 'error');
      return;
    }

    listeMesaj(result.message || 'Kitap iade alındı', 'success');
    await loadBooks();
  } catch (err) {
    listeMesaj('İade hatası: ' + err.message, 'error');
  }
}

loadBooks();
