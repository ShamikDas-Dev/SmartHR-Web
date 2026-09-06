// Firebase App
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

// Firebase Authentication
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

// Firebase Firestore
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Firebase Storage
import {
    getStorage
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// Export everything we need
export {
    app,
    auth,
    db,
    storage,

    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,

    doc,
    getDoc
};