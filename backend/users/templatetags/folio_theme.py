from django import template
from django.utils.safestring import mark_safe

from users.models import SiteTheme

register = template.Library()

# (accent, darker accent) per site preset — darker variants keep white header text readable.
ACCENTS = {
    'verdigris': ('#17604f', '#124e40'),
    'ember': ('#b0791f', '#8a5e14'),
    'slate': ('#2b4bbf', '#223c9c'),
}


@register.simple_tag
def folio_admin_accent_style():
    """`:root{...}` overriding the admin accent to the current site preset."""
    a, d = ACCENTS.get(SiteTheme.load().preset, ACCENTS['verdigris'])
    return mark_safe(f':root{{--folio-accent:{a};--folio-accent-dark:{d}}}')
