from rest_framework.permissions import BasePermission

from .models import User


class IsPlainUser(BasePermission):
    """Only USER accounts, not conciliateurs."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.USER
