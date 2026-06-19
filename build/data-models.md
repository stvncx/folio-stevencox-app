# Folio — Data Models

Build all models below and run migrations before building any API endpoints.

---

## User & Theme

```python
# Extends Django's built-in User model

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    primary_color = models.CharField(max_length=7, default='#000000')  # hex
    accent_color = models.CharField(max_length=7, default='#0066cc')   # hex
    font_name = models.CharField(max_length=100, blank=True)
    font_file = models.FileField(upload_to='fonts/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## CV Models

### CV Section Types

The following are the only valid section types. These are fixed and match LinkedIn's standard sections exactly.

```python
class SectionType(models.TextChoices):
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
```

### CV

```python
class CV(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cv')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### CVSection

```python
class CVSection(models.Model):
    cv = models.ForeignKey(CV, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=50, choices=SectionType.choices)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['cv', 'section_type']
```

### CVEntry

```python
class CVEntry(models.Model):
    section = models.ForeignKey(CVSection, on_delete=models.CASCADE, related_name='entries')
    order = models.PositiveIntegerField(default=0)
    data = models.JSONField(default=dict)  # section-type-specific fields stored here
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
```

The `data` JSONField stores different fields depending on the section type. See the **CV Entry Field Schemas** section below for the exact fields per section type.

---

## CV Entry Field Schemas

Each section type has a defined set of fields stored in the `data` JSONField of CVEntry. The frontend must render the correct form for each section type. The backend must validate that required fields are present for the given section type.

### headline
```json
{
  "text": "string — required"
}
```

### about
```json
{
  "text": "string (TipTap HTML) — required"
}
```

### experience
```json
{
  "job_title": "string — required",
  "company": "string — required",
  "location": "string — optional",
  "start_date": "YYYY-MM — required",
  "end_date": "YYYY-MM — optional, null means Present",
  "is_current": "boolean — required",
  "description": "string (TipTap HTML) — optional",
  "bullets": ["string", "string"]
}
```

### education
```json
{
  "school": "string — required",
  "degree": "string — required",
  "field_of_study": "string — optional",
  "start_date": "YYYY-MM — optional",
  "end_date": "YYYY-MM — optional",
  "grade": "string — optional",
  "activities": "string — optional",
  "description": "string (TipTap HTML) — optional"
}
```

### skills
```json
{
  "name": "string — required",
  "category": "string — optional",
  "proficiency": "string — optional (e.g. Beginner, Intermediate, Expert)"
}
```

### certifications
```json
{
  "name": "string — required",
  "issuing_organization": "string — required",
  "issue_date": "YYYY-MM — optional",
  "expiration_date": "YYYY-MM — optional, null means No Expiration",
  "does_not_expire": "boolean — required",
  "credential_id": "string — optional",
  "credential_url": "string — optional"
}
```

### projects
```json
{
  "name": "string — required",
  "description": "string (TipTap HTML) — optional",
  "url": "string — optional",
  "start_date": "YYYY-MM — optional",
  "end_date": "YYYY-MM — optional",
  "is_current": "boolean — required",
  "associated_with": "string — optional (company or organization)"
}
```

### publications
```json
{
  "title": "string — required",
  "publisher": "string — optional",
  "publication_date": "YYYY-MM — optional",
  "url": "string — optional",
  "authors": "string — optional",
  "description": "string (TipTap HTML) — optional"
}
```

### patents
```json
{
  "title": "string — required",
  "patent_office": "string — optional",
  "status": "string — optional (e.g. Pending, Issued)",
  "patent_number": "string — optional",
  "issue_date": "YYYY-MM — optional",
  "url": "string — optional",
  "inventors": "string — optional",
  "description": "string (TipTap HTML) — optional"
}
```

### courses
```json
{
  "name": "string — required",
  "number": "string — optional",
  "associated_with": "string — optional (institution or company)"
}
```

### honors
```json
{
  "title": "string — required",
  "issuer": "string — optional",
  "issue_date": "YYYY-MM — optional",
  "description": "string (TipTap HTML) — optional"
}
```

### volunteer
```json
{
  "role": "string — required",
  "organization": "string — required",
  "cause": "string — optional",
  "start_date": "YYYY-MM — optional",
  "end_date": "YYYY-MM — optional",
  "is_current": "boolean — required",
  "description": "string (TipTap HTML) — optional"
}
```

### languages
```json
{
  "language": "string — required",
  "proficiency": "string — optional (e.g. Native, Full Professional, Conversational)"
}
```

### organizations
```json
{
  "name": "string — required",
  "position": "string — optional",
  "start_date": "YYYY-MM — optional",
  "end_date": "YYYY-MM — optional",
  "is_current": "boolean — required",
  "description": "string (TipTap HTML) — optional"
}
```

### featured
```json
{
  "title": "string — required",
  "description": "string — optional",
  "url": "string — optional",
  "media_type": "string — optional (e.g. Link, Article, Post)"
}
```

### recommendations
```json
{
  "recommender_name": "string — required",
  "recommender_title": "string — optional",
  "relationship": "string — optional",
  "date": "YYYY-MM — optional",
  "text": "string (TipTap HTML) — required"
}
```

---

## Topical Resume Models

```python
class TopicalResume(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topical_resumes')
    title = models.CharField(max_length=200)
    description = models.TextField(help_text='Description of the job type this resume targets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
    cv_entry = models.ForeignKey(CVEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='topical_entries')
    order = models.PositiveIntegerField(default=0)
    data = models.JSONField(default=dict)  # snapshot of CV entry data at time of selection, may be edited

    class Meta:
        ordering = ['order']
```

---

## Custom Resume Models

```python
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

class CustomResumeSection(models.Model):
    custom_resume = models.ForeignKey(CustomResume, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=50, choices=SectionType.choices)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

class CustomResumeEntry(models.Model):
    section = models.ForeignKey(CustomResumeSection, on_delete=models.CASCADE, related_name='entries')
    topical_entry = models.ForeignKey(TopicalResumeEntry, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    data = models.JSONField(default=dict)

    class Meta:
        ordering = ['order']
```

---

## Job Application Tracker Models

```python
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
    custom_resume = models.ForeignKey(CustomResume, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    company_name = models.CharField(max_length=200)
    position_title = models.CharField(max_length=200)
    job_posting = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=ApplicationStatus.choices, default=ApplicationStatus.SAVED)
    applied_date = models.DateField(null=True, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    offer_deadline = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    cover_letter = models.TextField(blank=True)  # TipTap HTML
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
```
