import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"[*] Initializing ANTROTHON'27 Terminator Cyber Engine...")
    print(f"[*] Host: {settings.HOST}:{settings.PORT}")
    print(f"[*] Admin Portal: http://{settings.HOST}:{settings.PORT}/admin")
    print(f"[*] Mode: {'LIVE RAZORPAY' if settings.is_razorpay_configured else 'HIGH-FIDELITY SIMULATOR'}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
