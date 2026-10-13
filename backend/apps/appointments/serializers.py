from rest_framework import serializers

from apps.conciliateurs.models import Slot
from apps.conciliateurs.serializers import SlotSerializer

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    slot = SlotSerializer(read_only=True)
    slot_id = serializers.PrimaryKeyRelatedField(source="slot", queryset=Slot.objects.all(), write_only=True)
    conciliateur_id = serializers.IntegerField(source="slot.conciliateur_id", read_only=True)

    class Meta:
        model = Appointment
        fields = ("id", "slot", "slot_id", "conciliateur_id", "status", "first_name", "last_name", "phone", "motive")
        read_only_fields = ("status",)
        validators = []  # double booking is handled in services.book (409)
