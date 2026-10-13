from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.accounts.permissions import IsPlainUser
from apps.conciliateurs.permissions import IsConciliateur

from . import services
from .models import Appointment
from .serializers import AppointmentSerializer


@extend_schema(tags=["Rendez-vous"])
class AppointmentListCreateView(ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsPlainUser]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Appointment.objects.none()
        return self.request.user.appointments.select_related("slot")

    def perform_create(self, serializer):
        d = serializer.validated_data
        serializer.instance = services.book(self.request.user, d["slot"], d.get("motive", ""))


@extend_schema(tags=["Rendez-vous"])
class AppointmentDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsPlainUser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Appointment.objects.none()
        return self.request.user.appointments.select_related("slot")

    def perform_update(self, serializer):
        slot = serializer.validated_data.get("slot")
        if slot is None:
            raise ValidationError({"slot_id": "This field is required."})
        services.reschedule(serializer.instance, slot)

    def perform_destroy(self, instance):
        services.cancel(instance)  # soft cancel: the row is kept


@extend_schema(tags=["Rendez-vous"])
class MyAppointmentListView(ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsConciliateur]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Appointment.objects.none()
        return Appointment.objects.filter(slot__conciliateur=self.request.user.conciliateur).select_related("slot")
