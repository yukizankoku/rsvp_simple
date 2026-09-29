import os
import secrets

from flask import current_app

# Magic-byte signatures, so a renamed non-image file is rejected.
_SIGNATURES = {
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "gif": [b"GIF87a", b"GIF89a"],
    "webp": [b"RIFF"],
}


class UploadError(ValueError):
    pass


def _extension(filename):
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def save_image(file_storage, subfolder="images"):
    """Validate and store an uploaded image. Returns the relative stored path."""
    if not file_storage or not file_storage.filename:
        return None

    ext = _extension(file_storage.filename)
    if ext not in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]:
        raise UploadError("Format file tidak didukung. Gunakan PNG, JPG, WEBP atau GIF.")

    head = file_storage.stream.read(16)
    file_storage.stream.seek(0)
    if not any(head.startswith(sig) for sig in _SIGNATURES[ext]):
        raise UploadError("File bukan gambar yang valid.")
    if ext == "webp" and head[8:12] != b"WEBP":
        raise UploadError("File bukan gambar WEBP yang valid.")

    folder = os.path.join(current_app.config["UPLOAD_FOLDER"], subfolder)
    os.makedirs(folder, exist_ok=True)
    # Random filename: never trust the client-supplied name.
    name = f"{secrets.token_hex(16)}.{'jpg' if ext == 'jpeg' else ext}"
    file_storage.save(os.path.join(folder, name))
    return f"{subfolder}/{name}"


def delete_upload(relative_path):
    if not relative_path:
        return
    root = os.path.realpath(current_app.config["UPLOAD_FOLDER"])
    path = os.path.realpath(os.path.join(root, relative_path))
    if path.startswith(root + os.sep) and os.path.isfile(path):
        os.remove(path)
