from django.contrib import admin

from .models import ConciliateurProfile


@admin.register(ConciliateurProfile)
class ConciliateurProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "city", "is_verified")
    list_filter = ("is_verified",)
