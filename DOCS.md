# OmniBridge Application Documentation

OmniBridge is a Unified Incident Management & Reporting application that allows the public to report incidents securely, while providing a staff portal for authorities to acknowledge, track, and resolve these incidents in real-time.

---

## 🏗️ System Architecture & Tech Stack

### Backend (Spring Boot)
- **Framework:** Spring Boot (Java 23)
- **Database:** PostgreSQL (Migrated and managed via Flyway)
- **Security:** Spring Security + JWT for stateless session management
- **Authentication:** One-Time Token (OTT) / Magic Links for passwordless staff login, and OTP mechanisms.
- **Rate Limiting:** Bucket4J for API rate limiting to prevent abuse.
- **Email Service:** Brevo API for sending Magic Links and notifications.
- **Key Dependencies:** Data JPA, WebMVC, Lombok, Flyway, JJWT.

### Frontend (React + Vite)
- **Framework:** React 19 (Bootstrapped with Vite)
- **Routing:** React Router DOM (v7)
- **Styling:** Custom CSS (`index.css`, `App.css`) for a dark/modern UI theme.
- **State Management:** React hooks (`useState`, `useEffect`).

---

## ✨ Features Overview

### 1. Public Portal (Incident Reporting)
**Endpoint / Route:** `/`
- **Venue Selection:** Users can select the specific venue where the incident occurred.
- **Incident Categorization:** Categorize incidents by type (Medical, Fire, Security, Facility, Other).
- **Severity Levels:** Set severity as Low, Medium, High, or Critical.
- **Detailed Reporting:** Collects specific location, detailed description, and optional reporter contact info.
- **Feedback:** Real-time success or error messages upon submission.

### 2. Staff Portal (Incident Management)
**Endpoint / Route:** `/staff`
- **Passwordless Login (Magic Links):** Staff members can enter their email to receive a Magic Link (OTT).
- **JWT Session Persistence:** Secure login session preserved in `localStorage`.
- **Live Incident Dashboard:** Displays a list of all active incidents assigned to the staff member's venue.
- **Incident Status Workflow:** Staff can interactively update the status of an incident through the following flow:
  `REPORTED` ➔ `ACKNOWLEDGED` ➔ `RESPONDING` ➔ `RESOLVED` ➔ `CLOSED`
- **Auto-Logout:** Automatic session termination on JWT expiration.

---

## 🔌 API Endpoints Summary (Backend)

Here is a general overview of the exposed backend routes identified from the frontend integration:

### Public Endpoints
- `GET /api/venues` : Fetch a list of all active venues available for reporting.
- `POST /api/report/{venueSlug}` : Submit a new public incident report.

### Authentication (Staff)
- `POST /api/ott/sent?email={email}` : Request a Magic Link (OTT) for a staff member.
- `POST /api/ott/login?token={token}` : Authenticate using the received OTT and generate a JWT.

### Staff Endpoints (Secured via JWT)
- `GET /api/staff/incidents` : Retrieve all incidents accessible to the logged-in staff user.
- `POST /api/staff/incidents/{id}/status` : Update the state/status of a specific incident.

---

## 📂 Project Structure

```text
omnibridge/
├── backend/
│   ├── src/main/java/.../Omni_Bridge/
│   │   ├── config/       (Security, DB, Rate Limiting configs)
│   │   ├── controller/   (Auth, Incident, Otp, Ott, Venue controllers)
│   │   ├── dto/          (Request/Response payloads)
│   │   ├── entity/       (JPA Entities: Incident, StaffUser, Venue, etc.)
│   │   ├── exception/    (Global exception handlers)
│   │   ├── handler/      (JWT filters, Rate limit filters)
│   │   ├── repository/   (Spring Data JPA repositories)
│   │   └── service/      (Business logic: AuthService, IncidentService, etc.)
│   ├── src/main/resources/
│   │   ├── db/migration/ (Flyway SQL scripts)
│   │   └── application.properties
│   └── pom.xml
└── frontend/
    ├── src/
    │   ├── App.jsx       (Main Application, Router, Portals)
    │   ├── main.jsx      (React Entry Point)
    │   ├── App.css       (Component Styles)
    │   └── index.css     (Global Styles)
    ├── package.json
    └── vite.config.js
```
