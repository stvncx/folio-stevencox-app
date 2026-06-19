import secrets

from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """Per-user theme settings (colors + uploaded font)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    primary_color = models.CharField(max_length=7, default='#000000')
    accent_color = models.CharField(max_length=7, default='#0066cc')
    font_name = models.CharField(max_length=100, blank=True)
    font_file = models.FileField(upload_to='fonts/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile<{self.user.username}>'


class AuthToken(models.Model):
    """Simple per-user API token (Ninja bearer auth). One token per user."""
    key = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='auth_token')
    created = models.DateTimeField(auto_now_add=True)

    @classmethod
    def get_or_create_for(cls, user):
        obj, _ = cls.objects.get_or_create(
            user=user, defaults={'key': secrets.token_hex(32)})
        return obj

    def __str__(self):
        return f'Token<{self.user.username}>'


@receiver(post_save, sender=User)
def ensure_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)
