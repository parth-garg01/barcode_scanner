# Product Requirements Document

## Event Attendance Tracker via ID Card Barcode Scanning

### 1. Overview

Every student and staff ID card at the college has a barcode printed on the back. This barcode encodes a unique registration or ID number (for example 24BCI0115) that identifies the cardholder. This project aims to build an application that allows event organisers to scan these barcodes during an event, automatically log attendee details in real time, and export the complete attendance list as an Excel file once the event ends.

### 2. Problem Statement

Currently event attendance is tracked manually through paper sign in sheets or Google Forms. This approach is slow, prone to errors such as duplicate entries or illegible handwriting, and requires manual work afterward to convert the data into a usable format for reporting. Since every ID card already carries a scannable barcode, this data can be captured instantly and accurately instead.

### 3. Goals and Objectives

The app should let an organiser scan a student's ID barcode using a phone or laptop camera and instantly log their attendance. It should prevent duplicate check ins for the same event. It should maintain a searchable list of everyone who has checked in. It should allow the organiser to export the final list as an Excel file with a single tap or click. It should support multiple events, each with its own separate attendance list.

### 4. Target Users

The primary users are event organisers, club coordinators, and volunteers who run college events such as workshops, fests, seminars, and department functions. The secondary users are administrators who need the exported reports for record keeping and attendance verification.

### 5. Key Use Case

An organiser creates a new event inside the app. During the event, volunteers use their phones to scan each attendee's ID card barcode. Each scan looks up or records the person's details and adds them to that event's attendance list, showing a live count. If the same card is scanned twice, the app shows a warning and does not add a duplicate entry. At the end of the event, the organiser opens the event and taps export, which generates an Excel file containing the full attendance list.

### 6. Data Captured

Based on the barcode and the printed ID card, the following fields should be captured or linked for each scan:

Registration or ID number, decoded directly from the barcode
Name of the cardholder
Blood group
Contact number
Department or official address details, if available from a linked database
Timestamp of the scan
Event name

Since the barcode itself typically only encodes the registration number, the app will need either a pre loaded student database (a master list mapping registration numbers to names, contact details, and so on) or a manual entry step the first time a new ID is scanned, so that future scans of the same ID auto fill the details.

### 7. Core Features

**Barcode Scanning**
The app should use the device camera to scan standard 1D barcodes (Code 128 or similar, matching the format used on the college ID cards). Scanning should work in low light conditions typical of event venues. A short beep or vibration should confirm a successful scan.

**Duplicate Detection**
If a barcode that has already been scanned for the current event is scanned again, the app should alert the user instead of adding a second row.

**Event Management**
Organisers should be able to create a new event with a name, date, and optional description. Multiple events can run independently, each with its own attendee list. Past events should remain accessible for later export or review.

**Live Attendee List**
While scanning is in progress, the app should show a running list of everyone checked in so far along with a live count, so organisers can track turnout in real time.

**Student Master Database**
A one time upload of a master list (registration number, name, department, contact number, blood group) should be supported, likely via a CSV or Excel upload, so that scans automatically pull in full details rather than just the ID number.

**Manual Entry Fallback**
If a scanned barcode is damaged, unreadable, or not found in the master database, the organiser should be able to manually type the registration number or add the person's details by hand.

**Excel Export**
At the end of an event, the organiser should be able to export the attendance list as an XLSX file with columns for registration number, name, department, contact number, blood group, and check in time. The export should be triggered with a single action and downloaded directly to the device.

**Search and Filter**
Organisers should be able to search the attendee list by name or registration number, useful for large events with hundreds of attendees.

### 8. Non Functional Requirements

The app should work reliably on standard Android and iOS phones using the built in camera, without needing a dedicated barcode scanner device. Scanning should feel near instant, ideally under one second per scan. The app should function with intermittent internet connectivity, syncing data once a connection is available. Attendee data should be stored securely, since it includes personal details like contact numbers and blood group.

### 9. Suggested Tech Stack

A mobile friendly frontend, such as a Flutter or React Native app, or a responsive web app using a barcode scanning library like Zxing or QuaggaJS through the browser camera. A backend service, such as Node.js or Python with a lightweight database like Firebase, Supabase, or PostgreSQL, to store events, master student data, and scan records. An Excel export library, such as SheetJS on the frontend or openpyxl on the backend, to generate the XLSX file from the stored attendance data.

### 10. User Flow

The organiser logs in and creates a new event. The organiser optionally uploads the master student list. During the event, a volunteer opens the scan screen and points the camera at each ID card barcode. Each valid scan appears instantly in the live list with a success sound. Duplicate scans trigger a warning instead of a new entry. At the end of the event, the organiser opens the event summary screen and taps export to Excel, receiving a downloadable XLSX file with the complete attendance record.

### 11. Success Metrics

Reduction in time taken to record attendance compared to manual sign in sheets, accuracy of attendance data with zero duplicate entries, and adoption of the app across multiple college events and clubs.

### 12. Future Scope

Possible future additions include a dashboard showing attendance trends across events, integration with the college's official student database for automatic master list updates, QR code support in addition to barcodes, and role based access so multiple volunteers can scan simultaneously into the same event with data synced live.
