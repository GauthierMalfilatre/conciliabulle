from django.urls import path

from . import views

urlpatterns = [
    path("candidatures", views.CandidatureCreateView.as_view(), name="candidatures"),
]
