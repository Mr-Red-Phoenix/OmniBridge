# OmniBridge Application Documentation

OmniBridge is a Unified Incident Management & Crisis Response application that allows the public to report incidents securely, while providing an Incident Command Center for authorities to acknowledge, track, verify, and resolve incidents in real-time, dispatch emergency services (911/EMS), issue facility broadcast alerts, and coordinate directly with first responders and distressed guests.

---

## 🏗️ System Architecture & Tech Stack

### Backend (Spring Boot)
- **Framework:** Spring Boot (Java 25)
- **Database:** PostgreSQL (Migrated and managed via Flyway)
- **Security:** Spring Security + JWT for stateless session management + Refresh Token rotation
- **Authentication:** Password login, One-Time Token (OTT) Magic Links, and Phone OTP 2FA mechanisms.
- **Real-Time Streaming:** Server-Sent Events (SSE) via `CrisisEventStreamService` for staff incident command, guest lifelines, and venue broadcast alerts.
- **Rate Limiting:** Bucket4J for API rate limiting to prevent abuse.
- **Email Service:** Brevo API for sending Magic Links and notifications.
- **Key Dependencies:** Data JPA, WebMVC, Lombok, Flyway, JJWT.

### Frontend (React 19 + Vite)
- **Framework:** React 19 (Bootstrapped with Vite)
- **Routing:** React Router DOM (v7) with protected routes
- **Styling:** Custom CSS (`index.css`) with modern glassmorphism, responsive grids, dark/light theme toggle, and fluid micro-animations.
- **Icons & Motion:** `lucide-react`, `framer-motion`, and `react-toastify`.
- **State & Context:** Centralized `AuthContext` for JWT tokens, user profiles, venue syncing, role-based capabilities, and auto-refresh interceptors.
- **Real-Time Integration:** EventSource SSE streams with auto-reconnection and live status indicator badges.

---

## ✨ Features Overview

### 1. Public Portal (Incident Reporting & Instant Emergency SOS)
**Endpoint / Route:** `/`
- **Venue Selection:** Live venues fetched directly from backend `GET /api/venues` (with fallback presets).
- **Incident Categorization:** Medical, Fire, Security, Facility, Other.
- **Severity Levels:** Low, Medium, High, Critical.
- **Geolocation Support:** One-click GPS auto-detection (`navigator.geolocation`) attaching exact latitude and longitude to reports.
- **Red Emergency SOS Panic Button:** Immediate distress trigger sending instant tactical distress coordinates and auto-routing to the Guest Lifeline.
- **Facility Safety Broadcasts:** Live top banner displaying active alerts for the facility.
- **Post-Submission Confirmation:** Generates incident reference and one-click direct access to the secure Guest Lifeline.

### 2. Live Guest Lifeline Portal
**Endpoint / Route:** `/lifeline/:incidentId?token=:token`
- **Real-Time Status Stepper:** Live visual progression (`REPORTED` ➔ `ACKNOWLEDGED` ➔ `RESPONDING` ➔ `RESOLVED` ➔ `CLOSED`).
- **SSE Live Stream:** Subscribes to `/api/guest/incidents/:id/stream?token=...` for instant status updates.
- **911/EMS Dispatch Indicator:** Flashing alert when external emergency services are en route.
- **Facility Emergency Instructions:** Venue-specific emergency directives (e.g. lockdown codes, evacuation corridors).
- **2-Way Real-Time Chat Channel:** Distressed guests can send status updates and questions directly to command via `POST /api/guest/incidents/:id/messages`.

### 3. First Responder Tactical Portal
**Endpoint / Route:** `/responder/:responderToken`
- **Tactical Access Dossier:** Critical building access data:
  - Gate Code (with one-click copy)
  - Knox Box Location
  - Architectural Floor Plan PDF link
  - Facility Address with one-click Google Maps Navigation
  - Emergency Dispatch Contact Phone
- **Field Status Broadcasting:** Responders can mark status (`ACKNOWLEDGED`, `RESPONDING`, `RESOLVED`, `CLOSED`) with field notes.
- **Field Note Logging:** Post tactical field observations directly into the incident operations log.

### 4. Staff Incident Command Center
**Endpoint / Route:** `/staff` (Protected)
- **Live SSE Event Stream:** Subscribes to `/api/staff/incidents/stream` to receive incoming incidents and updates in real time.
- **KPI Metrics:** Open incidents, Critical threats, Responders en route, and 911 dispatched counts.
- **Search & Multi-Filtering:** Filter by search keywords, status, or severity.
- **Incident Actions:**
  - One-click Acknowledge
  - Assign to Self (claim incident)
  - Open Complete Incident Dossier & Timeline Modal
- **Full Dossier Controls:**
  - Verify Incident (`POST /api/staff/incidents/:id/verify`)
  - Dispatch 911 / EMS (`POST /api/staff/incidents/:id/dispatch-emergency`)
  - Flag False Alarm (`POST /api/staff/incidents/:id/flag-false-alarm`)
  - Status Workflow Stepper
  - Post Timeline Log (with toggle for "Visible to Guest")
  - Copy Guest Lifeline URL & Open First Responder Packet
- **Facility Broadcast Management:** Security/Coordinators can publish emergency broadcast alerts or deactivate active broadcasts.
- **Staff Access Control:** Admins can view all staff users and promote/demote user roles.

### 5. Authentication & Access Control
**Endpoint / Routes:** `/auth`, `/login?token=:token`
- **Password Authentication:** Secure login with JWT access token + refresh token.
- **Passwordless Magic Links (OTT):** Enter email to receive a 5-minute magic link.
- **Magic Link Token Handler:** Auto-authenticates when opening `/login?token=...` or `/auth/magic?token=...`.
- **Phone OTP 2FA:** Send and verify 6-digit one-time passcodes.
- **Full Staff Registration:** Sign up with name, email, venue selection, role, and optional Admin Key (protected by Passwordless MFA: Phone OTP + Magic Link).

---

## 🔌 API Endpoints Integrated (Backend ➔ Frontend)

### Public & Guest Endpoints
- `GET /api/venues` : List active venues
- `GET /api/venues/{slug}` : Get venue details
- `POST /api/report/{venueSlug}` : Submit incident report
- `POST /api/report/{venueSlug}/sos` : Submit emergency SOS distress alert
- `GET /api/guest/incidents/{incidentId}?token={token}` : Get guest lifeline status
- `GET /api/guest/incidents/{incidentId}/stream?token={token}` : SSE stream for guest lifeline
- `POST /api/guest/incidents/{incidentId}/messages?token={token}` : Send 2-way message to command
- `GET /api/guest/venues/{venueSlug}/broadcasts` : Active venue emergency broadcasts
- `GET /api/guest/venues/{venueSlug}/broadcasts/stream` : SSE stream for venue alerts

### First Responder Endpoints
- `GET /api/responder/{responderToken}` : Get tactical response packet
- `POST /api/responder/{responderToken}/status` : Update tactical status with note
- `POST /api/responder/{responderToken}/notes` : Add field note to command timeline

### Staff Authentication Endpoints
- `POST /api/auth/login` : Staff email/password login
- `POST /api/auth/register` : Staff registration
- `POST /api/auth/refreshToken` : Rotate/refresh JWT session
- `GET /api/auth/me` : Current staff user profile
- `GET /api/auth/verify-staff?email={email}` : Verify staff email
- `POST /api/ott/sent?email={email}` : Request OTT Magic Link
- `POST /api/ott/login?token={token}` : Login with Magic Link OTT
- `POST /api/otp/send` : Dispatch Phone OTP
- `POST /api/otp/verify` : Verify Phone OTP
- `POST /api/otp/resend` : Resend Phone OTP

### Staff Incident Command Endpoints
- `GET /api/staff/incidents` : List open incidents for venue
- `GET /api/staff/incidents/{incidentId}` : Full incident dossier and timeline
- `GET /api/staff/incidents/stream` : Live SSE incident event stream
- `POST /api/staff/incidents/{incidentId}/acknowledge` : Mark incident acknowledged
- `POST /api/staff/incidents/{incidentId}/assign-to-self` : Claim incident
- `POST /api/staff/incidents/{incidentId}/verify` : Mark incident verified
- `POST /api/staff/incidents/{incidentId}/flag-false-alarm` : Mark as false alarm
- `POST /api/staff/incidents/{incidentId}/status` : Update status workflow
- `POST /api/staff/incidents/{incidentId}/updates` : Add note/update to timeline
- `POST /api/staff/incidents/{incidentId}/dispatch-emergency` : Dispatch external 911/EMS

### Facility Broadcast Endpoints
- `POST /api/staff/venues/{venueSlug}/broadcasts` : Issue emergency broadcast
- `GET /api/staff/venues/{venueSlug}/broadcasts` : List active venue broadcasts
- `POST /api/staff/venues/{venueSlug}/broadcasts/{alertId}/deactivate` : End broadcast

### Staff Admin Endpoints
- `GET /api/staff/admin/users` : List staff members for venue
- `PUT /api/staff/admin/users/{userId}/role` : Update staff role (ADMIN, COORDINATOR, SECURITY, STAFF, RESPONDER)

---

## 📂 Production Frontend File Structure

```text
frontend/
├── src/
│   ├── api/
│   │   ├── client.js               # Central Axios instance, refresh interceptor, SSE URL builder
│   │   ├── authApi.js              # Auth, OTT Magic Link, OTP 2FA
│   │   ├── venueApi.js             # Venue fetching
│   │   ├── incidentApi.js          # Public reporting, SOS, Staff Command actions, SSE URLs
│   │   ├── guestApi.js             # Guest Lifeline & Venue Broadcasts
│   │   ├── responderApi.js         # First Responder tactical packet & updates
│   │   ├── broadcastApi.js         # Facility emergency broadcasts
│   │   ├── adminApi.js             # Staff role administration
│   │   └── index.js                # Re-exports all API services
│   ├── context/
│   │   └── AuthContext.jsx         # Global auth state, user profile, role helpers, logout
│   ├── components/
│   │   ├── Navbar.jsx              # Responsive header, role badge, theme toggle, SOS button
│   │   ├── BroadcastBanner.jsx     # Live emergency broadcast banner with SSE
│   │   ├── SosModal.jsx            # Panic SOS modal with GPS location detection
│   │   ├── IncidentDetailModal.jsx # Full staff incident dossier, timeline, 911 dispatch
│   │   ├── BroadcastManagerModal.jsx # Staff emergency broadcast creation & management
│   │   ├── AdminUserManagement.jsx # Staff role assignment table for ADMIN role
│   │   └── LiveStreamStatus.jsx    # Real-time SSE connectivity indicator badge
│   ├── pages/
│   │   ├── PublicReport.jsx        # Public incident reporting, SOS trigger, venue selection
│   │   ├── GuestLifeline.jsx       # Real-time guest tracker, live status, 2-way chat
│   │   ├── FirstResponder.jsx      # Tactical HUD for arriving emergency units
│   │   ├── StaffDashboard.jsx      # Incident Command: stats, filters, SSE live updates, cards
│   │   ├── AuthPage.jsx            # Password, Magic Link, OTP, and Registration
│   │   └── MagicLogin.jsx          # Magic Link token handler from email
│   ├── App.jsx                     # Router, AuthProvider, protected routes, modals
│   ├── main.jsx                    # React entry point
│   └── index.css                   # Comprehensive design system, dark/light themes, animations
├── .env                            # Environment configuration (VITE_API_BASE_URL)
├── .env.example                    # Template environment configuration
├── vite.config.js                  # Vite configuration with proxy and vendor code-splitting
└── package.json                    # Project dependencies and build scripts
```

---

## 🚀 One-Click Execution Options

1. **Windows Batch Launcher:** Double-click `run-all.bat` in the root folder to boot both backend and frontend, and launch the browser.
2. **VS Code F5 / Play Button:** Select `🚀 Full Stack (Backend + Frontend)` in Run & Debug and click Play.
3. **VS Code Task:** Press `Ctrl+Shift+P` -> `Tasks: Run Task` -> `🚀 Run Both (Backend + Frontend)`.
4. **Root CLI:** Run `npm start` or `npm run dev` in the root directory.
5. **Shutdown Utility:** Double-click `stop-all.bat` to terminate both ports 8080 and 3000.

