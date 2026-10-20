import json
import logging
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, Request, Form, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse, Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import init_db, get_db, Registration, PreRegistrationAlert
from app.services.payment import payment_service
from app.services.export import generate_excel_spreadsheet, generate_csv_spreadsheet

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("antrothon.main")

# Initialize database schema
init_db()

app = FastAPI(
    title="ANTROTHON'27 Hackathon Platform",
    description="Think Human. Innovate for Society. Inter-College Hackathon by PIIC",
    version="1.0.0"
)

# Add session middleware for admin authentication
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY, max_age=86400)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_PPT_DIR = BASE_DIR / "static" / "uploads" / "ppt"
UPLOAD_PPT_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Inject common context to all templates
def get_base_context(request: Request) -> dict:
    return {
        "request": request,
        "settings": settings,
        "now": datetime.now(),
        "is_reg_open": settings.is_registration_open,
        "reg_open_date_iso": settings.REGISTRATION_OPEN_DATE_STR,
        "reg_deadline_iso": settings.REGISTRATION_DEADLINE_STR,
        "hackathon_date_iso": settings.HACKATHON_START_DATE_STR,
        "razorpay_configured": settings.is_razorpay_configured,
        "razorpay_key_id": settings.RAZORPAY_KEY_ID or "rzp_test_simulated"
    }

# ----------------- PUBLIC ROUTES ----------------- #

@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request, db: Session = Depends(get_db)):
    context = get_base_context(request)
    total_reg = db.query(Registration).filter(Registration.payment_status == "paid").count()
    context["total_registered_teams"] = total_reg
    return templates.TemplateResponse(request=request, name="index.html", context=context)

@app.get("/download/idea-template")
async def download_idea_template():
    """
    Serves the official ANTROTHON'27 Idea Presentation PPT Template (SIH Standard).
    """
    ppt_path = BASE_DIR / "static" / "downloads" / "ANTROTHON27_Idea_Presentation_Template.pptx"
    if not ppt_path.exists():
        from scripts.generate_ppt_template import create_template
        create_template()
    return FileResponse(
        path=str(ppt_path),
        filename="ANTROTHON27_Idea_Presentation_Template.pptx",
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )

@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    context = get_base_context(request)
    context["allow_registration"] = True
    context["official_launch_date"] = "30 October 2026"
    return templates.TemplateResponse(request=request, name="register.html", context=context)

@app.get("/confirmation/{team_code}", response_class=HTMLResponse)
async def confirmation_page(request: Request, team_code: str, db: Session = Depends(get_db)):
    context = get_base_context(request)
    reg = db.query(Registration).filter(Registration.team_code == team_code).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration record not found.")
    context["registration"] = reg
    context["members"] = reg.get_members()
    return templates.TemplateResponse(request=request, name="confirmation.html", context=context)

# ----------------- CONVENIENCE NAV ROUTES ----------------- #

@app.get("/tracks")
async def nav_tracks():
    return RedirectResponse("/#tracks", status_code=status.HTTP_302_FOUND)

@app.get("/schedule")
@app.get("/timeline")
async def nav_schedule():
    return RedirectResponse("/#timeline", status_code=status.HTTP_302_FOUND)

@app.get("/about")
async def nav_about():
    return RedirectResponse("/#about", status_code=status.HTTP_302_FOUND)

@app.get("/fees")
@app.get("/rules")
async def nav_fees():
    return RedirectResponse("/#fees", status_code=status.HTTP_302_FOUND)

@app.get("/team")
@app.get("/contact")
async def nav_team():
    return RedirectResponse("/#team", status_code=status.HTTP_302_FOUND)

@app.get("/faq")
async def nav_faq():
    return RedirectResponse("/#faq", status_code=status.HTTP_302_FOUND)

# ----------------- REGISTRATION & PAYMENT API ----------------- #

@app.get("/api/check-team-name")
def api_check_team_name(name: str = Query("", description="Team name to verify"), db: Session = Depends(get_db)):
    clean_name = name.strip()
    if not clean_name:
        return {"available": False, "message": "Team name cannot be empty."}
    
    # Check if team name already exists case-insensitively
    existing = db.query(Registration).filter(
        func.lower(Registration.team_name) == clean_name.lower()
    ).first()

    if existing:
        return {
            "available": False,
            "message": f"Team name '{clean_name}' is already reserved by another team (team names are unique & case-insensitive).",
            "existing_name": existing.team_name
        }
    
    return {
        "available": True,
        "message": f"Team name '{clean_name}' is available for registration."
    }

@app.post("/api/register")
async def api_submit_registration(request: Request, db: Session = Depends(get_db)):
    """
    Validates team data, idea dossier, PPT presentation upload,
    and generates a ₹300 payment order.
    Enforces team size 4 to 6 members.
    """
    content_type = request.headers.get("content-type", "")
    data = {}
    idea_ppt_file = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        for k, v in form.items():
            if k == "idea_ppt":
                idea_ppt_file = v
            else:
                data[k] = v
        
        # Parse members JSON if sent as string
        if isinstance(data.get("members"), str):
            try:
                data["members"] = json.loads(data["members"])
            except Exception:
                data["members"] = []
    else:
        try:
            data = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid request payload.")

    team_name = str(data.get("team_name", "")).strip()
    college_name = str(data.get("college_name", "")).strip()
    track = str(data.get("track", "")).strip()

    leader_name = str(data.get("leader_name", "")).strip()
    leader_email = str(data.get("leader_email", "")).strip().lower()
    leader_phone = str(data.get("leader_phone", "")).strip()
    leader_college = str(data.get("leader_college", "")).strip() or college_name
    leader_department = str(data.get("leader_department", "")).strip() or "General"
    leader_year = str(data.get("leader_year", "")).strip() or "1st Year"
    leader_gender = str(data.get("leader_gender", "")).strip()
    leader_id_number = str(data.get("leader_id_number", "")).strip()

    idea_title = str(data.get("idea_title", "")).strip()
    idea_description = str(data.get("idea_description", "")).strip()
    idea_summary = str(data.get("idea_summary", "")).strip()

    members_list = data.get("members", [])
    if isinstance(members_list, str):
        try:
            members_list = json.loads(members_list)
        except Exception:
            members_list = []

    # Validate essential team & leader fields
    if not (team_name and college_name and track and leader_name and leader_email and leader_phone):
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": "Please fill in Team Name, College Name, Track, and Team Leader credentials."}
        )

    # Enforce case-insensitive unique team name
    existing_team = db.query(Registration).filter(
        func.lower(Registration.team_name) == team_name.lower()
    ).first()
    if existing_team:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": f"Team name '{team_name}' is already reserved by another team (team names are unique & case-insensitive). Please choose a different team name."
            }
        )

    # Validate Idea Submission fields
    if not idea_title:
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": "Idea Title is required."}
        )
    if len(idea_title) > 100:
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": f"Idea Title exceeds maximum limit of 100 characters (Current length: {len(idea_title)})."}
        )

    if not idea_summary:
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": "Abstract / Summary is required."}
        )
    if len(idea_summary) > 10000:
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": f"Abstract / Summary exceeds maximum limit of 10,000 characters (Current length: {len(idea_summary)})."}
        )

    if not idea_description:
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": "Idea Description is required."}
        )
    if len(idea_description) > 50000:
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": f"Idea Description exceeds maximum limit of 50,000 characters (Current length: {len(idea_description)})."}
        )

    # Validate team size: leader + members must be between 4 and 6
    total_team_size = 1 + len(members_list)
    if total_team_size < settings.MIN_TEAM_MEMBERS or total_team_size > settings.MAX_TEAM_MEMBERS:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": f"Team size must be between {settings.MIN_TEAM_MEMBERS} and {settings.MAX_TEAM_MEMBERS} members (Leader + {settings.MIN_TEAM_MEMBERS - 1} to {settings.MAX_TEAM_MEMBERS - 1} members)."
            }
        )

    # Validate each member has at least name, email, phone
    for idx, m in enumerate(members_list, start=2):
        if not (m.get("name") and m.get("email") and m.get("phone")):
            return JSONResponse(
                status_code=422,
                content={"success": False, "message": f"Please provide Name, Email, and Mobile Number for Team Member #{idx}."}
            )

    # Generate unique team code: ANTRO-27-XXXX
    count_today = db.query(Registration).count() + 101
    random_suffix = uuid.uuid4().hex[:4].upper()
    team_code = f"ANTRO-27-{count_today:03d}-{random_suffix}"

    # Handle Idea PPT upload
    ppt_filename = None
    ppt_disk_path = None
    if idea_ppt_file and hasattr(idea_ppt_file, "filename") and idea_ppt_file.filename:
        filename = idea_ppt_file.filename
        ext = Path(filename).suffix.lower()
        if ext not in [".ppt", ".pptx", ".pdf"]:
            return JSONResponse(
                status_code=422,
                content={"success": False, "message": "Idea Presentation must be in .pptx, .ppt, or .pdf format."}
            )
        
        file_bytes = await idea_ppt_file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            return JSONResponse(
                status_code=422,
                content={"success": False, "message": "Idea Presentation file size exceeds maximum limit of 10MB."}
            )

        UPLOAD_PPT_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = re.sub(r"[^a-zA-Z0-9_\.-]", "_", filename)
        saved_filename = f"{team_code}_{safe_name}"
        save_path = UPLOAD_PPT_DIR / saved_filename
        with open(save_path, "wb") as f:
            f.write(file_bytes)
        
        ppt_filename = filename
        ppt_disk_path = f"/static/uploads/ppt/{saved_filename}"

    # Create Payment Order (₹300)
    order_data = payment_service.create_order(
        amount_in_inr=settings.REGISTRATION_FEE_INR,
        receipt_id=team_code,
        notes={
            "team_code": team_code,
            "team_name": team_name,
            "leader_email": leader_email,
            "leader_phone": leader_phone
        }
    )

    # Create DB Record
    reg = Registration(
        team_code=team_code,
        team_name=team_name,
        college_name=college_name,
        track=track,
        project_title=idea_title,
        project_synopsis=idea_summary,
        idea_title=idea_title,
        idea_description=idea_description,
        idea_summary=idea_summary,
        idea_ppt_filename=ppt_filename,
        idea_ppt_path=ppt_disk_path,
        leader_name=leader_name,
        leader_email=leader_email,
        leader_phone=leader_phone,
        leader_college=leader_college,
        leader_department=leader_department,
        leader_year=leader_year,
        leader_gender=leader_gender,
        leader_id_number=leader_id_number,
        member_count=total_team_size,
        amount_paid=settings.REGISTRATION_FEE_INR,
        payment_status="pending",
        payment_mode=order_data.get("mode", "razorpay"),
        razorpay_order_id=order_data.get("order_id"),
        status="submitted"
    )
    reg.set_members(members_list)

    try:
        db.add(reg)
        db.commit()
        db.refresh(reg)
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": f"Team name '{team_name}' is already reserved by another team (team names are unique & case-insensitive). Please choose a different team name."
            }
        )

    return {
        "success": True,
        "team_code": team_code,
        "order": order_data
    }

@app.post("/api/payment/verify")
async def api_verify_payment(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    team_code = data.get("team_code")
    order_id = data.get("razorpay_order_id")
    payment_id = data.get("razorpay_payment_id")
    signature = data.get("razorpay_signature")

    reg = db.query(Registration).filter(Registration.team_code == team_code).first()
    if not reg:
        return JSONResponse(status_code=404, content={"success": False, "message": "Team registration not found."})

    is_valid = payment_service.verify_payment(order_id, payment_id, signature)
    if not is_valid:
        reg.payment_status = "failed"
        db.commit()
        return JSONResponse(status_code=400, content={"success": False, "message": "Payment verification failed."})

    reg.payment_status = "paid"
    reg.razorpay_payment_id = payment_id
    reg.razorpay_signature = signature
    reg.payment_timestamp = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": "Payment verified successfully!",
        "team_code": team_code,
        "redirect_url": f"/confirmation/{team_code}"
    }

@app.post("/api/notify-me")
async def api_notify_me(
    full_name: str = Form(...),
    email: str = Form(...),
    college: Optional[str] = Form(None),
    track_interest: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    clean_email = email.strip().lower()
    existing = db.query(PreRegistrationAlert).filter(PreRegistrationAlert.email == clean_email).first()
    if not existing:
        alert = PreRegistrationAlert(
            full_name=full_name.strip(),
            email=clean_email,
            college=(college or "").strip(),
            track_interest=track_interest
        )
        db.add(alert)
        db.commit()
    return JSONResponse(content={"success": True, "message": "Target locked. You will be notified on October 30, 2026."})

# ----------------- ADMIN PORTAL ----------------- #

def get_current_admin(request: Request) -> bool:
    return bool(request.session.get("admin_logged_in"))

@app.get("/admin/login", response_class=HTMLResponse)
async def admin_login_page(request: Request):
    if get_current_admin(request):
        return RedirectResponse("/admin", status_code=status.HTTP_302_FOUND)
    context = get_base_context(request)
    context["error"] = None
    return templates.TemplateResponse(request=request, name="admin/login.html", context=context)

@app.post("/admin/login")
async def admin_login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    if username == settings.ADMIN_USERNAME and password == settings.ADMIN_PASSWORD:
        request.session["admin_logged_in"] = True
        return RedirectResponse("/admin", status_code=status.HTTP_302_FOUND)
    
    context = get_base_context(request)
    context["error"] = "ACCESS DENIED: Invalid Cyberdyne Security Credentials."
    return templates.TemplateResponse(request=request, name="admin/login.html", context=context, status_code=401)

@app.get("/admin/logout")
async def admin_logout(request: Request):
    request.session.clear()
    response = RedirectResponse("/admin/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie("session")
    return response

@app.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(
    request: Request,
    track: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if not get_current_admin(request):
        return RedirectResponse("/admin/login", status_code=status.HTTP_302_FOUND)

    context = get_base_context(request)

    # Base query
    query = db.query(Registration)
    if track:
        query = query.filter(Registration.track == track)
    if status_filter:
        query = query.filter(Registration.status == status_filter)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Registration.team_name.ilike(search_fmt)) |
            (Registration.team_code.ilike(search_fmt)) |
            (Registration.leader_name.ilike(search_fmt)) |
            (Registration.leader_college.ilike(search_fmt)) |
            (Registration.leader_email.ilike(search_fmt))
        )

    registrations = query.order_by(Registration.created_at.desc()).all()

    # Calculate metrics
    all_regs = db.query(Registration).all()
    total_teams = len(all_regs)
    paid_teams = sum(1 for r in all_regs if r.payment_status == "paid")
    finalist_teams = sum(1 for r in all_regs if r.status == "shortlisted_finalist")
    total_participants = sum(r.member_count for r in all_regs if r.payment_status == "paid")
    total_revenue_inr = sum(r.amount_paid for r in all_regs if r.payment_status == "paid")
    total_leads = db.query(PreRegistrationAlert).count()

    # Track distribution
    track1_count = sum(1 for r in all_regs if "Safety" in r.track)
    track2_count = sum(1 for r in all_regs if "Health" in r.track or "Education" in r.track)
    track3_count = sum(1 for r in all_regs if "Sustainability" in r.track)

    context.update({
        "registrations": registrations,
        "total_teams": total_teams,
        "paid_teams": paid_teams,
        "finalist_teams": finalist_teams,
        "total_finalists_quota": settings.TOTAL_FINALISTS,
        "total_participants": total_participants,
        "total_revenue_inr": total_revenue_inr,
        "total_leads": total_leads,
        "track1_count": track1_count,
        "track2_count": track2_count,
        "track3_count": track3_count,
        "selected_track": track or "",
        "selected_status": status_filter or "",
        "search_term": search or ""
    })

    return templates.TemplateResponse(request=request, name="admin/dashboard.html", context=context)

@app.post("/api/admin/registration/{reg_id}/status")
async def update_registration_status(
    reg_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    if not get_current_admin(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()
    new_status = data.get("status")
    admin_notes = data.get("notes")

    reg = db.query(Registration).filter(Registration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    if new_status:
        reg.status = new_status
    if admin_notes is not None:
        reg.admin_notes = admin_notes
    
    db.commit()
    return {"success": True, "new_status": reg.status}

@app.delete("/api/admin/registration/{reg_id}")
async def delete_registration_api(
    reg_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    if not get_current_admin(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    reg = db.query(Registration).filter(Registration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration record not found")

    team_name = reg.team_name
    team_code = reg.team_code

    # Clean up uploaded PPT file if it exists on disk
    if reg.idea_ppt_path:
        try:
            clean_rel = reg.idea_ppt_path.lstrip("/").replace("static/", "", 1)
            full_path = BASE_DIR / "static" / clean_rel
            if full_path.exists() and full_path.is_file():
                full_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete attached PPT for team {team_code}: {e}")

    db.delete(reg)
    db.commit()

    return {
        "success": True,
        "message": f"Registration for team '{team_name}' ({team_code}) has been permanently purged."
    }

@app.post("/api/admin/registration/{reg_id}/delete")
async def delete_registration_post_api(
    reg_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    return await delete_registration_api(reg_id, request, db)

@app.get("/api/admin/export/excel")
async def export_excel(request: Request, db: Session = Depends(get_db)):
    if not get_current_admin(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    regs = db.query(Registration).order_by(Registration.created_at.desc()).all()
    excel_bytes = generate_excel_spreadsheet(regs)

    filename = f"ANTROTHON_27_Registrations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.get("/api/admin/export/csv")
async def export_csv(request: Request, db: Session = Depends(get_db)):
    if not get_current_admin(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    regs = db.query(Registration).order_by(Registration.created_at.desc()).all()
    csv_content = generate_csv_spreadsheet(regs)

    filename = f"ANTROTHON_27_Registrations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
