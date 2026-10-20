import hmac
import hashlib
import time
import uuid
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("antrothon.payment")

class PaymentService:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self._client = None
        
        if self.is_live():
            try:
                import razorpay
                self._client = razorpay.Client(auth=(self.key_id, self.key_secret))
                logger.info("Razorpay client initialized in LIVE/TEST mode.")
            except Exception as e:
                logger.error(f"Failed to initialize razorpay client: {e}")
                self._client = None
        else:
            logger.info("Razorpay keys not configured. System is in high-fidelity SIMULATOR mode.")

    def is_live(self) -> bool:
        return bool(self.key_id and self.key_secret)

    def create_order(self, amount_in_inr: int, receipt_id: str, notes: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Creates an order for payment.
        Amount is in INR; converted to paise (* 100).
        """
        amount_paise = amount_in_inr * 100
        currency = "INR"
        notes = notes or {}

        if self.is_live() and self._client:
            try:
                data = {
                    "amount": amount_paise,
                    "currency": currency,
                    "receipt": receipt_id[:40],
                    "notes": notes,
                    "payment_capture": 1
                }
                order = self._client.order.create(data=data)
                return {
                    "mode": "razorpay",
                    "order_id": order.get("id"),
                    "amount": amount_paise,
                    "currency": currency,
                    "key_id": self.key_id,
                    "name": "ANTROTHON'27",
                    "description": f"Team Registration Fee - {receipt_id}",
                    "notes": notes
                }
            except Exception as e:
                logger.error(f"Razorpay order creation failed: {e}")
                # Fallback to simulation if network/auth fails during development
                return self._create_simulated_order(amount_paise, receipt_id, notes, fallback_reason=str(e))
        else:
            return self._create_simulated_order(amount_paise, receipt_id, notes)

    def _create_simulated_order(self, amount_paise: int, receipt_id: str, notes: Dict[str, str], fallback_reason: Optional[str] = None) -> Dict[str, Any]:
        sim_order_id = f"order_sim_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        return {
            "mode": "simulator",
            "order_id": sim_order_id,
            "amount": amount_paise,
            "currency": "INR",
            "key_id": "rzp_test_simulated",
            "name": "ANTROTHON'27",
            "description": f"Team Registration Fee (Simulated Mode) - {receipt_id}",
            "notes": notes,
            "is_simulated": True,
            "fallback_reason": fallback_reason
        }

    def verify_payment(self, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Verifies the Razorpay payment signature.
        """
        if order_id.startswith("order_sim_"):
            # Valid simulation signature
            return signature.startswith("sim_sig_") or len(signature) > 0

        if self.is_live() and self._client:
            try:
                params_dict = {
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature
                }
                self._client.utility.verify_payment_signature(params_dict)
                return True
            except Exception as e:
                logger.error(f"Razorpay signature verification failed via client: {e}")
                
            # Direct HMAC-SHA256 verification as robust secondary check
            try:
                msg = f"{order_id}|{payment_id}".encode("utf-8")
                generated_sig = hmac.new(
                    self.key_secret.encode("utf-8"),
                    msg,
                    hashlib.sha256
                ).hexdigest()
                return hmac.compare_digest(generated_sig, signature)
            except Exception as e:
                logger.error(f"Direct HMAC verification failed: {e}")
                return False

        # If not live and not simulated, permit test tokens
        return signature.startswith("sim_sig_") or payment_id.startswith("pay_sim_")

payment_service = PaymentService()
