from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny

from .serializers import ConciliateurRegisterSerializer


class ConciliateurRegisterView(CreateAPIView):
    serializer_class = ConciliateurRegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
