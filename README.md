# ANTROTHON’27 Hackathon Platform
> **"Think Human. Innovate for Society."**  
> Organized by **Patrician Institute Innovation Cell (PIIC)**  
> **Patrician College of Arts and Science**, Chennai  
> Event Dates: **January 7–8, 2027** (24-Hour Inter-College Hackathon)

---

## ⚡ Aesthetic & Theme
Built with a sleek, cinematic **Terminator Cyberdyne HUD** theme:
- **T-800 Optical Crimson & Laser Red Accents** (`#ff1e2e`, glowing reticles, targeting brackets)
- **Titanium & Brushed Steel High-Tech Grids**
- **HUD Telemetry Status Bar** with real-time coordinate tracking, defense grid status, and live Indian Standard Time clock
- **Synthesized Web Audio Engine** (tactical laser clicks and reticle lock-on audio feedback, toggleable in header)
- **Classification Lock & Countdown Engine** targeting **30 October 2026**

---

## 🚀 Key Features

### 1. Thematic Tracks & Open Innovation Format
- ANTROTHON'27 operates across **3 Designated Tracks** (Human Safety, Rights & Empowerment | Health, Education & Digital Innovation | Sustainability, Smart Communities & Social Entrepreneurship). Teams have complete freedom to innovate and build prototypes aligned with any of these 3 tracks.
- **Registration Open Ahead of Campaign Launch:** Registration is unlocked directly at `/register` with an informational notice that official campus circulation & public branding launches on **30 October 2026**.
- Real-time countdown timer tracking the official campaign circulation launch.

### 2. Streamlined 3-Step Registration Wizard (4–6 Members Enforced)
- **Step 1: Team & Crew Assembly**
  - **Team Identity:** Team Name, College / Institution Name, Operational Hackathon Track (Tracks 1, 2, or 3).
  - **Primary Notification Intimation:** Prominent tactical alert intimating that all official instructions, keys, track updates, and announcements will be communicated directly to the Team Leader's Mobile Number and Email ID.
  - **Team Leader Credentials:** Leader Full Name, Mobile Number (10 digits), Email ID, Department, Year of Study.
  - **Crew Unit Manifest:** Mandates 4 to 6 members total (Leader + 3 to 5 crew members). Dynamic **"+ Add Team Member"** controls to register Member #5 and Member #6, with dynamic removal.
- **Step 2: Idea Submission Dossier (SIH Standard)**
  - **Idea Title:** Maximum 100 characters with real-time character counter.
  - **Abstract / Summary:** Maximum 10,000 characters with real-time character counter for executive evaluation.
  - **Idea Description:** Maximum 50,000 characters with real-time character counter for in-depth system architecture, tech stack, and 24-hour prototype feasibility.
  - **Idea Presentation PPT:** File upload accepting `.pptx`, `.ppt`, or `.pdf` up to **10MB**, built using the official SIH-style 6-slide template.
  - **Direct Template Download:** Dedicated button on the homepage and within the registration form allowing teams to download the official template (`ANTROTHON27_Idea_Presentation_Template.pptx`).
- **Step 3: Review Manifest & Payment Authorization (₹300)**
  - Comprehensive review summary of team credentials, college, track, idea title, abstract, and uploaded presentation file.
  - Direct payment authorization of ₹300 per team via Razorpay or the Sandbox Simulator.

### 3. Payment Integration (Razorpay & Seamless Simulator)
- **Initial Registration Fee:** ₹300 per team.
- **Finalist Participation Fee:** ₹350 per head (applicable solely to the 45 shortlisted finalist teams).
- **Dual-Mode Razorpay Engine:**
  - When `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are present in `.env`, the system launches the live Razorpay modal.
  - If keys are not yet configured in `.env`, the system activates a **High-Fidelity Sandbox Simulator** allowing end-to-end testing and database persistence without errors.
- Generates a **Cyberpunk Digital Boarding Ticket / Confirmation Receipt** upon success (`/confirmation/{team_code}`) with print/save support.

### 4. Cyberdyne Admin Command Portal (`/admin`)
- Secure authentication (Username: `admin` / Password: `terminator27`).
- **Real-Time Key Metrics Dashboard:**
  - Total Registered Teams
  - Paid vs Pending Registrations
  - **45 Finalists Quota Tracker** with animated progress meter
  - Total Confirmed Participants (Leader + Crew)
  - Total Initial Revenue Collected (₹)
- **Full Team Dossier Inspection:** View team leader contact details, project synopsis, complete table of team members, and Razorpay transaction IDs.
- **Protocol Status Selector:** Update team status directly between *Submitted*, *Under Review*, *Shortlisted Finalist (45 Quota)*, *Waitlist*, and *Rejected*.
- **Spreadsheet Data Extraction:**
  - **Download Styled Excel Spreadsheet (.xlsx):** Auto-formatted using `openpyxl` with custom Terminator crimson headers, status highlight badges, and separated columns for all 6 team members.
  - **Download CSV (.csv):** Compatible with Google Sheets and Excel.

---

## 🛠️ Technology Stack
- **Frontend:** Vanilla HTML5, Vanilla CSS3 (Terminator Cyber HUD Design System), Vanilla JavaScript (Web Audio API, dynamic DOM wizard).
- **Backend:** Python 3.10+ (tested on Python 3.13) + FastAPI + Starlette Session Middleware.
- **Database:** SQLite with SQLAlchemy (`antrothon.db`).
- **Spreadsheet Engine:** `openpyxl` & Python `csv`.
- **Payment Gateway:** Razorpay Python SDK + Client-side Checkout JS.

---

## 🏃 Running the Application

### Step 1: Clone and Navigate to Directory
```powershell
cd Antrothon
```

### Step 2: Create and Activate Virtual Environment
**Windows PowerShell:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
> *Note:* If PowerShell blocks script execution (`UnauthorizedAccess`), run:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> .\venv\Scripts\Activate.ps1
> ```

**Windows Command Prompt (cmd.exe):**
```cmd
python -m venv venv
.\venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

---

### Step 3: Install Required Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

> **Windows Note on Timezones:** `requirements.txt` includes `tzdata`, which is required on Windows for Python's standard library `zoneinfo` module to parse Indian Standard Time (`Asia/Kolkata`). Additionally, `itsdangerous` is included for secure admin session handling.

---

### Step 4: Configure Environment (`.env`)
Copy `.env.example` to `.env` (or verify `.env` is present in the root folder):
```powershell
Copy-Item .env.example .env
```
Key defaults in `.env`:
```ini
APP_ENV=development
SECRET_KEY=cyberdyne_t800_antrothon_secret_key_2027
PORT=8000
HOST=127.0.0.1

ADMIN_USERNAME=admin
ADMIN_PASSWORD=terminator27

# Razorpay Keys (Leave blank to use the high-fidelity test payment simulator)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

REGISTRATION_FEE_INR=300
FINALIST_FEE_PER_HEAD_INR=350
MIN_TEAM_MEMBERS=4
MAX_TEAM_MEMBERS=6

REGISTRATION_OPEN_DATE=2026-10-30T00:00:00
REGISTRATION_DEADLINE=2026-12-20T23:59:59
FINALIST_ANNOUNCEMENT_DATE=2026-12-27T18:00:00
HACKATHON_START_DATE=2027-01-07T09:00:00
HACKATHON_END_DATE=2027-01-08T09:00:00

FORCE_UNLOCK_REGISTRATION=false
```

---

### Step 5 (Optional): Seed Demo Registrations
To populate the database with realistic sample teams and test the admin dashboard and Excel export:
```powershell
python scripts/seed_demo_data.py
```

---

### Step 6: Launch Server

**Option A (Recommended Server Runner):**
```powershell
python run_server.py
```

**Option B (Direct Uvicorn Command):**
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Access the application in your browser:
- **Public Portal:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Registration Form:** [http://127.0.0.1:8000/register](http://127.0.0.1:8000/register) *(use `?preview=true` to test the wizard before 30 Oct)*
- **Admin Dashboard:** [http://127.0.0.1:8000/admin](http://127.0.0.1:8000/admin) *(Username: `admin` | Password: `terminator27`)*

---

### 🔧 Troubleshooting Common Errors

| Issue | Cause | Solution |
|---|---|---|
| `ZoneInfoNotFoundError: 'No time zone found with key Asia/Kolkata'` | Windows lacks native IANA tz database for Python `zoneinfo`. | Run `pip install tzdata` (now included in `requirements.txt`). An automatic UTC+05:30 fallback is also built into `app/config.py`. |
| `ModuleNotFoundError: No module named 'itsdangerous'` | Missing session serializer dependency. | Run `pip install itsdangerous` (included in `requirements.txt`). |
| `PSSecurityException: Execution of scripts is disabled on this system` | Windows PowerShell execution policy restriction. | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then activate `venv`. |
| `ModuleNotFoundError: No module named 'app'` | Running scripts from a subfolder without root directory in Python path. | Both `run_server.py` and `scripts/seed_demo_data.py` now automatically resolve the project root into `sys.path`. |

---

## 🧭 Routes & Endpoints
| URL | Description |
|---|---|
| `/` | Landing page (Hero, Countdown, 3 Thematic Tracks, Timeline, Team, FAQ) |
| `/tracks` | Redirects to `/#tracks` (3 Thematic Tracks) |
| `/register` | Team Registration Wizard (Open & Active with Launch Intimation) |
| `/confirmation/{team_code}` | Cyber Ticket & Payment Confirmation Receipt |
| `/admin/login` | Admin Authentication Terminal |
| `/admin` | Admin Dashboard (Metrics, Dossiers, Status Controls) |
| `/api/admin/export/excel` | **Export registrations to Excel (.xlsx)** |
| `/api/admin/export/csv` | **Export registrations to CSV (.csv)** |
| `/api/admin/registration/{id}` | **DELETE registration record & attached files** |

---

## 👥 Organizing Committee Contacts
- **Vasikaran A (Lead Organizer):** 9360531897 | karanvasi80@gmail.com | [@vxsi93](https://www.instagram.com/vxsi93/) | [LinkedIn](https://www.linkedin.com/in/vasikaran-a-813b5531b)
- **Abdul Fahaad A.K (Core Coordinator):** 9677037457
- **Cleven J (Technical Operations):** 9962753510 | clevenmichaelrajj@gmail.com | [@cxrtheofxspixx](https://www.instagram.com/cxrtheofxspixx/) | [LinkedIn](https://www.linkedin.com/in/clevenmichaelraj/)
- **Alan K Rison (Event Logistics):** 9940293860 | alanrison2@gmail.com | [@alanspeakable](https://www.instagram.com/alanspeakable/) | [LinkedIn](https://www.linkedin.com/in/alan-k-rison-6b0a2b30a/)
