import secrets
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPlainUser
from apps.conciliateurs.models import ConciliateurProfile
from apps.conciliateurs.permissions import IsConciliateur

from . import ics, services
from .models import Appointment
from .serializers import AppointmentSerializer


@extend_schema(tags=["Rendez-vous"])
class AppointmentListCreateView(ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsPlainUser]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Appointment.objects.none()
        return self.request.user.appointments.select_related("slot__conciliateur")

    def perform_create(self, serializer):
        d = dict(serializer.validated_data)
        serializer.instance = services.book(self.request.user, d.pop("slot"), **d)


@extend_schema(tags=["Rendez-vous"])
class AppointmentDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsPlainUser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Appointment.objects.none()
        return self.request.user.appointments.select_related("slot__conciliateur")

    def perform_update(self, serializer):
        d = dict(serializer.validated_data)
        if not d:
            raise ValidationError("Nothing to change.")
        services.update(serializer.instance, d.pop("slot", None), **d)

    def perform_destroy(self, instance):
        services.cancel(instance)  # soft cancel: the row is kept


@extend_schema(tags=["Rendez-vous"])
class MyAppointmentListView(ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsConciliateur]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Appointment.objects.none()
        return Appointment.objects.filter(slot__conciliateur=self.request.user.conciliateur).select_related("slot__conciliateur")


class ICalRenderer(BaseRenderer):
    media_type = "text/calendar"
    format = "ics"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data.encode() if isinstance(data, str) else b""  # error bodies (404...) are dicts


@extend_schema(tags=["Calendrier"], responses={(200, "text/calendar"): OpenApiTypes.STR})
class CalendarFeedView(APIView):
    """Public (the secret token is the credential): the conciliateur's appointments as an iCalendar feed
    to subscribe to from Google Calendar, Outlook, Apple Calendar..."""

    permission_classes = [AllowAny]
    authentication_classes = []
    renderer_classes = [ICalRenderer]

    def get(self, request, token):
        c = get_object_or_404(ConciliateurProfile.objects.select_related("user"), calendar_token=token)
        since = timezone.now() - timedelta(days=30)
        appointments = Appointment.objects.filter(slot__conciliateur=c, status=Appointment.Status.BOOKED, slot__start__gte=since).select_related("slot")
        return Response(ics.build_calendar(appointments, "Rendez-vous conciliateur"))


_calendar_link = extend_schema(tags=["Calendrier"], request=None, responses=inline_serializer("CalendarLink", {"url": serializers.URLField()}))


class MyCalendarLinkView(APIView):
    """GET: the private subscription URL of the feed. POST: generate a new one (the old one stops working)."""

    permission_classes = [IsConciliateur]

    def _link(self, request, rotate):
        profile = request.user.conciliateur
        if rotate or not profile.calendar_token:
            profile.calendar_token = secrets.token_urlsafe(32)
            profile.save(update_fields=["calendar_token"])
        return Response({"url": request.build_absolute_uri(reverse("calendar-feed", args=[profile.calendar_token]))})

    @_calendar_link
    def get(self, request):
        return self._link(request, rotate=False)

    @_calendar_link
    def post(self, request):
        return self._link(request, rotate=True)
