from django.urls import path

from . import views

urlpatterns = [
    path("auth/conciliateur/register", views.ConciliateurRegisterView.as_view(), name="conciliateur-register"),
    path("conciliateurs", views.ConciliateurListView.as_view(), name="conciliateur-list"),
    path("conciliateurs/<int:pk>/slots", views.FreeSlotListView.as_view(), name="conciliateur-slots"),
    path("me/slots", views.MySlotListCreateView.as_view(), name="my-slots"),
    path("me/slots/<int:pk>", views.MySlotDeleteView.as_view(), name="my-slot-delete"),
]
