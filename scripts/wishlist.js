const boot = () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const grid = document.querySelector("[data-wishlist-grid]");
    const status = document.querySelector("[data-wishlist-status]");
    const summary = document.querySelector("[data-wishlist-summary]");
    const clearBtn = document.querySelector("[data-clear-wishlist]");
    const wishlistCount = document.querySelector("[data-wishlist-count]");
    const cartCount = document.querySelector("#cart-count");
    const year = document.querySelector("[data-year]");

    const wishlistKey = "ss_wishlist_v1";
    const productsCacheKey = "ss_products_cache_v6";

    if (year) year.textContent = String(new Date().getFullYear());

    if (header && hamburger && mobileMenu) {
        const closeMenu = () => {
            header.classList.remove("is-open");
            hamburger.setAttribute("aria-expanded", "false");
            hamburger.setAttribute("aria-label", "Open menu");
        };
        hamburger.addEventListener("click", () => {
            const open = header.classList.toggle("is-open");
            hamburger.setAttribute("aria-expanded", open ? "true" : "false");
            hamburger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });
        mobileMenu.addEventListener("click", (event) => {
            if (event.target.closest("a")) closeMenu();
        });
    }

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

    const toast = createToast();
    let toastTimer = null;
    const showToast = (message) => {
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
    };

    const formatPrice = (value) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return "Rs.0";
        return number.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    };

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

    const readProducts = () => {
        try {
            const raw = window.localStorage.getItem(productsCacheKey);
            const parsed = raw ? JSON.parse(raw) : null;
            return Array.isArray(parsed?.data) ? parsed.data : [];
        } catch {
            return [];
        }
    };

    const updateBadges = () => {
        const ids = readWishlist();
        if (wishlistCount) wishlistCount.textContent = String(ids.length);
        if (cartCount && window.ShopSmartCart) cartCount.textContent = String(window.ShopSmartCart.getCount());
    };

    const productCard = (product) => {
        const id = String(product?.id ?? "");
        const image = String(product?.image ?? product?.thumbnail ?? "assets/product-fallback.svg");
        const title = String(product?.title ?? "Product");
        const category = String(product?.category ?? "Featured");
        const rating = Number(product?.rating?.rate);
        const count = Number(product?.rating?.count);
        const ratingText = Number.isFinite(rating) ? `${rating.toFixed(1)} • ${Number.isFinite(count) ? count : 0} reviews` : "Top rated";
        const card = document.createElement("article");
        card.className = "product-card";
        card.dataset.productId = id;
        card.dataset.productTitle = title;
        card.dataset.productImage = image;
        card.dataset.productPrice = String(Number(product?.price ?? 0));
        card.innerHTML = `
            <a class="product-link" href="product.html?id=${encodeURIComponent(id)}" aria-label="View product details">
                <div class="product-media">
                    <img class="product-img" alt="" loading="lazy" decoding="async" />
                    <span class="product-tag"></span>
                </div>
                <div class="product-body">
                    <h3 class="product-title"></h3>
                    <p class="product-meta"></p>
                    <div class="product-footer">
                        <div class="product-price"></div>
                    </div>
                </div>
            </a>
            <div class="wishlist-card-actions">
                <button class="btn btn--primary btn--sm add-to-cart" type="button">Add to Cart</button>
                <button class="btn btn--ghost btn--sm" type="button" data-remove-wishlist>Remove</button>
            </div>
        `;
        card.querySelector(".product-img").src = image;
        card.querySelector(".product-img").alt = title;
        card.querySelector(".product-tag").textContent = category;
        card.querySelector(".product-title").textContent = title;
        card.querySelector(".product-meta").textContent = ratingText;
        card.querySelector(".product-price").textContent = formatPrice(product?.price);
        return card;
    };

    const render = () => {
        if (!grid) return;
        const ids = readWishlist();
        const products = readProducts();
        const byId = new Map(products.map((product) => [String(product?.id ?? ""), product]));
        const items = ids.map((id) => byId.get(id)).filter(Boolean);

        updateBadges();
        grid.innerHTML = "";
        if (summary) summary.textContent = `${ids.length} saved item${ids.length === 1 ? "" : "s"}`;

        if (ids.length === 0) {
            status.innerHTML = `<div class="wishlist-empty"><h2>No favorites yet</h2><p>Tap the heart on product cards to save items here.</p><a class="btn btn--primary" href="products.html">Browse products</a></div>`;
            return;
        }

        if (items.length === 0) {
            status.innerHTML = `<div class="wishlist-empty"><h2>Refresh products first</h2><p>Your saved ids are here, but the product cache is empty. Open products once to refresh the catalog.</p><a class="btn btn--primary" href="products.html">Load products</a></div>`;
            return;
        }

        status.innerHTML = "";
        const fragment = document.createDocumentFragment();
        items.forEach((product) => fragment.appendChild(productCard(product)));
        grid.appendChild(fragment);
    };

    grid?.addEventListener("click", (event) => {
        const card = event.target.closest("[data-product-id]");
        if (!card) return;
        const id = String(card.dataset.productId ?? "");
        if (event.target.closest("[data-remove-wishlist]")) {
            writeWishlist(readWishlist().filter((x) => x !== id));
            showToast("Removed from wishlist");
            render();
            return;
        }
        if (event.target.closest(".add-to-cart")) {
            if (!window.ShopSmartCart) return;
            window.ShopSmartCart.addItem(
                {
                    productId: id,
                    title: card.dataset.productTitle ?? "",
                    image: card.dataset.productImage ?? "",
                    price: Number(card.dataset.productPrice),
                },
                1
            );
            updateBadges();
            showToast("Added to cart");
        }
    });

    clearBtn?.addEventListener("click", () => {
        writeWishlist([]);
        showToast("Wishlist cleared");
        render();
    });

    updateBadges();
    render();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}
