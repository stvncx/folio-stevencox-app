"""Admin-triggered backup: a staff-only POST view that runs the backup script."""
import os
import subprocess

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.views.decorators.http import require_POST

BACKUP_SCRIPT = '/home/ubuntu/apps/folio.stevencox.org/backup/snapshot.sh'


@staff_member_required
@require_POST
def run_backup(request):
    try:
        r = subprocess.run(
            ['bash', BACKUP_SCRIPT], capture_output=True, text=True, timeout=180,
            env={**os.environ, 'HOME': '/home/ubuntu', 'PATH': '/usr/local/bin:/usr/bin:/bin'})
    except subprocess.TimeoutExpired:
        messages.error(request, 'Backup timed out.')
        return HttpResponseRedirect(reverse('admin:index'))
    if r.returncode == 0:
        messages.success(request, 'Backup complete. ' + (r.stdout or '').strip()[-200:])
    else:
        messages.error(request, 'Backup failed: ' + (r.stderr or r.stdout or 'unknown error').strip()[-300:])
    return HttpResponseRedirect(reverse('admin:index'))
