console.log("E-Commerce Website Loaded");

document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("[data-header]");
    const hamburger = document.querySelector("[data-hamburger]");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const searchForms = document.querySelectorAll("form.search");

    if (!header || !hamburger || !mobileMenu) return;

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

    searchForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const input = form.querySelector("input[type='search']");
            const query = input?.value?.trim() ?? "";
            if (query) console.log("Search:", query);
        });
    });
});
