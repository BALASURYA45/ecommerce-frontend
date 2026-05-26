document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");
    const cartCount = document.querySelector("#cart-count");
    const year = document.querySelector("[data-year]");

    const cartApi = window.ShopSmartCart;
    if (!cartApi) return;

    if (year) year.textContent = String(new Date().getFullYear());

    if (header && hamburger && mobileMenu) {
        const closeMenu = () => {
            header.classList.remove("is-open");
            hamburger.setAttribute("aria-expanded", "false");
            hamburger.setAttribute("aria-label", "Open menu");
        };

        const openMenu = () => {
            header.classList.add("is-open");
            hamburger.setAttribute("aria-expanded", "true");
            hamburger.setAttribute("aria-label", "Close menu");
        };

        const toggleMenu = () => {
            const isOpen = header.classList.contains("is-open");
            if (isOpen) closeMenu();
            else openMenu();
        };

        hamburger.addEventListener("click", toggleMenu);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });

        document.addEventListener("click", (event) => {
            if (!header.classList.contains("is-open")) return;
            if (header.contains(event.target)) return;
            closeMenu();
        });

        mobileMenu.addEventListener("click", (event) => {
            const link = event.target.closest("a");
            if (link) closeMenu();
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) closeMenu();
        });
    }

    searchForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const input = form.querySelector("input[type='search']");
            const query = input?.value?.trim() ?? "";
            if (query) console.log("Search:", query);
        });
    });

    const createToast = () => {
        let toast = document.querySelector("[data-toast]");
        if (toast) return toast;

        toast = document.createElement("div");
        toast.className = "toast";
        toast.setAttribute("data-toast", "");
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
        return toast;
    };

    const toastEl = createToast();
    let toastTimer = null;
    const showToast = (message, variant = "default") => {
        toastEl.textContent = message;
        toastEl.dataset.variant = variant;
        toastEl.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toastEl.classList.remove("is-visible");
        }, 2400);
    };

    const formatPrice = (value) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return "—";
        return number.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    };

    const updateCartBadge = () => {
        if (!cartCount) return;
        cartCount.textContent = String(cartApi.getCount());
        const badge = cartCount.closest(".badge");
        badge?.classList.remove("is-bump");
        window.requestAnimationFrame(() => badge?.classList.add("is-bump"));
    };

    updateCartBadge();
    cartApi.onChange(updateCartBadge);

    const els = {
        items: document.querySelector("[data-cart-items]"),
        empty: document.querySelector("[data-cart-empty]"),
        subtitle: document.querySelector("[data-cart-subtitle]"),
        status: document.querySelector("[data-cart-status]"),
        summaryCount: document.querySelector("[data-summary-count]"),
        subtotal: document.querySelector("[data-summary-subtotal]"),
        total: document.querySelector("[data-summary-total]"),
        checkout: document.querySelector("[data-checkout]"),
    };

    const setStatus = (html) => {
        if (!els.status) return;
        els.status.innerHTML = html ?? "";
    };

    const variantToText = (variant) => {
        if (!variant || typeof variant !== "object") return "";
        const entries = Object.entries(variant)
            .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
            .map(([key, value]) => `${String(key)}: ${String(value)}`);
        return entries.length ? entries.join(" • ") : "";
    };

    const computeSubtotal = (cart) =>
        Object.values(cart.items).reduce((total, item) => {
            const price = Number(item?.price);
            const qty = Number(item?.qty);
            if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) return total;
            return total + price * qty;
        }, 0);

    const render = () => {
        const cart = cartApi.readCart();
        const items = Object.values(cart.items);
        items.sort((a, b) => Number(b.addedAt ?? 0) - Number(a.addedAt ?? 0));

        if (els.subtitle) {
            els.subtitle.textContent = items.length
                ? "Review items, update quantities, and proceed when ready."
                : "Your cart is empty — add something you love.";
        }

        if (els.items) els.items.innerHTML = "";
        if (els.empty) els.empty.hidden = items.length > 0;

        if (!els.items) return;

        const fragment = document.createDocumentFragment();
        items.forEach((item) => {
            const row = document.createElement("article");
            row.className = "cart-item";
            row.dataset.key = item.key;

            const title = (item.title || "Product").toString();
            const imgSrc = (item.image || "").toString();
            const variantText = variantToText(item.variant);
            const unit = Number(item.price);
            const unitText = Number.isFinite(unit) ? formatPrice(unit) : "—";
            const qty = Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 1)));
            const lineTotal = Number.isFinite(unit) ? formatPrice(unit * qty) : "—";

            row.innerHTML = `
                <div class="cart-item-media">
                    <img class="cart-item-img" alt="" loading="lazy" decoding="async" />
                </div>
                <div class="cart-item-main">
                    <div class="cart-item-top">
                        <div>
                            <h3 class="cart-item-title"></h3>
                            <p class="cart-item-meta"></p>
                        </div>
                        <div class="cart-item-prices">
                            <div class="cart-item-unit">${unitText}</div>
                            <div class="cart-item-total" data-line-total>${lineTotal}</div>
                        </div>
                    </div>

                    <div class="cart-item-actions">
                        <div class="qty qty--cart" aria-label="Quantity selector">
                            <button class="qty-btn" type="button" data-qty-dec aria-label="Decrease quantity">−</button>
                            <input class="qty-input" type="number" min="1" max="99" inputmode="numeric" data-qty />
                            <button class="qty-btn" type="button" data-qty-inc aria-label="Increase quantity">+</button>
                        </div>
                        <button class="btn btn--ghost btn--sm cart-remove" type="button" data-remove>Remove</button>
                    </div>
                </div>
            `;

            const img = row.querySelector("img");
            const titleEl = row.querySelector(".cart-item-title");
            const metaEl = row.querySelector(".cart-item-meta");
            const qtyEl = row.querySelector("[data-qty]");
            if (img) {
                img.alt = title;
                img.src = imgSrc;
                img.width = 320;
                img.height = 320;
            }
            if (titleEl) titleEl.textContent = title;
            if (metaEl) metaEl.textContent = variantText || "—";
            if (qtyEl) qtyEl.value = String(qty);

            fragment.appendChild(row);
        });

        els.items.appendChild(fragment);

        const subtotal = computeSubtotal(cart);
        const count = cartApi.getCount(cart);
        if (els.summaryCount) els.summaryCount.textContent = `${count} item${count === 1 ? "" : "s"}`;
        if (els.subtotal) els.subtotal.textContent = formatPrice(subtotal);
        if (els.total) els.total.textContent = formatPrice(subtotal);

        if (els.checkout) {
            els.checkout.disabled = count === 0;
            els.checkout.classList.toggle("is-disabled", count === 0);
        }

        setStatus("");
    };

    render();
    cartApi.onChange(render);

    const clampQty = (value) => {
        const num = Math.floor(Number(value));
        if (!Number.isFinite(num)) return 1;
        return Math.min(99, Math.max(1, num));
    };

    els.items?.addEventListener("click", (event) => {
        const row = event.target.closest(".cart-item");
        const key = row?.dataset.key;
        if (!key) return;

        const dec = event.target.closest("[data-qty-dec]");
        const inc = event.target.closest("[data-qty-inc]");
        const remove = event.target.closest("[data-remove]");

        if (remove) {
            cartApi.removeItem(key);
            showToast("Removed from cart", "default");
            return;
        }

        if (!dec && !inc) return;
        const input = row.querySelector("[data-qty]");
        const current = clampQty(input?.value);
        const next = dec ? current - 1 : current + 1;
        const clamped = clampQty(next);
        if (input) input.value = String(clamped);
        cartApi.setQty(key, clamped);
    });

    els.items?.addEventListener("input", (event) => {
        const input = event.target.closest("[data-qty]");
        if (!input) return;
        const row = input.closest(".cart-item");
        const key = row?.dataset.key;
        if (!key) return;
        const qty = clampQty(input.value);
        input.value = String(qty);
        cartApi.setQty(key, qty);
    });

    els.checkout?.addEventListener("click", () => {
        const count = cartApi.getCount();
        if (count === 0) return;
        window.location.href = "checkout.html";
    });
});
