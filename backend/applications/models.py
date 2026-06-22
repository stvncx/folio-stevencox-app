from django.contrib.auth.models import User
from django.db import models

from resumes.models import CustomResume


class ApplicationStatus(models.TextChoices):
    APPLIED = 'applied', 'Applied'
    PHONE_SCREEN = 'phone_screen', 'Phone Screen'
    INTERVIEW = 'interview', 'Interview'
    OFFER = 'offer', 'Offer'
    REJECTED = 'rejected', 'Rejected'
    WITHDRAWN = 'withdrawn', 'Withdrawn'
    SAVED = 'saved', 'Saved'


class JobApplication(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    custom_resume = models.ForeignKey(
        CustomResume, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    company_name = models.CharField(max_length=200)
    position_title = models.CharField(max_length=200)
    company_url = models.URLField(blank=True)
    company_analysis = models.TextField(blank=True)  # AI research/fit (HTML)
    job_posting = models.TextField(blank=True)
    job_posting_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=ApplicationStatus.choices,
                              default=ApplicationStatus.SAVED)
    applied_date = models.DateField(null=True, blank=True)
    interview_date = models.DateField(null=True, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    offer_deadline = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    cover_letter = models.TextField(blank=True)  # TipTap HTML
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.position_title} @ {self.company_name}'


class ApplicationContact(models.Model):
    class ContactRole(models.TextChoices):
        RECRUITER = 'recruiter', 'Recruiter'
        HIRING_MANAGER = 'hiring_manager', 'Hiring Manager'
        OTHER = 'other', 'Other'

    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=ContactRole.choices)
    title = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    linkedin_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)


class ApplicationActivity(models.Model):
    class ActivityType(models.TextChoices):
        NOTE = 'note', 'Note'
        EMAIL_SENT = 'email_sent', 'Email Sent'
        EMAIL_RECEIVED = 'email_received', 'Email Received'
        PHONE_CALL = 'phone_call', 'Phone Call'
        INTERVIEW = 'interview', 'Interview'
        FOLLOW_UP = 'follow_up', 'Follow Up'
        OFFER_RECEIVED = 'offer_received', 'Offer Received'
        OTHER = 'other', 'Other'

    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
    date = models.DateTimeField()
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
