from django.conf import settings
from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsConciliateur(BasePermission):
    """Conciliateur account, verified unless AUTHORIZE_ALL is on."""

    def has_permission(self, request, view):
        u = request.user
        if not (u.is_authenticated and u.role == User.Role.CONCILIATEUR and hasattr(u, "conciliateur")):
            return False
        return settings.AUTHORIZE_ALL or u.conciliateur.is_verified
