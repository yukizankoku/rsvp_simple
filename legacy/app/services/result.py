from dataclasses import dataclass, field
from typing import Any


@dataclass
class ServiceResult:
    ok: bool
    code: str = "ok"
    message: str = ""
    data: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def success(cls, message="", code="ok", **data):
        return cls(True, code, message, data)

    @classmethod
    def fail(cls, code, message, **data):
        return cls(False, code, message, data)
