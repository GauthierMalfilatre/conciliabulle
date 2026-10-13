from django.db import models

from config.validators import department_validator, phone_validator


class Candidature(models.Model):
    """Someone who wants to become a conciliateur and asks the département's association to contact them."""

    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, validators=[phone_validator])
    department = models.CharField(max_length=3, db_index=True, validators=[department_validator])
    message = models.TextField(blank=True)
    consent = models.BooleanField(help_text="Agreed to be contacted and to the processing of these data.")
    created_at = models.DateTimeField(auto_now_add=True)
    handled = models.BooleanField(default=False, help_text="The association has contacted this person.")

    class Meta:
        ordering = ("-created_at",)
