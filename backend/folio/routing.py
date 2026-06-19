from django.urls import path

from services.consumers import (
    CoverLetterGenerationConsumer,
    CustomResumeGenerationConsumer,
    TopicalResumeGenerationConsumer,
)

websocket_urlpatterns = [
    path('ws/ai/topical/generate/', TopicalResumeGenerationConsumer.as_asgi()),
    path('ws/ai/custom/generate/', CustomResumeGenerationConsumer.as_asgi()),
    path('ws/ai/cover-letter/generate/', CoverLetterGenerationConsumer.as_asgi()),
]
