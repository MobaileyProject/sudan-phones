from django.core.management.base import BaseCommand
from core.media.tasks import process_pending


class Command(BaseCommand):
    help = (
        "Process a bounded batch of durable media jobs (also scheduled by Celery beat)."
    )

    def handle(self, *args, **options):
        self.stdout.write(f"Processed {process_pending()} media jobs.")
