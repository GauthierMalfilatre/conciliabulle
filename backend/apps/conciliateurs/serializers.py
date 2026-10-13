from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import RegisterSerializer

from .models import ConciliateurProfile


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
