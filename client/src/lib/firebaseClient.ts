import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function getEnv(name: string): string | undefined {
  const value = (import.meta as any).env?.[name];
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    getEnv("VITE_FIREBASE_API_KEY") &&
      getEnv("VITE_FIREBASE_AUTH_DOMAIN") &&
      getEnv("VITE_FIREBASE_PROJECT_ID") &&
      getEnv("VITE_FIREBASE_APP_ID")
  );
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (getApps().length) return getApps()[0]!;

  const firebaseConfig = {
    apiKey: getEnv("VITE_FIREBASE_API_KEY")!,
    authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN")!,
    projectId: getEnv("VITE_FIREBASE_PROJECT_ID")!,
    storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnv("VITE_FIREBASE_APP_ID")!,
  };

  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

export function getFirebaseDb() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}
