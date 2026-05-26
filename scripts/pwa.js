const isLocalFile = window.location.protocol === "file:";

if ("serviceWorker" in navigator && !isLocalFile) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {
            // ignore SW registration failures (unsupported host, private mode, etc.)
        });
    });
}

