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

    const popularSuggestions = [
        { title: "Kids toys", category: "Toys", query: "kids toys" },
        { title: "Mens clothing", category: "Fashion", query: "men" },
        { title: "Womens clothing", category: "Fashion", query: "women" },
        { title: "Electronics deals", category: "Electronics", query: "electronics" },
        { title: "Backpacks", category: "Travel", query: "backpack" },
        { title: "Smart watches", category: "Gadgets", query: "watch" },
        { title: "Shoes", category: "Fashion", query: "shoes" },
        { title: "Beauty products", category: "Beauty", query: "beauty" },
    ];

    const goToProducts = (query) => {
        const value = String(query ?? "").trim();
        if (!value) return;
        const url = new URL("products.html", window.location.href);
        url.searchParams.set("q", value);
        window.location.href = url.toString();
    };

    const setupAutocomplete = (form) => {
        const input = form.querySelector("input[type='search']");
        if (!input) return;

        form.classList.add("search--suggest");
        const panel = document.createElement("div");
        panel.className = "search-suggestions";
        panel.setAttribute("role", "listbox");
        panel.hidden = true;
        form.appendChild(panel);

        let activeIndex = -1;
        let currentItems = [];

        const close = () => {
            panel.hidden = true;
            panel.innerHTML = "";
            activeIndex = -1;
            currentItems = [];
        };

        const render = () => {
            panel.innerHTML = "";
            currentItems.forEach((item, index) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = `search-suggestion${index === activeIndex ? " is-active" : ""}`;
                button.setAttribute("role", "option");
                button.innerHTML = `
                    <span class="suggestion-icon" aria-hidden="true"></span>
                    <span class="suggestion-copy">
                        <strong></strong>
                        <small></small>
                    </span>
                `;
                button.querySelector("strong").textContent = item.title;
                button.querySelector("small").textContent = item.category;
                button.addEventListener("mousedown", (event) => {
                    event.preventDefault();
                    goToProducts(item.query);
                });
                panel.appendChild(button);
            });
            panel.hidden = currentItems.length === 0;
        };

        const update = () => {
            const query = input.value.trim().toLowerCase();
            currentItems = popularSuggestions
                .filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query))
                .slice(0, 6);
            if (!query) currentItems = popularSuggestions.slice(0, 6);
            activeIndex = -1;
            render();
        };

        input.addEventListener("input", update);
        input.addEventListener("focus", update);
        input.addEventListener("keydown", (event) => {
            if (panel.hidden || currentItems.length === 0) return;
            if (event.key === "ArrowDown") {
                event.preventDefault();
                activeIndex = (activeIndex + 1) % currentItems.length;
                render();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                activeIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
                render();
            } else if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault();
                goToProducts(currentItems[activeIndex].query);
            } else if (event.key === "Escape") {
                close();
            }
        });
        input.addEventListener("blur", () => window.setTimeout(close, 120));
    };

    searchForms.forEach(setupAutocomplete);

    searchForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            const input = form.querySelector("input[type='search']");
            const query = input?.value?.trim() ?? "";
            if (!query) return;
            event.preventDefault();
            goToProducts(query);
        });
    });

};

boot();
