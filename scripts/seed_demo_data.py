import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import json
from datetime import datetime, timedelta
from app.database import SessionLocal, init_db, Registration, PreRegistrationAlert

def seed():
    init_db()
    db = SessionLocal()

    # Check if records exist
    if db.query(Registration).count() > 0:
        print("Registrations table already contains records. Skipping seed.")
        db.close()
        return

    sample_teams = [
        {
            "team_code": "ANTRO-27-0101-A1B2",
            "team_name": "Cyberdyne Guardians",
            "track": "Track 1: Human Safety, Rights & Empowerment",
            "project_title": "AI Sentinel: Autonomous Emergency Transit Safety for Women",
            "project_synopsis": "A wearable edge-AI SOS device combining biometric distress monitoring and low-latency mesh alert beaconing for women navigating transit corridors.",
            "leader_name": "Karthik Subramanian",
            "leader_email": "karthik.s@patriciancollege.ac.in",
            "leader_phone": "9840112233",
            "leader_college": "Patrician College of Arts and Science",
            "leader_department": "B.Sc Computer Science",
            "leader_year": "3rd Year",
            "member_count": 4,
            "members": [
                {"name": "Sneha R", "email": "sneha.r@gmail.com", "phone": "9840223344", "college": "Patrician College", "department": "B.Sc CS", "year": "3rd Year"},
                {"name": "Dinesh Kumar", "email": "dinesh.k@gmail.com", "phone": "9840334455", "college": "Patrician College", "department": "B.Com", "year": "2nd Year"},
                {"name": "Pooja V", "email": "pooja.v@gmail.com", "phone": "9840445566", "college": "Patrician College", "department": "B.A English", "year": "3rd Year"}
            ],
            "payment_status": "paid",
            "amount_paid": 300,
            "status": "shortlisted_finalist"
        },
        {
            "team_code": "ANTRO-27-0102-C3D4",
            "team_name": "Neural Pioneers",
            "track": "Track 2: Health, Education & Digital Innovation",
            "project_title": "VernacLearn: Vernacular Offline LLM for Primary Classrooms",
            "project_synopsis": "An offline-first educational system delivering interactive Tamil & English STEM instruction running locally on low-cost Raspberry Pi micro-servers.",
            "leader_name": "Abinaya Meenakshi",
            "leader_email": "abinaya.m@loyola.edu",
            "leader_phone": "9789123456",
            "leader_college": "Loyola College Chennai",
            "leader_department": "B.Sc Data Science",
            "leader_year": "2nd Year",
            "member_count": 5,
            "members": [
                {"name": "Rahul Verma", "email": "rahul.v@loyola.edu", "phone": "9789234567", "college": "Loyola College", "department": "B.Sc Physics", "year": "2nd Year"},
                {"name": "Ananya Sri", "email": "ananya.s@loyola.edu", "phone": "9789345678", "college": "Loyola College", "department": "B.Sc CS", "year": "2nd Year"},
                {"name": "Gokul Nath", "email": "gokul.n@loyola.edu", "phone": "9789456789", "college": "Loyola College", "department": "B.A Economics", "year": "3rd Year"},
                {"name": "Deepak Raj", "email": "deepak.r@loyola.edu", "phone": "9789567890", "college": "Loyola College", "department": "B.Sc Maths", "year": "2nd Year"}
            ],
            "payment_status": "paid",
            "amount_paid": 300,
            "status": "under_review"
        },
        {
            "team_code": "ANTRO-27-0103-E5F6",
            "team_name": "TerraForge Systems",
            "track": "Track 3: Sustainability, Smart Communities & Social Entrepreneurship",
            "project_title": "AquaGrid: Hyperlocal Community Rainwater & Leak Telemetry",
            "project_synopsis": "IoT acoustic sensor network detecting municipal water leakages and optimizing apartment rooftop rainwater harvesting in Chennai.",
            "leader_name": "Vigneshwaran P",
            "leader_email": "vignesh.p@annauniv.edu",
            "leader_phone": "9444111222",
            "leader_college": "College of Engineering Guindy (Anna University)",
            "leader_department": "B.Tech IT",
            "leader_year": "4th Year",
            "member_count": 4,
            "members": [
                {"name": "Siddharth Menon", "email": "sid.m@annauniv.edu", "phone": "9444222333", "college": "CEG Anna Univ", "department": "B.E ECE", "year": "4th Year"},
                {"name": "Lavanya B", "email": "lavanya.b@annauniv.edu", "phone": "9444333444", "college": "CEG Anna Univ", "department": "B.Tech IT", "year": "4th Year"},
                {"name": "Rohan George", "email": "rohan.g@annauniv.edu", "phone": "9444444555", "college": "CEG Anna Univ", "department": "B.E Mech", "year": "4th Year"}
            ],
            "payment_status": "paid",
            "amount_paid": 300,
            "status": "shortlisted_finalist"
        }
    ]

    for item in sample_teams:
        reg = Registration(
            team_code=item["team_code"],
            team_name=item["team_name"],
            track=item["track"],
            project_title=item["project_title"],
            project_synopsis=item["project_synopsis"],
            leader_name=item["leader_name"],
            leader_email=item["leader_email"],
            leader_phone=item["leader_phone"],
            leader_college=item["leader_college"],
            leader_department=item["leader_department"],
            leader_year=item["leader_year"],
            member_count=item["member_count"],
            amount_paid=item["amount_paid"],
            payment_status=item["payment_status"],
            payment_mode="simulator",
            razorpay_order_id=f"order_seed_{item['team_code'][-4:]}",
            razorpay_payment_id=f"pay_seed_{item['team_code'][-4:]}",
            status=item["status"],
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        reg.set_members(item["members"])
        db.add(reg)

    # Sample alert leads
    leads = [
        PreRegistrationAlert(full_name="Meera Krishnan", email="meera.k@gmail.com", college="Stella Maris College", track_interest="Track 1: Human Safety, Rights & Empowerment"),
        PreRegistrationAlert(full_name="Arjun Nambiar", email="arjun.n@gmail.com", college="SRM University", track_interest="Track 2: Health, Education & Digital Innovation")
    ]
    for l in leads:
        db.add(l)

    db.commit()
    db.close()
    print("Seed data injected successfully!")

if __name__ == "__main__":
    seed()
