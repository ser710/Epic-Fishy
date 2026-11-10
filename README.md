# Epic Fishy — Android install guide

Made by **Epic Stuff, Things & Co**.

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
- **Conditions** — live weather, tides, and radar for your spot, plus a
  4-day hourly **bite forecast** (light, moon position, pressure trend, wind,
  sky, tide flow and water temperature, tuned to the species you pick),
  **lure & bait picks** matched to your tackle box and your own catch history,
  and the fish people have actually recorded near you. Works worldwide
  (Open-Meteo + iNaturalist); US-only extras are NOAA tides and NWS alerts.
- **Catches** — a catch log with GPS tagging and photos, a life list of
  species caught, and insights (best time of day, barometer, moon phase)
  built from the weather recorded at each catch.
- **Spots** — combines your own catch data (which locations produce the most
  and biggest fish, and what's working there) with nearby named lakes,
  rivers, and fishing spots pulled live from OpenStreetMap so you can find
  new water to try.

## Features

- **Tackle** — your gear, organized by compartment, with photos and low-stock alerts.
- **Conditions** — live weather, tides, and radar for your spot, plus a
  4-day hourly **bite forecast** (light, moon position, pressure trend, wind,
  sky, tide flow and water temperature, tuned to the species you pick),
  **lure & bait picks** matched to your tackle box and your own catch history,
  and the fish people have actually recorded near you. Works worldwide
  (Open-Meteo + iNaturalist); US-only extras are NOAA tides and NWS alerts.
- **Catches** — a catch log with GPS tagging and photos, a life list of
  species caught, and insights (best time of day, barometer, moon phase)
  built from the weather recorded at each catch.
- **Spots** — combines your own catch data (which locations produce the most
  and biggest fish, and what's working there) with nearby named lakes,
  rivers, and fishing spots pulled live from OpenStreetMap so you can find
  new water to try.
- **Community** (optional) — a shared feed of catches, an opt-in catch map
  (clustered, filterable by species, locations blurred to ~1 km), crowd-sourced spots
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
4. **Build → Authentication** → **Get started** → **Email/Password** → **Enable**
   → **Save**. (People create a free account with email + password to post to
   the community — no anonymous access, so posts stay tied to a real login.)
5. Click the **⚙️ gear** → **Project settings** → scroll to "Your apps" →
   click **`</>`** → give it a nickname → **Register app** (skip hosting).
6. Copy the `firebaseConfig` object it shows you into **`firebase-config.js`**,
   replacing the placeholder values.
7. Upload the updated `firebase-config.js` to your hosted site (same
   upload/commit process as any other file) — no other changes needed.

Once that's live, reload the app and the Community tab will connect
automatically — same for anyone else using the same hosted link.

## Scan tackle with your camera

On the Tackle tab, tap **Scan** and take or pick a photo. Two ways to identify what's in it:

- **Your own AI** (best): paste an API key from Anthropic, OpenAI or Google in Settings. The photo goes
  straight from the phone to that provider; there is no Epic Fishy server and the key never leaves the device.
  You pay the provider's normal usage cost (a few cents per photo at most).
- **On-device (free)**: a small open image model runs in the browser (downloaded once). Less detailed.

Results are shown as a checklist; tap **Add** and items are merged into your box (quantities add up).

## Identify a fish from a photo

In **Log a catch**, add or take a photo and tap **Identify my photo**. With your own AI key you get up to three
likely species, the visible features behind each guess, look-alikes and how to tell them apart, and a handling
tip. Without a key, the free on-device model gives a rough guess from common species plus fish recorded near
you. Tap **Use** and the species is filled in. It is a best guess, never a legal ruling; always check local rules.

## Species guide, rules links, forecast scorecard, offline maps

- **Species guide** (Catches tab): 27 fish with how to spot them, where they live, what they eat, look-alikes and handling. Written by hand, not a legal reference.
- **Rules links**: next to an identified or chosen species there is a "Check [state] rules for [fish]" link. It opens a search limited to
  government sites for that place and species. There is no free official size-limit feed, so the app points to the source instead of quoting limits.
- **Forecast scorecard** (Catches tab): each GPS-tagged catch is scored by the bite model for the hour it happened and ranked within that day. The card shows how
  many catches fell in the best third of their day (chance is about 33%). Needs 5+ catches to show a result; small samples are noisy.
- **Offline maps** (Spots tab, My map): "Save this view for offline" stores up to 150 map tiles for the area and two zoom levels closer. Tiles you view are also kept (up to 1,200) so the map still works with no signal.

## Today's call and Explore nearby

- **Today's call** (top of Conditions) turns the bite forecast into one
  verdict: go now, or the next window with a countdown, whether the bite is
  building or fading, the top lure, and warnings for thunderstorms, strong
  gusts, heat, cold or an approaching front in the next few hours.
- **Explore nearby** (top of Spots) shows named lakes and rivers, fishing
  spots and piers, boat ramps, bait and tackle shops and marinas from
  OpenStreetMap on a map and in a filterable list, with directions and
  one-tap "save as waypoint". It asks several public Overpass mirrors and
  keeps results on the device for a week.

## Smarter lure picks

The picks score ~30 lure and bait styles against live conditions, the target species and your own catch
history, then map them onto what's in your box and list what to buy (hooks, weights, trailers) with colours,
depth, retrieve, rod and line for each pick.

## Maps and data sources

Base map: CARTO Voyager, with automatic fallback to OpenStreetMap tiles. Water temperature uses the nearest
NOAA CO-OPS sensor station within 25 miles when available (labelled "measured"), else the Open-Meteo ocean
model, else an air-temperature estimate (labelled "est.").

## Epic Fishy Pro (optional one-time unlock)

The app is free, including the full 4-day bite forecast, the first lure pick,
the life list and a headline from your own catch data. Pro (a one-time Google
Play purchase, product ID `epic_fishy_pro`) adds **Where to fish today** (ranks
all your saved spots for today and tomorrow), every lure pick, the full
catch insights, **My map layers** (USGS satellite, NOAA nautical charts, NASA
sea-surface temperature, GEBCO ocean depth, OpenSeaMap seamarks), **calendar
reminders** for your best bite windows (.ics) and **GPX export** of your spots. It is **off by default**: the switch is `PRO_PAYWALL_ON` in
`tackle-tracker.jsx` (currently `false`), so nothing is locked until it is set to
`true` and the Play product exists. It only sells inside the Android app (Digital
Goods API); the web version shows how to unlock it. Setup order: merchant account
in Play Console, create the one-time product, rebuild the package with Play
Billing enabled in PWABuilder, then flip the switch.

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

## Comments & chat (added Nov 2026)

Community now has comments on catches/spots and a live chat room. These need
**updated Firestore rules** or posting will fail with "permission denied":

1. Firebase console → project **epic-fishy** → **Firestore Database** → **Rules** tab.
2. Replace everything with the contents of `firestore.rules` from this folder.
3. Click **Publish**.

Reports filed from the app land in a `community_reports` collection — open
Firestore → **Data** to review them and delete abusive posts.

`firebase-config.js` in this folder already contains the real `epic-fishy`
config, so uploading the whole folder no longer overwrites it with placeholders.

## Account deletion (Google Play requirement)

Members can delete their account in-app: **Community → Delete my account**.
The web instructions Play asks for live at `privacy.html#delete-account`.

**One-time Firestore index (needed so deletion also removes a member's comments):**
Firebase console → **Firestore → Indexes → Single field → Add exemption**
- Collection ID: `comments`
- Field path: `uid`
- Query scope: **Collection group** → turn on **Ascending** → Save

Also republish `firestore.rules` (it gained one rule for this).

## Social features (likes, profiles, following, direct messages)

Community now works like a small fishing social network:
- **Likes** on shared catches (heart button).
- **Profiles:** tap any angler's name (feed, chat, spots, comments) to see their
  catches and stats, **Follow** them, or **Message** them.
- **Following** filter on the Feed.
- **DMs** tab: private one-to-one conversations (only the two members can read them).

All of this needs the updated `firestore.rules` published (Firestore -> Rules -> Publish).
No new indexes are required.

## Blocking

Any member can **Block this angler** from their profile sheet. Blocked members'
catches, comments, chat, spots and messages are hidden from the blocker, and a
blocked member can no longer start or continue a direct message with them
(enforced by the rules). Blocked anglers can be unblocked from the list at the
bottom of the Community tab. Republish `firestore.rules` for this to work.

## Weather safety alerts

A warning banner appears at the top of the app when the saved Conditions location has an
active National Weather Service alert (U.S.) or a thunderstorm / strong-wind / heavy-rain
forecast within the next 6 hours. Settings -> **Weather safety alerts** turns on phone
notifications. Background checks while the app is closed are best-effort (Chrome decides
when they run). Reliable closed-app push would need a server (Firebase Cloud Functions).

Google Play build: in PWABuilder's Android options, enable **Notification delegation** so
notifications work inside the Play Store version.
