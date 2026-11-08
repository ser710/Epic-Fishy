import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  deleteUser, reauthenticateWithCredential, EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, getDoc, getDocs, getCountFromServer,
  query, orderBy, limit, serverTimestamp, setDoc, onSnapshot, where, collectionGroup,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const NICKNAME_KEY = "tackle-community-nickname";
const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

window.communityAPI = {
  ready: false,       // true once we know whether someone is signed in or not
  signedIn: false,    // true once an email/password account is actively signed in
  configured: isConfigured,
  uid: null,
  userEmail: null,
  blocked: new Set(),   // uids this member has blocked
  blockList: [],        // [{ uid, nickname }]
};

function nickname() {
  return localStorage.getItem(NICKNAME_KEY) || "Angler";
}

function friendlyAuthError(err) {
  const code = err && err.code || "";
  if (code.includes("email-already-in-use")) return "That email already has an account — try logging in instead.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "That doesn't look like a valid email address.";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Incorrect email or password.";
  if (code.includes("user-not-found")) return "No account found with that email — try signing up instead.";
  if (code.includes("too-many-requests")) return "Too many attempts — wait a bit and try again.";
  return "Something went wrong — please try again.";
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

    onAuthStateChanged(auth, (user) => {
      window.communityAPI.ready = true;
      window.communityAPI.signedIn = !!user;
      window.communityAPI.uid = user ? user.uid : null;
      window.communityAPI.userEmail = user ? user.email : null;
      window.dispatchEvent(new CustomEvent("community-ready"));
      if (user && window.communityAPI.refreshBlocks) {
        window.communityAPI.refreshBlocks().catch(() => {});
      } else {
        window.communityAPI.blocked = new Set();
        window.communityAPI.blockList = [];
      }
    });

    window.communityAPI.getNickname = nickname;
    window.communityAPI.setNickname = function (name) {
      localStorage.setItem(NICKNAME_KEY, name);
    };

    window.communityAPI.signUp = async function (email, password) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        return { user: cred.user };
      } catch (err) {
        return { error: friendlyAuthError(err) };
      }
    };

    window.communityAPI.signIn = async function (email, password) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { user: cred.user };
      } catch (err) {
        return { error: friendlyAuthError(err) };
      }
    };

    window.communityAPI.signOutUser = async function () {
      await signOut(auth);
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

    // ---- Comments (on catches and spots) ----
    const COMMENT_PARENTS = ["community_catches", "community_spots"];

    window.communityAPI.listComments = async function (parentCol, parentId) {
      if (!COMMENT_PARENTS.includes(parentCol)) throw new Error("bad parent");
      const q = query(collection(db, parentCol, parentId, "comments"), orderBy("createdAt", "asc"), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    };

    window.communityAPI.addComment = async function (parentCol, parentId, text) {
      if (!COMMENT_PARENTS.includes(parentCol)) throw new Error("bad parent");
      const clean = String(text || "").trim().slice(0, 500);
      if (!clean) throw new Error("empty");
      return addDoc(collection(db, parentCol, parentId, "comments"), {
        text: clean,
        uid: auth.currentUser.uid,
        nickname: nickname(),
        createdAt: serverTimestamp(),
      });
    };

    window.communityAPI.deleteComment = async function (parentCol, parentId, commentId) {
      if (!COMMENT_PARENTS.includes(parentCol)) throw new Error("bad parent");
      return deleteDoc(doc(db, parentCol, parentId, "comments", commentId));
    };

    // ---- Live chat room ----
    window.communityAPI.subscribeChat = function (onMessages, onError) {
      const q = query(collection(db, "community_chat"), orderBy("createdAt", "desc"), limit(60));
      return onSnapshot(
        q,
        (snap) => {
          const msgs = snap.docs
            .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
            .reverse();
          onMessages(msgs);
        },
        (err) => { if (onError) onError(err); }
      );
    };

    window.communityAPI.sendChat = async function (text) {
      const clean = String(text || "").trim().slice(0, 300);
      if (!clean) throw new Error("empty");
      return addDoc(collection(db, "community_chat"), {
        text: clean,
        uid: auth.currentUser.uid,
        nickname: nickname(),
        createdAt: serverTimestamp(),
      });
    };

    window.communityAPI.deleteChat = async function (id) {
      return deleteDoc(doc(db, "community_chat", id));
    };

    // ---- Reporting (write-only; reviewed by the project owner in the Firebase console) ----
    window.communityAPI.report = async function (kind, path, excerpt, reason) {
      return addDoc(collection(db, "community_reports"), {
        kind: String(kind).slice(0, 20),
        path: String(path).slice(0, 200),
        excerpt: String(excerpt || "").slice(0, 300),
        reason: String(reason || "").slice(0, 200),
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
    };

    // ---- Likes ----
    window.communityAPI.likeCatch = async function (catchId) {
      await setDoc(doc(db, "community_catches", catchId, "likes", auth.currentUser.uid), { createdAt: serverTimestamp() });
    };
    window.communityAPI.unlikeCatch = async function (catchId) {
      await deleteDoc(doc(db, "community_catches", catchId, "likes", auth.currentUser.uid));
    };
    window.communityAPI.getLikeInfo = async function (catchId) {
      const [countSnap, mine] = await Promise.all([
        getCountFromServer(collection(db, "community_catches", catchId, "likes")),
        getDoc(doc(db, "community_catches", catchId, "likes", auth.currentUser.uid)),
      ]);
      return { count: countSnap.data().count, liked: mine.exists() };
    };

    // ---- Profiles & following ----
    window.communityAPI.followUser = async function (targetUid) {
      const me = auth.currentUser.uid;
      await setDoc(doc(db, "follows", me + "_" + targetUid), { follower: me, followee: targetUid, createdAt: serverTimestamp() });
    };
    window.communityAPI.unfollowUser = async function (targetUid) {
      const me = auth.currentUser.uid;
      await deleteDoc(doc(db, "follows", me + "_" + targetUid));
    };
    window.communityAPI.getFollowingUids = async function () {
      const snap = await getDocs(query(collection(db, "follows"), where("follower", "==", auth.currentUser.uid)));
      return snap.docs.map((d) => d.data().followee);
    };
    window.communityAPI.getProfileStats = async function (uid) {
      const me = auth.currentUser.uid;
      const [followers, following, rel] = await Promise.all([
        getCountFromServer(query(collection(db, "follows"), where("followee", "==", uid))),
        getCountFromServer(query(collection(db, "follows"), where("follower", "==", uid))),
        getDoc(doc(db, "follows", me + "_" + uid)),
      ]);
      return { followers: followers.data().count, following: following.data().count, isFollowing: rel.exists() };
    };
    window.communityAPI.listUserCatches = async function (uid) {
      const snap = await getDocs(query(collection(db, "community_catches"), where("uid", "==", uid), limit(50)));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const secs = (c) => (c.createdAt && c.createdAt.seconds) || 0;
      return list.sort((a, b) => secs(b) - secs(a));
    };

    // ---- Direct messages (private between two members) ----
    const pairIdFor = (a, b) => [a, b].sort().join("_");

    window.communityAPI.subscribeDM = function (otherUid, onMessages, onError) {
      const pid = pairIdFor(auth.currentUser.uid, otherUid);
      const q = query(collection(db, "dms", pid, "messages"), orderBy("createdAt", "desc"), limit(60));
      return onSnapshot(
        q,
        (snap) => onMessages(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).reverse()),
        (err) => { if (onError) onError(err); }
      );
    };

    window.communityAPI.sendDM = async function (otherUid, otherNickname, text) {
      const me = auth.currentUser.uid;
      const clean = String(text || "").trim().slice(0, 1000);
      if (!clean) throw new Error("empty");
      const pid = pairIdFor(me, otherUid);
      await addDoc(collection(db, "dms", pid, "messages"), {
        text: clean, uid: me, nickname: nickname(), createdAt: serverTimestamp(),
      });
      const preview = clean.slice(0, 80);
      // Inbox entries for both sides (best effort — the message itself is already saved).
      await Promise.allSettled([
        setDoc(doc(db, "dm_index", me, "threads", otherUid), {
          otherUid, otherNickname: String(otherNickname || "Angler").slice(0, 40), lastText: preview, updatedAt: serverTimestamp(),
        }),
        setDoc(doc(db, "dm_index", otherUid, "threads", me), {
          otherUid: me, otherNickname: nickname(), lastText: preview, updatedAt: serverTimestamp(),
        }),
      ]);
    };

    window.communityAPI.listThreads = async function () {
      const snap = await getDocs(collection(db, "dm_index", auth.currentUser.uid, "threads"));
      const secs = (t) => (t.updatedAt && t.updatedAt.seconds) || 0;
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => secs(b) - secs(a));
    };

    // ---- Blocking (hides a member's content from you and stops their direct messages) ----
    window.communityAPI.refreshBlocks = async function () {
      const snap = await getDocs(query(collection(db, "blocks"), where("blocker", "==", auth.currentUser.uid)));
      const list = snap.docs.map((d) => ({ uid: d.data().blocked, nickname: d.data().blockedNickname || "Angler" }));
      window.communityAPI.blockList = list;
      window.communityAPI.blocked = new Set(list.map((b) => b.uid));
      window.dispatchEvent(new CustomEvent("community-blocks"));
    };

    window.communityAPI.blockUser = async function (targetUid, targetNickname) {
      const me = auth.currentUser.uid;
      if (targetUid === me) return;
      await setDoc(doc(db, "blocks", me + "_" + targetUid), {
        blocker: me,
        blocked: targetUid,
        blockedNickname: String(targetNickname || "Angler").slice(0, 40),
        createdAt: serverTimestamp(),
      });
      try { await deleteDoc(doc(db, "follows", me + "_" + targetUid)); } catch (e) { /* not following */ }
      await window.communityAPI.refreshBlocks();
    };

    window.communityAPI.unblockUser = async function (targetUid) {
      await deleteDoc(doc(db, "blocks", auth.currentUser.uid + "_" + targetUid));
      await window.communityAPI.refreshBlocks();
    };

    // ---- Account deletion (required by Google Play for apps with accounts) ----
    window.communityAPI.deleteAccount = async function (password) {
      const user = auth.currentUser;
      if (!user || !user.email) return { error: "You're not signed in." };

      // Deleting an account needs a fresh login, so confirm the password first.
      try {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      } catch (err) {
        return { error: friendlyAuthError(err) };
      }

      const uid = user.uid;

      // Remove the user's posts, spots and chat messages.
      try {
        for (const col of ["community_catches", "community_spots", "community_chat"]) {
          const snap = await getDocs(query(collection(db, col), where("uid", "==", uid)));
          for (const d of snap.docs) await deleteDoc(d.ref);
        }
      } catch (e) {
        console.error("Account cleanup failed:", e);
        return { error: "Couldn't finish removing your posts — please try again." };
      }

      // Remove who they follow and their own inbox list (best effort).
      try {
        const fs = await getDocs(query(collection(db, "follows"), where("follower", "==", uid)));
        for (const d of fs.docs) await deleteDoc(d.ref);
        const ts = await getDocs(collection(db, "dm_index", uid, "threads"));
        for (const d of ts.docs) await deleteDoc(d.ref);
        const bs = await getDocs(query(collection(db, "blocks"), where("blocker", "==", uid)));
        for (const d of bs.docs) await deleteDoc(d.ref);
      } catch (e) {
        console.warn("Social cleanup skipped:", e);
      }

      // Remove the user's comments on other people's posts. Needs a one-time Firestore
      // index (see README); if it's missing we continue rather than block deletion.
      try {
        const cs = await getDocs(query(collectionGroup(db, "comments"), where("uid", "==", uid)));
        for (const d of cs.docs) await deleteDoc(d.ref);
      } catch (e) {
        console.warn("Comment cleanup skipped:", e);
      }

      try {
        await deleteUser(user);
      } catch (err) {
        return { error: "Your content was removed but the account couldn't be deleted — please try again." };
      }

      localStorage.removeItem(NICKNAME_KEY);
      return { ok: true };
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
