// ============================================================
// BOOK4U - Main Script
// Handles: Auth, Cart (localStorage + MongoDB), UI, Chatbot
// ============================================================

// ============================================================
// SESSION HELPERS
// ============================================================
function getLoggedInUser() {
    try {
        const u = localStorage.getItem('loggedInUser');
        return u ? JSON.parse(u) : null;
    } catch { return null; }
}

function setLoggedInUser(user) {
    localStorage.setItem('loggedInUser', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('rememberedEmail');
    window.location.href = 'login.html';
}
window.logout = logout;

// ============================================================
// CART STORAGE (localStorage-based, synced to MongoDB if logged in)
// ============================================================
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('cart')) || [];
    } catch { return []; }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ============================================================
// CART DISPLAY UPDATE (header badge)
// ============================================================
function updateCartDisplay() {
    const cart = getCart();
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = cart.length;
}

// ============================================================
// ADD TO CART
// ============================================================
function addToCart(btn) {
    const id = btn.dataset.id;
    const title = btn.dataset.title;
    const price = parseFloat(btn.dataset.price);
    const category = btn.dataset.category || 'general';

    if (!id || !title || isNaN(price)) {
        console.error('Invalid book data on button:', btn);
        return;
    }

    // Add to localStorage cart
    const cart = getCart();
    cart.push({ id, title, price, category, addedAt: new Date().toISOString() });
    saveCart(cart);
    updateCartDisplay();

    // Sync to MongoDB if logged in
    const user = getLoggedInUser();
    if (user && user.id) {
        fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                bookId: id,
                bookTitle: title,
                bookCategory: category,
                bookPrice: price
            })
        }).then(r => r.json()).then(data => {
            if (data.success) {
                // Update stored user cart count
                user.cartBookCount = data.cartCount;
                setLoggedInUser(user);
            }
        }).catch(err => console.error('Cart sync error:', err));
    }

    // Visual feedback
    const orig = btn.textContent;
    btn.textContent = 'Added! ✓';
    btn.style.background = '#4CAF50';
    btn.style.color = 'white';
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = orig;
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
    }, 1500);
}

// ============================================================
// EVENT DELEGATION - ADD TO CART (works on all pages)
// ============================================================
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart') || e.target.closest('.add-cart-btn');
    if (btn) {
        e.preventDefault();
        addToCart(btn);
    }
});

// ============================================================
// LIVE STATS (fetched from server)
// ============================================================
async function loadLiveStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        ['statUsers', 'statBooks', 'statCarts'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
        });
        const uEl = document.getElementById('statUsers');
        const bEl = document.getElementById('statBooks');
        const cEl = document.getElementById('statCarts');
        if (uEl) uEl.textContent = data.userCount ?? 0;
        if (bEl) bEl.textContent = data.bookCount ?? 0;
        if (cEl) cEl.textContent = data.cartCount ?? 0;
    } catch (err) {
        console.warn('Stats unavailable:', err.message);
    }
}

// ============================================================
// CART PAGE LOGIC
// ============================================================
async function loadCartPage() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    const cart = getCart();
    const user = getLoggedInUser();

    // Show/hide user banners
    const userBanner = document.getElementById('userInfoBanner');
    const guestBanner = document.getElementById('guestBanner');
    if (user) {
        if (userBanner) {
            userBanner.style.display = 'flex';
            const userInfoText = document.getElementById('userInfoText');
            if (userInfoText) userInfoText.textContent = `👤 ${user.fullname} (${user.email})`;
        }
        if (guestBanner) guestBanner.style.display = 'none';
    } else {
        if (userBanner) userBanner.style.display = 'none';
        if (guestBanner) guestBanner.style.display = 'block';
    }

    const cartFooter = document.getElementById('cartFooter');
    const orderSummaryCard = document.getElementById('orderSummaryCard');
    const paymentInfoCard = document.getElementById('paymentInfoCard');
    const payNowBtn = document.getElementById('payNowBtn');

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart-msg">Your cart is empty. <a href="shop.html">Browse books →</a></div>';
        if (cartFooter) cartFooter.style.display = 'none';
        if (orderSummaryCard) orderSummaryCard.style.display = 'none';
        if (paymentInfoCard) paymentInfoCard.style.display = 'none';
        updateCartDisplay();
        return;
    }

    // Render cart items
    container.innerHTML = '';
    cart.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-info">
                <h4>${escHtml(item.title)}</h4>
                <span class="cart-item-category">${escHtml(item.category || 'general')}</span>
                <p class="item-price" style="margin-top:5px;">$${parseFloat(item.price).toFixed(2)}</p>
            </div>
            <div class="cart-item-actions">
                <button class="remove-btn" data-index="${index}" data-id="${item.dbId || ''}">✕ Remove</button>
            </div>
        `;
        container.appendChild(el);
    });

    // Remove button listeners
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.index), btn.dataset.id));
    });

    // Calculate total
    const total = cart.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

    // Update footer bar
    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) cartTotalEl.textContent = `$${total.toFixed(2)}`;
    if (cartFooter) cartFooter.style.display = 'flex';

    // Update right-panel order summary
    if (orderSummaryCard) {
        orderSummaryCard.style.display = 'block';
        const lines = document.getElementById('orderSummaryLines');
        if (lines) {
            lines.innerHTML = cart.map(item =>
                `<div class="summary-row">
                    <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(item.title)}</span>
                    <span style="font-weight:600;">$${parseFloat(item.price).toFixed(2)}</span>
                </div>`
            ).join('');
        }
        const grandRight = document.getElementById('summaryGrandRight');
        if (grandRight) grandRight.textContent = `$${total.toFixed(2)}`;
    }
    if (paymentInfoCard) paymentInfoCard.style.display = 'block';

    updateCartDisplay();
}

// ── HTML escape helper ──
function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function removeFromCart(index, dbItemId) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);

    const user = getLoggedInUser();
    if (user && user.id && dbItemId) {
        fetch(`/api/cart/remove/${dbItemId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        }).catch(err => console.error('Remove sync error:', err));
    }
    loadCartPage();
}

// ============================================================
// PAYMENT MODAL — STATE
// ============================================================
let _selectedPayMethod = 'bank'; // 'bank' | 'mpesa'
let _currentStep = 1;

// ── Open the payment modal (called by Pay Now button) ──
function openPaymentModal() {
    const cart = getCart();
    if (cart.length === 0) { alert('Your cart is empty!'); return; }

    const total = cart.reduce((s, i) => s + parseFloat(i.price || 0), 0);

    // Populate step-1 amount label
    const payAmountLabel = document.getElementById('payAmountLabel');
    if (payAmountLabel) payAmountLabel.textContent = `$${total.toFixed(2)}`;

    // Populate step-1 book list
    const bookList = document.getElementById('modalBookList');
    if (bookList) {
        bookList.innerHTML = cart.map(item =>
            `<div class="modal-book-item">
                <span class="mbi-title">${escHtml(item.title)}</span>
                <span class="mbi-price">$${parseFloat(item.price).toFixed(2)}</span>
            </div>`
        ).join('');
    }

    // Populate step-2 totals
    const s2Count = document.getElementById('step2ItemCount');
    const s2Total = document.getElementById('step2Total');
    if (s2Count) s2Count.textContent = cart.length;
    if (s2Total) s2Total.textContent = `$${total.toFixed(2)}`;

    // Reset to step 1
    goToStep(1);

    // Clear any previous transaction input
    const txnInput = document.getElementById('transactionIdInput');
    if (txnInput) { txnInput.value = ''; txnInput.className = ''; }
    const validMsg = document.getElementById('txnValidationMsg');
    if (validMsg) { validMsg.textContent = ''; validMsg.className = 'txn-validation-msg'; }
    const errMsg = document.getElementById('step2ErrorMsg');
    if (errMsg) errMsg.style.display = 'none';
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;

    document.getElementById('paymentModalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}
window.openPaymentModal = openPaymentModal;

function closePaymentModal() {
    document.getElementById('paymentModalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}
window.closePaymentModal = closePaymentModal;

function maybeCloseModal(e) {
    // Close only if clicking the dark backdrop (not the modal box itself)
    if (e.target === document.getElementById('paymentModalOverlay')) closePaymentModal();
}
window.maybeCloseModal = maybeCloseModal;

// ── Step navigation ──
function goToStep(n) {
    _currentStep = n;
    [1, 2, 3].forEach(i => {
        const panel = document.getElementById(`step${i}`);
        if (panel) panel.classList.toggle('active', i === n);
        const dot = document.getElementById(`sdot${i}`);
        if (dot) {
            dot.classList.toggle('active', i === n);
            dot.classList.toggle('done', i < n);
        }
    });
    // Colour connecting lines
    const l1 = document.getElementById('sline1');
    const l2 = document.getElementById('sline2');
    if (l1) l1.classList.toggle('done', n > 1);
    if (l2) l2.classList.toggle('done', n > 2);
}
window.goToStep = goToStep;

// ── Payment method selector ──
function selectMethod(m) {
    _selectedPayMethod = m;
    document.getElementById('methodBank').classList.toggle('selected', m === 'bank');
    document.getElementById('methodPaypal').classList.toggle('selected', m === 'paypal');

    const hint = document.getElementById('txnHint');
    if (hint) {
        hint.textContent = m === 'bank'
            ? 'Bank transfer ID: starts with TXN followed by 8+ digits (e.g. TXN1234567890)'
            : 'PayPal transaction ID: 17 alphanumeric characters (e.g. 5O190127TN364715T)';
    }
    validateTransactionId();
}
window.selectMethod = selectMethod;

// ── Transaction ID Validation ──
// Rules:
//   Bank  : must match /^TXN\d{8,}$/i  (TXN + at least 8 digits)
//   PayPal: 17 alphanumeric characters (e.g. 5O190127TN364715T)
function validateTransactionId() {
    const input = document.getElementById('transactionIdInput');
    const msgEl = document.getElementById('txnValidationMsg');
    const confirmBtn = document.getElementById('confirmBtn');
    if (!input || !msgEl || !confirmBtn) return;

    const raw = input.value.trim().toUpperCase();

    if (!raw) {
        input.className = '';
        msgEl.textContent = '';
        msgEl.className = 'txn-validation-msg';
        confirmBtn.disabled = true;
        return;
    }

    let valid = false;
    let message = '';

    if (_selectedPayMethod === 'bank') {
        if (/^TXN\d{8,}$/.test(raw)) {
            valid = true;
            message = '\u2705 Valid bank transaction ID';
        } else if (!raw.startsWith('TXN')) {
            message = '\u274c Bank IDs must start with TXN (e.g. TXN12345678)';
        } else {
            message = `\u274c Must have at least 8 digits after TXN (you have ${raw.replace(/^TXN/, '').length})`;
        }
    } else {
        // PayPal transaction IDs are 17 alphanumeric characters
        if (/^[A-Z0-9]{17}$/.test(raw)) {
            valid = true;
            message = '\u2705 Valid PayPal transaction ID';
        } else if (raw.length < 17) {
            message = `\u274c PayPal IDs are 17 characters (you have ${raw.length})`;
        } else if (raw.length > 17) {
            message = `\u274c PayPal IDs are exactly 17 characters (you have ${raw.length})`;
        } else {
            message = '\u274c Only letters and numbers allowed (no spaces or symbols)';
        }
    }

    input.className = valid ? 'valid' : 'error';
    msgEl.textContent = message;
    msgEl.className = `txn-validation-msg ${valid ? 'success-text' : 'error-text'}`;
    confirmBtn.disabled = !valid;
}
window.validateTransactionId = validateTransactionId;

// ── Confirm Purchase ──
async function confirmPurchase() {
    const cart = getCart();
    if (cart.length === 0) return;

    const txnInput = document.getElementById('transactionIdInput');
    const errMsg = document.getElementById('step2ErrorMsg');
    const confirmBtn = document.getElementById('confirmBtn');
    const transactionId = txnInput ? txnInput.value.trim().toUpperCase() : '';

    if (!transactionId) {
        if (errMsg) { errMsg.textContent = '⚠️ Please enter your transaction ID.'; errMsg.style.display = 'block'; }
        return;
    }

    const total = cart.reduce((s, i) => s + parseFloat(i.price || 0), 0);
    const user = getLoggedInUser();

    // Show spinner
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="spinner"></span> Processing...'; }
    if (errMsg) errMsg.style.display = 'none';

    try {
        const res = await fetch('/api/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user ? user.id : null,
                transactionId,
                paymentMethod: _selectedPayMethod,
                cartItems: cart,
                total: total.toFixed(2)
            })
        });

        const data = await res.json();

        if (data.success) {
            // Show success step
            const confirmedTxnEl = document.getElementById('confirmedTxnId');
            if (confirmedTxnEl) confirmedTxnEl.textContent = `Transaction ID: ${transactionId}`;
            goToStep(3);
        } else {
            if (errMsg) {
                errMsg.textContent = `❌ ${data.message || 'Purchase failed. Please try again.'}`;
                errMsg.style.display = 'block';
            }
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = '✅ Confirm Purchase'; }
        }
    } catch (err) {
        console.error('Purchase error:', err);
        if (errMsg) {
            errMsg.textContent = '❌ Cannot reach server. Please check your connection and try again.';
            errMsg.style.display = 'block';
        }
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = '✅ Confirm Purchase'; }
    }
}
window.confirmPurchase = confirmPurchase;

// ── After success: clear cart and go to shop ──
function finishPurchase() {
    saveCart([]);
    closePaymentModal();
    window.location.href = 'shop.html';
}
window.finishPurchase = finishPurchase;

// ============================================================
// LOGIN PAGE REDIRECT (if already logged in, skip to mycart)
// ============================================================
function checkAutoRedirect() {
    const user = getLoggedInUser();
    const onLoginPage = window.location.pathname.includes('login.html');
    const onSignupPage = window.location.pathname.includes('signup.html');

    if (user && (onLoginPage || onSignupPage)) {
        // Already logged in — redirect to mycart
        window.location.href = 'mycart.html';
        return true;
    }

    // Update nav login button text if logged in
    const navLoginBtn = document.getElementById('navLoginBtn');
    if (navLoginBtn && user) {
        navLoginBtn.textContent = `👤 ${user.fullname || user.username}`;
        navLoginBtn.href = 'mycart.html';
    }

    return false;
}

// ============================================================
// LOGIN FORM HANDLER
// ============================================================
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Pre-fill remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const emailInput = document.getElementById('email');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    if (rememberedEmail && emailInput) {
        emailInput.value = rememberedEmail;
        if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

        // Basic client-side validation
        if (!email || !password) {
            showFormError(loginForm, 'Please enter both email and password.');
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.textContent = 'Signing in...'; submitBtn.disabled = true; }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                setLoggedInUser(data.user);
                window.location.href = 'mycart.html';
            } else {
                showFormError(loginForm, data.message || 'Login failed. Please try again.');
            }
        } catch (err) {
            console.error('Login error:', err);
            showFormError(loginForm, 'Cannot connect to server. Make sure the server is running.');
        } finally {
            if (submitBtn) { submitBtn.textContent = 'Sign In'; submitBtn.disabled = false; }
        }
    });
}

// ============================================================
// SIGNUP FORM HANDLER
// ============================================================
function initSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullname = document.getElementById('fullname')?.value.trim();
        const username = document.getElementById('username')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const address = document.getElementById('address')?.value.trim();
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        // Client-side validation
        if (!fullname || !username || !email || !address || !password || !confirmPassword) {
            showFormError(signupForm, 'All fields are required.');
            return;
        }

        if (fullname.length < 4) {
            showFormError(signupForm, 'Full name must be at least 4 characters.');
            return;
        }

        if (username.length < 3) {
            showFormError(signupForm, 'Username must be at least 3 characters.');
            return;
        }

        if (password.length < 8) {
            showFormError(signupForm, 'Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            showFormError(signupForm, 'Passwords do not match. Please re-enter.');
            return;
        }

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.textContent = 'Creating Account...'; submitBtn.disabled = true; }

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, username, email, address, password, confirmPassword })
            });

            const data = await res.json();

            if (data.success) {
                setLoggedInUser(data.user);
                localStorage.setItem('newUser', data.user.fullname);
                window.location.href = 'shop.html';
            } else {
                showFormError(signupForm, data.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Signup error:', err);
            showFormError(signupForm, 'Cannot connect to server. Make sure the server is running.');
        } finally {
            if (submitBtn) { submitBtn.textContent = 'Create Account'; submitBtn.disabled = false; }
        }
    });
}

// ============================================================
// FORM ERROR DISPLAY HELPER
// ============================================================
function showFormError(form, message) {
    let errEl = form.querySelector('.form-error-msg');
    if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'form-error-msg';
        errEl.style.cssText = 'color: #e74c3c; background: #fdecea; border: 1px solid #f5c6cb; padding: 10px 14px; border-radius: 8px; margin: 10px 0; font-size: 14px; font-weight: 500;';
        form.insertBefore(errEl, form.querySelector('button[type="submit"]'));
    }
    errEl.textContent = message;
    errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
// SHOP PAGE - CATEGORY FILTER
// ============================================================
function initShopPage() {
    const categoryCards = document.querySelectorAll('.category-card');
    const shopCards = document.querySelectorAll('.shop-card');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    let currentCategory = 'all';
    let currentSearch = '';

    function filterBooks() {
        const q = currentSearch.toLowerCase();
        shopCards.forEach(card => {
            const title = card.querySelector('.shop-card-title')?.textContent.toLowerCase() || '';
            const author = card.querySelector('.shop-card-author')?.textContent.toLowerCase() || '';
            const cat = card.dataset.category;

            const matchSearch = !q || title.includes(q) || author.includes(q);
            const matchCat = currentCategory === 'all' || cat === currentCategory;

            card.style.display = (matchSearch && matchCat) ? 'block' : 'none';
        });
    }

    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            categoryCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentCategory = card.dataset.category;
            filterBooks();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value;
            filterBooks();
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (searchInput) currentSearch = searchInput.value;
            filterBooks();
        });
    }

    // Handle URL param for category
    const urlParams = new URLSearchParams(window.location.search);
    const urlCat = urlParams.get('category');
    if (urlCat) {
        currentCategory = urlCat;
        categoryCards.forEach(c => {
            c.classList.toggle('active', c.dataset.category === urlCat);
        });
        filterBooks();
    }
}

// ============================================================
// HOME PAGE - CATEGORY CLICK -> SHOP
// ============================================================
function initHomePage() {
    const catItems = document.querySelectorAll('.cat-item[data-category]');
    catItems.forEach(item => {
        item.addEventListener('click', () => {
            window.location.href = `shop.html?category=${encodeURIComponent(item.dataset.category)}`;
        });
    });

    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        cartIcon.style.cursor = 'pointer';
        cartIcon.addEventListener('click', () => window.location.href = 'mycart.html');
    }
}

// ============================================================
// SECTION NAVIGATION (for single-page sections on index.html)
// ============================================================
function initSectionNav() {
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const sections = document.querySelectorAll('.page-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.dataset.section) {
                e.preventDefault();
                sections.forEach(s => s.classList.remove('active'));
                const target = document.getElementById(link.dataset.section);
                if (target) target.classList.add('active');
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// ============================================================
// WELCOME MODAL (post-registration)
// ============================================================
function initWelcomeModal() {
    const newUserName = localStorage.getItem('newUser');
    const welcomeModal = document.getElementById('welcomeModal');

    if (newUserName && welcomeModal && window.location.pathname.includes('shop.html')) {
        const welcomeUserName = document.getElementById('welcomeUserName');
        if (welcomeUserName) welcomeUserName.textContent = `Hello, ${newUserName}! 👋`;
        welcomeModal.classList.add('active');

        const closeBtn = document.getElementById('welcomeModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                welcomeModal.classList.remove('active');
                localStorage.removeItem('newUser');
            });
        }
        welcomeModal.addEventListener('click', (e) => {
            if (e.target === welcomeModal) {
                welcomeModal.classList.remove('active');
                localStorage.removeItem('newUser');
            }
        });
    }
}

// ============================================================
// CHATBOT
// ============================================================
function initChatbot() {
    const chatInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    if (!chatInput || !chatMessages) return;

    const sendBtn = document.querySelector('#chat-widget button:not([onclick])');

    function appendMessage(sender, text) {
        const isBot = sender === 'Bot';
        const msgHTML = `
            <div style="display:flex;gap:10px;justify-content:${isBot ? 'flex-start' : 'flex-end'};margin-bottom:10px;">
                ${isBot ? '<div style="font-size:24px;">🤖</div>' : ''}
                <div style="background:${isBot ? 'white' : '#667eea'};padding:12px 16px;border-radius:${isBot ? '0 15px 15px 15px' : '15px 15px 0 15px'};box-shadow:0 2px 5px rgba(0,0,0,0.05);color:${isBot ? '#333' : 'white'};font-size:14px;line-height:1.5;max-width:80%;">
                    ${text}
                </div>
            </div>`;
        chatMessages.insertAdjacentHTML('beforeend', msgHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleChat() {
        const message = chatInput.value.trim();
        if (!message) return;
        appendMessage('User', message);
        chatInput.value = '';

        const loadingId = 'loading-' + Date.now();
        chatMessages.insertAdjacentHTML('beforeend', `<div id="${loadingId}" style="margin-left:45px;font-style:italic;color:#888;font-size:12px;margin-bottom:10px;">Thinking...</div>`);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await res.json();
            document.getElementById(loadingId)?.remove();
            appendMessage('Bot', data.reply);
        } catch (err) {
            document.getElementById(loadingId)?.remove();
            appendMessage('Bot', "Sorry, I'm having trouble connecting right now.");
        }
    }

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });
    if (sendBtn) sendBtn.addEventListener('click', (e) => { e.preventDefault(); handleChat(); });
}

// ============================================================
// GLOBAL: NAV LOGIN BUTTON STATE
// ============================================================
function updateNavLoginState() {
    const user = getLoggedInUser();
    const navLoginBtns = document.querySelectorAll('#navLoginBtn');
    navLoginBtns.forEach(btn => {
        if (user) {
            btn.textContent = `👤 ${user.fullname || user.username || 'Account'}`;
            btn.href = 'mycart.html';
        }
    });
}

// ============================================================
// INIT ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Check auto-redirect for login/signup page if already logged in
    if (checkAutoRedirect()) return;

    // Update cart count
    updateCartDisplay();

    // Update nav if logged in
    updateNavLoginState();

    // Load live stats wherever stat elements exist
    if (document.getElementById('statUsers') || document.getElementById('statBooks')) {
        loadLiveStats();
        // Poll stats every 30 seconds for real-time feel
        setInterval(loadLiveStats, 30000);
    }

    // Section navigation (home page)
    initSectionNav();

    // Home page specific
    if (window.location.pathname.includes('index') || window.location.pathname === '/' || window.location.pathname.endsWith('.html') === false) {
        initHomePage();
    }

    // Shop page
    if (window.location.pathname.includes('shop.html')) {
        initShopPage();
        initWelcomeModal();
    }

    // My Cart page
    if (window.location.pathname.includes('mycart.html')) {
        loadCartPage();
    }

    // Login form
    if (window.location.pathname.includes('login.html')) {
        initLoginForm();
    }

    // Signup form
    if (window.location.pathname.includes('signup.html')) {
        initSignupForm();
    }

    // Home category clicks
    initHomePage();

    // Chatbot
    initChatbot();
});