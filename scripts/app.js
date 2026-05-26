import { db, isConfigured, collection, getDocs } from "./firebase-init.js";

const boot = () => {
    // Basic escaping for status rendering.
    const escapeHtml = (value) =>
        String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const reportFatal = (err) => {
        const status = document.querySelector("[data-products-status]");
        const countEl = document.querySelector("[data-products-count]");
        if (countEl) countEl.textContent = "Products unavailable";
        const message = err instanceof Error ? err.message : String(err);
        if (status) {
            status.innerHTML = `<div class="notice">Something went wrong while loading the storefront.${
                message ? ` <div class="muted">${escapeHtml(message)}</div>` : ""
            }</div>`;
        }
        // eslint-disable-next-line no-console
        console.error("[ShopSmart] Fatal error in app.js", err);
    };

    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");
    const cartCount = document.querySelector("#cart-count");

    const hasNav = Boolean(header && hamburger && mobileMenu);

    // Debug marker so it’s obvious the module executed (helps when SW/cache serves stale JS).
    try {
        const status = document.querySelector("[data-products-status]");
        if (status) status.innerHTML = `<div class="notice">App loaded. Preparing products…</div>`;
    } catch {
        // ignore
    }

    const closeMenu = () => {
        if (!hasNav) return;
        header.classList.remove("is-open");
        hamburger.setAttribute("aria-expanded", "false");
        hamburger.setAttribute("aria-label", "Open menu");
    };

    const openMenu = () => {
        if (!hasNav) return;
        header.classList.add("is-open");
        hamburger.setAttribute("aria-expanded", "true");
        hamburger.setAttribute("aria-label", "Close menu");
    };

    const toggleMenu = () => {
        const isOpen = header.classList.contains("is-open");
        if (isOpen) closeMenu();
        else openMenu();
    };

    if (hasNav) hamburger.addEventListener("click", toggleMenu);

    if (hasNav) {
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });
    }

    if (hasNav) {
        document.addEventListener("click", (event) => {
            if (!header.classList.contains("is-open")) return;
            if (header.contains(event.target)) return;
            closeMenu();
        });
    }

    if (hasNav) {
        mobileMenu.addEventListener("click", (event) => {
            const link = event.target.closest("a");
            if (link) closeMenu();
        });
    }

    if (hasNav) {
        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) closeMenu();
        });
    }

    searchForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            const input = form.querySelector("input[type='search']");
            const query = input?.value?.trim() ?? "";
            if (!query) return;

            const hasProductsGrid = Boolean(document.querySelector("[data-product-grid]"));
            if (!hasProductsGrid) {
                event.preventDefault();
                const url = new URL("products.html", window.location.href);
                url.searchParams.set("q", query);
                window.location.href = url.toString();
                return;
            }

            // If we're already on a page with a product grid, rely on the input handler to filter.
            event.preventDefault();
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

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());

    const contactForm = document.querySelector(".form-card");
    if (contactForm) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();
            showToast("Thanks! We received your message (demo).", "success");
            contactForm.reset();
        });
    }

    const cartApi =
        window.ShopSmartCart ??
        ({
            readCart: () => ({ version: 2, items: {} }),
            writeCart: (cart) => cart,
            addItem: () => undefined,
            setQty: () => undefined,
            removeItem: () => undefined,
            getCount: () => 0,
            onChange: () => () => {},
        });

    const productsCacheKey = "ss_products_cache_v5";
    const productsCacheTtlMs = 30 * 60 * 1000;

    const wishlistKey = "ss_wishlist_v1";
    const readWishlist = () => {
        try {
            const raw = window.localStorage.getItem(wishlistKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
        } catch {
            return [];
        }
    };

    const writeWishlist = (ids) => {
        try {
            window.localStorage.setItem(wishlistKey, JSON.stringify(ids));
        } catch {
            // ignore
        }
    };

    const isWishlisted = (productId, ids = readWishlist()) => ids.includes(String(productId));

    const toggleWishlist = (productId) => {
        const id = String(productId);
        const ids = readWishlist();
        const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids].slice(0, 200);
        writeWishlist(next);
        return next;
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

    const grid = document.querySelector("[data-product-grid]");
    const status = document.querySelector("[data-products-status]");
    const countEl = document.querySelector("[data-products-count]");
    const sortSelect = document.querySelector("[data-sort]");
    const minRatingSelect = document.querySelector("[data-min-rating]");
    const maxPriceInput = document.querySelector("[data-max-price]");
    const categoryChips = document.querySelector("[data-category-chips]");
    const clearFiltersBtn = document.querySelector("[data-clear-filters]");
    const showWishlistBtn = document.querySelector("[data-show-wishlist]");
    const recentSection = document.querySelector("[data-recently-viewed]");
    const recentRow = document.querySelector("[data-recent-row]");
    let productsHandlersWired = false;

    const fallbackProducts = [
        {
            id: "local-1",
            title: "Premium Wireless Headphones",
            price: 1499,
            image: "https://images.unsplash.com/photo-1518441902117-f0a6a0d83a67?auto=format&fit=crop&w=900&q=70",
            category: "electronics",
            rating: { rate: 4.6, count: 1200 },
        },
        {
            id: "local-2",
            title: "Minimal Leather Wallet",
            price: 799,
            image: "https://images.unsplash.com/photo-1588497859490-85d1c17db96d?auto=format&fit=crop&w=900&q=70",
            category: "accessories",
            rating: { rate: 4.4, count: 540 },
        },
        {
            id: "local-3",
            title: "Everyday Sneakers (Comfort Fit)",
            price: 1299,
            image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=70",
            category: "fashion",
            rating: { rate: 4.5, count: 890 },
        },
        {
            id: "local-4",
            title: "Smartwatch Series Pro",
            price: 1999,
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=70",
            category: "electronics",
            rating: { rate: 4.3, count: 760 },
        },
        {
            id: "local-5",
            title: "Organic Cotton T-Shirt",
            price: 499,
            image: "https://images.unsplash.com/photo-1520975682031-a27f86b21c13?auto=format&fit=crop&w=900&q=70",
            category: "fashion",
            rating: { rate: 4.2, count: 320 },
        },
        {
            id: "local-6",
            title: "Desk Lamp with Warm Glow",
            price: 699,
            image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=70",
            category: "home",
            rating: { rate: 4.7, count: 610 },
        },
        {
            id: "local-7",
            title: "Stainless Steel Water Bottle",
            price: 349,
            image: "https://images.unsplash.com/photo-1526401485004-2aa6a8288410?auto=format&fit=crop&w=900&q=70",
            category: "lifestyle",
            rating: { rate: 4.5, count: 1500 },
        },
        {
            id: "local-8",
            title: "Travel Backpack (35L)",
            price: 1599,
            image: "https://images.unsplash.com/photo-1514477917009-389c76a86b68?auto=format&fit=crop&w=900&q=70",
            category: "travel",
            rating: { rate: 4.4, count: 980 },
        },
    ];

    const toyProducts = [
        {
            id: "toy-001",
            title: "Wooden Rainbow Stacking Blocks",
            price: 349,
            image: "./assets/products/toys.svg",
            images: ["./assets/products/toys.svg"],
            category: "kids toys",
            description: "Colorful stacking blocks for shape recognition, balance, and early learning play.",
            offer: "Buy 2 get 10% off",
            rating: { rate: 4.8, count: 342 },
        },
        {
            id: "toy-002",
            title: "Soft Plush Bear Gift Set",
            price: 499,
            image: "./assets/products/toys.svg",
            images: ["./assets/products/toys.svg"],
            category: "kids toys",
            description: "Soft plush toy set for birthdays, gifting, and cozy bedtime routines.",
            offer: "Flat 25% off",
            rating: { rate: 4.7, count: 418 },
        },
        {
            id: "toy-003",
            title: "STEM Building Bricks Kit",
            price: 899,
            image: "./assets/products/toys.svg",
            images: ["./assets/products/toys.svg"],
            category: "kids toys",
            description: "Creative building kit for problem-solving, motor skills, and imaginative play.",
            offer: "Free storage box",
            rating: { rate: 4.9, count: 276 },
        },
        {
            id: "toy-004",
            title: "Animal Puzzle Board",
            price: 299,
            image: "./assets/products/toys.svg",
            images: ["./assets/products/toys.svg"],
            category: "kids toys",
            description: "Animal-themed puzzle board for toddlers learning names, colors, and matching.",
            offer: "Under Rs.299 deal",
            rating: { rate: 4.5, count: 198 },
        },
        {
            id: "toy-005",
            title: "Remote Control Mini Car",
            price: 749,
            image: "./assets/products/toys.svg",
            images: ["./assets/products/toys.svg"],
            category: "kids toys",
            description: "Compact remote control car with smooth handling for indoor racing fun.",
            offer: "Save Rs.150 today",
            rating: { rate: 4.6, count: 521 },
        },
        {
            id: "toy-006",
            title: "Kids Art and Craft Box",
            price: 599,
            image: "./assets/products/toys.svg",
            images: ["./assets/products/toys.svg"],
            category: "kids toys",
            description: "Craft box with safe, colorful supplies for drawing, paper craft, and weekend creativity.",
            offer: "Weekend special",
            rating: { rate: 4.8, count: 310 },
        },
    ];

    const fetchToyProductsFromCommons = async () => {
        const url =
            "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=kids%20toys&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*";
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 7000);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { accept: "application/json" },
            });
            if (!response.ok) throw new Error(`Bad toy image response: ${response.status}`);
            const payload = await response.json();
            const pages = Object.values(payload?.query?.pages ?? {});
            const images = pages
                .map((page) => page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url)
                .filter(Boolean)
                .filter((src) => !String(src).toLowerCase().includes("toyama"));

            if (images.length === 0) throw new Error("No toy images");

            return toyProducts.map((product, index) => {
                const image = String(images[index % images.length]);
                return { ...product, image, images: [image, product.image] };
            });
        } finally {
            window.clearTimeout(timer);
        }
    };

    const formatPrice = (value) => {
        const price = Number(value);
        if (!Number.isFinite(price)) return "₹—";
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
            price
        );
    };

    const setStatus = (html) => {
        if (!status) return;
        status.innerHTML = html;
    };

    const setCountText = (text) => {
        if (!countEl) return;
        countEl.textContent = text;
    };

    const recentlyViewedKey = "ss_recently_viewed_v1";
    const readRecentlyViewedIds = () => {
        try {
            const raw = window.localStorage.getItem(recentlyViewedKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
        } catch {
            return [];
        }
    };

    const renderRecentlyViewed = (allProducts) => {
        if (!recentSection || !recentRow) return;
        const ids = readRecentlyViewedIds();
        if (ids.length === 0) {
            recentSection.hidden = true;
            return;
        }

        const map = new Map(allProducts.map((p) => [String(p?.id ?? ""), p]));
        const items = ids.map((id) => map.get(id)).filter(Boolean).slice(0, 10);
        if (items.length === 0) {
            recentSection.hidden = true;
            return;
        }

        recentRow.innerHTML = "";
        const fragment = document.createDocumentFragment();
        items.forEach((product) => {
            const id = String(product?.id ?? "");
            const href = `product.html?id=${encodeURIComponent(id)}`;
            const card = document.createElement("a");
            card.className = "mini-card";
            card.href = href;
            card.setAttribute("aria-label", "Open product");
            card.innerHTML = `
                <div class="mini-media"><img alt="" loading="lazy" decoding="async" /></div>
                <div class="mini-body">
                    <p class="mini-title"></p>
                    <p class="mini-meta">${String(product?.category ?? "Featured")}</p>
                    <div class="mini-foot">
                        <div class="mini-price">${formatPrice(product?.price)}</div>
                        <span class="pill pill--soft">View</span>
                    </div>
                </div>
            `;
            const img = card.querySelector("img");
            const title = card.querySelector(".mini-title");
            if (img) {
                const titleText = String(product?.title ?? "Product");
                img.alt = titleText;
                img.width = 640;
                img.height = 640;

                const safe = titleText.slice(0, 60);
                const svg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
                      <defs>
                        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stop-color="#1f2937"/>
                          <stop offset="1" stop-color="#0b1220"/>
                        </linearGradient>
                      </defs>
                      <rect width="640" height="640" fill="url(#g)"/>
                      <text x="320" y="340" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="28" fill="rgba(255,255,255,0.78)">${safe.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</text>
                    </svg>
                `.trim();
                const fallback = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

                img.onerror = () => {
                    img.onerror = null;
                    img.src = fallback;
                };

                const src = String(product?.image ?? "");
                img.src = src || fallback;
            }
            if (title) title.textContent = String(product?.title ?? "Product");
            fragment.appendChild(card);
        });
        recentRow.appendChild(fragment);
        recentSection.hidden = false;
    };

    const renderSkeleton = (count = 8) => {
        if (!grid) return;
        grid.innerHTML = "";
        for (let i = 0; i < count; i += 1) {
            const card = document.createElement("div");
            card.className = "product-card is-skeleton";
            card.innerHTML = `
                <div class="product-media">
                    <div class="skeleton skeleton--img"></div>
                </div>
                <div class="product-body">
                    <div class="skeleton skeleton--title"></div>
                    <div class="skeleton skeleton--line"></div>
                    <div class="product-footer">
                        <div class="skeleton skeleton--price"></div>
                        <div class="skeleton skeleton--btn"></div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        }
    };

    const createProductCard = (product) => {
        const card = document.createElement("article");
        card.className = "product-card";
        card.dataset.productId = String(product.id);
        card.dataset.productTitle = String(product.title ?? "");
        card.dataset.productImage = String(product.image ?? "");
        card.dataset.productPrice = String(product.price ?? "");
        const productHref = `product.html?id=${encodeURIComponent(String(product.id))}`;

        const ratingRate = Number(product.rating?.rate);
        const ratingCount = Number(product.rating?.count);
        const ratingText =
            Number.isFinite(ratingRate) && Number.isFinite(ratingCount)
                ? `${ratingRate.toFixed(1)} • ${ratingCount.toLocaleString("en-IN")} reviews`
                : "Top rated";
        const offerText = String(product.offer ?? "").trim();
        const categoryText = String(product.category ?? "Featured");

        const wished = isWishlisted(product.id);

        card.innerHTML = `
            <a class="product-link" href="${productHref}" aria-label="View product details">
                <div class="product-media">
                    <img class="product-img" alt="" loading="lazy" decoding="async" />
                    <span class="product-tag">${offerText ? escapeHtml(offerText) : escapeHtml(categoryText)}</span>
                    <button class="wish-btn" type="button" aria-label="Add to wishlist" aria-pressed="${wished ? "true" : "false"}" data-wish>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12.1 20.1c-.1 0-.2 0-.3-.1C7.1 17 4 14.2 4 10.9 4 8.5 5.8 6.6 8.2 6.6c1.2 0 2.3.5 3 1.3.7-.8 1.8-1.3 3-1.3 2.4 0 4.2 1.9 4.2 4.3 0 3.3-3.1 6.1-7.8 9.1-.1.1-.2.1-.3.1Z"></path>
                        </svg>
                    </button>
                </div>
            </a>
            <div class="product-body">
                <a class="product-link product-link--title" href="${productHref}">
                    <h3 class="product-title"></h3>
                </a>
                <p class="product-meta">${ratingText}${offerText ? ` - ${escapeHtml(categoryText)}` : ""}</p>
                <div class="product-footer">
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <button class="btn btn--primary btn--sm add-to-cart" type="button">Add to Cart</button>
                </div>
            </div>
        `;

        const img = card.querySelector("img");
        const title = card.querySelector(".product-title");
        const tag = card.querySelector(".product-tag");

        const makeFallbackDataUrl = (label) => {
            const safe = String(label ?? "Product").slice(0, 60);
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stop-color="#1f2937"/>
                      <stop offset="1" stop-color="#0b1220"/>
                    </linearGradient>
                  </defs>
                  <rect width="640" height="640" fill="url(#g)"/>
                  <circle cx="320" cy="260" r="86" fill="rgba(255,255,255,0.10)"/>
                  <path d="M210 460c54-56 166-56 220 0" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="20" stroke-linecap="round"/>
                  <text x="320" y="560" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="28" fill="rgba(255,255,255,0.78)">${safe.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</text>
                </svg>
            `.trim();
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        };

        if (img) {
            img.alt = product.title ?? "Product image";
            img.width = 640;
            img.height = 640;
            img.onerror = () => {
                img.onerror = null;
                img.src = makeFallbackDataUrl(product.title);
            };
            img.src = product.image ?? makeFallbackDataUrl(product.title);
        }
        if (title) title.textContent = product.title ?? "Untitled product";
        if (tag) tag.textContent = (product.category ?? "Featured").toString();

        return card;
    };

    const sortProducts = (products, sortValue) => {
        const list = [...products];
        switch (sortValue) {
            case "price-asc":
                list.sort((a, b) => Number(a.price) - Number(b.price));
                return list;
            case "price-desc":
                list.sort((a, b) => Number(b.price) - Number(a.price));
                return list;
            case "title-asc":
                list.sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")));
                return list;
            case "featured":
            default:
                return list;
        }
    };

    const filterProducts = (products, filters) => {
        const query = String(filters?.query ?? "").trim().toLowerCase();
        const category = String(filters?.category ?? "");
        const wishlistOnly = Boolean(filters?.wishlistOnly);
        const wishlistIds = Array.isArray(filters?.wishlistIds) ? filters.wishlistIds.map((x) => String(x)) : [];
        const maxPrice = Number(filters?.maxPrice);
        const minRating = Number(filters?.minRating);

        return products.filter((product) => {
            const title = String(product?.title ?? "");
            const cat = String(product?.category ?? "");
            const price = Number(product?.price);
            const rating = Number(product?.rating?.rate);
            const id = String(product?.id ?? "");

            if (query) {
                const hay = `${title} ${cat}`.toLowerCase();
                if (!hay.includes(query)) return false;
            }

            if (category && category !== "all") {
                if (cat.toLowerCase() !== category) return false;
            }

            if (Number.isFinite(maxPrice) && maxPrice > 0) {
                if (!Number.isFinite(price) || price > maxPrice) return false;
            }

            if (Number.isFinite(minRating) && minRating > 0) {
                if (!Number.isFinite(rating) || rating < minRating) return false;
            }

            if (wishlistOnly) {
                if (!wishlistIds.includes(id)) return false;
            }

            return true;
        });
    };

    const renderProducts = (products) => {
        if (!grid) return;
        grid.innerHTML = "";
        const fragment = document.createDocumentFragment();
        products.forEach((product) => fragment.appendChild(createProductCard(product)));
        grid.appendChild(fragment);
    };

    const normalizeFirestoreProduct = (id, data) => {
        const product = data && typeof data === "object" ? data : {};
        const ratingRate = Number(product.ratingRate ?? product.rating?.rate);
        const ratingCount = Number(product.ratingCount ?? product.rating?.count);
        return {
            id,
            title: String(product.title ?? "Product"),
            price: Number(product.price ?? 0),
            image: String(product.image ?? ""),
            images: Array.isArray(product.images) ? product.images.map((x) => String(x)) : undefined,
            category: String(product.category ?? "featured").toLowerCase(),
            description: String(product.description ?? ""),
            offer: String(product.offer ?? ""),
            rating: {
                rate: Number.isFinite(ratingRate) ? ratingRate : 4.3,
                count: Number.isFinite(ratingCount) ? ratingCount : 250,
            },
        };
    };

    const normalizeApiProduct = (raw) => {
        const product = raw && typeof raw === "object" ? raw : {};
        const id = product.id ?? product._id ?? product.productId;
        const ratingRate = Number(product.ratingRate ?? product.rating?.rate ?? product.rating);
        const ratingCount = Number(product.ratingCount ?? product.rating?.count ?? product.stock);
        const images = Array.isArray(product.images) ? product.images.map((x) => String(x)) : [];
        const thumbnail = String(product.thumbnail ?? product.image ?? images[0] ?? "");
        return {
            id: String(id ?? ""),
            title: String(product.title ?? "Product"),
            price: Number(product.price ?? 0),
            image: thumbnail,
            images: images.length ? images : thumbnail ? [thumbnail, thumbnail, thumbnail] : [],
            category: String(product.category ?? "featured").toLowerCase(),
            description: String(product.description ?? ""),
            offer: String(product.offer ?? ""),
            rating: {
                rate: Number.isFinite(ratingRate) ? ratingRate : 4.3,
                count: Number.isFinite(ratingCount) ? ratingCount : 250,
            },
        };
    };

    const generateLocalProducts = (count = 100) => {
        const total = Math.max(1, Math.min(500, Math.floor(Number(count) || 100)));
        const categories = ["electronics", "fashion", "home", "accessories", "beauty", "sports", "kids toys"];
        const imageByCategory = {
            electronics: "./assets/products/electronics.svg",
            fashion: "./assets/products/fashion.svg",
            home: "./assets/products/home.svg",
            accessories: "./assets/products/accessories.svg",
            beauty: "./assets/products/beauty.svg",
            sports: "./assets/products/sports.svg",
            "kids toys": "./assets/products/toys.svg",
        };
        const titleA = ["Premium", "Modern", "Classic", "Eco", "Smart", "Minimal", "Pro", "Everyday", "Ultra", "Studio"];
        const titleB = ["Wireless", "Cotton", "Leather", "Steel", "Ceramic", "Bluetooth", "Travel", "Running", "Puzzle", "Plush"];
        const titleC = ["Headphones", "T-Shirt", "Wallet", "Bottle", "Mug", "Speaker", "Backpack", "Shoes", "Toy Set", "Blocks"];

        const out = [];
        for (let i = 1; i <= total; i += 1) {
            const category = categories[i % categories.length];
            const title = `${titleA[i % titleA.length]} ${titleB[i % titleB.length]} ${titleC[i % titleC.length]}`;
            const price = 299 + ((i * 37) % 2200);
            const rate = 3.6 + ((i * 13) % 15) / 10;
            const countReviews = 50 + ((i * 91) % 2400);
            const img = imageByCategory[category] ?? "./assets/product-fallback.svg";
            out.push({
                id: `local-${String(i).padStart(3, "0")}`,
                title,
                price,
                description: "Demo product for offline mode. Replace with Firestore catalog when ready.",
                category,
                thumbnail: img,
                images: [img],
                rating: rate,
                stock: countReviews,
            });
        }
        return out;
    };

    const withTimeout = (promise, ms, label) =>
        Promise.race([
            promise,
            new Promise((_, reject) =>
                window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
            ),
        ]);

    const fetchProductsFromFirestore = async () => {
        if (!isConfigured() || !db) throw new Error("Firestore not configured");
        setStatus(`<div class="notice">Fetching products from Firestore…</div>`);
        const snap = await withTimeout(getDocs(collection(db, "products")), 4500, "Firestore products");
        const products = [];
        snap.forEach((docSnap) => {
            products.push(normalizeFirestoreProduct(docSnap.id, docSnap.data()));
        });
        if (products.length === 0) throw new Error("No Firestore products");
        return products;
    };

    const fetchProductsFromApi = async () => {
        setStatus(`<div class="notice">Fetching demo products from API…</div>`);
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 9000);
        try {
            const response = await fetch("https://fakestoreapi.com/products", {
                signal: controller.signal,
                headers: { accept: "application/json" },
            });
            if (!response.ok) throw new Error(`Bad response: ${response.status}`);
            const payload = await response.json();
            const data = Array.isArray(payload) ? payload : payload?.products;
            if (!Array.isArray(data) || data.length === 0) throw new Error("No products");
            const toys = await fetchToyProductsFromCommons().catch(() => toyProducts);
            return [...data.map(normalizeApiProduct).filter((p) => p.id), ...toys];
        } finally {
            window.clearTimeout(timer);
        }
    };

    const fetchProductsFromLocal = async () => {
        setStatus(`<div class="notice">Loading demo products locallyâ€¦</div>`);
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 3000);
        try {
            const response = await fetch("./assets/demo-products.json", { signal: controller.signal, cache: "no-store" });
            if (!response.ok) throw new Error(`Bad response: ${response.status}`);
            const payload = await response.json();
            const data = Array.isArray(payload) ? payload : payload?.products;
            if (!Array.isArray(data) || data.length === 0) throw new Error("No local products");
            const normalized = data.map(normalizeApiProduct).filter((p) => p.id);
            if (normalized.length >= 100) return normalized.slice(0, 100);
            const existingIds = new Set(normalized.map((p) => String(p.id)));
            const generated = generateLocalProducts(100).map(normalizeApiProduct).filter((p) => p.id && !existingIds.has(String(p.id)));
            const toys = await fetchToyProductsFromCommons().catch(() => toyProducts);
            return [...normalized, ...toys, ...generated].slice(0, 120);
        } finally {
            window.clearTimeout(timer);
        }
    };

    const readProductsCache = () => {
        try {
            const raw = window.localStorage.getItem(productsCacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            if (!Array.isArray(parsed.data)) return null;
            if (!Number.isFinite(parsed.ts)) return null;
            return { ts: parsed.ts, data: parsed.data };
        } catch {
            return null;
        }
    };

    const writeProductsCache = (products) => {
        try {
            window.localStorage.setItem(productsCacheKey, JSON.stringify({ ts: Date.now(), data: products }));
        } catch {
            // ignore write failures (private mode / quota)
        }
    };

    const isFreshCache = (cache) => Date.now() - cache.ts < productsCacheTtlMs;

    const initProducts = async () => {
        if (!grid) return;

        renderSkeleton(8);
        setCountText("Loading products…");
        setStatus(`<div class="notice">Initializing product feed…</div>`);

        const cache = readProductsCache();
        let products = [];
        let source = "api";

        if (cache && isFreshCache(cache)) {
            products = cache.data;
            source = "cache";
        }

        let searchQuery = "";
        let selectedCategory = "all";
        let wishlistOnly = false;
        let maxPriceValue = "";
        let minRatingValue = "0";
        const getSortValue = () => (sortSelect?.value ?? "featured").toString();

        const getWishlistIds = () => readWishlist();

        const renderCategoryChips = () => {
            if (!categoryChips) return;
            const categories = Array.from(
                new Set(
                    products
                        .map((p) => String(p?.category ?? "").trim().toLowerCase())
                        .filter((c) => c && c !== "undefined" && c !== "null")
                )
            ).sort((a, b) => a.localeCompare(b));

            const all = ["all", ...categories];
            categoryChips.innerHTML = "";
            const fragment = document.createDocumentFragment();
            all.forEach((cat) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `chip${cat === selectedCategory ? " is-active" : ""}`;
                btn.dataset.category = cat;
                btn.textContent = cat === "all" ? "All" : cat;
                fragment.appendChild(btn);
            });
            categoryChips.appendChild(fragment);
        };

        const apply = () => {
            const filtered = filterProducts(products, {
                query: searchQuery,
                category: selectedCategory,
                wishlistOnly,
                wishlistIds: getWishlistIds(),
                maxPrice: maxPriceValue,
                minRating: minRatingValue,
            });
            const sorted = sortProducts(filtered, getSortValue());
            renderProducts(sorted);

            if (sorted.length === 0) setStatus(`<div class="notice">No products match your search.</div>`);
            else if (!status?.querySelector(".notice")) setStatus("");

            setCountText(`${sorted.length} product${sorted.length === 1 ? "" : "s"}`);
        };

        const wireHandlers = () => {
            if (productsHandlersWired) return;
            productsHandlersWired = true;

            const onSearchInput = (value) => {
                searchQuery = value ?? "";
                apply();
            };

            let searchDebounce = null;
            const attachSearchInput = (form) => {
                const input = form.querySelector("input[type='search']");
                if (!input) return;
                input.addEventListener("input", () => {
                    window.clearTimeout(searchDebounce);
                    const value = input.value;
                    searchDebounce = window.setTimeout(() => onSearchInput(value), 120);
                });
            };

            searchForms.forEach(attachSearchInput);

            try {
                const initialQuery = new URLSearchParams(window.location.search).get("q") ?? "";
                if (initialQuery) {
                    searchQuery = initialQuery;
                    searchForms.forEach((form) => {
                        const input = form.querySelector("input[type='search']");
                        if (input) input.value = initialQuery;
                    });
                }
            } catch {
                // ignore
            }

            if (searchQuery) apply();
            sortSelect?.addEventListener("change", apply);
            minRatingSelect?.addEventListener("change", () => {
                minRatingValue = String(minRatingSelect.value ?? "0");
                apply();
            });

            maxPriceInput?.addEventListener("input", () => {
                maxPriceValue = String(maxPriceInput.value ?? "");
                apply();
            });

            categoryChips?.addEventListener("click", (event) => {
                const btn = event.target.closest("button[data-category]");
                if (!btn) return;
                selectedCategory = String(btn.dataset.category ?? "all");
                categoryChips.querySelectorAll("button[data-category]").forEach((el) => {
                    el.classList.toggle("is-active", el === btn);
                });
                apply();
            });

            clearFiltersBtn?.addEventListener("click", () => {
                selectedCategory = "all";
                wishlistOnly = false;
                maxPriceValue = "";
                minRatingValue = "0";
                if (maxPriceInput) maxPriceInput.value = "";
                if (minRatingSelect) minRatingSelect.value = "0";
                renderCategoryChips();
                apply();
            });

            showWishlistBtn?.addEventListener("click", (event) => {
                event.preventDefault();
                wishlistOnly = !wishlistOnly;
                showWishlistBtn.textContent = wishlistOnly ? "All products" : "Wishlist";
                showToast(wishlistOnly ? "Showing wishlist" : "Showing all products", "default");
                apply();
            });

            grid.addEventListener("click", (event) => {
                const wish = event.target.closest("button[data-wish]");
                if (wish) {
                    event.preventDefault();
                    event.stopPropagation();
                    const card = wish.closest("[data-product-id]");
                    const productId = card?.dataset.productId;
                    if (!productId) return;
                    const next = toggleWishlist(productId);
                    const pressed = next.includes(String(productId));
                    wish.setAttribute("aria-pressed", pressed ? "true" : "false");
                    wish.setAttribute("aria-label", pressed ? "Remove from wishlist" : "Add to wishlist");
                    showToast(pressed ? "Added to wishlist" : "Removed from wishlist", "default");
                    if (wishlistOnly) apply();
                    return;
                }

                const button = event.target.closest("button.add-to-cart");
                if (!button) return;
                const card = button.closest("[data-product-id]");
                const productId = card?.dataset.productId;
                if (!productId) return;
                const title = card?.dataset.productTitle ?? "";
                const image = card?.dataset.productImage ?? "";
                const price = Number(card?.dataset.productPrice);
                if (!window.ShopSmartCart) {
                    showToast("Cart is unavailable (cart.js failed to load). Refresh the page.", "default");
                    return;
                }

                cartApi.addItem(
                    {
                        productId,
                        title,
                        image,
                        price: Number.isFinite(price) ? price : undefined,
                    },
                    1
                );
                showToast("Added to cart", "success");
            });

            status?.addEventListener("click", (event) => {
                const retry = event.target.closest("[data-retry]");
                if (!retry) return;
                void initProducts();
            });
        };

        wireHandlers();

        const renderFromSource = () => {
            renderCategoryChips();
            renderRecentlyViewed(products);
            apply();
            if (source === "cache") {
                setStatus(`<div class="notice">Showing cached products. Refreshing in background…</div>`);
            }
        };

        if (products.length > 0) {
            renderFromSource();
        }

        // Prefer the public product API for the storefront, then Firestore/local data as fallbacks.
        try {
            let fresh = null;
            try {
                fresh = await fetchProductsFromApi();
                source = "api";
            } catch {
                try {
                    fresh = await fetchProductsFromFirestore();
                    source = "firestore";
                } catch {
                    fresh = await fetchProductsFromLocal();
                    source = "local";
                }
            }

            products = fresh;
            writeProductsCache(fresh);
            setStatus("");
        } catch {
            if (products.length === 0) {
                products = [...fallbackProducts, ...toyProducts];
                source = "fallback";
                writeProductsCache(products);
                setStatus(
                    `<div class="notice">Live products are unavailable right now. Showing demo products. <button class="btn btn--ghost btn--sm notice-btn" type="button" data-retry>Retry</button></div>`
                );
            } else if (source === "cache") {
                setStatus(
                    `<div class="notice">Showing cached products (API currently unavailable). <button class="btn btn--ghost btn--sm notice-btn" type="button" data-retry>Retry</button></div>`
                );
            }
        }

        renderCategoryChips();
        renderRecentlyViewed(products);
        apply();
    };

    try {
        void initProducts();
    } catch (err) {
        reportFatal(err);
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}
