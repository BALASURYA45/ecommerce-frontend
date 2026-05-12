document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");
    const cartCount = document.querySelector("#cart-count");

    const year = document.querySelector("[data-year]");
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

    const cartKey = "ss_cart_v1";
    const productsCacheKey = "ss_products_cache_v1";
    const readCart = () => {
        try {
            const raw = window.localStorage.getItem(cartKey);
            if (!raw) return { items: {}, meta: {} };
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return { items: {}, meta: {} };
            if (!parsed.items || typeof parsed.items !== "object") return { items: {}, meta: {} };
            const meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {};
            return { ...parsed, items: parsed.items, meta };
        } catch {
            return { items: {}, meta: {} };
        }
    };

    const writeCart = (cart) => {
        try {
            window.localStorage.setItem(cartKey, JSON.stringify(cart));
        } catch {
            // ignore
        }
    };

    const getCartCount = (cart) =>
        Object.values(cart.items).reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

    const updateCartBadge = () => {
        if (!cartCount) return;
        const cart = readCart();
        cartCount.textContent = String(getCartCount(cart));
        const badge = cartCount.closest(".badge");
        badge?.classList.remove("is-bump");
        window.requestAnimationFrame(() => badge?.classList.add("is-bump"));
    };

    const addToCart = (cartItemKey, qty, metaPatch) => {
        const countToAdd = Math.max(1, Number(qty) || 1);
        const cart = readCart();
        const currentQty = Number.isFinite(cart.items[cartItemKey]) ? cart.items[cartItemKey] : 0;
        cart.items[cartItemKey] = currentQty + countToAdd;
        if (!cart.meta || typeof cart.meta !== "object") cart.meta = {};
        if (metaPatch && typeof metaPatch === "object") {
            cart.meta[cartItemKey] = { ...(cart.meta[cartItemKey] ?? {}), ...metaPatch };
        }
        writeCart(cart);
        updateCartBadge();
    };

    updateCartBadge();

    const readProductsCache = () => {
        try {
            const raw = window.localStorage.getItem(productsCacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            if (!Array.isArray(parsed.data)) return null;
            return parsed.data;
        } catch {
            return null;
        }
    };

    const fetchProductById = async (productId) => {
        const numericId = Number(productId);
        if (!Number.isInteger(numericId) || numericId <= 0) return null;

        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 9000);
        try {
            const response = await fetch(`https://fakestoreapi.com/products/${numericId}`, {
                signal: controller.signal,
                headers: { accept: "application/json" },
            });
            if (!response.ok) throw new Error(`Bad response: ${response.status}`);
            const data = await response.json();
            if (!data || typeof data !== "object") return null;
            return data;
        } finally {
            window.clearTimeout(timer);
        }
    };

    const els = {
        breadcrumb: document.querySelector("[data-product-breadcrumb]"),
        detail: document.querySelector("[data-product-detail]"),
        status: document.querySelector("[data-product-status]"),
        title: document.querySelector("[data-product-title]"),
        category: document.querySelector("[data-product-category]"),
        rating: document.querySelector("[data-product-rating]"),
        price: document.querySelector("[data-product-price]"),
        desc: document.querySelector("[data-product-desc]"),
        mainImg: document.querySelector("[data-product-main-img]"),
        thumbs: document.querySelector("[data-product-thumbs]"),
        zoomLens: document.querySelector("[data-zoom-lens]"),
        zoomHint: document.querySelector("[data-zoom-hint]"),
        qty: document.querySelector("[data-qty]"),
        qtyDec: document.querySelector("[data-qty-dec]"),
        qtyInc: document.querySelector("[data-qty-inc]"),
        addBtn: document.querySelector("[data-add-to-cart]"),
        variantsWrap: document.querySelector("[data-product-variants]"),
        sizeSelect: document.querySelector("[data-variant-size]"),
        colorSelect: document.querySelector("[data-variant-color]"),
        total: document.querySelector("[data-product-total]"),
    };

    const setStatus = (html) => {
        if (!els.status) return;
        els.status.innerHTML = html ?? "";
    };

    const setThumbs = (images, current) => {
        if (!els.thumbs) return;
        els.thumbs.innerHTML = "";
        const list = Array.isArray(images) ? images.filter(Boolean) : [];
        if (list.length <= 1) {
            els.thumbs.classList.add("is-empty");
            return;
        }
        els.thumbs.classList.remove("is-empty");

        const fragment = document.createDocumentFragment();
        list.forEach((src) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "thumb";
            btn.setAttribute("role", "listitem");
            btn.dataset.src = src;
            btn.setAttribute("aria-label", "Select image");
            btn.innerHTML = `<img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
            const img = btn.querySelector("img");
            if (img) img.src = src;
            if (src === current) btn.classList.add("is-active");
            fragment.appendChild(btn);
        });
        els.thumbs.appendChild(fragment);
    };

    const setMainImg = (src, alt) => {
        if (!els.mainImg) return;
        els.mainImg.src = src ?? "";
        els.mainImg.alt = alt ?? "Product image";
        els.mainImg.width = 900;
        els.mainImg.height = 900;
    };

    const state = {
        product: null,
        basePrice: 0,
        selected: { size: null, color: null },
        availability: null,
        zoomEnabled: false,
    };

    const cartItemKeyForSelection = () => {
        const size = state.selected.size ? `size:${state.selected.size}` : "";
        const color = state.selected.color ? `color:${state.selected.color}` : "";
        const suffix = [size, color].filter(Boolean).join("|");
        return suffix ? `${productId}|${suffix}` : String(productId);
    };

    const getMultiplier = () => {
        const size = state.selected.size;
        const color = state.selected.color;
        let multiplier = 1;
        if (size === "M") multiplier *= 1.03;
        else if (size === "L") multiplier *= 1.06;
        else if (size === "XL") multiplier *= 1.09;

        if (color === "Red") multiplier *= 1.02;
        else if (color === "Green") multiplier *= 1.01;
        else if (color === "Blue") multiplier *= 1.015;
        return multiplier;
    };

    const updatePricing = () => {
        const qty = Math.max(1, Math.min(99, Math.floor(Number(els.qty?.value) || 1)));
        const unit = Math.round(state.basePrice * getMultiplier());
        if (els.price) els.price.textContent = formatPrice(unit);
        if (els.total) els.total.textContent = formatPrice(unit * qty);
    };

    const renderProduct = (product) => {
        const title = (product?.title ?? "Product").toString();
        const category = (product?.category ?? "Featured").toString();
        const desc = (product?.description ?? "").toString();
        state.product = product ?? null;
        state.basePrice = Number(product?.price) || 0;

        if (els.breadcrumb) els.breadcrumb.textContent = title;
        document.title = `${title} • ShopSmart`;
        if (els.title) els.title.textContent = title;
        if (els.category) els.category.textContent = category;
        if (els.desc) els.desc.textContent = desc || "No description available.";
        updatePricing();

        const ratingRate = Number(product?.rating?.rate);
        const ratingCount = Number(product?.rating?.count);
        if (els.rating) {
            els.rating.textContent =
                Number.isFinite(ratingRate) && Number.isFinite(ratingCount)
                    ? `${ratingRate.toFixed(1)} • ${ratingCount.toLocaleString("en-IN")} reviews`
                    : "Top rated";
        }

        const imageList =
            Array.isArray(product?.images) && product.images.length > 0
                ? product.images
                : product?.image
                  ? [product.image, product.image, product.image]
                  : [];

        const initialSrc = imageList[0] ?? product?.image ?? "";
        setMainImg(initialSrc, title);
        setThumbs(imageList, initialSrc);

        const variants = product?.variants;
        const sizes = Array.isArray(variants?.sizes) ? variants.sizes : null;
        const colors = Array.isArray(variants?.colors) ? variants.colors : null;
        const normalizedSizes = sizes && sizes.length > 0 ? sizes : ["S", "M", "L", "XL"];
        const normalizedColors = colors && colors.length > 0 ? colors : ["Black", "Blue", "Green", "Red"];
        const showVariants = normalizedSizes.length > 0 || normalizedColors.length > 0;
        if (els.variantsWrap) els.variantsWrap.hidden = !showVariants;

        const fillSelect = (select, values, label) => {
            if (!select) return;
            select.innerHTML = "";
            if (!values || values.length === 0) return;
            values.forEach((value) => {
                const opt = document.createElement("option");
                opt.value = value;
                opt.textContent = value;
                select.appendChild(opt);
            });
            select.setAttribute("aria-label", label);
        };

        const resetSelect = (key) => {
            const current = els[key];
            if (!current) return;
            const clone = current.cloneNode(false);
            current.parentNode?.replaceChild(clone, current);
            els[key] = clone;
        };

        // Avoid duplicating listeners if renderProduct runs twice (cache + API).
        resetSelect("sizeSelect");
        resetSelect("colorSelect");

        const makeAvailability = (sizeList, colorList) => {
            const matrix = new Map();
            const seed = String(product?.id ?? "");
            const hash = (text) => {
                let h = 2166136261;
                for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
                return (h >>> 0) % 1000;
            };
            sizeList.forEach((s) => {
                colorList.forEach((c) => {
                    const v = hash(`${seed}|${s}|${c}`);
                    matrix.set(`${s}|${c}`, v % 7 !== 0); // ~14% disabled
                });
            });
            return {
                isAvailable: (s, c) => matrix.get(`${s}|${c}`) !== false,
            };
        };

        state.availability = makeAvailability(normalizedSizes, normalizedColors);

        fillSelect(els.sizeSelect, normalizedSizes, "Select size");
        fillSelect(els.colorSelect, normalizedColors, "Select color");

        if (els.sizeSelect) state.selected.size = els.sizeSelect.value || normalizedSizes[0] || null;
        if (els.colorSelect) state.selected.color = els.colorSelect.value || normalizedColors[0] || null;

        const refreshDisabledOptions = () => {
            const sizeValue = els.sizeSelect?.value ?? state.selected.size;
            const colorValue = els.colorSelect?.value ?? state.selected.color;

            if (els.sizeSelect) {
                Array.from(els.sizeSelect.options).forEach((opt) => {
                    const s = opt.value;
                    const ok = state.availability?.isAvailable(s, colorValue) ?? true;
                    opt.disabled = !ok;
                });
            }

            if (els.colorSelect) {
                Array.from(els.colorSelect.options).forEach((opt) => {
                    const c = opt.value;
                    const ok = state.availability?.isAvailable(sizeValue, c) ?? true;
                    opt.disabled = !ok;
                });
            }
        };

        const ensureValidSelection = () => {
            if (!state.availability) return;
            const s = els.sizeSelect?.value ?? state.selected.size;
            const c = els.colorSelect?.value ?? state.selected.color;
            if (s && c && state.availability.isAvailable(s, c)) return;

            const sizeOptions = Array.from(els.sizeSelect?.options ?? []).map((o) => o.value);
            const colorOptions = Array.from(els.colorSelect?.options ?? []).map((o) => o.value);
            for (const candidateSize of sizeOptions) {
                for (const candidateColor of colorOptions) {
                    if (state.availability.isAvailable(candidateSize, candidateColor)) {
                        if (els.sizeSelect) els.sizeSelect.value = candidateSize;
                        if (els.colorSelect) els.colorSelect.value = candidateColor;
                        return;
                    }
                }
            }
        };

        const onVariantChange = () => {
            state.selected.size = els.sizeSelect?.value ?? state.selected.size;
            state.selected.color = els.colorSelect?.value ?? state.selected.color;
            ensureValidSelection();
            state.selected.size = els.sizeSelect?.value ?? state.selected.size;
            state.selected.color = els.colorSelect?.value ?? state.selected.color;
            refreshDisabledOptions();
            updatePricing();
        };

        els.sizeSelect?.addEventListener("change", onVariantChange);
        els.colorSelect?.addEventListener("change", onVariantChange);

        refreshDisabledOptions();
        ensureValidSelection();
        onVariantChange();

        setStatus("");
    };

    const showNotFound = () => {
        if (els.breadcrumb) els.breadcrumb.textContent = "Not found";
        if (els.title) els.title.textContent = "Product not found";
        if (els.category) els.category.textContent = "—";
        if (els.desc) els.desc.textContent = "We couldn't find that product. Try returning to the products list.";
        if (els.price) els.price.textContent = "—";
        if (els.rating) els.rating.textContent = "";
        setMainImg("", "Product image");
        if (els.thumbs) els.thumbs.innerHTML = "";
        setStatus(`<div class="notice">Invalid or missing product id. <a class="btn btn--ghost btn--sm" href="index.html#products">Go back</a></div>`);
    };

    const productId = new URLSearchParams(window.location.search).get("id");
    if (!productId) {
        showNotFound();
        return;
    }

    const initQty = () => {
        const clampQty = (value) => {
            const num = Math.floor(Number(value));
            if (!Number.isFinite(num)) return 1;
            return Math.min(99, Math.max(1, num));
        };

        const setQty = (value) => {
            if (!els.qty) return 1;
            const next = clampQty(value);
            els.qty.value = String(next);
            return next;
        };

        setQty(1);

        const onQtyChange = () => {
            setQty(els.qty?.value);
            updatePricing();
        };

        els.qty?.addEventListener("input", onQtyChange);
        els.qtyDec?.addEventListener("click", () => {
            setQty((Number(els.qty?.value) || 1) - 1);
            updatePricing();
        });
        els.qtyInc?.addEventListener("click", () => {
            setQty((Number(els.qty?.value) || 1) + 1);
            updatePricing();
        });
        return { get: () => clampQty(els.qty?.value) };
    };

    const qtyApi = initQty();

    els.addBtn?.addEventListener("click", () => {
        const cartKeyForItem = cartItemKeyForSelection();
        const unit = Math.round(state.basePrice * getMultiplier());
        addToCart(cartKeyForItem, qtyApi.get(), {
            productId,
            title: state.product?.title ?? "",
            image: state.product?.image ?? "",
            category: state.product?.category ?? "",
            selected: { ...state.selected },
            unitPrice: unit,
            ts: Date.now(),
        });
        if (els.addBtn) {
            els.addBtn.classList.remove("is-added");
            window.requestAnimationFrame(() => els.addBtn?.classList.add("is-added"));
        }
        showToast("Added to cart", "success");
    });

    els.thumbs?.addEventListener("click", (event) => {
        const btn = event.target.closest("button.thumb");
        if (!btn) return;
        const src = btn.dataset.src;
        if (!src) return;
        setMainImg(src, els.title?.textContent ?? "Product image");
        els.thumbs.querySelectorAll("button.thumb").forEach((node) => node.classList.toggle("is-active", node === btn));
    });

    const initZoom = () => {
        if (!els.mainImg) return;
        const wrap = els.mainImg.closest(".product-main-img-wrap");
        if (!wrap) return;

        const setVars = (xPct, yPct, zoom) => {
            wrap.style.setProperty("--zoom-x", `${xPct}%`);
            wrap.style.setProperty("--zoom-y", `${yPct}%`);
            wrap.style.setProperty("--zoom", String(zoom));
        };

        const showLens = (clientX, clientY) => {
            if (!els.zoomLens) return;
            const rect = wrap.getBoundingClientRect();
            const x = Math.min(rect.right, Math.max(rect.left, clientX)) - rect.left;
            const y = Math.min(rect.bottom, Math.max(rect.top, clientY)) - rect.top;
            els.zoomLens.style.left = `${x}px`;
            els.zoomLens.style.top = `${y}px`;
        };

        const setFromPoint = (clientX, clientY) => {
            const rect = wrap.getBoundingClientRect();
            const x = ((clientX - rect.left) / rect.width) * 100;
            const y = ((clientY - rect.top) / rect.height) * 100;
            setVars(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)), state.zoomEnabled ? 2.1 : 1);
            showLens(clientX, clientY);
        };

        const enableZoom = () => {
            state.zoomEnabled = true;
            wrap.classList.add("is-zooming");
            if (els.zoomHint) els.zoomHint.textContent = "Move to zoom • Tap to exit";
        };

        const disableZoom = () => {
            state.zoomEnabled = false;
            wrap.classList.remove("is-zooming");
            setVars(50, 50, 1);
            if (els.zoomHint) els.zoomHint.textContent = "Hover to zoom • Tap to zoom";
        };

        disableZoom();

        let pointerDown = false;
        let downX = 0;
        let downY = 0;
        let moved = false;

        wrap.addEventListener("pointerenter", (event) => {
            if (event.pointerType !== "mouse") return;
            enableZoom();
            setFromPoint(event.clientX, event.clientY);
        });

        wrap.addEventListener("pointerleave", (event) => {
            if (event.pointerType !== "mouse") return;
            disableZoom();
        });

        wrap.addEventListener("pointermove", (event) => {
            if (event.pointerType === "mouse") {
                if (!state.zoomEnabled) return;
                setFromPoint(event.clientX, event.clientY);
                return;
            }
            if (!pointerDown || !state.zoomEnabled) return;
            if (Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 8) moved = true;
            setFromPoint(event.clientX, event.clientY);
        });

        wrap.addEventListener("pointerdown", (event) => {
            if (event.pointerType === "mouse") return;
            pointerDown = true;
            moved = false;
            downX = event.clientX;
            downY = event.clientY;
            wrap.setPointerCapture?.(event.pointerId);
            if (state.zoomEnabled) setFromPoint(event.clientX, event.clientY);
        });

        wrap.addEventListener("pointerup", (event) => {
            if (event.pointerType === "mouse") return;
            pointerDown = false;
            if (!moved) {
                if (state.zoomEnabled) disableZoom();
                else {
                    enableZoom();
                    setFromPoint(event.clientX, event.clientY);
                }
            }
        });

        wrap.addEventListener("dblclick", (event) => {
            if (event.pointerType !== "mouse") return;
            if (state.zoomEnabled) disableZoom();
            else enableZoom();
        });
    };

    const init = async () => {
        setStatus(`<div class="notice">Loading…</div>`);

        const cached = readProductsCache();
        const fromCache = cached?.find((item) => String(item?.id) === String(productId)) ?? null;
        if (fromCache) {
            renderProduct(fromCache);
            setStatus(`<div class="notice">Loaded from cache.</div>`);
        }

        try {
            const apiProduct = await fetchProductById(productId);
            if (apiProduct) {
                renderProduct(apiProduct);
                return;
            }
        } catch {
            // ignore
        }

        if (!fromCache) showNotFound();
    };

    void init();
    initZoom();
});
