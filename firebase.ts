import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyANLDNhWYWCmCz1aGspz-suFWOW2nn92C0",
  authDomain: "cinematch-db70a.firebaseapp.com",
  projectId: "cinematch-db70a",
  storageBucket: "cinematch-db70a.firebasestorage.app",
  messagingSenderId: "944423906766",
  appId: "1:944423906766:web:d27fd57cd698a188f08f9f",
  measurementId: "G-LMRPHNVS53"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);