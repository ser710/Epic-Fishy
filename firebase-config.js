// Paste YOUR Firebase project's config below.
// Find it at: Firebase console → ⚙️ Project settings → scroll to "Your apps" →
// click your web app (or click </> to register one if you haven't yet).
//
// Until you replace the placeholder apiKey below, Community features stay
// switched off and the rest of the app works exactly as before.

<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDk5Kpl7TZhxFhfTuAo7SH7QyUPN7oUIrw",
    authDomain: "epic-fishy.firebaseapp.com",
    databaseURL: "https://epic-fishy-default-rtdb.firebaseio.com",
    projectId: "epic-fishy",
    storageBucket: "epic-fishy.firebasestorage.app",
    messagingSenderId: "362455123000",
    appId: "1:362455123000:web:19eaa143abff79b18112cd"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>
