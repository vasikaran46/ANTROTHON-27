import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "antrothon.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    team_code = Column(String(32), unique=True, index=True, nullable=False)
    team_name = Column(String(128), nullable=False)
    college_name = Column(String(256), nullable=True)
    track = Column(String(128), nullable=False)
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

class PreRegistrationAlert(Base):
    __tablename__ = "preregistration_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), index=True, nullable=False)
    college = Column(String(256), nullable=True)
    track_interest = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Check and add new columns if table already exists
    try:
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
                ("idea_ppt_path", "VARCHAR(256)")
            ]
            for col_name, col_type in new_cols:
                if col_name not in columns:
                    cursor.execute(f"ALTER TABLE registrations ADD COLUMN {col_name} {col_type}")
            
            # Case-insensitive unique index on team_name
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_team_name_lower ON registrations(LOWER(team_name))")
            conn.connection.commit()
    except Exception as e:
        print(f"[*] Note during DB migration check: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

