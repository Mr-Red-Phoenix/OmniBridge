# 🌉 OmniBridge

OmniBridge is a Unified Incident Management & Crisis Response application combining a Spring Boot backend with a React 19 + Vite frontend.

---

## ⚡ Running Frontend & Backend in One Click

You have multiple convenient ways to run both services simultaneously:

### Option 1: Windows Double-Click (Zero Setup)
Simply double-click:
```text
run-all.bat
```
* **What it does:** Launches the Spring Boot backend (`http://localhost:8080`) and Vite frontend (`http://localhost:3000`) in two separate terminal windows with live logs, and automatically opens your browser to `http://localhost:3000`.
* **To stop both:** Double-click `stop-all.bat` or close the terminal windows.

---

### Option 2: VS Code 1-Click Launch (Run & Debug)
1. Open the **Run and Debug** view in VS Code (`Ctrl+Shift+D`).
2. Select **`🚀 Full Stack (Backend + Frontend)`** from the configuration dropdown.
3. Click the **Green Play Button** (or press `F5`).
* **What it does:** Starts the frontend dev server as a background task and immediately starts the Spring Boot backend in the debugger.

---

### Option 3: VS Code Task (Command Palette)
1. Press `Ctrl+Shift+P` (or `F1`).
2. Type **`Tasks: Run Task`** and press Enter.
3. Select **`🚀 Run Both (Backend + Frontend)`**.
* **What it does:** Runs both services in parallel within dedicated VS Code integrated terminal panes.

---

### Option 4: NPM Command (Root Directory)
From the root workspace directory, run:
```bash
npm start
# or
npm run dev
```
* **What it does:** Uses `concurrently` to run both backend and frontend inside a single terminal with color-coded labels (`[BACKEND]` and `[FRONTEND]`).

---

### Option 5: PowerShell / Windows Terminal
Right-click or run:
```powershell
.\run-all.ps1
```
* Opens both processes and launches `http://localhost:3000` in your default browser.

---

## 🌐 URLs & Ports
- **Frontend (Public Portal & Incident Command):** [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger:** [http://localhost:8080](http://localhost:8080)
