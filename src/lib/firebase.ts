import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyDlR0FsebkaCHLyBbhthrZCFEIn1lUPFbA",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "snitch-f54ea.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "snitch-f54ea",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "snitch-f54ea.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "473867035166",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:473867035166:web:7be058f4dcbeac816f840f",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-KWGNXLWYWN",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();

export const firebaseAnalytics: Promise<Analytics | null> =
  typeof window === "undefined"
    ? Promise.resolve(null)
    : isSupported().then((supported) =>
        supported ? getAnalytics(firebaseApp) : null,
      );

export function signInWithGoogle() {
  return signInWithPopup(firebaseAuth, googleAuthProvider);
}

export function signOutOfGoogle() {
  return signOut(firebaseAuth);
}
