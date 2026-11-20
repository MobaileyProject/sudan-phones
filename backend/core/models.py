"""Core base models."""
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base model with creation and modification timestamps."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

from core.identity.models import Account, OTPChallenge  # noqa: F401,E402
from core.stores.models import Store, Membership, Verification  # noqa: F401,E402
from core.operations.models import AuditEvent  # noqa: F401,E402
from core.media.models import MediaAsset, VerificationDocument  # noqa: F401,E402
from core.operations.models import AdminRole, RoleAssignment  # noqa: F401,E402
from core.catalog.models import Brand, PhoneModel, Variant  # noqa: F401,E402
from core.listings.models import Listing, ListingMedia, PriceHistory, Mutation  # noqa: F401,E402
from core.operations.models import DualApproval, ContactEvent, DailyMetrics  # noqa: F401,E402
