from django.contrib.auth.models import User
from django.db import models


class SectionType(models.TextChoices):
    """LinkedIn-standard section list + a Contact header. Valid section types."""
    CONTACT = 'contact', 'Contact'
    HEADLINE = 'headline', 'Headline'
    ABOUT = 'about', 'About'
    EXPERIENCE = 'experience', 'Experience'
    EDUCATION = 'education', 'Education'
    SKILLS = 'skills', 'Skills'
    CERTIFICATIONS = 'certifications', 'Licenses & Certifications'
    PROJECTS = 'projects', 'Projects'
    PUBLICATIONS = 'publications', 'Publications'
    PATENTS = 'patents', 'Patents'
    COURSES = 'courses', 'Courses'
    HONORS = 'honors', 'Honors & Awards'
    VOLUNTEER = 'volunteer', 'Volunteer Experience'
    LANGUAGES = 'languages', 'Languages'
    ORGANIZATIONS = 'organizations', 'Organizations'
    FEATURED = 'featured', 'Featured'
    RECOMMENDATIONS = 'recommendations', 'Recommendations'


# Required fields per section type — enforced when creating/updating CV entries.
REQUIRED_FIELDS = {
    'contact': ['full_name'],
    'headline': ['text'],
    'about': ['text'],
    'experience': ['job_title', 'company', 'start_date', 'is_current'],
    'education': ['school', 'degree'],
    'skills': ['name'],
    'certifications': ['name', 'issuing_organization', 'does_not_expire'],
    'projects': ['name', 'is_current'],
    'publications': ['title'],
    'patents': ['title'],
    'courses': ['name'],
    'honors': ['title'],
    'volunteer': ['role', 'organization', 'is_current'],
    'languages': ['language'],
    'organizations': ['name', 'is_current'],
    'featured': ['title'],
    'recommendations': ['recommender_name', 'text'],
}


class CV(models.Model):
    """One master CV per user — the source of truth; never sent to employers."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cv')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'CV<{self.user.username}>'


class CVSection(models.Model):
    cv = models.ForeignKey(CV, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=50, choices=SectionType.choices)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['cv', 'section_type']

    def __str__(self):
        return f'{self.cv.user.username}/{self.section_type}'


class CVEntry(models.Model):
    section = models.ForeignKey(CVSection, on_delete=models.CASCADE, related_name='entries')
    order = models.PositiveIntegerField(default=0)
    data = models.JSONField(default=dict)  # section-type-specific fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'Entry<{self.section.section_type}#{self.pk}>'
