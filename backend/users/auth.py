from ninja.security import HttpBearer

from users.models import AuthToken


class TokenAuth(HttpBearer):
    def authenticate(self, request, token):
        t = AuthToken.objects.select_related('user').filter(key=token).first()
        if t and t.user.is_active:
            request.user = t.user
            return t.user
        return None
