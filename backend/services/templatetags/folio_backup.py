from django import template

register = template.Library()

LAST_SUCCESS = '/home/ubuntu/.folio-backup-last-success'


@register.simple_tag
def folio_last_backup():
    """ISO-UTC timestamp of the last successful backup, or 'never'."""
    try:
        with open(LAST_SUCCESS) as f:
            return f.read().strip() or 'never'
    except OSError:
        return 'never'
