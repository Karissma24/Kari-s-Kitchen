// Online storage settings for Kari's Kitchen. See SETUP.md for how to fill this in.
//
// If these are ever blanked out, recipes go back to being saved in the browser only.
// These values are safe to put on GitHub: Firebase's security rules (firestore.rules)
// are what stop anyone except you from changing recipes.

window.KARIS_KITCHEN_FIREBASE = {
  // The Google account you'll sign in with to add and edit recipes.
  ownerEmail: "karissma.quinones2004@gmail.com",

  // Paste the values from Firebase → Project settings → Your apps → SDK setup and configuration.
  firebase: {
    apiKey: "AIzaSyCf2a0K2kd9wAPGBoY4mdLA-zScm8yE_nk",
    authDomain: "kari-s-kitchen.firebaseapp.com",
    projectId: "kari-s-kitchen",
    storageBucket: "kari-s-kitchen.firebasestorage.app",
    messagingSenderId: "328110238439",
    appId: "1:328110238439:web:e09c53faac43cd6a88d042",
  },
};
