from django.contrib import admin
from django.utils.html import format_html

from users.models import PasswordResetToken, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'primary_color', 'accent_color', 'font_name', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Lets the owner copy a reset link to hand to a user (no email needed)."""
    list_display = ('user', 'created', 'used', 'is_expired', 'reset_link')
    list_filter = ('used',)
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('user', 'token', 'created', 'used', 'reset_link')

    @admin.display(boolean=True, description='expired')
    def is_expired(self, obj):
        return obj.expired

    @admin.display(description='reset link')
    def reset_link(self, obj):
        if obj.used or obj.expired:
            return '—'
        return format_html('<a href="https://folio.stevencox.org/reset?token={}">open / copy link</a>', obj.token)
