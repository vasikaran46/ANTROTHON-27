import requests
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv("D:/Antrothon/.env", override=True)
webhook_url = os.getenv("GOOGLE_DRIVE_WEBHOOK_URL", "")

print("=" * 60)
print("GOOGLE APPS SCRIPT WEBHOOK DIAGNOSTIC")
print("=" * 60)
print("Webhook URL:", webhook_url)

try:
    res = requests.get(webhook_url, timeout=10)
    data = res.json()
    print("\nLive Webhook Response:")
    print(json.dumps(data, indent=2))
    
    if data.get("version") == "2.1":
        print("\n[+] Webhook is UP-TO-DATE (Version 2.1 - Multi-Folder Enabled)!")
    else:
        print("\n[!] Webhook is RUNNING AN OLD CODE VERSION!")
        print("    The deployed Apps Script does not yet support multi-folder routing.")
        print("    In Google Apps Script, update Code.gs and Deploy -> Manage Deployments -> New Version.")
except Exception as e:
    print("[!] Error connecting to webhook:", e)
