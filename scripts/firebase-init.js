import { firebaseConfig } from "./firebase-config.js";

const isConfigured = () => {
    if (!firebaseConfig || typeof firebaseConfig !== "object") return false;
    const key = String(firebaseConfig.apiKey ?? "").trim();
    const projectId = String(firebaseConfig.projectId ?? "").trim();
    return key && key !== "YOUR_API_KEY" && projectId && projectId !== "YOUR_PROJECT_ID";
};

let app = null;
let auth = null;
let db = null;

const firebaseUnavailable = (name) => {
    throw new Error(`[ShopSmart] Firebase SDK unavailable: ${name}`);
};

let createUserWithEmailAndPassword = (...args) => firebaseUnavailable("createUserWithEmailAndPassword");
let signInWithEmailAndPassword = (...args) => firebaseUnavailable("signInWithEmailAndPassword");
let onAuthStateChanged = (...args) => firebaseUnavailable("onAuthStateChanged");
let signOut = (...args) => firebaseUnavailable("signOut");
let updateProfile = (...args) => firebaseUnavailable("updateProfile");
let sendPasswordResetEmail = (...args) => firebaseUnavailable("sendPasswordResetEmail");
let getIdTokenResult = (...args) => firebaseUnavailable("getIdTokenResult");

let collection = (...args) => firebaseUnavailable("collection");
let getDocs = (...args) => firebaseUnavailable("getDocs");
let getDoc = (...args) => firebaseUnavailable("getDoc");
let addDoc = (...args) => firebaseUnavailable("addDoc");
let updateDoc = (...args) => firebaseUnavailable("updateDoc");
let deleteDoc = (...args) => firebaseUnavailable("deleteDoc");
let query = (...args) => firebaseUnavailable("query");
let where = (...args) => firebaseUnavailable("where");
let orderBy = (...args) => firebaseUnavailable("orderBy");
let limit = (...args) => firebaseUnavailable("limit");
let onSnapshot = (...args) => firebaseUnavailable("onSnapshot");
let doc = (...args) => firebaseUnavailable("doc");
let serverTimestamp = (...args) => firebaseUnavailable("serverTimestamp");
let runTransaction = (...args) => firebaseUnavailable("runTransaction");
let increment = (...args) => firebaseUnavailable("increment");

// Only load the Firebase CDN SDK when we have config, and never hard-fail app boot.
// IMPORTANT: Do not block module evaluation on network/CDN availability.
// This keeps the storefront usable (API/demo products) even when CDN access is blocked/offline.
const withTimeout = (promise, ms, label) =>
    Promise.race([
        promise,
        new Promise((_, reject) => window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
    ]);

let firebaseLoadPromise = null;

const loadFirebase = async () => {
    if (!isConfigured()) {
        // eslint-disable-next-line no-console
        console.warn("[ShopSmart] Firebase not configured. Update scripts/firebase-config.local.json");
        return false;
    }

    try {
        const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
            withTimeout(import("https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js"), 8000, "firebase-app"),
            withTimeout(import("https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js"), 8000, "firebase-auth"),
            withTimeout(import("https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js"), 8000, "firebase-firestore"),
        ]);

        app = initializeApp(firebaseConfig);
        auth = authMod.getAuth(app);
        db = firestoreMod.getFirestore(app);

        // Re-export bound functions from the loaded SDK modules.
        createUserWithEmailAndPassword = authMod.createUserWithEmailAndPassword;
        signInWithEmailAndPassword = authMod.signInWithEmailAndPassword;
        onAuthStateChanged = authMod.onAuthStateChanged;
        signOut = authMod.signOut;
        updateProfile = authMod.updateProfile;
        sendPasswordResetEmail = authMod.sendPasswordResetEmail;
        getIdTokenResult = authMod.getIdTokenResult;

        collection = firestoreMod.collection;
        getDocs = firestoreMod.getDocs;
        getDoc = firestoreMod.getDoc;
        addDoc = firestoreMod.addDoc;
        updateDoc = firestoreMod.updateDoc;
        deleteDoc = firestoreMod.deleteDoc;
        query = firestoreMod.query;
        where = firestoreMod.where;
        orderBy = firestoreMod.orderBy;
        limit = firestoreMod.limit;
        onSnapshot = firestoreMod.onSnapshot;
        doc = firestoreMod.doc;
        serverTimestamp = firestoreMod.serverTimestamp;
        runTransaction = firestoreMod.runTransaction;
        increment = firestoreMod.increment;

        // Keep users logged in across refreshes by default.
        await authMod.setPersistence(auth, authMod.browserLocalPersistence);

        return true;
    } catch (err) {
        app = null;
        auth = null;
        db = null;
        // eslint-disable-next-line no-console
        console.warn("[ShopSmart] Firebase SDK failed to load; continuing without Firebase.", err);
        return false;
    }
};

const ensureFirebase = () => {
    if (!firebaseLoadPromise) firebaseLoadPromise = loadFirebase();
    return firebaseLoadPromise;
};

// Kick off loading in the background when configured, but don't await it.
if (isConfigured()) {
    void ensureFirebase();
}

export {
    app,
    auth,
    db,
    isConfigured,
    ensureFirebase,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
    getIdTokenResult,
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    serverTimestamp,
    runTransaction,
    increment,
};
