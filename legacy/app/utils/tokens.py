import re
import secrets
import unicodedata

# No ambiguous characters (0/O, 1/I/L) so codes are easy to read aloud / type.
CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def generate_token(nbytes=24):
    """Cryptographically random, URL-safe opaque token."""
    return secrets.token_urlsafe(nbytes)


def generate_invitation_code(length=6):
    return "INV-" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def slugify(value, max_length=200):
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    value = re.sub(r"[-\s_]+", "-", value).strip("-")
    return value[:max_length] or "event"


def mask(token):
    """Shorten a secret for log output."""
    if not token:
        return "-"
    return token[:6] + "…"
