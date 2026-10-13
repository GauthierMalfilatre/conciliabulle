from django.core.validators import RegexValidator

phone_validator = RegexValidator(r"^\+?[0-9][0-9 .()-]{5,18}$", "Invalid phone number.")
# French département code: 01-95, 2A/2B, 971-976...
department_validator = RegexValidator(r"^(\d{2,3}|2[AB])$", "Invalid département code.")
