from django.contrib import admin
from django.urls import path

from folio.api import api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]

admin.site.site_header = 'Folio — Administration'
admin.site.site_title = 'Folio Admin'
admin.site.index_title = 'Account management'
