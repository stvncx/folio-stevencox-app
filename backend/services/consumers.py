"""Channels consumers that stream AI generation token-by-token.

Auth: the browser WebSocket sends its bearer token in the first JSON message
({token, job_id}) — browsers can't set WS Authorization headers. We validate
the token, load the pre-created AIJob, stream, then build DB records atomically.
"""
import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db import transaction

from services import ai, serializers
from services.models import AIJob

logger = logging.getLogger('services.ai')


def _parse_json(text: str) -> dict:
    text = (text or '').strip()
    if text.startswith('```'):
        text = text.split('```', 2)[1] if '```' in text[3:] else text[3:]
        if text.lstrip().lower().startswith('json'):
            text = text.lstrip()[4:]
    start, end = text.find('{'), text.rfind('}')
    if start >= 0 and end > start:
        return json.loads(text[start:end + 1])
    return json.loads(text)


@database_sync_to_async
def _user_for_token(token):
    from users.models import AuthToken
    try:
        return AuthToken.objects.select_related('user').get(key=token).user
    except AuthToken.DoesNotExist:
        return None


@database_sync_to_async
def _load_job(job_id, user, kind):
    return AIJob.objects.filter(id=job_id, user=user, kind=kind).first()


@database_sync_to_async
def _set_status(job, status, **fields):
    job.status = status
    for k, v in fields.items():
        setattr(job, k, v)
    job.save()


class BaseGen(AsyncJsonWebsocketConsumer):
    kind = None

    async def connect(self):
        self._started = False
        await self.accept()

    async def receive_json(self, content, **kwargs):
        if self._started:
            return
        self._started = True
        user = await _user_for_token(content.get('token') or '')
        if user is None or not user.is_active:
            await self.send_json({'type': 'error', 'message': 'Authentication failed.'})
            return await self.close()
        job = await _load_job(content.get('job_id'), user, self.kind)
        if job is None:
            await self.send_json({'type': 'error', 'message': 'Generation job not found.'})
            return await self.close()
        try:
            await self.run(job, user)
        except ai.AIConfigError as e:
            await self._fail(job, str(e))
        except json.JSONDecodeError:
            logger.exception('AI returned malformed JSON')
            await self._fail(job, 'The AI returned malformed output. Please try again.')
        except Exception as e:  # noqa: BLE001
            logger.exception('AI generation failed')
            await self._fail(job, f'AI generation failed: {e}')
        await self.close()

    async def _fail(self, job, message):
        await _set_status(job, AIJob.Status.ERROR, error=message)
        await self.send_json({'type': 'error', 'message': message})

    async def run(self, job, user):
        await _set_status(job, AIJob.Status.RUNNING)
        user_text = await self.prepare(job, user)
        full = ''
        async for chunk in ai.stream(self.kind, user_text, user):
            full += chunk
            await self.send_json({'type': 'token', 'content': chunk})
        record_id = await self.finalize(job, user, full)
        await _set_status(job, AIJob.Status.DONE, result_id=record_id)
        await self.send_json({'type': 'complete', 'record_id': record_id})

    # subclasses implement prepare() + finalize()


class TopicalResumeGenerationConsumer(BaseGen):
    kind = 'topical'

    @database_sync_to_async
    def prepare(self, job, user):
        cv = user.cv  # CV guaranteed to exist (created on first login)
        data = serializers.serialize_cv(cv)
        desc = job.params.get('description', '')
        return (f"User's complete CV (JSON):\n{json.dumps(data)}\n\n"
                f"Target job type description:\n{desc}")

    @database_sync_to_async
    def finalize(self, job, user, full):
        ai_json = _parse_json(full)
        with transaction.atomic():
            topical = serializers.build_topical_from_ai(
                user, job.params.get('title', ''), job.params.get('description', ''), ai_json)
        return topical.id


class CustomResumeGenerationConsumer(BaseGen):
    kind = 'custom'

    @database_sync_to_async
    def prepare(self, job, user):
        from resumes.models import TopicalResume
        topical = TopicalResume.objects.get(id=job.params['topical_id'], user=user)
        data = serializers.serialize_topical(topical)
        p = job.params
        return (f"Topical resume (JSON):\n{json.dumps(data)}\n\n"
                f"Job posting:\n{p.get('job_posting', '')}\n\n"
                f"Company: {p.get('company_name', '')}\nPosition: {p.get('position_title', '')}")

    @database_sync_to_async
    def finalize(self, job, user, full):
        from resumes.models import TopicalResume
        ai_json = _parse_json(full)
        topical = TopicalResume.objects.get(id=job.params['topical_id'], user=user)
        with transaction.atomic():
            custom = serializers.build_custom_from_ai(topical, job.params, ai_json)
        return custom.id


class CoverLetterGenerationConsumer(BaseGen):
    kind = 'cover_letter'

    @database_sync_to_async
    def prepare(self, job, user):
        from applications.models import JobApplication
        from resumes.models import CustomResume
        app = JobApplication.objects.get(id=job.params['application_id'], user=user)
        custom = CustomResume.objects.get(
            id=job.params['custom_resume_id'], topical_resume__user=user)
        data = serializers.serialize_custom(custom)
        return (f"Tailored resume (JSON):\n{json.dumps(data)}\n\n"
                f"Job posting:\n{app.job_posting}\n\n"
                f"Company: {app.company_name}\nPosition: {app.position_title}")

    @database_sync_to_async
    def finalize(self, job, user, full):
        from applications.models import JobApplication
        app = JobApplication.objects.get(id=job.params['application_id'], user=user)
        app.cover_letter = full.strip()
        app.save(update_fields=['cover_letter', 'updated_at'])
        return app.id
