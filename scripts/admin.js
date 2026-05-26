import {
    auth,
    db,
    isConfigured,
    onAuthStateChanged,
    getIdTokenResult,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
} from "./firebase-init.js";

const readAdminEmails = async () => {
    const fromGlobal = globalThis?.__SHOPSMART_ADMIN_EMAILS__;
    if (Array.isArray(fromGlobal) && fromGlobal.length) return fromGlobal.map((x) => String(x).toLowerCase().trim());

    try {
        const url = new URL("./admin-config.local.json", import.meta.url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        const data = await res.json();
        const emails = Array.isArray(data?.adminEmails) ? data.adminEmails : [];
        return emails.map((x) => String(x).toLowerCase().trim()).filter(Boolean);
    } catch {
        return [];
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    const productsBody = document.querySelector("[data-admin-products]");
    const status = document.querySelector("[data-admin-status]");
    const addBtn = document.querySelector("[data-add-product]");
    const searchInput = document.querySelector("[data-admin-search]");
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());

    const setStatus = (html) => {
        if (!status) return;
        status.innerHTML = html ?? "";
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
        toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), 2400);
    };

    const adminEmails = await readAdminEmails();

const isAdminUser = (user) => {
    const email = String(user?.email ?? "").toLowerCase().trim();
    return Boolean(email) && adminEmails.includes(email);
};

const isAdminClaim = async (user) => {
    try {
        if (!user) return false;
        const result = await getIdTokenResult(user, true);
        return Boolean(result?.claims?.admin);
    } catch {
        return false;
    }
};

    const requireConfigured = () => {
        if (!isConfigured() || !db) {
            setStatus(`<div class="notice">Firebase/Firestore is not configured. Update your local config.</div>`);
            return false;
        }
        return true;
    };

    const promptProduct = (initial = {}) => {
        const title = window.prompt("Title", initial.title ?? "");
        if (title === null) return null;
        const priceRaw = window.prompt("Price (number)", initial.price ?? "");
        if (priceRaw === null) return null;
        const category = window.prompt("Category (e.g. electronics)", initial.category ?? "featured");
        if (category === null) return null;
        const image = window.prompt("Image URL", initial.image ?? "");
        if (image === null) return null;
        const description = window.prompt("Description", initial.description ?? "");
        if (description === null) return null;

        const price = Number(priceRaw);
        if (!Number.isFinite(price) || price < 0) {
            showToast("Invalid price.", "error");
            return null;
        }

        return {
            title: String(title).trim(),
            price,
            category: String(category).trim().toLowerCase(),
            image: String(image).trim(),
            description: String(description).trim(),
        };
    };

    let allProducts = [];
    let queryText = "";

    const formatPrice = (value) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return "—";
        return number.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    };

    const render = () => {
        if (!productsBody) return;
        const q = queryText.trim().toLowerCase();
        const list = q
            ? allProducts.filter((p) => `${p.title} ${p.category}`.toLowerCase().includes(q))
            : allProducts;

        productsBody.innerHTML = "";
        const frag = document.createDocumentFragment();
        list.forEach((p) => {
            const tr = document.createElement("tr");
            tr.dataset.id = p.id;
            tr.innerHTML = `
                <td>
                    <div class="admin-prod">
                        <img class="admin-prod-img" alt="" />
                        <div>
                            <div class="admin-prod-title"></div>
                            <div class="admin-prod-sub">${p.id}</div>
                        </div>
                    </div>
                </td>
                <td class="td-cap">${p.category}</td>
                <td class="td-right">${formatPrice(p.price)}</td>
                <td class="td-right">${Number(p.ratingRate ?? 0).toFixed(1)} (${Number(p.ratingCount ?? 0)})</td>
                <td class="td-right">
                    <button class="btn btn--ghost btn--sm" type="button" data-edit>Edit</button>
                    <button class="btn btn--ghost btn--sm" type="button" data-delete>Delete</button>
                </td>
            `;
            const img = tr.querySelector("img");
            const titleEl = tr.querySelector(".admin-prod-title");
            if (img) {
                img.src = p.image || "";
                img.alt = p.title || "Product image";
                img.width = 80;
                img.height = 80;
            }
            if (titleEl) titleEl.textContent = p.title || "Product";
            frag.appendChild(tr);
        });
        productsBody.appendChild(frag);
        setStatus(list.length ? "" : `<div class="notice">No products found.</div>`);
    };

    const loadProducts = async () => {
        if (!requireConfigured()) return;
        setStatus(`<div class="notice">Loading products…</div>`);
        const snap = await getDocs(collection(db, "products"));
        const list = [];
        snap.forEach((d) => {
            const data = d.data() || {};
            list.push({
                id: d.id,
                title: String(data.title ?? ""),
                price: Number(data.price ?? 0),
                category: String(data.category ?? "featured"),
                image: String(data.image ?? ""),
                description: String(data.description ?? ""),
                ratingRate: Number(data.ratingRate ?? data.rating?.rate ?? 0),
                ratingCount: Number(data.ratingCount ?? data.rating?.count ?? 0),
            });
        });
        list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
        allProducts = list;
        render();
    };

    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        const allowed = (await isAdminClaim(user)) || isAdminUser(user);
        if (!allowed) {
            setStatus(`<div class="notice">You do not have access to admin. Contact the owner.</div>`);
            window.setTimeout(() => (window.location.href = "index.html"), 900);
            return;
        }
        await loadProducts();
    });

    searchInput?.addEventListener("input", () => {
        queryText = String(searchInput.value ?? "");
        render();
    });

    addBtn?.addEventListener("click", async () => {
        if (!requireConfigured()) return;
        const user = auth?.currentUser;
        const allowed = (await isAdminClaim(user)) || isAdminUser(user);
        if (!allowed) return;
        const next = promptProduct();
        if (!next) return;
        try {
            await addDoc(collection(db, "products"), {
                ...next,
                ratingRate: 0,
                ratingCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            showToast("Product added.", "success");
            await loadProducts();
        } catch {
            showToast("Failed to add product.", "error");
        }
    });

    productsBody?.addEventListener("click", async (event) => {
        const row = event.target.closest("tr[data-id]");
        if (!row) return;
        const id = String(row.dataset.id ?? "");
        const product = allProducts.find((p) => p.id === id);
        if (!product) return;

        const user = auth?.currentUser;
        const allowed = (await isAdminClaim(user)) || isAdminUser(user);
        if (!allowed) return;

        const edit = event.target.closest("[data-edit]");
        const del = event.target.closest("[data-delete]");
        if (edit) {
            const next = promptProduct(product);
            if (!next) return;
            try {
                await updateDoc(doc(db, "products", id), { ...next, updatedAt: serverTimestamp() });
                showToast("Product updated.", "success");
                await loadProducts();
            } catch {
                showToast("Failed to update product.", "error");
            }
        } else if (del) {
            const ok = window.confirm("Delete this product? This cannot be undone.");
            if (!ok) return;
            try {
                await deleteDoc(doc(db, "products", id));
                showToast("Product deleted.", "success");
                await loadProducts();
            } catch {
                showToast("Failed to delete product.", "error");
            }
        }
    });
});
