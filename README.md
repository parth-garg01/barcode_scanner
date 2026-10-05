# ScanMark

Event attendance tracker for college events. An organiser creates an event in
the admin portal and gets a join code. Volunteers enter that code and their
name, then scan the barcode on each student or staff ID card with a phone
camera. Every check-in lands in one shared Google Sheet, in a tab named after
the event, as registration number, time and the volunteer who scanned it.

See [PRD.md](PRD.md) for the original product requirements.

## Features

- Admin portal (one shared password) to create events and hand out join codes,
  see who has been scanned for each event, and stop or reopen scanning.
- Volunteers join with an event code and their name, with no account needed.
- Camera barcode scanning (Code 128, Code 39 and similar 1D formats) with
  vibration feedback on a successful scan.
- One shared Google Sheet: a new tab per event with registration number,
  check-in time and the volunteer who scanned.
- One row per registration number per event. A repeat scan is rejected and
  shows who scanned the card first, even across different volunteers.
- Keeps working offline: scans are saved on the phone and sent to the sheet
  when the connection returns.
- Manual entry fallback for damaged or unrecognised barcodes.
- Live, searchable list of everyone checked in, with a running count.

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL on a laptop, or on a phone on the same network for
camera scanning (the camera API requires `localhost` or HTTPS).

```bash
npm run build     # type-check and build for production
npm run test      # run the unit test suite
npm run preview   # preview the production build locally
```

## Android app

The same web app is wrapped with Capacitor into a native Android app (camera
permission and vibration). Building it needs JDK 17 and the Android SDK, and
`VITE_API_URL` must be set before `npm run build` so the app knows its backend.

```bash
npm run build                        # build the web app into dist/
npx cap sync android                 # copy it into the Android project
cd android && ./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
Copy it to a phone and open it to install, or run `npx cap open android` to
work on it in Android Studio.

## Google Sheet backend

The backend is a small Apps Script attached to your Google Sheet. Set it up
once:

1. Create a Google Sheet (any name). This is where attendance will appear.
2. In the sheet, open **Extensions > Apps Script**, delete the sample code and
   paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Open **Project Settings** (the gear icon) and under **Script properties**
   add a property named `ADMIN_PASSWORD` with the password organisers will use.
4. Click **Deploy > New deployment**, choose type **Web app**, set
   **Execute as: Me** and **Who has access: Anyone**, then deploy and approve
   the permission prompt.
5. Copy the web app URL (it ends in `/exec`). Copy `.env.example` to
   `.env.local`, set `VITE_API_URL` to that URL, and restart or rebuild.

After changing `Code.gs` later, use **Deploy > Manage deployments > Edit > New
version** so the same URL serves the new code.

Without `VITE_API_URL`, `npm run dev` uses a built in demo backend (admin
password `admin`) that keeps everything in memory, so the whole flow can be
tried before a sheet is connected. A production build has no demo backend.

## Usage flow

1. Organiser: open the admin portal, sign in and create an event. A tab for it
   is added to the Google Sheet and the event gets a six character code.
2. Give the code to the volunteers.
3. Volunteer: open the app, enter the code and your name, then point the
   camera at each ID card barcode. A successful scan vibrates and appears in
   the live list. A repeat scan shows who already scanned that card.
4. If a barcode will not scan, use manual entry below the camera.
5. When check-in is over, the organiser opens the event in the admin portal
   and taps Stop scanning. Volunteers' cameras turn off and no more ID cards
   are accepted until scanning is allowed again.
6. Attendance is in the Google Sheet as it happens; there is nothing to export.

## Tech stack

React + TypeScript + Vite, Google Apps Script and Google Sheets for the shared
backend, Dexie (IndexedDB) for the offline queue, ZXing (WebAssembly) for
camera barcode decoding, and Capacitor for the Android app.
