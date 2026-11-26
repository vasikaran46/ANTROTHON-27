import os
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path("D:/Antrothon")
sys.path.insert(0, str(PROJECT_ROOT))
os.chdir(str(PROJECT_ROOT))

from app.config import settings
from app.database import Registration, init_db, SessionLocal
from app.services.export import generate_excel_spreadsheet, generate_csv_spreadsheet
from datetime import datetime

print("=" * 60)
print("ANTROTHON'27 — PAYMENT SCREENSHOT & QR INTEGRATION TEST")
print("=" * 60)

# 1. Config Check
print(f"[+] Payment Mode: {settings.PAYMENT_MODE}")
print(f"[+] UPI Payee: {settings.UPI_PAYEE_NAME} ({settings.UPI_ID})")
print(f"[+] UPI QR Image: {settings.UPI_QR_IMAGE}")
print(f"[+] Registration Fee: Rs. {settings.REGISTRATION_FEE_INR}")
print(f"[+] Drive Upload Folder ID: {settings.GOOGLE_DRIVE_FOLDER_ID}")
print(f"[+] Drive Payment Folder ID: {settings.GOOGLE_DRIVE_PAYMENT_FOLDER_ID or '(falls back to GOOGLE_DRIVE_FOLDER_ID)'}")
print(f"[+] WhatsApp Track 1: {settings.WHATSAPP_TRACK_1_URL}")
print(f"[+] WhatsApp Track 2: {settings.WHATSAPP_TRACK_2_URL}")
print(f"[+] WhatsApp Track 3: {settings.WHATSAPP_TRACK_3_URL}")

# 2. Database Model Check
sample_reg = Registration(
    id=999,
    team_code="ANTRO-27-TEST-999",
    team_name="Cyber Sentinel Test",
    track="Track 1: Human Safety, Rights & Empowerment",
    leader_name="Test Commander",
    leader_email="commander@test.edu",
    leader_phone="9876543210",
    leader_college="Patrician College",
    leader_degree="B.Sc",
    leader_department="Computer Science",
    leader_year="3rd Year",
    leader_gender="Male",
    member_count=3,
    status="submitted",
    amount_paid=settings.REGISTRATION_FEE_INR,
    payment_status="paid",
    payment_mode="upi_qr",
    razorpay_payment_id="412345678901",
    payment_screenshot_filename="ANTRO-27-TEST-999_Payment_Receipt_gpay.jpg",
    payment_screenshot_url="https://drive.google.com/file/d/1TEST_PAYMENT_RECEIPT_ID/view?usp=drivesdk",
    idea_title="Autonomous Drone Safety Mesh",
    idea_summary="Summary of drone mesh...",
    idea_description="Exhaustive details of the architecture...",
    created_at=datetime.utcnow()
)
sample_reg.set_members([
    {"name": "Crew Member Two", "email": "m2@test.edu", "phone": "9876543211", "gender": "Female", "degree": "BCA", "department": "CA", "year": "2nd Year"},
    {"name": "Crew Member Three", "email": "m3@test.edu", "phone": "9876543212", "gender": "Male", "degree": "B.Sc", "department": "CS", "year": "3rd Year"}
])

reg_dict = sample_reg.to_dict()
assert reg_dict["payment_screenshot_url"] == "https://drive.google.com/file/d/1TEST_PAYMENT_RECEIPT_ID/view?usp=drivesdk", "payment_screenshot_url mismatch in to_dict!"
assert reg_dict["payment_screenshot_filename"] == "ANTRO-27-TEST-999_Payment_Receipt_gpay.jpg", "payment_screenshot_filename mismatch in to_dict!"
print("[+] Registration.to_dict() serialized payment screenshot fields successfully!")

# 3. Export Check
excel_bytes = generate_excel_spreadsheet([sample_reg])
assert len(excel_bytes) > 1000, "Excel spreadsheet generation failed!"
print(f"[+] Excel generation succeeded: {len(excel_bytes)} bytes")

csv_str = generate_csv_spreadsheet([sample_reg])
assert "Payment Screenshot URL" in csv_str, "CSV header missing Payment Screenshot URL!"
assert "https://drive.google.com/file/d/1TEST_PAYMENT_RECEIPT_ID/view?usp=drivesdk" in csv_str, "CSV row missing screenshot URL!"
print("[+] CSV generation succeeded and contains Payment Screenshot URL!")

# 4. Template Rendering Check
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader(str(PROJECT_ROOT / "app" / "templates")))

# Test register.html
reg_tmpl = env.get_template("register.html")
reg_rendered = reg_tmpl.render({
    "settings": settings,
    "request": None,
    "user": None
})
assert "id=\"payment_screenshot\"" in reg_rendered, "register.html missing payment_screenshot input!"
assert "id=\"screenshot-drop-zone\"" in reg_rendered, "register.html missing screenshot-drop-zone!"
assert "id=\"sum-screenshot-file\"" in reg_rendered, "register.html missing sum-screenshot-file in summary!"
print("[+] register.html rendered successfully with Payment Screenshot dropzone!")

# Test confirmation.html
conf_tmpl = env.get_template("confirmation.html")
conf_rendered = conf_tmpl.render({
    "settings": settings,
    "registration": sample_reg,
    "members": sample_reg.get_members(),
    "request": None
})
assert "Join the ANTROTHON'27 WhatsApp Community" in conf_rendered, "confirmation.html missing WhatsApp box!"
assert "https://chat.whatsapp.com/EPgo06iFowmIFyoEk3Elww" in conf_rendered, "confirmation.html missing Track 1 WhatsApp link!"
assert "View Uploaded Screenshot in Google Drive" in conf_rendered, "confirmation.html missing Payment Screenshot Drive link!"
print("[+] confirmation.html rendered successfully with WhatsApp links and Screenshot link!")

# Test admin/dashboard.html
dash_tmpl = env.get_template("admin/dashboard.html")
dash_rendered = dash_tmpl.render({
    "settings": settings,
    "registrations": [sample_reg],
    "total_registrations": 1,
    "total_paid": 1,
    "total_revenue": 200,
    "total_pending": 0,
    "total_finalists": 0,
    "finalist_teams": 0,
    "total_finalists_quota": 45,
    "total_participants": 3,
    "total_revenue_inr": 200,
    "total_leads": 0,
    "track1_count": 1,
    "track2_count": 0,
    "track3_count": 0,
    "recent_audit_logs": [],
    "total_audits": 0,
    "selected_track": "",
    "selected_status": "",
    "search_term": "",
    "request": None
})
assert "dos-screenshot-link" in dash_rendered, "admin/dashboard.html missing dos-screenshot-link!"
assert "Screenshot &#8599;" in dash_rendered, "admin/dashboard.html missing Screenshot button in table!"
print("[+] admin/dashboard.html rendered successfully with Screenshot button and modal link!")

print("=" * 60)
print("ALL VERIFICATION CHECKS PASSED PERFECTLY!")
print("=" * 60)
