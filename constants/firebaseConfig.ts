// constants/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace with your Firebase credentials
const firebaseConfig = {
    apiKey: "AIzaSyBxEuIZ8l1lFh4na28zij_K14o6WZTLMoI",
    authDomain: "notify-3aa60.firebaseapp.com",
    projectId: "notify-3aa60",
    storageBucket: "notify-3aa60.firebasestorage.app",
    messagingSenderId: "295424596835",
    appId: "1:295424596835:web:487fac610225cbba645156"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
