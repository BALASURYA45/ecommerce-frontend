import { auth, ensureFirebase, isConfigured, onAuthStateChanged, signOut, getIdTokenResult } from "./firebase-init.js";

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

const isAdminViaClaims = async (user) => {
    try {
        if (!user) return false;
        const result = await getIdTokenResult(user, true);
        return Boolean(result?.claims?.admin);
    } catch {
        return false;
    }
};

const updateAuthUi = (user) => {
    const loggedIn = Boolean(user);
    document.querySelectorAll("[data-auth-login]").forEach((el) => {
        el.classList.toggle("is-hidden", loggedIn);
        el.hidden = loggedIn;
    });
    document.querySelectorAll("[data-auth-logout]").forEach((el) => {
        el.classList.toggle("is-hidden", !loggedIn);
        el.hidden = !loggedIn;
    });
    document.querySelectorAll("[data-auth-user]").forEach((el) => {
        el.classList.toggle("is-hidden", !loggedIn);
        el.hidden = !loggedIn;
        if (!loggedIn) return;
        const label = user?.displayName || user?.email || "Account";
        el.textContent = String(label);
    });
};

const wireLogout = () => {
    document.querySelectorAll("[data-auth-logout]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!isConfigured()) return;
            await ensureFirebase();
            if (!auth) return;
            try {
                await signOut(auth);
            } finally {
                window.location.href = "login.html";
            }
        });
    });
};

wireLogout();

const hideAdminLinks = () => {
    document.querySelectorAll("[data-admin-link]").forEach((el) => {
        el.classList.add("is-hidden");
        el.hidden = true;
    });
};

const boot = async () => {
    if (!isConfigured()) {
        updateAuthUi(null);
        hideAdminLinks();
        return;
    }

    // Important: don't block other modules (like product loading) on Firebase CDN availability.
    await ensureFirebase();
    if (!auth) {
        updateAuthUi(null);
        hideAdminLinks();
        return;
    }

    const adminEmails = await readAdminEmails();

    const updateAdminUi = (user) => {
        void (async () => {
            const email = String(user?.email ?? "").toLowerCase().trim();
            const allowlistAdmin = Boolean(email) && adminEmails.includes(email);
            const claimAdmin = await isAdminViaClaims(user);
            const isAdmin = claimAdmin || allowlistAdmin;
            document.querySelectorAll("[data-admin-link]").forEach((el) => {
                el.classList.toggle("is-hidden", !isAdmin);
                el.hidden = !isAdmin;
            });
        })();
    };

    onAuthStateChanged(auth, (user) => {
        updateAuthUi(user);
        updateAdminUi(user);

        const requireAuth = document.body?.hasAttribute("data-require-auth");
        if (requireAuth && !user) window.location.href = "login.html";
    });
};

void boot();
