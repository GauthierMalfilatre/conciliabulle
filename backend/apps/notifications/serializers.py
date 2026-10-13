from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    appointment_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "kind", "message", "appointment_id", "created_at", "read_at")
