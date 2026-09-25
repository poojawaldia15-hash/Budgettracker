// ---------------------------------------------------------------
// Fill this in with your own Firebase project's config.
// Get it from: Firebase Console -> Project settings -> General ->
// "Your apps" -> Web app -> SDK setup and configuration -> Config
// ---------------------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// This is the single shared account everyone signs in as, behind the
// scenes, using the password entered on the login screen. Create this
// exact user (Authentication -> Users -> Add user) in the Firebase
// console and give the password to whoever should have access.
// See README.md for the full walkthrough.
const SHARED_LOGIN_EMAIL = "household@ledger.local";
