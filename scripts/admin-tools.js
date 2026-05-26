import { auth, onAuthStateChanged, getIdTokenResult } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
    const lookupForm = document.querySelector("[data-lookup-form]");
    const lookupResult = document.querySelector("[data-lookup-result]");
    const claimForm = document.querySelector("[data-claim-form]");
    const claimResult = document.querySelector("[data-claim-result]");
    const status = document.querySelector("[data-tools-status]");
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());

    const setStatus = (html) => {
        if (!status) return;
        status.innerHTML = html ?? "";
    };

    const setResult = (el, html) => {
        if (!el) return;
        el.hidden = !html;
        el.innerHTML = html ?? "";
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

    const apiBase = () => {
        const forced = String(globalThis?.__SHOPSMART_API_BASE__ ?? "").trim();
        if (forced) return forced.replace(/\/+$/, "");
        const host = window.location.hostname;
        const isLocal = host === "localhost" || host === "127.0.0.1";
        return isLocal ? "http://localhost:8787" : "";
    };

    const apiPost = async (path, body, token) => {
        const res = await fetch(`${apiBase()}${path}`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-admin-token": String(token ?? "").trim(),
            },
            body: JSON.stringify(body ?? {}),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String(data?.error || `Request failed (${res.status})`));
        return data;
    };

    const isAdmin = async (user) => {
        try {
            if (!user) return false;
            const result = await getIdTokenResult(user, true);
            return Boolean(result?.claims?.admin);
        } catch {
            return false;
        }
    };

    onAuthStateChanged(auth, (user) => {
        void (async () => {
            if (!user) return;
            const ok = await isAdmin(user);
            if (!ok) {
                setStatus(`<div class="notice">Admin claim required to use these tools.</div>`);
                window.setTimeout(() => (window.location.href = "index.html"), 900);
            }
        })();
    });

    lookupForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus("");
        setResult(lookupResult, "");

        const form = new FormData(lookupForm);
        const email = String(form.get("email") ?? "").trim();
        if (!email) return;

        const token = String(document.querySelector("#claim-token")?.value ?? "").trim();
        if (!token) {
            showToast("Enter the admin token (right form).", "error");
            return;
        }

        try {
            const data = await apiPost("/api/admin/lookup-user", { email }, token);
            const claims = JSON.stringify(data?.claims ?? {});
            setResult(
                lookupResult,
                `<div class="notice">UID: <code>${data.uid}</code><br/>Email: <code>${data.email}</code><br/>Claims: <code>${claims}</code></div>`
            );
            const uidInput = document.querySelector("#claim-uid");
            if (uidInput && data?.uid) uidInput.value = String(data.uid);
        } catch (err) {
            setStatus(`<div class="notice">${String(err?.message || "Lookup failed.")}</div>`);
            showToast("Lookup failed.", "error");
        }
    });

    claimForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus("");
        setResult(claimResult, "");

        const form = new FormData(claimForm);
        const uid = String(form.get("uid") ?? "").trim();
        const adminValue = String(form.get("admin") ?? "false") === "true";
        const token = String(form.get("token") ?? "").trim();
        if (!uid || !token) return;

        try {
            const data = await apiPost("/api/admin/set-admin-claim", { uid, admin: adminValue }, token);
            setResult(
                claimResult,
                `<div class="notice">Updated: <code>${data.uid}</code> admin=<code>${String(data.admin)}</code></div>`
            );
            showToast("Claim updated.", "success");
        } catch (err) {
            setStatus(`<div class="notice">${String(err?.message || "Update failed.")}</div>`);
            showToast("Update failed.", "error");
        }
    });
});

