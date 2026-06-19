from django.contrib.auth.models import User
from django.db import models

from cv.models import CVEntry, SectionType


# --- Topical Resume (Tier 2) ------------------------------------------------
class TopicalResume(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topical_resumes')
    title = models.CharField(max_length=200)
    description = models.TextField(help_text='Description of the job type this resume targets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'Topical<{self.title}>'


class TopicalResumeSection(models.Model):
    topical_resume = models.ForeignKey(TopicalResume, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=50, choices=SectionType.choices)
    title = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)  # section-level toggle
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']


class TopicalResumeEntry(models.Model):
    section = models.ForeignKey(TopicalResumeSection, on_delete=models.CASCADE, related_name='entries')
    cv_entry = models.ForeignKey(
        CVEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='topical_entries')
    order = models.PositiveIntegerField(default=0)
    data = models.JSONField(default=dict)  # snapshot of CV entry data; may be edited

    class Meta:
        ordering = ['order']


# --- Custom Resume (Tier 3) -------------------------------------------------
class CustomResume(models.Model):
    class GenerationMethod(models.TextChoices):
        AI_GENERATED = 'ai_generated', 'AI Generated'
        COPIED = 'copied', 'Copied'

    topical_resume = models.ForeignKey(TopicalResume, on_delete=models.CASCADE, related_name='custom_resumes')
    title = models.CharField(max_length=200)
    job_posting = models.TextField()
    company_name = models.CharField(max_length=200, blank=True)
    position_title = models.CharField(max_length=200, blank=True)
    generation_method = models.CharField(max_length=20, choices=GenerationMethod.choices)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'Custom<{self.title}>'


class CustomResumeSection(models.Model):
    custom_resume = models.ForeignKey(CustomResume, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=50, choices=SectionType.choices)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']


class CustomResumeEntry(models.Model):
    section = models.ForeignKey(CustomResumeSection, on_delete=models.CASCADE, related_name='entries')
    topical_entry = models.ForeignKey(
        TopicalResumeEntry, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    data = models.JSONField(default=dict)

    class Meta:
        ordering = ['order']
