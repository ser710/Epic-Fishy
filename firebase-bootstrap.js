import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, getDoc, getDocs, getCountFromServer,
  query, orderBy, limit, serverTimestamp, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const NICKNAME_KEY = "tackle-community-nickname";
const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

window.communityAPI = {
  ready: false,
  configured: isConfigured,
  uid: null,
};

function nickname() {
  return localStorage.getItem(NICKNAME_KEY) || "Angler";
}

function weightToLb(weight, unit) {
  const w = Number(weight);
  if (!weight || Number.isNaN(w)) return 0;
  return unit === "kg" ? w * 2.20462 : w;
}

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    signInAnonymously(auth).catch((e) => {
      console.error("Community sign-in failed:", e);
    });

    onAuthStateChanged(auth, (user) => {
      if (user) {
        window.communityAPI.uid = user.uid;
        window.communityAPI.ready = true;
        window.dispatchEvent(new CustomEvent("community-ready"));
      }
    });

    window.communityAPI.getNickname = nickname;
    window.communityAPI.setNickname = function (name) {
      localStorage.setItem(NICKNAME_KEY, name);
    };

    window.communityAPI.addCatch = async function (data) {
      return addDoc(collection(db, "community_catches"), {
        ...data,
        uid: auth.currentUser.uid,
        nickname: nickname(),
        createdAt: serverTimestamp(),
      });
    };

    window.communityAPI.listCatches = async function (n = 30) {
      const q = query(collection(db, "community_catches"), orderBy("createdAt", "desc"), limit(n));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    };

    window.communityAPI.deleteCatch = async function (id) {
      return deleteDoc(doc(db, "community_catches", id));
    };

    window.communityAPI.addSpot = async function (data) {
      return addDoc(collection(db, "community_spots"), {
        ...data,
        uid: auth.currentUser.uid,
        nickname: nickname(),
        createdAt: serverTimestamp(),
      });
    };

    window.communityAPI.listSpots = async function () {
      const q = query(collection(db, "community_spots"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      const spots = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      for (const s of spots) {
        try {
          const countSnap = await getCountFromServer(collection(db, "community_spots", s.id, "votes"));
          s.voteCount = countSnap.data().count;
        } catch (e) {
          s.voteCount = 0;
        }
      }
      return spots.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    };

    window.communityAPI.voteSpot = async function (spotId) {
      const uidVal = auth.currentUser.uid;
      await setDoc(doc(db, "community_spots", spotId, "votes", uidVal), { votedAt: serverTimestamp() });
    };

    window.communityAPI.hasVoted = async function (spotId) {
      const snap = await getDoc(doc(db, "community_spots", spotId, "votes", auth.currentUser.uid));
      return snap.exists();
    };

    window.communityAPI.getLeaderboard = async function () {
      const q = query(collection(db, "community_catches"), orderBy("createdAt", "desc"), limit(300));
      const snap = await getDocs(q);
      const catches = snap.docs.map((d) => d.data());
      const byAngler = {};
      for (const c of catches) {
        const key = c.nickname || "Angler";
        if (!byAngler[key]) byAngler[key] = { nickname: key, count: 0, bestLb: 0, bestSpecies: null };
        byAngler[key].count += 1;
        const lb = weightToLb(c.weight, c.weightUnit);
        if (lb > byAngler[key].bestLb) {
          byAngler[key].bestLb = lb;
          byAngler[key].bestSpecies = c.species;
        }
      }
      return Object.values(byAngler).sort((a, b) => b.count - a.count);
    };
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
}
