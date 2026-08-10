// ============================================================
//  FIREBASE CONFIG — paste your new Firebase project keys here.
//
//  1. Go to https://console.firebase.google.com and create a project.
//  2. Add a Web app (the </> icon) and copy the config object.
//  3. Paste the values below, replacing the YOUR_... placeholders.
//  4. Enable Firestore and deploy the rules in firestore.rules
//     (or apply them in the console: Firestore > Rules).
//
//  Until real keys are added, the app works fully in "local mode"
//  (registrations and completed days are saved on each phone).
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export function isFirebaseConfigured() {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY");
}
