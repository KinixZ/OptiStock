// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDXicrYACQFQ-YDXRh-TT_126Vm-owkRh8",
  authDomain: "optistock-pr0j3ct.firebaseapp.com",
  projectId: "optistock-pr0j3ct",
  storageBucket: "optistock-pr0j3ct.firebasestorage.app",
  messagingSenderId: "275592028198",
  appId: "1:275592028198:web:eadf80e8d1dd9cf58506e7",
  measurementId: "G-15XL92YG40"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;