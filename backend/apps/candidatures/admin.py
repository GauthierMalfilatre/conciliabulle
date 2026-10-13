from django.contrib import admin

from .models import Candidature


@admin.register(Candidature)
class CandidatureAdmin(admin.ModelAdmin):
    list_display = ("created_at", "last_name", "first_name", "department", "email", "phone", "handled")
    list_filter = ("handled", "department")
    list_editable = ("handled",)
    search_fields = ("last_name", "first_name", "email")
