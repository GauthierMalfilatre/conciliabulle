from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import RegisterSerializer

from .models import ConciliateurProfile, Slot


class ConciliateurRegisterSerializer(RegisterSerializer):
    role = User.Role.CONCILIATEUR
    city = serializers.CharField(max_length=100, write_only=True)
    bio = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ("city", "bio")

    @transaction.atomic
    def create(self, validated_data):
        profile = {k: validated_data.pop(k) for k in ("city", "bio") if k in validated_data}
        user = super().create(validated_data)
        ConciliateurProfile.objects.create(user=user, **profile)
        return user


class ConciliateurSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")

    class Meta:
        model = ConciliateurProfile
        fields = ("id", "first_name", "last_name", "city", "bio")


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ("id", "start", "end")

    def validate(self, data):
        if data["end"] <= data["start"]:
            raise serializers.ValidationError("end must be after start")
        if data["start"] <= timezone.now():
            raise serializers.ValidationError("start must be in the future")
        return data
