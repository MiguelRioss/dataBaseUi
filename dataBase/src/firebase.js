  // src/firebase.js
  import { initializeApp } from "firebase/app";
  import {
    getAuth,
    onAuthStateChanged,   // <-- you were missing this import
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
  } from "firebase/auth";
  import { getDatabase } from "firebase/database";

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FB_API_KEY,
    authDomain: "storageproducts-bbe30.firebaseapp.com",
    databaseURL:
      "https://storageproducts-bbe30-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "storageproducts-bbe30",
    storageBucket: "storageproducts-bbe30.firebasestorage.app",
    messagingSenderId: "878194109069",
    appId: "1:878194109069:web:56ff48f9c87e6ddca950c4",
  };

  const app = initializeApp(firebaseConfig);

  export const auth = getAuth(app);
  export const db   = getDatabase(app);

  // Small helpers
  export const onUser  = (cb) => onAuthStateChanged(auth, cb);
  export const logout  = () => signOut(auth);

  export const provider = new GoogleAuthProvider();
  export const signInWithGoogle = () => signInWithPopup(auth, provider);
  export const signInWithEmail  = (email, pass) =>
    signInWithEmailAndPassword(auth, email, pass);
