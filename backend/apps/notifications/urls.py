from django.urls import path

from . import views

urlpatterns = [
    path("me/notifications", views.NotificationListView.as_view(), name="notifications"),
    path("me/notifications/read-all", views.NotificationReadAllView.as_view(), name="notifications-read-all"),
    path("me/notifications/<int:pk>/read", views.NotificationReadView.as_view(), name="notification-read"),
]
