"""Tiny in-memory rate limiter for public endpoints.

Good enough for a single-process deployment. For multiple workers, swap this for
a shared store (e.g. Redis / Flask-Limiter).
"""
import threading
import time
from collections import defaultdict, deque
from functools import wraps

from flask import abort, current_app, request

_hits = defaultdict(deque)
_lock = threading.Lock()


def _client_ip():
    return request.remote_addr or "unknown"


def rate_limit(limit, per_seconds, scope=None):
    def decorator(view):
        key_scope = scope or view.__name__

        @wraps(view)
        def wrapped(*args, **kwargs):
            if current_app.config.get("RATELIMIT_ENABLED", True):
                key = (key_scope, _client_ip())
                now = time.monotonic()
                with _lock:
                    hits = _hits[key]
                    while hits and now - hits[0] > per_seconds:
                        hits.popleft()
                    if len(hits) >= limit:
                        abort(429)
                    hits.append(now)
            return view(*args, **kwargs)

        return wrapped

    return decorator
