import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKTh4rRphCZ_cXymXswfeqbEMynUsu6A8",
  authDomain: "struna-sound.firebaseapp.com",
  projectId: "struna-sound",
  storageBucket: "struna-sound.firebasestorage.app",
  messagingSenderId: "505415978328",
  appId: "1:505415978328:web:74a40b474f1de0b7fe692d",
  measurementId: "G-P1CZXYS DTQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);