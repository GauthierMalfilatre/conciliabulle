from django.utils import timezone
from rest_framework import serializers

from .models import ConciliateurProfile, Slot


class ConciliateurSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")

    class Meta:
        model = ConciliateurProfile
        fields = ("id", "first_name", "last_name", "city", "department", "bio")


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ("id", "start", "end", "location")

    def validate(self, data):
        if data["end"] <= data["start"]:
            raise serializers.ValidationError("end must be after start")
        if data["start"] <= timezone.now():
            raise serializers.ValidationError("start must be in the future")
        return data
