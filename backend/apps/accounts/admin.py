from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class EmailUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "role", "is_staff")
    fieldsets = UserAdmin.fieldsets[:1] + (("Profile", {"fields": ("first_name", "last_name", "role")}),) + UserAdmin.fieldsets[2:]
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "role", "password1", "password2")}),)
