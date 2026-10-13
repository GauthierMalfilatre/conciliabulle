from django.utils import timezone
from rest_framework import serializers

from .models import Availability, ConciliateurProfile, Slot


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


class AvailabilitySerializer(serializers.ModelSerializer):
    slot_minutes = serializers.IntegerField(min_value=15, max_value=240, default=60)

    class Meta:
        model = Availability
        fields = ("id", "weekday", "start_time", "end_time", "slot_minutes", "location", "valid_from", "valid_until")

    def validate(self, data):
        if data["end_time"] <= data["start_time"]:
            raise serializers.ValidationError("end_time must be after start_time")
        minutes = (data["end_time"].hour - data["start_time"].hour) * 60 + data["end_time"].minute - data["start_time"].minute
        if minutes < data["slot_minutes"]:
            raise serializers.ValidationError("The time range is shorter than one slot")
        if data.get("valid_from") and data.get("valid_until") and data["valid_until"] < data["valid_from"]:
            raise serializers.ValidationError("valid_until must not be before valid_from")
        return data


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConciliateurProfile
        fields = ("city", "department", "bio", "instructions", "is_verified")
        read_only_fields = ("is_verified",)
