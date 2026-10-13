from django.db import connection
from django.db.utils import Error as DatabaseError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    try:
        connection.ensure_connection()
        db = "ok"
    except DatabaseError:
        db = "error"
    ok = db == "ok"
    return Response(
        {"status": "ok" if ok else "error", "database": db},
        status=status.HTTP_200_OK if ok else status.HTTP_503_SERVICE_UNAVAILABLE,
    )
