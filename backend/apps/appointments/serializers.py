from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.conciliateurs.models import Slot
from apps.conciliateurs.serializers import SlotSerializer

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    slot = SlotSerializer(read_only=True)
    slot_id = serializers.PrimaryKeyRelatedField(source="slot", queryset=Slot.objects.all(), write_only=True)
    conciliateur_id = serializers.IntegerField(source="slot.conciliateur_id", read_only=True)
    instructions = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = ("id", "slot", "slot_id", "conciliateur_id", "status", "first_name", "last_name", "phone", "motive", "instructions")
        read_only_fields = ("status",)
        validators = []  # double booking is handled in services.book (409)

    @extend_schema_field(str)
    def get_instructions(self, appointment):
        return appointment.slot.conciliateur.appointment_instructions
