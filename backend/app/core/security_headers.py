"""
LANDSLIDEGUARD SIH26001 - Production Security Headers Middleware
Attaches enterprise HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) to all responses.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        
        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Clickjacking defense
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS Filter enable
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # HTTP Strict Transport Security (HSTS - 1 year)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy (Allows Leaflet maps, ESRI/OSM tiles, Google Fonts, and internal APIs)
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https://* https://server.arcgisonline.com https://*.tile.openstreetmap.org",
            "connect-src 'self' http://localhost:* http://127.0.0.1:* https://* ws://* wss://*",
            "frame-ancestors 'none'"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        return response
