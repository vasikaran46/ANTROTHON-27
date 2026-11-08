import json
import logging
import os
import re
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    Index,
    inspect,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("antrothon.database")

# ---------------------------------------------------------------------------
# Database URL Sanitizer
# ---------------------------------------------------------------------------
def sanitize_database_url(url: str) -> str:
    """
    Sanitizes database URL by:
    1. Removing duplicated keys like 'SUPABASE_DB_URL='
    2. Stripping wrapping quotes
    3. Ensuring postgresql+psycopg2 dialect
    4. Safely URL-encoding password special characters (e.g., quotes, @, etc.)
    """
    if not url:
        return ""
    
    # Strip duplicated variable name if copied by mistake
    url = re.sub(r"^(SUPABASE_DB_URL|DATABASE_URL)\s*=\s*", "", url.strip(), flags=re.IGNORECASE).strip()
    
    # Strip surrounding quotes if wrapped
    if (url.startswith('"') and url.endswith('"')) or (url.startswith("'") and url.endswith("'")):
        url = url[1:-1].strip()

    # Match scheme://user:password@host_and_rest
    match = re.match(r"^([a-zA-Z0-9_\+]+)://([^:]+):(.*)@([^@]+)$", url)
    if match:
        scheme, user, password, host_and_rest = match.groups()
        if scheme in ("postgres", "postgresql"):
            scheme = "postgresql+psycopg2"
        # Safely quote password
        clean_password = urllib.parse.quote_plus(urllib.parse.unquote_plus(password))
        return f"{scheme}://{user}:{clean_password}@{host_and_rest}"

    if url.startswith("postgres://"):
        url = re.sub(r"^postgres://", "postgresql+psycopg2://", url, count=1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = re.sub(r"^postgresql://", "postgresql+psycopg2://", url, count=1)

    return url

# ---------------------------------------------------------------------------
# Database Engine Initialization
# ---------------------------------------------------------------------------
raw_db_url = os.getenv("SUPABASE_DB_URL", "").strip() or os.getenv("DATABASE_URL", "").strip()
IS_SUPABASE = False
engine = None

if raw_db_url:
    try:
        sanitized_url = sanitize_database_url(raw_db_url)
        logger.info("[*] Testing Supabase PostgreSQL connection...")
        is_vercel = bool(os.getenv("VERCEL"))
        engine_kwargs = {
            "pool_pre_ping": True,
            "connect_args": {"connect_timeout": 15}
        }
        if is_vercel:
            from sqlalchemy.pool import NullPool
            engine_kwargs["poolclass"] = NullPool
        else:
            engine_kwargs.update({
                "pool_size": 5,
                "max_overflow": 10,
                "pool_recycle": 300
            })
        candidate_engine = create_engine(sanitized_url, **engine_kwargs)
        # Probe connection to verify credentials and connectivity
        with candidate_engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
        
        engine = candidate_engine
        DATABASE_URL = sanitized_url
        IS_SUPABASE = True
        logger.info("[+] Successfully connected to Supabase PostgreSQL!")
    except Exception as e:
        logger.warning(
            "[*] WARNING: Could not connect to Supabase PostgreSQL (%s).\n"
            "[*] Falling back to local SQLite database until Supabase credentials are authenticated.",
            e
        )
        engine = None

if engine is None:
    DB_PATH = BASE_DIR / "antrothon.db"
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    IS_SUPABASE = False
    logger.info("[*] Running with local SQLite database at: %s", DB_PATH)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def is_supabase_connected() -> bool:
    """Returns True if the engine is currently connected to Supabase PostgreSQL."""
    return IS_SUPABASE


# ---------------------------------------------------------------------------
# Optional Supabase REST Client
# ---------------------------------------------------------------------------
_supabase_client = None

def get_supabase_client():
    """
    Returns an instance of the Supabase Client (from `supabase-py`)
    using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.
    Returns None if credentials are not configured.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    if supabase_url.endswith("/rest/v1"):
        supabase_url = supabase_url[:-8]

    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
        or os.getenv("SUPABASE_KEY", "").strip()
    )

    if supabase_url and supabase_key:
        try:
            from supabase import create_client
            _supabase_client = create_client(supabase_url, supabase_key)
            logger.info("[+] Supabase REST client initialized successfully.")
            return _supabase_client
        except Exception as e:
            logger.error("Failed to initialize Supabase REST client: %s", e)
            return None
    return None


# ---------------------------------------------------------------------------
# Database Models
# ---------------------------------------------------------------------------

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    team_code = Column(String(32), unique=True, index=True, nullable=False)
    team_name = Column(String(128), index=True, nullable=False)
    college_name = Column(String(256), nullable=True)
    track = Column(String(128), nullable=False)

    # Legacy project fields (maintained for backward compatibility)
    project_title = Column(String(256), nullable=True)
    project_synopsis = Column(Text, nullable=True)

    # Idea Submission Dossier (SIH Format)
    idea_title = Column(String(100), nullable=True)
    idea_description = Column(Text, nullable=True)
    idea_summary = Column(Text, nullable=True)
    idea_ppt_filename = Column(String(256), nullable=True)
    idea_ppt_path = Column(String(256), nullable=True)

    # Leader Information
    leader_name = Column(String(128), nullable=False)
    leader_email = Column(String(128), index=True, nullable=False)
    leader_phone = Column(String(20), nullable=False)
    leader_college = Column(String(256), nullable=False)
    leader_degree = Column(String(128), nullable=True)
    leader_department = Column(String(128), nullable=False)
    leader_year = Column(String(32), nullable=False)
    leader_gender = Column(String(32), nullable=True)
    leader_id_number = Column(String(64), nullable=True)

    # Member count & structured member list
    member_count = Column(Integer, default=4)
    members_data = Column(Text, default="[]")  # JSON encoded list of member objects

    # Payment details
    amount_paid = Column(Integer, default=300)
    payment_status = Column(String(32), default="pending")  # pending, paid, failed, simulated
    payment_mode = Column(String(32), default="razorpay")   # razorpay, simulator
    razorpay_order_id = Column(String(128), nullable=True)
    razorpay_payment_id = Column(String(128), nullable=True)
    razorpay_signature = Column(String(256), nullable=True)
    payment_timestamp = Column(DateTime, nullable=True)

    # Review / Finalist status
    status = Column(String(32), default="submitted")  # submitted, under_review, shortlisted_finalist, waitlist, rejected
    admin_notes = Column(Text, nullable=True)
    finalist_paid = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_members(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.members_data or "[]")
        except Exception:
            return []

    def set_members(self, members_list: List[Dict[str, Any]]):
        self.members_data = json.dumps(members_list)
        # Keep member_count synchronized with members_list + leader (1)
        if isinstance(members_list, list):
            self.member_count = len(members_list) + 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "team_code": self.team_code,
            "team_name": self.team_name,
            "college_name": self.college_name,
            "track": self.track,
            "project_title": self.project_title,
            "project_synopsis": self.project_synopsis,
            "idea_title": self.idea_title,
            "idea_description": self.idea_description,
            "idea_summary": self.idea_summary,
            "idea_ppt_filename": self.idea_ppt_filename,
            "idea_ppt_path": self.idea_ppt_path,
            "leader_name": self.leader_name,
            "leader_email": self.leader_email,
            "leader_phone": self.leader_phone,
            "leader_college": self.leader_college,
            "leader_degree": self.leader_degree or "",
            "leader_department": self.leader_department,
            "leader_year": self.leader_year,
            "leader_gender": self.leader_gender or "",
            "leader_id_number": self.leader_id_number or "",
            "member_count": self.member_count,
            "members_data": self.members_data,
            "members": self.get_members(),
            "amount_paid": self.amount_paid,
            "payment_status": self.payment_status,
            "payment_mode": self.payment_mode,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "razorpay_signature": self.razorpay_signature,
            "payment_timestamp": self.payment_timestamp.isoformat() if self.payment_timestamp else None,
            "status": self.status,
            "admin_notes": self.admin_notes or "",
            "finalist_paid": self.finalist_paid,
        }

    def apply_dict(self, data: Dict[str, Any]):
        for key, val in data.items():
            if key in ("id", "created_at", "updated_at"):
                continue
            if key == "members":
                self.set_members(val)
                continue
            if key == "payment_timestamp" and val:
                if isinstance(val, str):
                    try:
                        self.payment_timestamp = datetime.fromisoformat(val)
                    except Exception:
                        pass
                continue
            if hasattr(self, key):
                setattr(self, key, val)


class RegistrationAuditLog(Base):
    __tablename__ = "registration_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    registration_id = Column(Integer, index=True, nullable=True)
    team_code = Column(String(32), index=True, nullable=False)
    team_name = Column(String(128), nullable=False)
    changed_by = Column(String(64), default="admin")
    action = Column(String(32), default="edit")  # 'edit' or 'undo'
    changes_summary = Column(Text, nullable=True)
    changes_json = Column(Text, nullable=False)   # JSON: {"field": {"old": ..., "new": ...}}
    snapshot_before = Column(Text, nullable=False)  # Full JSON dict before edit
    snapshot_after = Column(Text, nullable=False)   # Full JSON dict after edit
    is_undone = Column(Boolean, default=False)
    undone_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def get_changes(self) -> Dict[str, Any]:
        try:
            return json.loads(self.changes_json or "{}")
        except Exception:
            return {}

    def get_snapshot_before(self) -> Dict[str, Any]:
        try:
            return json.loads(self.snapshot_before or "{}")
        except Exception:
            return {}

    def get_snapshot_after(self) -> Dict[str, Any]:
        try:
            return json.loads(self.snapshot_after or "{}")
        except Exception:
            return {}

    def get_created_at_ist(self) -> str:
        import datetime as dt_mod
        try:
            from zoneinfo import ZoneInfo
            ist_tz = ZoneInfo("Asia/Kolkata")
        except Exception:
            ist_tz = dt_mod.timezone(dt_mod.timedelta(hours=5, minutes=30), name="IST")
        
        utc_dt = self.created_at
        if utc_dt:
            if utc_dt.tzinfo is None:
                utc_dt = utc_dt.replace(tzinfo=dt_mod.timezone.utc)
            local_dt = utc_dt.astimezone(ist_tz)
            return local_dt.strftime("%d %b %Y, %I:%M %p IST")
        return "-"


class PreRegistrationAlert(Base):
    __tablename__ = "preregistration_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), index=True, nullable=False)
    college = Column(String(256), nullable=True)
    track_interest = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """
    Initializes tables in Supabase PostgreSQL (or fallback SQLite).
    Safe to run repeatedly; uses create_all() to create missing tables.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("[+] Database schema verified / created successfully.")

        # If on SQLite, maintain existing column migration check
        if not IS_SUPABASE:
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(registrations)")
                columns = [row[1] for row in cursor.fetchall()]
                new_cols = [
                    ("college_name", "VARCHAR(256)"),
                    ("idea_title", "VARCHAR(100)"),
                    ("idea_description", "TEXT"),
                    ("idea_summary", "TEXT"),
                    ("idea_ppt_filename", "VARCHAR(256)"),
                    ("idea_ppt_path", "VARCHAR(256)"),
                    ("leader_degree", "VARCHAR(128)"),
                    ("leader_gender", "VARCHAR(32)")
                ]
                for col_name, col_type in new_cols:
                    if col_name not in columns:
                        cursor.execute(f"ALTER TABLE registrations ADD COLUMN {col_name} {col_type}")

                cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_team_name_lower ON registrations(LOWER(team_name))")
                conn.connection.commit()
        else:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE registrations ADD COLUMN IF NOT EXISTS leader_degree VARCHAR(128);"))
                    conn.execute(text("ALTER TABLE registrations ADD COLUMN IF NOT EXISTS leader_gender VARCHAR(32);"))
                    conn.commit()
                except Exception as pg_err:
                    logger.debug("PostgreSQL column verification note: %s", pg_err)
    except Exception as e:
        logger.error("[!] Note during DB initialization: %s", e)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
