# utils.py
#
# Text-processing helpers shared across the application.
# Extracted here so models.py and any future module that validates
# user-supplied strings can import a single, well-tested implementation.

# Control characters (C0/C1 + DEL) plus Unicode directional overrides that
# would corrupt the rendered PDF or enable text-spoofing attacks if they
# reached a user-visible surface.
_CONTROL_CHARS: frozenset[str] = frozenset(
    chr(c) for c in range(0, 32)
) | frozenset({chr(0x7F), "‮", "‭", "‎", "‏"})


def strip_control(value: str) -> str:
    """Remove control characters and Unicode directional overrides from a string."""
    return "".join(ch for ch in value if ch not in _CONTROL_CHARS)
