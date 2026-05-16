document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");
    const cartCount = document.querySelector("#cart-count");
    const year = document.querySelector("[data-year]");

    const cartApi = window.ShopSmartCart;
    if (cartApi && cartCount) {
        const updateCartBadge = () => {
            cartCount.textContent = String(cartApi.getCount());
            const badge = cartCount.closest(".badge");
            badge?.classList.remove("is-bump");
            window.requestAnimationFrame(() => badge?.classList.add("is-bump"));
        };
        updateCartBadge();
        cartApi.onChange(updateCartBadge);
    }

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

    const AUTH_USERS_KEY = "ss_users_v1";
    const AUTH_SESSION_KEY = "ss_session_v1";

    const safeParse = (raw) => {
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    };

    const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

    const readUsers = () => {
        const parsed = safeParse(window.localStorage.getItem(AUTH_USERS_KEY));
        if (!isObject(parsed) || !isObject(parsed.users)) return { users: {} };
        return { users: parsed.users };
    };

    const writeUsers = (next) => {
        try {
            window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(next));
        } catch {
            // ignore
        }
    };

    const writeSession = (email) => {
        try {
            window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ email, ts: Date.now() }));
        } catch {
            // ignore
        }
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
        // 0..4 -> 0..3 levels
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

    const wireForgot = (scope) => {
        const link = scope.querySelector("[data-forgot]");
        if (!link) return;
        link.addEventListener("click", (event) => {
            event.preventDefault();
            showToast("Password recovery is a demo placeholder.", "default");
        });
    };

    const wireLogin = (form) => {
        const emailInput = form.querySelector("input[name='email']");
        const passInput = form.querySelector("input[name='password']");

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

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            setStatus(form, "");
            if (!validate()) return;

            const email = normalizeEmail(emailInput?.value);
            const pass = String(passInput?.value ?? "");
            const { users } = readUsers();
            const existing = users[email];

            if (!existing) {
                setStatus(form, "No account found for this email. Please sign up.", "error");
                return;
            }

            // Demo-only: store plaintext. Replace with backend hashing in real app.
            if (String(existing.password ?? "") !== pass) {
                setStatus(form, "Incorrect password. Try again.", "error");
                return;
            }

            writeSession(email);
            setStatus(form, "Logged in successfully. Redirecting…", "success");
            showToast("Welcome back!", "success");
            window.setTimeout(() => {
                window.location.href = "index.html";
            }, 700);
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

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            setStatus(form, "");
            if (!validate()) return;

            const name = normalizeName(nameInput?.value);
            const email = normalizeEmail(emailInput?.value);
            const pass = String(passInput?.value ?? "");

            const store = readUsers();
            const existing = store.users[email];
            if (existing) {
                setStatus(form, "An account with this email already exists. Try logging in.", "error");
                return;
            }

            store.users[email] = { name, email, password: pass, createdAt: Date.now() };
            writeUsers(store);
            writeSession(email);
            setStatus(form, "Account created. Redirecting…", "success");
            showToast("Account created!", "success");
            window.setTimeout(() => {
                window.location.href = "index.html";
            }, 800);
        });
    };

    document.querySelectorAll("[data-auth-form]").forEach((form) => {
        const mode = form.getAttribute("data-auth-form");
        wirePasswordToggles(form);
        wireForgot(form);
        if (mode === "login") wireLogin(form);
        if (mode === "signup") wireSignup(form);
    });
});

