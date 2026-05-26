import { auth, db, isConfigured, addDoc, collection, serverTimestamp } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");
    const cartCount = document.querySelector("#cart-count");
    const year = document.querySelector("[data-year]");
    const checkoutForm = document.querySelector("[data-checkout-form]");
    const checkoutItems = document.querySelector("[data-checkout-items]");
    const emptyState = document.querySelector("[data-checkout-empty]");
    const summaryCount = document.querySelector("[data-summary-count]");
    const summarySubtotal = document.querySelector("[data-summary-subtotal]");
    const summaryTotal = document.querySelector("[data-summary-total]");

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

    const updateCartBadge = () => {
        if (!cartCount) return;
        cartCount.textContent = String(cartApi.getCount());
        const badge = cartCount.closest(".badge");
        badge?.classList.remove("is-bump");
        window.requestAnimationFrame(() => badge?.classList.add("is-bump"));
    };

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

    const computeSubtotal = (cart) =>
        Object.values(cart.items).reduce((total, item) => {
            const price = Number(item?.price);
            const qty = Number(item?.qty);
            if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) return total;
            return total + price * qty;
        }, 0);

    // Payment modules intentionally removed. Checkout is Cash on Delivery only (demo).

    const renderSummary = () => {
        if (!checkoutItems) return;
        const cart = cartApi.readCart();
        const items = Object.values(cart.items);
        items.sort((a, b) => Number(b.addedAt ?? 0) - Number(a.addedAt ?? 0));

        checkoutItems.innerHTML = "";

        if (emptyState) emptyState.hidden = items.length > 0;
        if (checkoutForm) checkoutForm.classList.toggle("is-disabled", items.length === 0);

        const fragment = document.createDocumentFragment();
        items.forEach((item) => {
            const row = document.createElement("div");
            row.className = "checkout-item";

            const title = String(item?.title || "Product");
            const imgSrc = String(item?.image || "");
            const qty = Math.max(1, Math.min(99, Math.floor(Number(item?.qty) || 1)));
            const unit = Number(item?.price);
            const total = Number.isFinite(unit) ? unit * qty : null;

            row.innerHTML = `
                <img class="checkout-item-img" alt="" loading="lazy" decoding="async" />
                <div>
                    <p class="checkout-item-title"></p>
                    <p class="checkout-item-meta">${qty} × ${Number.isFinite(unit) ? formatPrice(unit) : "—"}</p>
                </div>
                <div class="checkout-item-total">${total === null ? "—" : formatPrice(total)}</div>
            `;

            const img = row.querySelector("img");
            const titleEl = row.querySelector(".checkout-item-title");
            if (img) {
                img.alt = title;
                img.src = imgSrc;
                img.width = 160;
                img.height = 160;
            }
            if (titleEl) titleEl.textContent = title;

            fragment.appendChild(row);
        });

        checkoutItems.appendChild(fragment);

        const subtotal = computeSubtotal(cart);
        const count = cartApi.getCount(cart);
        if (summaryCount) summaryCount.textContent = `${count} item${count === 1 ? "" : "s"}`;
        if (summarySubtotal) summarySubtotal.textContent = formatPrice(subtotal);
        if (summaryTotal) summaryTotal.textContent = formatPrice(subtotal);
    };

    updateCartBadge();
    cartApi.onChange(updateCartBadge);
    cartApi.onChange(renderSummary);
    renderSummary();

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const cart = cartApi.readCart();
            const count = cartApi.getCount(cart);
            if (count <= 0) {
                showToast("Your cart is empty.", "error");
                return;
            }

            const form = new FormData(checkoutForm);
            const name = String(form.get("name") ?? "").trim();
            const phone = String(form.get("phone") ?? "").trim();
            const address = String(form.get("address") ?? "").trim();
            const city = String(form.get("city") ?? "").trim();
            const zip = String(form.get("zip") ?? "").trim();
            const payment = "cod";

            const phoneOk = /^[0-9]{10}$/.test(phone.replace(/\s+/g, ""));
            const zipOk = /^[0-9]{5,6}$/.test(zip.replace(/\s+/g, ""));

            if (!name || !address || !city) {
                showToast("Please fill in your shipping details.", "error");
                return;
            }

            if (!phoneOk) {
                showToast("Enter a valid 10-digit phone number.", "error");
                return;
            }

            if (!zipOk) {
                showToast("Enter a valid PIN code.", "error");
                return;
            }

            const subtotal = computeSubtotal(cart);
            const orderPayload = {
                userId: auth?.currentUser?.uid ?? null,
                userEmail: auth?.currentUser?.email ?? null,
                items: Object.values(cart.items || {}).map((item) => ({
                    key: item?.key ?? null,
                    productId: item?.productId ?? null,
                    title: item?.title ?? null,
                    image: item?.image ?? null,
                    price: Number.isFinite(Number(item?.price)) ? Number(item.price) : null,
                    qty: Number.isFinite(Number(item?.qty)) ? Number(item.qty) : 1,
                    variant: item?.variant ?? null,
                })),
                subtotal: Number.isFinite(subtotal) ? subtotal : null,
                shipping: 0,
                total: Number.isFinite(subtotal) ? subtotal : null,
                address: { name, phone, address, city, zip },
                payment: { method: payment, status: "initiated" },
                createdAt: serverTimestamp?.() ?? new Date().toISOString(),
                client: { userAgent: navigator.userAgent },
            };

            const finalizeCod = async () => {
                const payload = {
                    ...orderPayload,
                    payment: { method: "cod", status: "pending" },
                };

                if (isConfigured() && db) {
                    try {
                        await addDoc(collection(db, "orders"), payload);
                    } catch {
                        // ignore
                    }
                }

                cartApi.writeCart({ version: 2, items: {} });
                renderSummary();
                showToast("Order placed (Cash on Delivery).", "success");
                checkoutForm.reset();
            };
            void finalizeCod();
        });
    }
});
