document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");
    const cartCount = document.querySelector("#cart-count");

    if (!header || !hamburger || !mobileMenu) return;

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

    const cartApi = window.ShopSmartCart;
    if (!cartApi) {
        // Cart script not loaded; keep page usable without cart functionality.
        return;
    }

    const productsCacheKey = "ss_products_cache_v1";
    const productsCacheTtlMs = 30 * 60 * 1000;

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

        card.innerHTML = `
            <a class="product-link" href="${productHref}" aria-label="View product details">
                <div class="product-media">
                    <img class="product-img" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
                    <span class="product-tag">${product.category ?? "Featured"}</span>
                </div>
            </a>
            <div class="product-body">
                <a class="product-link product-link--title" href="${productHref}">
                    <h3 class="product-title"></h3>
                </a>
                <p class="product-meta">${ratingText}</p>
                <div class="product-footer">
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <button class="btn btn--primary btn--sm add-to-cart" type="button">Add to Cart</button>
                </div>
            </div>
        `;

        const img = card.querySelector("img");
        const title = card.querySelector(".product-title");
        const tag = card.querySelector(".product-tag");

        if (img) {
            img.alt = product.title ?? "Product image";
            img.src = product.image ?? "";
            img.width = 640;
            img.height = 640;
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

    const filterProducts = (products, query) => {
        const q = (query ?? "").trim().toLowerCase();
        if (!q) return products;
        return products.filter((product) => {
            const hay = `${product.title ?? ""} ${product.category ?? ""}`.toLowerCase();
            return hay.includes(q);
        });
    };

    const renderProducts = (products) => {
        if (!grid) return;
        grid.innerHTML = "";
        const fragment = document.createDocumentFragment();
        products.forEach((product) => fragment.appendChild(createProductCard(product)));
        grid.appendChild(fragment);
    };

    const fetchProducts = async () => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 9000);
        try {
            const response = await fetch("https://fakestoreapi.com/products", {
                signal: controller.signal,
                headers: { accept: "application/json" },
            });
            if (!response.ok) throw new Error(`Bad response: ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) throw new Error("No products");
            return data;
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
        setStatus("");

        const cache = readProductsCache();
        let products = [];
        let source = "api";

        if (cache && isFreshCache(cache)) {
            products = cache.data;
            source = "cache";
        }

        let searchQuery = "";
        const getSortValue = () => (sortSelect?.value ?? "featured").toString();

        const apply = () => {
            const filtered = filterProducts(products, searchQuery);
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
            sortSelect?.addEventListener("change", apply);

            grid.addEventListener("click", (event) => {
                const button = event.target.closest("button.add-to-cart");
                if (!button) return;
                const card = button.closest("[data-product-id]");
                const productId = card?.dataset.productId;
                if (!productId) return;
                const title = card?.dataset.productTitle ?? "";
                const image = card?.dataset.productImage ?? "";
                const price = Number(card?.dataset.productPrice);
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
            apply();
            if (source === "cache") {
                setStatus(`<div class="notice">Showing cached products. Refreshing in background…</div>`);
            }
        };

        if (products.length > 0) {
            renderFromSource();
        }

        // Always try to refresh from API (stale-while-revalidate).
        try {
            const apiProducts = await fetchProducts();
            products = apiProducts;
            source = "api";
            writeProductsCache(apiProducts);
            setStatus("");
        } catch {
            if (products.length === 0) {
                products = fallbackProducts;
                source = "fallback";
                writeProductsCache(fallbackProducts);
                setStatus(
                    `<div class="notice">Live products are unavailable right now. Showing demo products. <button class="btn btn--ghost btn--sm notice-btn" type="button" data-retry>Retry</button></div>`
                );
            } else if (source === "cache") {
                setStatus(
                    `<div class="notice">Showing cached products (API currently unavailable). <button class="btn btn--ghost btn--sm notice-btn" type="button" data-retry>Retry</button></div>`
                );
            }
        }

        apply();
    };

    void initProducts();
});
