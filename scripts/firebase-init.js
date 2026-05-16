import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const isConfigured = () => {
    if (!firebaseConfig || typeof firebaseConfig !== "object") return false;
    const key = String(firebaseConfig.apiKey ?? "").trim();
    const projectId = String(firebaseConfig.projectId ?? "").trim();
    return key && key !== "YOUR_API_KEY" && projectId && projectId !== "YOUR_PROJECT_ID";
};

let app = null;
let auth = null;

if (isConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Keep users logged in across refreshes by default.
    // (Default is already local persistence for web, but we set it explicitly.)
    await setPersistence(auth, browserLocalPersistence);
} else {
    // eslint-disable-next-line no-console
    console.warn("[ShopSmart] Firebase not configured. Update scripts/firebase-config.js");
}

export {
    app,
    auth,
    isConfigured,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
};

