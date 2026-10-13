from django.utils import timezone
from drf_spectacular.utils import extend_schema_field, inline_serializer
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


class MySlotSerializer(SlotSerializer):
    """A slot as the conciliateur sees it in their calendar: free, or booked by someone."""

    is_booked = serializers.SerializerMethodField()
    appointment = serializers.SerializerMethodField()

    class Meta(SlotSerializer.Meta):
        fields = SlotSerializer.Meta.fields + ("is_booked", "appointment")

    def _booked(self, slot):
        # In Python so that a prefetch of "appointments" serves the whole list in one query.
        return next((a for a in slot.appointments.all() if a.status == "BOOKED"), None)

    def get_is_booked(self, slot) -> bool:
        return self._booked(slot) is not None

    @extend_schema_field(
        inline_serializer(
            "SlotAppointment",
            {
                "id": serializers.IntegerField(),
                "first_name": serializers.CharField(),
                "last_name": serializers.CharField(),
                "phone": serializers.CharField(),
                "motive": serializers.CharField(),
            },
            allow_null=True,
        )
    )
    def get_appointment(self, slot):
        a = self._booked(slot)
        return a and {"id": a.id, "first_name": a.first_name, "last_name": a.last_name, "phone": a.phone, "motive": a.motive}
