"""Core domain services and transaction helpers."""
from django.db import transaction


def atomic_operation():
    """Context manager for service-owned atomic database transactions."""
    return transaction.atomic()
