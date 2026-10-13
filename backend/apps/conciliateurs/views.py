from drf_spectacular.utils import extend_schema
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException
from rest_framework.generics import CreateAPIView, DestroyAPIView, ListAPIView, ListCreateAPIView
from rest_framework.permissions import AllowAny

from .models import ConciliateurProfile, Slot
from .permissions import IsConciliateur
from .serializers import ConciliateurRegisterSerializer, ConciliateurSerializer, SlotSerializer


class Conflict(APIException):
    status_code = 409


@extend_schema(tags=["Auth"])
class ConciliateurRegisterView(CreateAPIView):
    serializer_class = ConciliateurRegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


@extend_schema(tags=["Conciliateurs"])
class ConciliateurListView(ListAPIView):
    serializer_class = ConciliateurSerializer

    def get_queryset(self):
        return ConciliateurProfile.objects.visible().select_related("user")


@extend_schema(tags=["Conciliateurs"])
class FreeSlotListView(ListAPIView):
    serializer_class = SlotSerializer

    def get_queryset(self):
        c = get_object_or_404(ConciliateurProfile.objects.visible(), pk=self.kwargs["pk"])
        return c.slots.filter(start__gt=timezone.now()).exclude(appointments__status="BOOKED")


@extend_schema(tags=["Créneaux"])
class MySlotListCreateView(ListCreateAPIView):
    serializer_class = SlotSerializer
    permission_classes = [IsConciliateur]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Slot.objects.none()
        return self.request.user.conciliateur.slots.all()

    def perform_create(self, serializer):
        serializer.save(conciliateur=self.request.user.conciliateur)


@extend_schema(tags=["Créneaux"])
class MySlotDeleteView(DestroyAPIView):
    permission_classes = [IsConciliateur]
    serializer_class = SlotSerializer

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise Conflict("This slot has appointments and cannot be deleted.")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Slot.objects.none()
        return self.request.user.conciliateur.slots.all()
