"""
SMTP Email Service for ANTROTHON'27
Sends confirmation emails after successful registration + payment.
Uses Gmail SMTP with App Password authentication.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)

# Base URL for static assets (logos hosted on Vercel)
SITE_URL = "https://antrothon-27.vercel.app"


def _build_html_body(leader_name: str, team_code: str, team_name: str, track: str) -> str:
    """Build the HTML email body with dynamic registration data."""
    return f"""\
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #222; line-height: 1.7; margin: 0; padding: 0; background: #f4f4f4; }}
  .container {{ max-width: 640px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
  .college-header {{ background: #ffffff; padding: 24px 30px; text-align: center; border-bottom: 3px solid #2e7d32; }}
  .college-header table {{ width: 100%; border-collapse: collapse; }}
  .college-header td {{ vertical-align: middle; }}
  .college-header .logo {{ width: 70px; }}
  .college-header .logo img {{ width: 64px; height: auto; }}
  .college-header .college-text {{ text-align: center; }}
  .college-header .college-text h2 {{ margin: 0; font-size: 22px; color: #2e7d32; font-weight: 800; letter-spacing: 1px; }}
  .college-header .college-text h3 {{ margin: 2px 0 0; font-size: 16px; color: #2e7d32; font-weight: 700; }}
  .college-header .college-text .subtitle {{ margin: 3px 0 0; font-size: 12px; color: #555; font-style: italic; }}
  .college-header .college-text .affiliation {{ margin: 3px 0 0; font-size: 11px; color: #777; }}
  .event-header {{ background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); padding: 22px 40px; text-align: center; }}
  .event-header h1 {{ color: #00e5ff; margin: 0; font-size: 26px; letter-spacing: 2px; }}
  .event-header p {{ color: #b0bec5; margin: 5px 0 0; font-size: 12px; letter-spacing: 1px; }}
  .body-content {{ padding: 30px 40px; }}
  .body-content p {{ margin: 10px 0; }}
  .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
  .details-table td {{ padding: 10px 14px; border-bottom: 1px solid #e0e0e0; }}
  .details-table td:first-child {{ font-weight: 600; color: #455a64; width: 45%; }}
  .details-table td:last-child {{ color: #1a237e; }}
  .info-box {{ background: #e8f5e9; border-left: 4px solid #43a047; padding: 16px 20px; margin: 20px 0; border-radius: 4px; }}
  .info-box ol {{ margin: 8px 0 0 18px; padding: 0; }}
  .info-box li {{ margin: 4px 0; }}
  .event-box {{ background: #e3f2fd; border-left: 4px solid #1e88e5; padding: 16px 20px; margin: 20px 0; border-radius: 4px; }}
  .event-box ul {{ margin: 8px 0 0 18px; padding: 0; list-style: disc; }}
  .event-box li {{ margin: 4px 0; }}
  .footer {{ background: #263238; color: #b0bec5; text-align: center; padding: 20px 40px; font-size: 12px; }}
  .footer strong {{ color: #ffffff; }}
  .tagline {{ color: #00e5ff; font-style: italic; margin-top: 10px; }}
</style>
</head>
<body>
<div class="container">
  <!-- College Letterhead Header -->
  <div class="college-header">
    <table>
      <tr>
        <td class="logo" style="text-align: left;">
          <img src="{SITE_URL}/static/img/patrician_logo.png" alt="Patrician College Logo" style="width: 64px; height: auto;">
        </td>
        <td class="college-text">
          <h2>PATRICIAN</h2>
          <h3>COLLEGE OF ARTS AND SCIENCE</h3>
          <p class="subtitle">An Institute of the Brothers of St. Patrick</p>
          <p class="affiliation">Affiliated to the University of Madras | Accredited 'A+' Grade By NAAC</p>
        </td>
        <td class="logo" style="text-align: right;">
          <img src="{SITE_URL}/static/img/iic_logo.png" alt="IIC Logo" style="width: 64px; height: auto;">
        </td>
      </tr>
    </table>
  </div>

  <!-- Event Banner -->
  

  <div class="body-content">
    <p>Dear <strong>{leader_name}</strong>,</p>
    <p>Greetings from <strong>Patrician Institution's Innovation Council!</strong></p>
    <p>We are pleased to inform you that your registration for <strong>ANTROTHON'27 – 24-Hour National Level Inter-College Hackathon</strong> has been successfully completed.</p>
    <p>Thank you for taking the first step towards innovation! Your registration details have been recorded successfully.</p>

    <h3 style="color: #1a237e; border-bottom: 2px solid #e0e0e0; padding-bottom: 6px;">Your Registration Details</h3>
    <table class="details-table">
      <tr><td>Event</td><td>ANTROTHON'27</td></tr>
      <tr><td>Registration ID</td><td><strong>{team_code}</strong></td></tr>
      <tr><td>Team Name</td><td><strong>{team_name}</strong></td></tr>
      <tr><td>Track Selected</td><td><strong>{track}</strong></td></tr>
      <tr><td>Registration Status</td><td style="color: #2e7d32; font-weight: 600;">✅ Successfully Registered</td></tr>
    </table>

    <div class="info-box">
      <strong>Important Information</strong>
      <ol>
        <li>Please save your unique Registration ID carefully. You will need it for all future communication and event-related activities.</li>
        <li>The first-round registration is now complete.</li>
        <li>Shortlisted teams will be announced on <strong>27 December 2026</strong>.</li>
        <li>A total of 45 teams will be shortlisted for the final 24-hour hackathon.</li>
        <li>Shortlisted teams will receive further instructions regarding finalist confirmation and participation fees.</li>
      </ol>
    </div>

    <div class="event-box">
      <strong>Event Details</strong>
      <ul>
        <li><strong>Event Dates:</strong> 7–8 January 2027</li>
        <li><strong>Registration Fee:</strong> ₹300 per team</li>
        <li><strong>Finalist Participation Fee:</strong> ₹350 per participant (applicable only to shortlisted teams)</li>
        <li><strong>Tagline:</strong> Think Human. Innovate for Society.</li>
      </ul>
    </div>

    <p>Stay connected with us for announcements and updates.</p>
    <p>We look forward to seeing your ideas turn into meaningful innovations!</p>

    <p style="margin-top: 24px;">
      Best Regards,<br>
      <strong>Organising Committee</strong><br>
      Patrician Institution's Innovation Council (PIIC)<br>
      Patrician College of Arts and Science<br>
      Chennai – 600 020
    </p>
    <p class="tagline"><em>Think Human. Innovate for Society.</em></p>
  </div>
  <div class="footer">
    <p><strong>ANTROTHON'27</strong> &mdash; Patrician Institution's Innovation Council</p>
    <p>This is an automated confirmation. Please do not reply to this email.</p>
  </div>
</div>
</body>
</html>"""


def _build_plain_body(leader_name: str, team_code: str, team_name: str, track: str) -> str:
    """Build the plain-text email body as fallback."""
    return f"""\
Dear {leader_name},

Greetings from Patrician Institution's Innovation Council!

PATRICIAN COLLEGE OF ARTS AND SCIENCE
An Institute of the Brothers of St. Patrick
Affiliated to the University of Madras | Accredited 'A+' Grade By NAAC

We are pleased to inform you that your registration for ANTROTHON'27 – 24-Hour National Level Inter-College Hackathon has been successfully completed.

Thank you for taking the first step towards innovation! Your registration details have been recorded successfully.

YOUR REGISTRATION DETAILS
--------------------------
Event: ANTROTHON'27
Registration ID: {team_code}
Team Name: {team_name}
Track Selected: {track}
Registration Status: Successfully Registered

IMPORTANT INFORMATION
---------------------
1. Please save your unique Registration ID carefully. You will need it for all future communication and event-related activities.
2. The first-round registration is now complete.
3. Shortlisted teams will be announced on 27 December 2026.
4. A total of 45 teams will be shortlisted for the final 24-hour hackathon.
5. Shortlisted teams will receive further instructions regarding finalist confirmation and participation fees.

EVENT DETAILS
-------------
- Event Dates: 7–8 January 2027
- Registration Fee: Rs.300 per team
- Finalist Participation Fee: Rs.350 per participant (applicable only to shortlisted teams)
- Tagline: Think Human. Innovate for Society.

Stay connected with us for announcements and updates.

We look forward to seeing your ideas turn into meaningful innovations!

Best Regards,
Organising Committee
Patrician Institution's Innovation Council (PIIC)
Patrician College of Arts and Science
Chennai – 600 020

Think Human. Innovate for Society.
"""


def send_registration_confirmation(
    to_email: str,
    team_code: str,
    team_name: str,
    track: str,
    leader_name: str = "Participant"
) -> bool:
    """
    Send a registration confirmation email after successful payment.
    Returns True on success, False on failure. Never raises.
    """
    if not settings.is_smtp_configured:
        logger.warning("SMTP not configured — skipping confirmation email for %s", team_code)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"ANTROTHON'27 — Registration Confirmed | {team_code}"
        msg["From"] = f"ANTROTHON'27 <{settings.SMTP_EMAIL}>"
        msg["To"] = to_email

        # Attach plain text first, then HTML (email clients prefer the last part)
        plain_part = MIMEText(_build_plain_body(leader_name, team_code, team_name, track), "plain", "utf-8")
        html_part = MIMEText(_build_html_body(leader_name, team_code, team_name, track), "html", "utf-8")
        msg.attach(plain_part)
        msg.attach(html_part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())

        logger.info("✅ Confirmation email sent to %s for team %s", to_email, team_code)
        return True

    except Exception as e:
        logger.error("❌ Failed to send confirmation email to %s: %s", to_email, e)
        return False
