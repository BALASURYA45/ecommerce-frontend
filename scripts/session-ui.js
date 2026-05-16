import { auth, isConfigured, onAuthStateChanged, signOut } from "./firebase-init.js";

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
            if (!isConfigured() || !auth) return;
            try {
                await signOut(auth);
            } finally {
                window.location.href = "login.html";
            }
        });
    });
};

wireLogout();

if (isConfigured() && auth) {
    onAuthStateChanged(auth, (user) => {
        updateAuthUi(user);

        const requireAuth = document.body?.hasAttribute("data-require-auth");
        if (requireAuth && !user) window.location.href = "login.html";
    });
} else {
    // Firebase not configured: keep "Login" visible and hide logout/user.
    updateAuthUi(null);
}
