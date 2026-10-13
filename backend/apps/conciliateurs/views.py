from datetime import datetime

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from django.db import transaction
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.generics import DestroyAPIView, ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView

from . import services
from .models import Availability, ConciliateurProfile, Slot
from .permissions import IsConciliateur
from .serializers import AvailabilitySerializer, ConciliateurSerializer, MySlotSerializer, ProfileSerializer, SlotSerializer


class Conflict(APIException):
    status_code = 409


@extend_schema(
    tags=["Conciliateurs"],
    parameters=[
        OpenApiParameter("department", str, description="Code département (ex. 69, 2A)."),
        OpenApiParameter("available", bool, description="true : seulement ceux qui ont au moins un créneau libre."),
    ],
)
class ConciliateurListView(ListAPIView):
    serializer_class = ConciliateurSerializer

    def get_queryset(self):
        services.extend_rules()
        qs = ConciliateurProfile.objects.visible().select_related("user")
        params = self.request.query_params
        if department := params.get("department"):
            qs = qs.filter(department__iexact=department)
        if params.get("available") == "true":
            qs = qs.filter(slots__in=Slot.objects.free()).distinct()
        return qs


def _parse_bound(name, value):
    """ISO datetime or date (midnight UTC) -> aware datetime; 400 if invalid."""
    parsed = parse_datetime(value)
    if parsed is None and (day := parse_date(value)):
        parsed = datetime(day.year, day.month, day.day)
    if parsed is None:
        raise ValidationError({name: "Expected an ISO 8601 date or datetime."})
    return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed


@extend_schema(
    tags=["Conciliateurs"],
    parameters=[
        OpenApiParameter("from", OpenApiTypes.DATETIME, description="Début (inclus), date ou datetime ISO 8601."),
        OpenApiParameter("to", OpenApiTypes.DATETIME, description="Fin (exclue), date ou datetime ISO 8601."),
    ],
)
class FreeSlotListView(ListAPIView):
    serializer_class = SlotSerializer

    def get_queryset(self):
        c = get_object_or_404(ConciliateurProfile.objects.visible(), pk=self.kwargs["pk"])
        services.extend_rules()
        qs = c.slots.free()
        if value := self.request.query_params.get("from"):
            qs = qs.filter(start__gte=_parse_bound("from", value))
        if value := self.request.query_params.get("to"):
            qs = qs.filter(start__lt=_parse_bound("to", value))
        return qs


@extend_schema(
    tags=["Créneaux"],
    parameters=[
        OpenApiParameter("from", OpenApiTypes.DATETIME, description="Début (inclus), date ou datetime ISO 8601."),
        OpenApiParameter("to", OpenApiTypes.DATETIME, description="Fin (exclue), date ou datetime ISO 8601."),
    ],
)
class MySlotListCreateView(ListCreateAPIView):
    serializer_class = MySlotSerializer
    permission_classes = [IsConciliateur]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Slot.objects.none()
        qs = self.request.user.conciliateur.slots.prefetch_related("appointments")
        if value := self.request.query_params.get("from"):
            qs = qs.filter(start__gte=_parse_bound("from", value))
        if value := self.request.query_params.get("to"):
            qs = qs.filter(start__lt=_parse_bound("to", value))
        return qs

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


@extend_schema(tags=["Créneaux"])
class MyAvailabilityListCreateView(ListCreateAPIView):
    """Recurring weekly availabilities: slots are generated from them, 8 weeks ahead."""

    serializer_class = AvailabilitySerializer
    permission_classes = [IsConciliateur]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Availability.objects.none()
        return self.request.user.conciliateur.availabilities.all()

    def perform_create(self, serializer):
        rule = serializer.save(conciliateur=self.request.user.conciliateur)
        services.materialize(rule)


@extend_schema(tags=["Créneaux"])
class MyAvailabilityDeleteView(DestroyAPIView):
    """Deletes the rule and its future unbooked slots; booked slots are kept."""

    serializer_class = AvailabilitySerializer
    permission_classes = [IsConciliateur]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Availability.objects.none()
        return self.request.user.conciliateur.availabilities.all()

    @transaction.atomic
    def perform_destroy(self, instance):
        instance.slots.filter(start__gt=timezone.now()).exclude(appointments__isnull=False).delete()
        instance.delete()  # slots with appointments stay, detached from the rule


@extend_schema(tags=["Account"])
class MyProfileView(RetrieveUpdateAPIView):
    """The conciliateur's own profile, including the instructions shown to plaignants after booking."""

    serializer_class = ProfileSerializer
    permission_classes = [IsConciliateur]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user.conciliateur
