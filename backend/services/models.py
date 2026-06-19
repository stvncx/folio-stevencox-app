from django.contrib.auth.models import User
from django.db import models


class AIJob(models.Model):
    """Holds the parameters for one streamed AI generation between the REST
    trigger (which returns the job id) and the WebSocket that runs it."""
    class Kind(models.TextChoices):
        TOPICAL = 'topical', 'Topical Resume'
        CUSTOM = 'custom', 'Custom Resume'
        COVER_LETTER = 'cover_letter', 'Cover Letter'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        DONE = 'done', 'Done'
        ERROR = 'error', 'Error'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_jobs')
    kind = models.CharField(max_length=20, choices=Kind.choices)
    params = models.JSONField(default=dict)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    result_id = models.IntegerField(null=True, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'AIJob<{self.kind}#{self.pk} {self.status}>'
