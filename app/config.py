import os
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

try:
    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    from datetime import timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30), name="IST")

class Settings:
    APP_ENV: str = os.getenv("APP_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cyberdyne_t800_antrothon_secret_key_2027")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Admin Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "terminator27")
    
    # Razorpay
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "").strip()
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    
    # Fees & Members
    REGISTRATION_FEE_INR: int = int(os.getenv("REGISTRATION_FEE_INR", 300))
    FINALIST_FEE_PER_HEAD_INR: int = int(os.getenv("FINALIST_FEE_PER_HEAD_INR", 350))
    MIN_TEAM_MEMBERS: int = int(os.getenv("MIN_TEAM_MEMBERS", 4))
    MAX_TEAM_MEMBERS: int = int(os.getenv("MAX_TEAM_MEMBERS", 6))
    TOTAL_FINALISTS: int = 45
    
    # Milestones (stored in ISO format)
    REGISTRATION_OPEN_DATE_STR: str = os.getenv("REGISTRATION_OPEN_DATE", "2026-10-30T00:00:00")
    REGISTRATION_DEADLINE_STR: str = os.getenv("REGISTRATION_DEADLINE", "2026-12-20T23:59:59")
    FINALIST_ANNOUNCEMENT_DATE_STR: str = os.getenv("FINALIST_ANNOUNCEMENT_DATE", "2026-12-27T18:00:00")
    HACKATHON_START_DATE_STR: str = os.getenv("HACKATHON_START_DATE", "2027-01-07T09:00:00")
    HACKATHON_END_DATE_STR: str = os.getenv("HACKATHON_END_DATE", "2027-01-08T09:00:00")
    
    FORCE_UNLOCK_REGISTRATION: bool = os.getenv("FORCE_UNLOCK_REGISTRATION", "true").lower() in ("true", "1", "yes")

    @property
    def registration_open_date(self) -> datetime:
        return datetime.fromisoformat(self.REGISTRATION_OPEN_DATE_STR)

    @property
    def registration_deadline(self) -> datetime:
        return datetime.fromisoformat(self.REGISTRATION_DEADLINE_STR)

    @property
    def is_registration_open(self) -> bool:
        if self.FORCE_UNLOCK_REGISTRATION:
            return True
        now = datetime.now()
        return self.registration_open_date <= now <= self.registration_deadline

    @property
    def is_razorpay_configured(self) -> bool:
        return bool(self.RAZORPAY_KEY_ID and self.RAZORPAY_KEY_SECRET)

settings = Settings()
