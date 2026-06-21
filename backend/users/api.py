from typing import List, Optional

from asgiref.sync import sync_to_async
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from ninja import File, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from services import ai
from users.models import AuthToken, UserProfile, build_profile_text

auth_router = Router(tags=['auth'])
profile_router = Router(tags=['profile'])

FONT_EXTS = ('.ttf', '.otf', '.woff', '.woff2')


class LoginIn(Schema):
    username: str  # email or username
    password: str


@auth_router.post('/login/', auth=None)
def login(request, data: LoginIn):
    ident = data.username.strip()
    user = authenticate(username=ident, password=data.password)
    if user is None:
        match = User.objects.filter(email__iexact=ident).first()
        if match:
            user = authenticate(username=match.username, password=data.password)
    if user is None or not user.is_active:
        raise HttpError(401, 'Invalid credentials.')
    token = AuthToken.get_or_create_for(user)
    return {'token': token.key, 'username': user.username, 'email': user.email}


@auth_router.post('/logout/')
def logout(request):
    AuthToken.objects.filter(user=request.user).delete()
    return {'detail': 'logged out'}


def _profile_dict(request, profile):
    url = None
    if profile.font_file:
        url = request.build_absolute_uri(profile.font_file.url)
    return {
        'primary_color': profile.primary_color,
        'accent_color': profile.accent_color,
        'font_name': profile.font_name,
        'font_url': url,
        'about': profile.about,
        'preferences': profile.preferences,
        'fulfilling': profile.fulfilling,
        'personality': profile.personality or [],
        'username': request.user.username,
        'email': request.user.email,
        'is_staff': request.user.is_staff,
    }


class ProfileIn(Schema):
    primary_color: str = None
    accent_color: str = None
    about: Optional[str] = None
    preferences: Optional[str] = None
    fulfilling: Optional[str] = None
    personality: Optional[List[dict]] = None


@profile_router.get('/')
def get_profile(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return _profile_dict(request, profile)


@profile_router.patch('/')
def update_profile(request, data: ProfileIn):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if data.primary_color is not None:
        profile.primary_color = data.primary_color[:7]
    if data.accent_color is not None:
        profile.accent_color = data.accent_color[:7]
    if data.about is not None:
        profile.about = data.about
    if data.preferences is not None:
        profile.preferences = data.preferences
    if data.fulfilling is not None:
        profile.fulfilling = data.fulfilling
    if data.personality is not None:
        profile.personality = data.personality
    profile.save()
    return _profile_dict(request, profile)


@profile_router.post('/personality-questions/')
async def personality_questions(request):
    profile_text = await sync_to_async(lambda: build_profile_text(request.user))()
    try:
        qs = await ai.generate_personality_questions(profile_text)
    except ai.AIConfigError as e:
        raise HttpError(400, str(e))
    except Exception as e:  # noqa: BLE001
        raise HttpError(502, f'Could not generate questions: {e}')
    return {'questions': qs}


@profile_router.post('/font/')
def upload_font(request, file: UploadedFile = File(...)):
    name = (file.name or '').lower()
    if not name.endswith(FONT_EXTS):
        raise HttpError(400, f'Font must be one of {", ".join(FONT_EXTS)}.')
    if file.size > settings.MAX_FONT_UPLOAD_BYTES:
        raise HttpError(400, 'Font file must be 5 MB or smaller.')
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.font_file.save(file.name, file, save=False)
    profile.font_name = file.name.rsplit('.', 1)[0]
    profile.save()
    return _profile_dict(request, profile)


@profile_router.delete('/font/')
def delete_font(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.font_file:
        profile.font_file.delete(save=False)
    profile.font_name = ''
    profile.save()
    return _profile_dict(request, profile)
