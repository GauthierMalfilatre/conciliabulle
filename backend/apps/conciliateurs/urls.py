from django.urls import path

from . import views

urlpatterns = [
    path("conciliateurs", views.ConciliateurListView.as_view(), name="conciliateur-list"),
    path("conciliateurs/<int:pk>/slots", views.FreeSlotListView.as_view(), name="conciliateur-slots"),
    path("me/slots", views.MySlotListCreateView.as_view(), name="my-slots"),
    path("me/availabilities", views.MyAvailabilityListCreateView.as_view(), name="my-availabilities"),
    path("me/availabilities/<int:pk>", views.MyAvailabilityDeleteView.as_view(), name="my-availability-delete"),
    path("me/slots/<int:pk>", views.MySlotDeleteView.as_view(), name="my-slot-delete"),
]
