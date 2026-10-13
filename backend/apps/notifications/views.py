from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


def _mine(request):
    return Notification.objects.filter(recipient=request.user)


@extend_schema(tags=["Notifications"], parameters=[OpenApiParameter("unread", bool, description="true : seulement les non lues.")])
class NotificationListView(ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        qs = _mine(self.request)
        return qs.filter(read_at__isnull=True) if self.request.query_params.get("unread") == "true" else qs


class NotificationReadView(APIView):
    @extend_schema(tags=["Notifications"], request=None, responses=NotificationSerializer)
    def post(self, request, pk):
        n = get_object_or_404(_mine(request), pk=pk)
        if n.read_at is None:
            n.read_at = timezone.now()
            n.save(update_fields=["read_at"])
        return Response(NotificationSerializer(n).data)


class NotificationReadAllView(APIView):
    @extend_schema(tags=["Notifications"], request=None, responses=inline_serializer("ReadAll", {"updated": serializers.IntegerField()}))
    def post(self, request):
        return Response({"updated": _mine(request).filter(read_at__isnull=True).update(read_at=timezone.now())})
