const boot = () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");

    const hasNav = Boolean(header && hamburger && mobileMenu);

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

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());

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

    const contactForm = document.querySelector(".form-card");
    if (contactForm) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();
            showToast("Thanks! We received your message (demo).", "success");
            contactForm.reset();
        });
    }

    searchForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            const input = form.querySelector("input[type='search']");
            const query = input?.value?.trim() ?? "";
            if (!query) return;
            event.preventDefault();
            const url = new URL("products.html", window.location.href);
            url.searchParams.set("q", query);
            window.location.href = url.toString();
        });
    });
};

boot();

