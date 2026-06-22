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


class ApiUsage(models.Model):
    """One row per Anthropic API call, for per-user running cost totals."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_usage')
    kind = models.CharField(max_length=30)
    model = models.CharField(max_length=60)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    web_searches = models.IntegerField(default=0)
    cost_usd = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'ApiUsage<{self.user_id} {self.kind} ${self.cost_usd:.4f}>'
