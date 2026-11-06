"""
ANTROTHON'27 — Google Drive Upload Verification Script
Tests if files can be uploaded directly to the destination Google Drive folder
using the credentials specified in .env (or service_account.json).

Usage:
    python scripts/test_gdrive_upload.py
"""

import sys
import os
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from app.services.gdrive import gdrive_service


def test():
    print("=" * 60)
    print(" ANTROTHON'27 — GOOGLE DRIVE INTEGRATION TEST")
    print("=" * 60)

    print(f"[*] Target Folder ID: {gdrive_service.folder_id or '(Not set)'}")
    
    # Check what auth methods exist
    auto_sa = PROJECT_ROOT / "service_account.json"
    if auto_sa.exists():
        print(f"[+] Found 'service_account.json' in project root!")
    elif gdrive_service.sa_json_raw:
        print("[+] Found GOOGLE_SERVICE_ACCOUNT_JSON in .env")
    elif gdrive_service.sa_file:
        print(f"[+] Found GOOGLE_SERVICE_ACCOUNT_FILE: {gdrive_service.sa_file}")
    elif gdrive_service.webhook_url:
        print(f"[+] Found GOOGLE_DRIVE_WEBHOOK_URL")
    elif gdrive_service.access_token:
        print(f"[*] Found GOOGLE_DRIVE_API_KEY / ACCESS_TOKEN: {gdrive_service.access_token[:10]}...")

    print("\n[*] Attempting test upload to Google Drive...")
    dummy_bytes = b"ANTROTHON'27 Test Presentation Content - Google Drive Integration Verified"
    filename = "ANTROTHON27_Drive_Test_Upload.txt"

    success, result_url_or_err, file_id = gdrive_service.upload_file(
        file_bytes=dummy_bytes,
        filename=filename,
        mime_type="text/plain"
    )

    if success:
        print("\n" + "=" * 60)
        print(" [SUCCESS] File successfully uploaded to your Google Drive!")
        print("=" * 60)
        print(f" Direct View URL: {result_url_or_err}")
        print(f" File ID:         {file_id}")
        print("\n This link will now be automatically stored in Supabase PostgreSQL for all participant submissions.")
    else:
        print("\n" + "=" * 60)
        print(" [ERROR] Google Drive Upload Failed")
        print("=" * 60)
        print(f" Details: {result_url_or_err}\n")
        if not (os.getenv("GOOGLE_DRIVE_WEBHOOK_URL") or gdrive_service.webhook_url):
            print(" RECOMMENDED SOLUTION (Bypasses Google Cloud Policy & Key restrictions):")
            print(" Use a simple Google Apps Script Webhook deployed on your Google Account (karanvasi80@gmail.com).")
            print(" 1. Go to https://script.google.com/home/start")
            print(" 2. Paste the provided Apps Script code.")
            print(" 3. Click Deploy -> New deployment -> Web app -> Execute as: Me -> Access: Anyone.")
            print(" 4. Copy the Web app URL and paste it into .env as GOOGLE_DRIVE_WEBHOOK_URL=...")
            print(" 5. Re-run this script: python scripts/test_gdrive_upload.py")


if __name__ == "__main__":
    test()

