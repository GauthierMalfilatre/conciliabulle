from rest_framework import serializers

from .models import Candidature


class CandidatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidature
        fields = ("id", "first_name", "last_name", "email", "phone", "department", "message", "consent")
        extra_kwargs = {"consent": {"write_only": True}}

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("Consent is required to be contacted.")
        return value
