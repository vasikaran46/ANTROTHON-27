"""
ANTROTHON'27 — Google Drive Integration Service
Uploads participant presentation files (.pptx, .ppt, .pdf) directly
to the organizer's Google Drive and returns shareable Google Drive URLs
to be stored in Supabase PostgreSQL.

Supported Authentication Methods in .env:
1. Google Cloud Service Account (Recommended for automated server upload):
   - Drop 'service_account.json' into the project root directory
   - OR set GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...} in .env
   - GOOGLE_DRIVE_FOLDER_ID (Destination Google Drive Folder ID)

2. Google Apps Script Webhook (Alternative zero-cloud-console method):
   - GOOGLE_DRIVE_WEBHOOK_URL=https://script.google.com/macros/s/.../exec

3. OAuth2 Refresh Token:
   - GOOGLE_DRIVE_CLIENT_ID
   - GOOGLE_DRIVE_CLIENT_SECRET
   - GOOGLE_DRIVE_REFRESH_TOKEN
   - GOOGLE_DRIVE_FOLDER_ID
"""

import os
import time
import json
import base64
import logging
from pathlib import Path
from typing import Optional, Tuple

import requests
import jwt

logger = logging.getLogger("antrothon.gdrive")

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink"
GOOGLE_DRIVE_PERMISSIONS_URL = "https://www.googleapis.com/drive/v3/files/{file_id}/permissions"


class GoogleDriveService:
    def __init__(self):
        self.project_root = Path(__file__).resolve().parent.parent.parent
        self.folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "").strip()
        self.webhook_url = os.getenv("GOOGLE_DRIVE_WEBHOOK_URL", "").strip() or os.getenv("GOOGLE_DRIVE_SCRIPT_URL", "").strip()
        self.sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
        self.sa_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "").strip()
        self.access_token = os.getenv("GOOGLE_DRIVE_ACCESS_TOKEN", "").strip() or os.getenv("GOOGLE_DRIVE_API_KEY", "").strip()
        self.client_id = os.getenv("GOOGLE_DRIVE_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("GOOGLE_DRIVE_CLIENT_SECRET", "").strip()
        self.refresh_token = os.getenv("GOOGLE_DRIVE_REFRESH_TOKEN", "").strip()

        # Check for service_account.json in project root automatically
        auto_sa_path = self.project_root / "service_account.json"
        if not self.sa_file and auto_sa_path.exists():
            self.sa_file = str(auto_sa_path)

    def is_configured(self) -> bool:
        """Returns True if any valid Google Drive authentication method is provided."""
        webhook = os.getenv("GOOGLE_DRIVE_WEBHOOK_URL", "").strip() or self.webhook_url
        return bool(
            webhook or
            self.sa_json_raw or
            self.sa_file or
            (self.access_token and not self.access_token.startswith("AIzaSy")) or
            (self.refresh_token and self.client_id)
        )

    def _get_access_token_from_service_account(self, sa_data: dict) -> Optional[str]:
        """Exchanges a Google Service Account JWT for a short-lived Bearer access token."""
        try:
            client_email = sa_data.get("client_email")
            private_key = sa_data.get("private_key")
            if not (client_email and private_key):
                logger.error("[!] Service Account JSON missing 'client_email' or 'private_key'")
                return None

            now = int(time.time())
            payload = {
                "iss": client_email,
                "scope": "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
                "aud": GOOGLE_TOKEN_URL,
                "exp": now + 3600,
                "iat": now,
            }

            signed_jwt = jwt.encode(payload, private_key, algorithm="RS256")
            res = requests.post(
                GOOGLE_TOKEN_URL,
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": signed_jwt,
                },
                timeout=15
            )
            if res.status_code == 200:
                token = res.json().get("access_token")
                logger.info("[+] Successfully authenticated via Google Service Account (%s)", client_email)
                return token
            else:
                logger.error("Failed to obtain Google access token: %s", res.text)
                return None
        except Exception as e:
            logger.error("Error creating Google JWT / access token: %s", e)
            return None

    def _get_access_token_from_refresh_token(self) -> Optional[str]:
        """Refreshes an OAuth2 access token using client credentials and refresh token."""
        try:
            res = requests.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=15
            )
            if res.status_code == 200:
                return res.json().get("access_token")
            else:
                logger.error("Failed to refresh Google OAuth token: %s", res.text)
                return None
        except Exception as e:
            logger.error("Error refreshing Google OAuth token: %s", e)
            return None

    def get_token(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolves an active Google Drive API access token from environment configurations.
        Returns (token, error_explanation).
        """
        # 1. Service Account JSON in env
        if self.sa_json_raw:
            try:
                if self.sa_json_raw.startswith("{"):
                    sa_data = json.loads(self.sa_json_raw)
                elif Path(self.sa_json_raw).exists():
                    with open(self.sa_json_raw, "r", encoding="utf-8") as f:
                        sa_data = json.load(f)
                else:
                    sa_data = None
                if sa_data:
                    token = self._get_access_token_from_service_account(sa_data)
                    if token:
                        return token, None
            except Exception as e:
                logger.warning("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: %s", e)

        # 2. Service Account file path (or auto service_account.json in project root)
        if self.sa_file and Path(self.sa_file).exists():
            try:
                with open(self.sa_file, "r", encoding="utf-8") as f:
                    sa_data = json.load(f)
                token = self._get_access_token_from_service_account(sa_data)
                if token:
                    return token, None
            except Exception as e:
                logger.warning("Failed to load GOOGLE_SERVICE_ACCOUNT_FILE (%s): %s", self.sa_file, e)

        # 3. OAuth Refresh Token
        if self.refresh_token and self.client_id and self.client_secret:
            token = self._get_access_token_from_refresh_token()
            if token:
                return token, None

        # 4. Check if user provided an API Key instead of Service Account
        if self.access_token:
            if self.access_token.startswith("AIzaSy"):
                err_msg = (
                    "Google Drive API rejected the API key (AIzaSy...). "
                    "Google Drive API requires a Service Account or OAuth token to upload files. "
                    "Please download a Service Account JSON key from Google Cloud Console "
                    "and place it as 'service_account.json' or set GOOGLE_SERVICE_ACCOUNT_JSON in .env."
                )
                logger.error("[!] %s", err_msg)
                return None, err_msg
            return self.access_token, None

        return None, "No Google Drive credentials configured"

    def _upload_via_apps_script(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        folder_id: Optional[str]
    ) -> Tuple[bool, str, Optional[str]]:
        """Uploads file through a deployed Google Apps Script Webhook."""
        webhook_url = os.getenv("GOOGLE_DRIVE_WEBHOOK_URL", "").strip() or os.getenv("GOOGLE_DRIVE_SCRIPT_URL", "").strip() or self.webhook_url
        if not webhook_url:
            return False, "Google Apps Script Webhook URL not set in GOOGLE_DRIVE_WEBHOOK_URL", None

        try:
            b64_str = base64.b64encode(file_bytes).decode("utf-8")
            target_folder = folder_id or os.getenv("GOOGLE_DRIVE_FOLDER_ID", "").strip() or self.folder_id
            payload = {
                "filename": filename,
                "mimeType": mime_type,
                "base64": b64_str,
                "folderId": target_folder
            }
            res = requests.post(webhook_url, json=payload, timeout=7, allow_redirects=True)

            content_type = res.headers.get("content-type", "")
            if "text/html" in content_type or res.text.strip().startswith("<!DOCTYPE html>"):
                return False, (
                    "Apps Script returned a Google login page instead of JSON. "
                    "In Apps Script: Click Deploy -> Manage deployments -> Edit -> Ensure 'Who has access' is set to 'Anyone' (not 'Only myself')."
                ), None

            try:
                data = res.json()
            except Exception:
                return False, f"Apps Script returned non-JSON response ({res.status_code}): {res.text[:200]}", None

            if data.get("success") and data.get("url"):
                return True, data.get("url"), data.get("id")
            elif data.get("url"):
                return True, data.get("url"), data.get("id")
            elif data.get("error"):
                return False, f"Apps Script reported error: {data.get('error')}", None

            return False, f"Apps Script unexpected response: {res.text[:200]}", None
        except Exception as e:
            return False, f"Apps Script upload failed: {e}", None

    def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str = "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        folder_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Uploads a presentation file to the designated Google Drive folder.
        Sets permission to public-readable ('Anyone with link can view').
        Returns (success, message_or_url, file_id).
        """
        target_folder = folder_id or os.getenv("GOOGLE_DRIVE_FOLDER_ID", "").strip() or self.folder_id
        active_webhook = os.getenv("GOOGLE_DRIVE_WEBHOOK_URL", "").strip() or os.getenv("GOOGLE_DRIVE_SCRIPT_URL", "").strip() or self.webhook_url

        # 1. Option: Apps Script Webhook
        if active_webhook:
            return self._upload_via_apps_script(file_bytes, filename, mime_type, target_folder)

        # 2. Option: Google Cloud REST API
        token, token_err = self.get_token()
        if not token:
            logger.warning("[!] Google Drive upload aborted: %s", token_err)
            return False, token_err or "Google Drive credentials not configured", None

        metadata = {
            "name": filename,
            "mimeType": mime_type,
        }
        if target_folder:
            metadata["parents"] = [target_folder]

        headers = {
            "Authorization": f"Bearer {token}"
        }

        files = {
            "data": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
            "file": (filename, file_bytes, mime_type)
        }

        try:
            upload_res = requests.post(
                GOOGLE_DRIVE_UPLOAD_URL,
                headers=headers,
                files=files,
                timeout=60
            )

            if upload_res.status_code not in (200, 201):
                err_text = upload_res.text
                logger.error("Google Drive upload failed (%s): %s", upload_res.status_code, err_text)
                return False, f"Google Drive API error: {err_text}", None

            data = upload_res.json()
            file_id = data.get("id")
            if not file_id:
                return False, "No file ID returned by Google Drive", None

            # Attempt to set public read permission so jury can open it
            try:
                requests.post(
                    GOOGLE_DRIVE_PERMISSIONS_URL.format(file_id=file_id),
                    headers=headers,
                    json={"role": "reader", "type": "anyone"},
                    timeout=10
                )
            except Exception as perm_err:
                logger.warning("Could not set public permission on Drive file %s: %s", file_id, perm_err)

            # Generate canonical Drive URL
            view_url = data.get("webViewLink") or f"https://drive.google.com/file/d/{file_id}/view?usp=sharing"
            logger.info("[+] File successfully uploaded to Google Drive: %s", view_url)
            return True, view_url, file_id

        except Exception as e:
            logger.error("Exception during Google Drive upload: %s", e)
            return False, str(e), None


# Singleton instance
gdrive_service = GoogleDriveService()
