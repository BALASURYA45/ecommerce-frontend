(() => {
    const CART_V2_KEY = "ss_cart_v2";
    const CART_V1_KEY = "ss_cart_v1";

    const safeParse = (raw) => {
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    };

    const safeStringifyWrite = (key, value) => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    };

    const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

    const normalizeVariant = (variant) => {
        if (!isObject(variant)) return null;
        const entries = Object.entries(variant)
            .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
            .map(([key, value]) => [String(key), String(value)]);
        if (entries.length === 0) return null;
        entries.sort(([a], [b]) => a.localeCompare(b));
        return Object.fromEntries(entries);
    };

    const variantKeyFromVariant = (variant) => {
        const normalized = normalizeVariant(variant);
        return normalized ? JSON.stringify(normalized) : "";
    };

    const buildItemKey = ({ productId, variantKey }) => {
        const id = String(productId ?? "").trim();
        const suffix = String(variantKey ?? "").trim();
        return suffix ? `${id}::${suffix}` : id;
    };

    const emptyCart = () => ({ version: 2, items: {} });

    const readCartV2Raw = () => safeParse(window.localStorage.getItem(CART_V2_KEY));
    const readCartV1Raw = () => safeParse(window.localStorage.getItem(CART_V1_KEY));

    const sanitizeCartV2 = (raw) => {
        if (!isObject(raw)) return emptyCart();
        if (!isObject(raw.items)) return emptyCart();

        const items = {};
        for (const [key, value] of Object.entries(raw.items)) {
            if (!isObject(value)) continue;
            const qty = Math.floor(Number(value.qty));
            if (!Number.isFinite(qty) || qty <= 0) continue;

            const productId = String(value.productId ?? value.product?.id ?? "").trim();
            if (!productId) continue;

            const title = String(value.title ?? value.product?.title ?? "").trim();
            const image = String(value.image ?? value.product?.image ?? "").trim();
            const priceNum = Number(value.price ?? value.product?.price);
            const price = Number.isFinite(priceNum) ? priceNum : null;

            const variant = normalizeVariant(value.variant);
            const variantKey = String(value.variantKey ?? variantKeyFromVariant(variant) ?? "");

            items[String(key)] = {
                key: String(key),
                productId,
                title,
                image,
                price,
                qty,
                variant,
                variantKey,
                addedAt: Number.isFinite(Number(value.addedAt)) ? Number(value.addedAt) : Date.now(),
            };
        }

        return { version: 2, items };
    };

    const migrateV1ToV2 = (rawV1) => {
        if (!isObject(rawV1) || !isObject(rawV1.items)) return emptyCart();
        const meta = isObject(rawV1.meta) ? rawV1.meta : {};
        const items = {};

        for (const [legacyKey, legacyQty] of Object.entries(rawV1.items)) {
            const qty = Math.floor(Number(legacyQty));
            if (!Number.isFinite(qty) || qty <= 0) continue;

            const m = isObject(meta[legacyKey]) ? meta[legacyKey] : {};
            const productId = String(m.productId ?? legacyKey ?? "").trim();
            if (!productId) continue;

            const title = String(m.title ?? "").trim();
            const image = String(m.image ?? "").trim();
            const priceNum = Number(m.unitPrice ?? m.price);
            const price = Number.isFinite(priceNum) ? priceNum : null;
            const variant = normalizeVariant(m.selected);
            const variantKey = variantKeyFromVariant(variant);
            const key = buildItemKey({ productId, variantKey });

            items[key] = {
                key,
                productId,
                title,
                image,
                price,
                qty,
                variant,
                variantKey,
                addedAt: Number.isFinite(Number(m.ts)) ? Number(m.ts) : Date.now(),
            };
        }

        return { version: 2, items };
    };

    const ensureCartV2 = () => {
        const existing = readCartV2Raw();
        if (existing) return sanitizeCartV2(existing);

        const legacy = readCartV1Raw();
        if (!legacy) return emptyCart();

        const migrated = migrateV1ToV2(legacy);
        safeStringifyWrite(CART_V2_KEY, migrated);
        return migrated;
    };

    const listeners = new Set();
    const emit = () => {
        const cart = readCart();
        const count = getCount(cart);
        listeners.forEach((fn) => {
            try {
                fn({ cart, count });
            } catch {
                // ignore listener errors
            }
        });
        window.dispatchEvent(new CustomEvent("ss:cartchange", { detail: { cart, count } }));
    };

    const readCart = () => ensureCartV2();

    const writeCart = (nextCart) => {
        const sanitized = sanitizeCartV2(nextCart);
        safeStringifyWrite(CART_V2_KEY, sanitized);
        emit();
        return sanitized;
    };

    const getCount = (cart = readCart()) =>
        Object.values(cart.items).reduce((total, item) => total + (Number.isFinite(item?.qty) ? item.qty : 0), 0);

    const addItem = (product, qty = 1) => {
        const countToAdd = Math.floor(Number(qty));
        if (!Number.isFinite(countToAdd) || countToAdd <= 0) return readCart();

        const productId = String(product?.productId ?? product?.id ?? "").trim();
        if (!productId) return readCart();

        const variant = normalizeVariant(product?.variant);
        const variantKey = String(product?.variantKey ?? variantKeyFromVariant(variant) ?? "");
        const key = buildItemKey({ productId, variantKey });

        const cart = readCart();
        const existing = cart.items[key];
        const nextQty = (existing?.qty ?? 0) + countToAdd;

        const title = String(product?.title ?? existing?.title ?? "").trim();
        const image = String(product?.image ?? existing?.image ?? "").trim();
        const priceNum = Number(product?.price ?? existing?.price);
        const price = Number.isFinite(priceNum) ? priceNum : existing?.price ?? null;

        cart.items[key] = {
            key,
            productId,
            title,
            image,
            price,
            qty: nextQty,
            variant: variant ?? existing?.variant ?? null,
            variantKey,
            addedAt: existing?.addedAt ?? Date.now(),
        };

        return writeCart(cart);
    };

    const setQty = (key, qty) => {
        const nextQty = Math.floor(Number(qty));
        const cart = readCart();
        const item = cart.items[key];
        if (!item) return cart;

        if (!Number.isFinite(nextQty) || nextQty <= 0) {
            delete cart.items[key];
            return writeCart(cart);
        }

        cart.items[key] = { ...item, qty: nextQty };
        return writeCart(cart);
    };

    const removeItem = (key) => setQty(key, 0);

    const onChange = (handler) => {
        if (typeof handler !== "function") return () => {};
        listeners.add(handler);
        return () => listeners.delete(handler);
    };

    window.ShopSmartCart = {
        readCart,
        writeCart,
        addItem,
        setQty,
        removeItem,
        getCount,
        onChange,
    };
})();

