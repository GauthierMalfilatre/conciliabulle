from django.urls import path

from . import views

urlpatterns = [
    path("auth/conciliateur/register", views.ConciliateurRegisterView.as_view(), name="conciliateur-register"),
]
