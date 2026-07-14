# Epic Fishy — Android install guide

This is a Progressive Web App (PWA), not a Play Store APK — but on Android,
Chrome installs PWAs as real standalone apps: their own icon on your home
screen, their own window with no browser bar, and offline support for your
gear list. This is the standard way to ship an app like this without an
app-store build pipeline.

## 1. Host the files somewhere with HTTPS

Android will only offer to "install" a site if it's served over HTTPS (not a
local file). Pick whichever is easiest for you:

**GitHub Pages (free, no time limit)**
1. Create a new GitHub repo (public).
2. Upload all the files in this folder (`index.html`, `manifest.json`, `sw.js`,
   and the `icons/` folder), keeping the same file structure.
3. Repo Settings → Pages → set source to your main branch, root folder.
4. GitHub gives you a URL like `https://yourname.github.io/repo-name/`.

**Netlify Drop (free, fastest, no signup required)**
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. Netlify gives you a live HTTPS URL immediately.

Either works fine — just keep the folder structure intact (icons stay in an
`icons/` subfolder next to `index.html`).

## 2. Install it on your Android phone

1. Open the hosted URL in **Chrome** on your phone.
2. Chrome will either show an "Install app" banner automatically, or:
   tap the **⋮** menu (top right) → **Add to Home screen** / **Install app**.
3. Confirm — you'll get an Epic Fishy icon on your home screen that opens
   full-screen, just like any other installed app.

## Features

- **Tackle** — your gear, organized by compartment, with photos and low-stock alerts.
- **Conditions** — live weather, tides, and radar for your spot.
- **Catches** — a catch log with GPS tagging and photos.
- **Spots** — combines your own catch data (which locations produce the most
  and biggest fish, and what's working there) with nearby named lakes,
  rivers, and fishing spots pulled live from OpenStreetMap so you can find
  new water to try.

## Features

- **Tackle** — your gear, organized by compartment, with photos and low-stock alerts.
- **Conditions** — live weather, tides, and radar for your spot.
- **Catches** — a catch log with GPS tagging and photos.
- **Spots** — combines your own catch data (which locations produce the most
  and biggest fish, and what's working there) with nearby named lakes,
  rivers, and fishing spots pulled live from OpenStreetMap so you can find
  new water to try.
- **Community** (optional) — a shared feed of catches, crowd-sourced spots
  with upvotes, and a leaderboard, visible to everyone using this app.
  Requires the one-time Firebase setup below; until then, this tab shows a
  simple "not set up yet" message and everything else works as normal.

## Setting up Community features (optional, free)

1. Go to **console.firebase.google.com** → **Add project** → name it anything
   → Google Analytics isn't needed → **Create project**.
2. **Build → Firestore Database** → **Create database** → **Start in
   production mode** → pick a region → **Enable**.
3. In Firestore, go to the **Rules** tab, replace the contents with what's in
   `firestore.rules` (included alongside this README), and click **Publish**.
4. **Build → Authentication** → **Get started** → **Anonymous** → **Enable**
   → **Save**. (This quietly identifies each phone — no login screen needed.)
5. Click the **⚙️ gear** → **Project settings** → scroll to "Your apps" →
   click **`</>`** → give it a nickname → **Register app** (skip hosting).
6. Copy the `firebaseConfig` object it shows you into **`firebase-config.js`**,
   replacing the placeholder values.
7. Upload the updated `firebase-config.js` to your hosted site (same
   upload/commit process as any other file) — no other changes needed.

Once that's live, reload the app and the Community tab will connect
automatically — same for anyone else using the same hosted link.

## What works offline vs. needs a connection

- **Your tackle box data and catch log** (items, quantities, categories, logged
  catches with their GPS tags and photos) are saved right on your phone (via
  browser storage) and work fully offline.
- **Weather, tides, and the radar map** need an internet connection each time,
  since they're live data pulled from public weather/tide services.
- **GPS-tagging a catch** will prompt for location permission the first time —
  allow it so each catch can be pinned to the exact spot you caught it.
- **Photos** are compressed and stored right alongside your data, so there's
  no separate photo storage step — just snap or pick one in the form. Browser
  storage has a size ceiling (a few MB total), so photos are auto-resized to
  keep things well within budget; if you ever hit the limit, the app will flag
  a save error so you know to trim older entries.


## Want an actual Play Store listing later?

If you ever want a real `.apk`/`.aab` to submit to the Play Store, once this
is hosted you can run it through **PWABuilder** (https://www.pwabuilder.com) —
paste your hosted URL in and it packages this exact PWA into an Android app
bundle for you. Not needed just to use it as an app on your own phone, though.
