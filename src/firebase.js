// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔐 Replace this with your config from the Firebase console
const firebaseConfig = {
    apiKey: "AIzaSyAiLh1yeUsl4u79aOswPTQTFFuDd7xpzW0",
    authDomain: "citynotes-618a9.firebaseapp.com",
    projectId: "citynotes-618a9",
    storageBucket: "citynotes-618a9.firebasestorage.app",
    messagingSenderId: "656838982798",
    appId: "1:656838982798:web:503ed16f3c06e3ba161ddf"
  };
  
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };