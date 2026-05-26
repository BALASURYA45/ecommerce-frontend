// Firebase Console → Project settings → General → Your apps → SDK setup and configuration.
// Note: This project uses Firebase via CDN ES modules in `scripts/firebase-init.js`.
// IMPORTANT:
// Keep real Firebase config out of git if your repo/security policy treats it as a secret.
// Provide config at runtime via either:
// - `globalThis.__SHOPSMART_FIREBASE_CONFIG__ = {...}` (see `firebase-config.local.example.js`), OR
// - `scripts/firebase-config.local.json` (see `firebase-config.local.json.example`).

const fallbackConfig = {
    apiKey: "AIzaSyBX-kgvl3x6s6sfEj2L_vBvenVEd8IecpU",
    authDomain: "e-commerce-a8b89.firebaseapp.com",
    projectId: "e-commerce-a8b89",
    storageBucket: "e-commerce-a8b89.firebasestorage.app",
    messagingSenderId: "935015063478",
    appId: "1:935015063478:web:3ba60c53c2161930baeb17",
    measurementId: "G-PFE2T4MDKH",
};

const runtimeConfig = globalThis?.__SHOPSMART_FIREBASE_CONFIG__;

const readLocalJsonConfig = async () => {
    try {
        const url = new URL("./firebase-config.local.json", import.meta.url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        return data && typeof data === "object" ? data : null;
    } catch {
        return null;
    }
};

const localJsonConfig = await readLocalJsonConfig();

export const firebaseConfig =
    runtimeConfig && typeof runtimeConfig === "object"
        ? { ...fallbackConfig, ...runtimeConfig }
        : localJsonConfig
          ? { ...fallbackConfig, ...localJsonConfig }
          : fallbackConfig;
