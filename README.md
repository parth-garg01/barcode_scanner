# ScanMark

Event attendance tracker for college events. Scan the barcode on a student or
staff ID card with a phone camera, log the check in instantly, and export the
full attendance list as an Excel file when the event ends.

See [PRD.md](PRD.md) for the full product requirements.

## Features

- Camera barcode scanning (Code 128, Code 39 and similar 1D formats) with
  beep and vibration feedback on a successful scan.
- Duplicate check-in detection, per event.
- Multiple independent events, each with its own attendee list.
- One-time master student list upload (CSV or XLSX) so scans auto-fill name,
  department, contact number and blood group.
- Manual entry fallback for damaged or unrecognised barcodes.
- Live, searchable attendee list with a running count.
- One-click Excel (XLSX) export of the full attendance record.
- Works fully offline: everything is stored locally in the browser
  (IndexedDB), so a flaky venue Wi-Fi never blocks a scan.

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

## Usage flow

1. Create an event with a name and date.
2. Optionally upload the master student list (CSV/XLSX with registration
   number, name, department, contact number and blood group columns).
3. Open the event's Scan tab and point the camera at each ID card barcode.
   A successful scan beeps, vibrates and appears instantly in the live list.
   A repeat scan shows a warning instead of adding a duplicate row.
4. If a barcode won't scan, use the manual entry field below the camera.
5. When the event ends, open the Export tab and download the XLSX file.

## Tech stack

React + TypeScript + Vite, Dexie (IndexedDB) for local-first storage,
ZXing for camera barcode decoding, and SheetJS for spreadsheet import/export.
