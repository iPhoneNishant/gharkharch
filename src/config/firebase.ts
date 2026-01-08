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

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGtnSJTZenpmyPqoTiKi3Ks4nlVwL1WaI",
  authDomain: "gharkharch-d36dc.firebaseapp.com",
  projectId: "gharkharch-d36dc",
  storageBucket: "gharkharch-d36dc.firebasestorage.app",
  messagingSenderId: "360598936824",
  appId: "1:360598936824:web:d5bc8077917dc5afb12f0d",
  measurementId: "G-BQH7R1R68B"
};

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
