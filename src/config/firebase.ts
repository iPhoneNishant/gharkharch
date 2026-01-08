/**
 * Firebase Configuration for Gharkharch
 * 
 * IMPORTANT: Replace these placeholder values with your actual Firebase config
 * 
 * Steps to get your Firebase config:
 * 1. Go to Firebase Console (https://console.firebase.google.com)
 * 2. Select your project (or create a new one)
 * 3. Click the gear icon (⚙️) > Project Settings
 * 4. Scroll down to "Your apps" section
 * 5. Click "Add app" and select "Web" (</>) - NOT iOS or Android
 * 6. Register your app with a name (e.g., "gharkharch-web")
 * 7. Copy the firebaseConfig object and paste it below
 * 
 * Note: For React Native/Expo apps, you MUST use the Web app configuration,
 * not the iOS or Android app configurations.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  Auth,
  // @ts-expect-error - getReactNativePersistence is exported but not in types
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from environment variables
// Create a .env file in the root directory with your Firebase config
// See .env.example for the required variables

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// Validate that required config values are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "⚠️ Firebase configuration is missing!\n" +
    "Please create a .env file with your Firebase credentials.\n" +
    "See .env.example for the required variables."
  );
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

/**
 * Initialize Firebase services
 * Uses singleton pattern to prevent multiple initializations
 */
export const initializeFirebase = (): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
} => {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    
    // Initialize Auth with React Native persistence
    // Use try-catch to handle case where auth might already be initialized
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (error: any) {
      // If auth is already initialized, get the existing instance
      if (error?.code === 'auth/already-initialized' || error?.message?.includes('already initialized')) {
        auth = getAuth(app);
      } else {
        console.error('Firebase Auth initialization error:', error);
        throw error;
      }
    }
    
    db = getFirestore(app);
    // Cloud Functions v2 default region is us-central1
    // If you deployed to a different region, specify it here:
    // functions = getFunctions(app, 'asia-south1');
    functions = getFunctions(app);
  } else {
    app = getApps()[0];
    // Try to get auth first, if it fails, initialize it
    try {
      auth = getAuth(app);
    } catch (error: any) {
      // If getAuth fails, try to initialize auth with persistence
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch (initError: any) {
        // If initializeAuth also fails, try getAuth again (might work after initialization attempt)
        if (initError?.code === 'auth/already-initialized' || initError?.message?.includes('already initialized')) {
          auth = getAuth(app);
        } else {
          console.error('Firebase Auth initialization error:', initError);
          throw initError;
        }
      }
    }
    db = getFirestore(app);
    // Cloud Functions v2 default region is us-central1
    // If you deployed to a different region, specify it here:
    // functions = getFunctions(app, 'asia-south1');
    functions = getFunctions(app);
  }

  return { app, auth, db, functions };
};

// Initialize on import
const firebase = initializeFirebase();

export { firebase };
export const firebaseAuth = firebase.auth;
export const firestore = firebase.db;
export const cloudFunctions = firebase.functions;
