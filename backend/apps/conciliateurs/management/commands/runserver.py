from django.conf import settings
from django.contrib.staticfiles.management.commands.runserver import Command as RunserverCommand


class Command(RunserverCommand):
    help = RunserverCommand.help + " Supports --authorize-all=yes (testing: unverified conciliateurs become usable)."

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument("--authorize-all", choices=["yes", "no"], default="no")

    def handle(self, *args, **options):
        # Runs in the autoreload child too, since the reloader re-execs with the same argv.
        settings.AUTHORIZE_ALL = options["authorize_all"] == "yes"
        super().handle(*args, **options)

    def inner_run(self, *args, **options):
        if settings.AUTHORIZE_ALL:
            self.stderr.write(self.style.WARNING("AUTHORIZE_ALL is ON: unverified conciliateurs are visible and bookable."))
        super().inner_run(*args, **options)
