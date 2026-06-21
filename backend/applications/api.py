import html as _html
import io
import re
from datetime import date, datetime
from typing import Optional

from asgiref.sync import sync_to_async
from django.db.models import Count
from ninja import File, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from applications.models import (ApplicationActivity, ApplicationContact,
                                 JobApplication)
from resumes.models import CustomResume
from services import ai
from services.models import AIJob
from users.models import build_profile_text

router = Router(tags=['applications'])


def _app(request, aid):
    o = JobApplication.objects.filter(id=aid, user=request.user).first()
    if o is None:
        raise HttpError(404, 'Application not found.')
    return o


def _own_custom(request, cid):
    if cid is None:
        return None
    c = CustomResume.objects.filter(id=cid, topical_resume__user=request.user).first()
    if c is None:
        raise HttpError(400, 'Custom resume not found or not yours.')
    return c


def _contact_d(c):
    return {'id': c.id, 'name': c.name, 'role': c.role, 'title': c.title,
            'email': c.email, 'phone': c.phone, 'linkedin_url': c.linkedin_url, 'notes': c.notes}


def _activity_d(a):
    return {'id': a.id, 'activity_type': a.activity_type, 'date': a.date.isoformat(),
            'title': a.title, 'notes': a.notes}


def _fit_of(analysis: str) -> str:
    """Pull the 'Fit: Strong|Moderate|Weak' rating out of an analysis."""
    if not analysis:
        return ''
    m = re.search(r'Fit:\s*(Strong|Moderate|Weak)', analysis, re.IGNORECASE)
    return m.group(1).capitalize() if m else ''


def _app_d(a, full=False):
    d = {'id': a.id, 'company_name': a.company_name, 'position_title': a.position_title,
         'company_url': a.company_url, 'company_fit': _fit_of(a.company_analysis),
         'status': a.status, 'job_posting': a.job_posting, 'job_posting_url': a.job_posting_url,
         'custom_resume_id': a.custom_resume_id,
         'applied_date': a.applied_date.isoformat() if a.applied_date else None,
         'follow_up_date': a.follow_up_date.isoformat() if a.follow_up_date else None,
         'offer_deadline': a.offer_deadline.isoformat() if a.offer_deadline else None,
         'notes': a.notes, 'cover_letter': a.cover_letter,
         'created_at': a.created_at.isoformat(), 'updated_at': a.updated_at.isoformat()}
    if full:
        d['company_analysis'] = a.company_analysis
        d['contacts'] = [_contact_d(c) for c in a.contacts.all()]
        d['activities'] = [_activity_d(x) for x in a.activities.all()]
    return d


# --- schemas ---------------------------------------------------------------
class AppIn(Schema):
    company_name: str
    position_title: str
    company_url: str = ''
    job_posting: str = ''
    job_posting_url: str = ''
    status: str = 'saved'
    applied_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    offer_deadline: Optional[date] = None
    notes: str = ''
    custom_resume_id: Optional[int] = None


class AppPatch(Schema):
    company_name: Optional[str] = None
    position_title: Optional[str] = None
    company_url: Optional[str] = None
    company_analysis: Optional[str] = None
    job_posting: Optional[str] = None
    job_posting_url: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    offer_deadline: Optional[date] = None
    notes: Optional[str] = None
    custom_resume_id: Optional[int] = None


class CoverGenIn(Schema):
    custom_resume_id: int


class CoverSaveIn(Schema):
    cover_letter: str


class ContactIn(Schema):
    name: str
    role: str = 'other'
    title: str = ''
    email: str = ''
    phone: str = ''
    linkedin_url: str = ''
    notes: str = ''


class ActivityIn(Schema):
    activity_type: str
    date: datetime
    title: str
    notes: str = ''


# --- applications ----------------------------------------------------------
@router.get('/')
def list_apps(request):
    return [_app_d(a) for a in JobApplication.objects.filter(user=request.user)]


@router.post('/')
def create_app(request, data: AppIn):
    c = _own_custom(request, data.custom_resume_id)
    a = JobApplication.objects.create(
        user=request.user, company_name=data.company_name, position_title=data.position_title,
        company_url=data.company_url, job_posting=data.job_posting,
        job_posting_url=data.job_posting_url, status=data.status,
        applied_date=data.applied_date, follow_up_date=data.follow_up_date,
        offer_deadline=data.offer_deadline, notes=data.notes, custom_resume=c)
    return _app_d(a, full=True)


@router.get('/{aid}/')
def get_app(request, aid: int):
    return _app_d(_app(request, aid), full=True)


@router.patch('/{aid}/')
def update_app(request, aid: int, data: AppPatch):
    a = _app(request, aid)
    payload = data.dict(exclude_unset=True)
    if 'custom_resume_id' in payload:
        a.custom_resume = _own_custom(request, payload.pop('custom_resume_id'))
    for f, v in payload.items():
        setattr(a, f, v)
    a.save()
    return _app_d(a, full=True)


@router.delete('/{aid}/', response={204: None})
def delete_app(request, aid: int):
    _app(request, aid).delete()
    return 204, None


# --- company analysis ------------------------------------------------------
@router.post('/{aid}/analyze-company/')
async def analyze_company_ep(request, aid: int):
    def _ctx():
        a = _app(request, aid)
        return a.company_name, a.company_url, build_profile_text(request.user)
    company, url, profile_text = await sync_to_async(_ctx)()
    try:
        analysis = await ai.analyze_company(company, url, profile_text)
    except ai.AIConfigError as e:
        raise HttpError(400, str(e))
    except Exception as e:  # noqa: BLE001
        raise HttpError(502, f'Analysis failed: {e}')

    def _save():
        a = _app(request, aid)
        a.company_analysis = analysis
        a.save(update_fields=['company_analysis', 'updated_at'])
        return _app_d(a, full=True)
    return await sync_to_async(_save)()


# --- cover letter ----------------------------------------------------------
@router.post('/{aid}/cover-letter/generate/')
def gen_cover(request, aid: int, data: CoverGenIn):
    _app(request, aid)
    _own_custom(request, data.custom_resume_id)
    job = AIJob.objects.create(
        user=request.user, kind=AIJob.Kind.COVER_LETTER,
        params={'application_id': aid, 'custom_resume_id': data.custom_resume_id})
    return {'job_id': job.id, 'ws': '/ws/ai/cover-letter/generate/'}


@router.patch('/{aid}/cover-letter/')
def save_cover(request, aid: int, data: CoverSaveIn):
    a = _app(request, aid)
    a.cover_letter = data.cover_letter
    a.save(update_fields=['cover_letter', 'updated_at'])
    return {'cover_letter': a.cover_letter}


# --- contacts --------------------------------------------------------------
@router.get('/{aid}/contacts/')
def list_contacts(request, aid: int):
    return [_contact_d(c) for c in _app(request, aid).contacts.all()]


@router.post('/{aid}/contacts/')
def add_contact(request, aid: int, data: ContactIn):
    c = ApplicationContact.objects.create(application=_app(request, aid), **data.dict())
    return _contact_d(c)


@router.patch('/{aid}/contacts/{cid}/')
def update_contact(request, aid: int, cid: int, data: ContactIn):
    a = _app(request, aid)
    c = a.contacts.filter(id=cid).first()
    if c is None:
        raise HttpError(404, 'Contact not found.')
    for f, v in data.dict().items():
        setattr(c, f, v)
    c.save()
    return _contact_d(c)


@router.delete('/{aid}/contacts/{cid}/', response={204: None})
def delete_contact(request, aid: int, cid: int):
    _app(request, aid).contacts.filter(id=cid).delete()
    return 204, None


# --- activities ------------------------------------------------------------
@router.get('/{aid}/activities/')
def list_activities(request, aid: int):
    return [_activity_d(x) for x in _app(request, aid).activities.all()]


@router.post('/{aid}/activities/')
def add_activity(request, aid: int, data: ActivityIn):
    a = ApplicationActivity.objects.create(application=_app(request, aid), **data.dict())
    return _activity_d(a)


@router.patch('/{aid}/activities/{actid}/')
def update_activity(request, aid: int, actid: int, data: ActivityIn):
    a = _app(request, aid)
    act = a.activities.filter(id=actid).first()
    if act is None:
        raise HttpError(404, 'Activity not found.')
    for f, v in data.dict().items():
        setattr(act, f, v)
    act.save()
    return _activity_d(act)


@router.delete('/{aid}/activities/{actid}/', response={204: None})
def delete_activity(request, aid: int, actid: int):
    _app(request, aid).activities.filter(id=actid).delete()
    return 204, None


# ===========================================================================
#  Job-description tools (PDF extract + URL fetch) and Dashboard
# ===========================================================================
jd_router = Router(tags=['jd'])
dashboard_router = Router(tags=['dashboard'])


@jd_router.post('/extract/')
def extract_pdf(request, file: UploadedFile = File(...)):
    """Extract text from an uploaded position-description PDF."""
    if not (file.name or '').lower().endswith('.pdf'):
        raise HttpError(400, 'Upload a PDF file.')
    if file.size > 10 * 1024 * 1024:
        raise HttpError(400, 'PDF must be 10 MB or smaller.')
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file.read()))
        text = '\n'.join((p.extract_text() or '') for p in reader.pages)
    except Exception:
        raise HttpError(400, 'Could not read that PDF — paste the text instead.')
    return {'text': text.strip()}


class UrlIn(Schema):
    url: str


LOGIN_WALL = ('Some job sites (LinkedIn, Indeed, Glassdoor…) require signing in and block '
              'automated fetching. Paste the description text or upload the PDF instead.')
_WALL_URL = ('authwall', '/login', '/uas/login', '/checkpoint', 'signin', '/authwall')
_WALL_TEXT = ('sign in to linkedin', 'join linkedin', 'sign in to view', 'please log in',
              'you must be logged in', 'sign in or join', 'log in or sign up',
              'sign in to continue', 'register to see')


@jd_router.post('/fetch/')
def fetch_url(request, data: UrlIn):
    """Best-effort fetch of a position-description URL → readable text."""
    import httpx
    url = data.url.strip()
    if not url.startswith(('http://', 'https://')):
        raise HttpError(400, 'Enter a valid http(s) URL.')
    host = url.split('://', 1)[1].split('/', 1)[0].lower()
    wall_domain = any(d in host for d in
                      ('linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'dice.com'))
    try:
        r = httpx.get(url, follow_redirects=True, timeout=15.0, headers={
            'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                           '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'})
        # Redirected to a sign-in wall (LinkedIn does this for logged-out requests).
        if any(m in str(r.url).lower() for m in _WALL_URL):
            raise HttpError(502, LOGIN_WALL)
        r.raise_for_status()
        raw = r.text
    except HttpError:
        raise
    except Exception:
        # Known job sites bot-block (HTTP 999/403); say so plainly.
        raise HttpError(502, LOGIN_WALL if wall_domain
                        else 'Could not fetch that URL — paste the description instead.')
    raw = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', raw)
    text = _html.unescape(re.sub(r'(?s)<[^>]+>', ' ', raw))
    text = '\n'.join(ln.strip() for ln in re.sub(r'[ \t]+', ' ', text).splitlines())
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    if any(p in text[:2000].lower() for p in _WALL_TEXT):
        raise HttpError(502, LOGIN_WALL)
    if len(text) < 50:
        raise HttpError(502, 'Fetched the page but found little text — paste the description instead.')
    return {'text': text[:20000], 'url': url}


@dashboard_router.get('/')
def dashboard(request):
    apps = JobApplication.objects.filter(user=request.user)
    by_status = {row['status']: row['c']
                 for row in apps.values('status').annotate(c=Count('id')).order_by()}
    upcoming = []
    for a in apps.exclude(follow_up_date=None):
        upcoming.append({'application_id': a.id, 'company': a.company_name,
                         'position': a.position_title, 'type': 'Follow-up',
                         'date': a.follow_up_date.isoformat()})
    for a in apps.exclude(offer_deadline=None):
        upcoming.append({'application_id': a.id, 'company': a.company_name,
                         'position': a.position_title, 'type': 'Offer deadline',
                         'date': a.offer_deadline.isoformat()})
    upcoming.sort(key=lambda x: x['date'])
    acts = (ApplicationActivity.objects.filter(application__user=request.user)
            .select_related('application').order_by('-date')[:15])
    recent = [{'application_id': x.application_id, 'company': x.application.company_name,
               'activity_type': x.activity_type, 'title': x.title, 'date': x.date.isoformat()}
              for x in acts]
    by_fit = {}
    for a in apps.exclude(company_analysis=''):
        f = _fit_of(a.company_analysis)
        if f:
            by_fit[f] = by_fit.get(f, 0) + 1
    return {'total': apps.count(), 'by_status': by_status, 'by_fit': by_fit,
            'upcoming': upcoming[:10], 'recent_activity': recent}
