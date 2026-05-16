import {
    auth,
    isConfigured,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
} from "./firebase-init.js";

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

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const normalizeName = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());

const passwordRules = (password) => {
    const value = String(password ?? "");
    const minLen = value.length >= 8;
    const upper = /[A-Z]/.test(value);
    const lower = /[a-z]/.test(value);
    const number = /\d/.test(value);
    return { minLen, upper, lower, number };
};

const isStrongPassword = (password) => {
    const rules = passwordRules(password);
    return rules.minLen && rules.upper && rules.lower && rules.number;
};

const scorePassword = (password) => {
    const rules = passwordRules(password);
    const score = [rules.minLen, rules.upper, rules.lower, rules.number].filter(Boolean).length;
    if (score <= 1) return { level: 0, label: "Weak" };
    if (score === 2) return { level: 1, label: "Fair" };
    if (score === 3) return { level: 2, label: "Good" };
    return { level: 3, label: "Strong" };
};

const setError = (form, field, message) => {
    const el = form.querySelector(`[data-error-for="${field}"]`);
    if (!el) return;
    el.textContent = message ?? "";
    el.classList.toggle("is-visible", Boolean(message));
};

const setStatus = (form, message, variant = "default") => {
    const el = form.querySelector("[data-auth-status]");
    if (!el) return;
    el.textContent = message ?? "";
    el.dataset.variant = variant;
};

const wirePasswordToggles = (scope) => {
    scope.querySelectorAll("[data-toggle-password]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const wrap = btn.closest(".field-password");
            const input = wrap?.querySelector("input");
            if (!input) return;
            const nextType = input.type === "password" ? "text" : "password";
            input.type = nextType;
            btn.textContent = nextType === "password" ? "Show" : "Hide";
            btn.setAttribute("aria-label", nextType === "password" ? "Show password" : "Hide password");
        });
    });
};

const friendlyAuthError = (code) => {
    const c = String(code ?? "");
    if (c.includes("auth/invalid-email")) return "Enter a valid email address.";
    if (c.includes("auth/missing-password")) return "Password is required.";
    if (c.includes("auth/invalid-credential")) return "Incorrect email or password.";
    if (c.includes("auth/email-already-in-use")) return "This email is already registered. Try logging in.";
    if (c.includes("auth/weak-password")) return "Password is too weak. Use 8+ chars with upper/lower + number.";
    if (c.includes("auth/too-many-requests")) return "Too many attempts. Please try again later.";
    if (c.includes("auth/network-request-failed")) return "Network error. Check your connection and try again.";
    if (c.includes("auth/configuration-not-found")) return "Firebase configuration is missing or invalid.";
    return "Something went wrong. Please try again.";
};

const ensureFirebaseReady = (form) => {
    if (isConfigured() && auth) return true;
    setStatus(form, "Firebase is not configured yet. Update scripts/firebase-config.js.", "error");
    return false;
};

const wireLogin = (form) => {
    const emailInput = form.querySelector("input[name='email']");
    const passInput = form.querySelector("input[name='password']");
    const forgot = form.querySelector("[data-forgot]");

    const validate = () => {
        const email = normalizeEmail(emailInput?.value);
        const pass = String(passInput?.value ?? "");
        let ok = true;

        if (!email) {
            setError(form, "email", "Email is required.");
            ok = false;
        } else if (!isValidEmail(email)) {
            setError(form, "email", "Enter a valid email address.");
            ok = false;
        } else {
            setError(form, "email", "");
        }

        if (!pass) {
            setError(form, "password", "Password is required.");
            ok = false;
        } else {
            setError(form, "password", "");
        }

        return ok;
    };

    emailInput?.addEventListener("input", validate);
    passInput?.addEventListener("input", validate);

    forgot?.addEventListener("click", async (event) => {
        event.preventDefault();
        if (!ensureFirebaseReady(form)) return;

        const email = normalizeEmail(emailInput?.value);
        if (!email || !isValidEmail(email)) {
            setError(form, "email", "Enter your email to reset password.");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            showToast("Password reset email sent.", "success");
        } catch (err) {
            showToast(friendlyAuthError(err?.code), "default");
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus(form, "");
        if (!ensureFirebaseReady(form)) return;
        if (!validate()) return;

        const email = normalizeEmail(emailInput?.value);
        const pass = String(passInput?.value ?? "");

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            setStatus(form, "Logged in successfully. Redirecting…", "success");
            showToast("Welcome back!", "success");
            window.setTimeout(() => {
                window.location.href = "index.html";
            }, 650);
        } catch (err) {
            setStatus(form, friendlyAuthError(err?.code), "error");
        }
    });
};

const wireSignup = (form) => {
    const nameInput = form.querySelector("input[name='name']");
    const emailInput = form.querySelector("input[name='email']");
    const passInput = form.querySelector("input[name='password']");
    const confirmInput = form.querySelector("input[name='confirm']");
    const strengthBar = form.querySelector("[data-strength-bar]");
    const strengthText = form.querySelector("[data-strength-text]");

    const updateStrength = () => {
        const value = String(passInput?.value ?? "");
        const { level, label } = scorePassword(value);
        if (strengthBar) strengthBar.dataset.level = String(level);
        if (strengthText) strengthText.textContent = value ? `Strength: ${label}` : "Use 8+ chars with upper/lower + number";
    };

    const validate = () => {
        const name = normalizeName(nameInput?.value);
        const email = normalizeEmail(emailInput?.value);
        const pass = String(passInput?.value ?? "");
        const confirm = String(confirmInput?.value ?? "");
        let ok = true;

        if (!name) {
            setError(form, "name", "Full name is required.");
            ok = false;
        } else if (name.length < 2) {
            setError(form, "name", "Name looks too short.");
            ok = false;
        } else {
            setError(form, "name", "");
        }

        if (!email) {
            setError(form, "email", "Email is required.");
            ok = false;
        } else if (!isValidEmail(email)) {
            setError(form, "email", "Enter a valid email address.");
            ok = false;
        } else {
            setError(form, "email", "");
        }

        if (!pass) {
            setError(form, "password", "Password is required.");
            ok = false;
        } else if (!isStrongPassword(pass)) {
            setError(form, "password", "Use 8+ chars including uppercase, lowercase, and a number.");
            ok = false;
        } else {
            setError(form, "password", "");
        }

        if (!confirm) {
            setError(form, "confirm", "Please confirm your password.");
            ok = false;
        } else if (confirm !== pass) {
            setError(form, "confirm", "Passwords do not match.");
            ok = false;
        } else {
            setError(form, "confirm", "");
        }

        return ok;
    };

    nameInput?.addEventListener("input", validate);
    emailInput?.addEventListener("input", validate);
    passInput?.addEventListener("input", () => {
        updateStrength();
        validate();
    });
    confirmInput?.addEventListener("input", validate);

    updateStrength();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus(form, "");
        if (!ensureFirebaseReady(form)) return;
        if (!validate()) return;

        const name = normalizeName(nameInput?.value);
        const email = normalizeEmail(emailInput?.value);
        const pass = String(passInput?.value ?? "");

        try {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            if (name) {
                try {
                    await updateProfile(cred.user, { displayName: name });
                } catch {
                    // ignore profile failures
                }
            }
            setStatus(form, "Account created. Redirecting…", "success");
            showToast("Account created!", "success");
            window.setTimeout(() => {
                window.location.href = "index.html";
            }, 750);
        } catch (err) {
            setStatus(form, friendlyAuthError(err?.code), "error");
        }
    });
};

document.querySelectorAll("[data-auth-form]").forEach((form) => {
    const mode = form.getAttribute("data-auth-form");
    wirePasswordToggles(form);
    if (mode === "login") wireLogin(form);
    if (mode === "signup") wireSignup(form);
});

