# pdf.py
#
# Renders the FDA label as an HTML string using Jinja2,
# then converts it to PDF bytes using WeasyPrint.
# No database access, no macro math.

import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models import MacroProfile, GenerateLabelRequest
from app.nutrition import compute_daily_value_pct
from app.constants import UNIT_CONVERSIONS, NUTRIENT_FIELDS

# Build the Jinja2 environment once at module load instead of per request.
# Jinja2's FileSystemLoader already caches compiled templates, but recreating
# the Environment object on every call adds unnecessary overhead.
_TEMPLATES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates"))
_jinja_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)
_label_template = _jinja_env.get_template("label.html")


def _no_external_fetch(url: str) -> bytes:
    """
    URL fetcher for WeasyPrint that denies all external and file:// URLs.
    This prevents SSRF, local file disclosure, and other URL-based attacks.
    """
    raise ValueError(f"External resources are disabled: {url}")


def render_label_html(macros: MacroProfile, request: GenerateLabelRequest, unrounded_macros: dict[str, float] | None = None) -> str:
    """
    Fill the Jinja2 label template with computed values and return the HTML string.
    The HTML is what WeasyPrint will turn into a PDF.
    
    Args:
        macros: The rounded per-serving MacroProfile to display
        request: The GenerateLabelRequest with label metadata
        unrounded_macros: The unrounded per-serving values for %DV calculation
                         If None, uses the rounded values (fallback for compatibility)
    """
    # Use unrounded values for %DV calculation, or fall back to rounded values
    if unrounded_macros:
        dv_source = unrounded_macros
    else:
        dv_source = macros.model_dump()
    
    # Build %DV for every nutrient that has a daily value
    daily_values: dict[str, int | None] = {
        field: compute_daily_value_pct(dv_source.get(field, 0), field)
        for field in NUTRIENT_FIELDS
    }

    # Build the ingredients string: sorted by actual gram weight, all caps, period at end
    # FDA requires ingredients listed in descending order by weight
    sorted_ingredients = sorted(
        request.ingredients,
        key=lambda ing: ing.amount * UNIT_CONVERSIONS.get(ing.unit, 1.0),
        reverse=True,
    )
    ingredients_string = (
        ", ".join(ing.name.upper() for ing in sorted_ingredients) + "."
        if sorted_ingredients else ""
    )

    return _label_template.render(
        macros=macros,
        daily_values=daily_values,
        portion_divisor=request.portion_divisor,
        label_name=request.label_name,
        ingredients_string=ingredients_string,
        width_inches=request.width_inches,
        height_inches=request.height_inches,
    )


def generate_pdf(html: str) -> bytes:
    """Convert an HTML string to PDF bytes using WeasyPrint."""
    return HTML(string=html, url_fetcher=_no_external_fetch).write_pdf()
