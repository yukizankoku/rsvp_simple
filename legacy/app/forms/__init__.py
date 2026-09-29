from flask_wtf.file import FileField

SKIP_FIELDS = {"csrf_token", "submit"}


def clean_data(form):
    """form.data without CSRF/file fields; blank strings become None, strings are stripped."""
    data = {}
    for name, field in form._fields.items():
        if name in SKIP_FIELDS or isinstance(field, FileField):
            continue
        value = field.data
        if isinstance(value, str):
            value = value.strip() or None
        data[name] = value
    return data
