from drf_spectacular.utils import extend_schema
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from .serializers import CandidatureSerializer


class CandidatureThrottle(AnonRateThrottle):
    scope = "candidatures"


@extend_schema(tags=["Candidatures"])
class CandidatureCreateView(CreateAPIView):
    """Public: deposit one's details to be contacted by the association of one's département."""

    serializer_class = CandidatureSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [CandidatureThrottle]
