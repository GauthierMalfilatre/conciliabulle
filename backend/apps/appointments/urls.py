from django.urls import path

from . import views

urlpatterns = [
    path("appointments", views.AppointmentListCreateView.as_view(), name="appointments"),
    path("appointments/<int:pk>", views.AppointmentDetailView.as_view(), name="appointment-detail"),
    path("me/appointments", views.MyAppointmentListView.as_view(), name="my-appointments"),
]
