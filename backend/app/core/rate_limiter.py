import os
import time
import threading
from typing import Dict, List
from fastapi import Request, HTTPException, status
from backend.app.core.config import IS_PRODUCTION

DEFAULT_LOGIN_LIMIT = int(os.environ.get("RATE_LIMIT_LOGIN_PER_MIN", "10" if IS_PRODUCTION else "60"))
DEFAULT_REGISTER_LIMIT = int(os.environ.get("RATE_LIMIT_REGISTER_PER_MIN", "10" if IS_PRODUCTION else "60"))
DEFAULT_RESET_LIMIT = int(os.environ.get("RATE_LIMIT_RESET_PER_HOUR", "5" if IS_PRODUCTION else "30"))

class InMemoryRateLimiter:
    def __init__(self):
        self._lock = threading.Lock()
        self._requests: Dict[str, List[float]] = {}

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            if key not in self._requests:
                self._requests[key] = []

            # Filter out timestamps older than the sliding window
            valid_timestamps = [t for t in self._requests[key] if t > window_start]
            
            if len(valid_timestamps) >= max_requests:
                self._requests[key] = valid_timestamps
                return True

            valid_timestamps.append(now)
            self._requests[key] = valid_timestamps
            return False

    def clear(self):
        with self._lock:
            self._requests.clear()


# Global Rate Limiter instance
rate_limiter = InMemoryRateLimiter()


def check_auth_rate_limit(request: Request, max_attempts: int = DEFAULT_LOGIN_LIMIT, window_seconds: int = 60, action_name: str = "login"):
    """
    FastAPI dependency/helper enforcing rate limits per client IP.
    Default: configurable attempts per window.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    limit_key = f"auth:{action_name}:{client_ip}"
    
    if rate_limiter.is_rate_limited(limit_key, max_requests=max_attempts, window_seconds=window_seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many {action_name} attempts. Please wait before trying again.",
            headers={"Retry-After": str(window_seconds)}
        )
