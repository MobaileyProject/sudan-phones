from datetime import timedelta
import secrets
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.utils.module_loading import import_string
from core.common.domain import DomainError, require, require_actor
from core.operations.audit import record
from core.stores.models import Store, Membership
from .models import Account, OTPChallenge


def session_data(actor):
    account = (
        Account.objects.filter(user=actor).first() if actor.is_authenticated else None
    )
    from core.operations.models import RoleAssignment
    from core.operations.policy import PERMISSIONS

    assignment = (
        RoleAssignment.objects.select_related("role").filter(user=actor).first()
        if actor.is_authenticated
        else None
    )
    admin = actor.is_authenticated and (actor.is_superuser or assignment is not None)
    permissions = (
        PERMISSIONS
        if actor.is_authenticated and actor.is_superuser
        else assignment.role.permissions
        if assignment
        else []
    )
    merchant = actor.is_authenticated and Membership.objects.filter(user=actor).exists()
    role = (
        "guest"
        if not actor.is_authenticated
        else "admin"
        if admin
        else "merchant"
        if merchant
        else "buyer"
    )
    return {
        "authenticated": actor.is_authenticated,
        "role": role,
        "permissions": permissions,
        "user_id": actor.pk if actor.is_authenticated else None,
        "merchant": merchant,
        "phone_verified": bool(account and account.phone_verified),
        "email_verified": bool(account and account.email_verified),
    }


def issue_otp(user, purpose, channel):
    backend = settings.OTP_DELIVERY_BACKEND
    require(bool(backend), "DELIVERY_UNAVAILABLE", 503)
    recent = OTPChallenge.objects.filter(
        user=user,
        purpose=purpose,
        channel=channel,
        created_at__gt=timezone.now() - timedelta(seconds=60),
    )
    require(not recent.exists(), "THROTTLED", 429)
    destination = user.email if channel == "email" else user.account.phone
    require(bool(destination), "CONTACT_REQUIRED")
    code = f"{secrets.randbelow(1000000):06d}"
    OTPChallenge.objects.filter(
        user=user, purpose=purpose, channel=channel, consumed=False
    ).update(consumed=True)
    OTPChallenge.objects.create(
        user=user,
        purpose=purpose,
        channel=channel,
        digest=make_password(code),
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    # Delivery is inside the caller transaction: a provider failure rolls back issuance.
    try:
        import_string(backend)(destination, code)
    except Exception:
        raise DomainError("DELIVERY_UNAVAILABLE", 503) from None


def consume_otp(user, purpose, channel, code):
    challenge = (
        OTPChallenge.objects.select_for_update()
        .filter(user=user, purpose=purpose, channel=channel)
        .order_by("-pk")
        .first()
    )
    if (
        not challenge
        or challenge.consumed
        or challenge.expires_at <= timezone.now()
        or challenge.attempts >= 5
    ):
        return False
    challenge.attempts += 1
    valid = check_password(code, challenge.digest)
    challenge.consumed = valid
    challenge.save(update_fields=["attempts", "consumed"])
    return valid


@transaction.atomic
def register(data, merchant=False):
    # An unproved claim never reserves a phone or inherits another claimant's identity.
    require(
        not Account.objects.filter(phone=data["phone"], phone_verified=True).exists()
        and not get_user_model()
        .objects.filter(username=data["phone"], is_superuser=True)
        .exists(),
        "ACCOUNT_UNAVAILABLE",
        409,
    )
    try:
        with transaction.atomic():
            user = get_user_model().objects.create_user(
                username="pending-" + secrets.token_hex(16),
                password=data["password"],
                first_name=data["name"],
                email=data.get("email", ""),
            )
            Account.objects.create(user=user, phone=data["phone"], is_merchant=merchant)
    except IntegrityError:
        raise DomainError("ACCOUNT_UNAVAILABLE", 409) from None
    if merchant:
        store = Store.objects.create(owner=user)
        Membership.objects.create(store=store, user=user, role="owner")
    issue_otp(user, "verify", data["channel"])
    record(user, "identity.register", user.pk)
    return user


def login_user(data):
    account = None
    founder = None
    if data.get("phone"):
        account = (
            Account.objects.select_related("user")
            .filter(phone=data["phone"], phone_verified=True)
            .first()
        )
        founder = (
            get_user_model()
            .objects.filter(username=data["phone"], is_superuser=True, is_active=True)
            .first()
            if not account
            else None
        )
    elif data.get("email"):
        email = data["email"].strip().lower()
        account = (
            Account.objects.select_related("user")
            .filter(user__email__iexact=email, email_verified=True)
            .first()
        )
        if not account:
            # Allow active superusers and delegated admins/staff with matching email
            founder = (
                get_user_model()
                .objects.filter(email__iexact=email, is_active=True)
                .filter(is_superuser=True)
                .first()
            )
    username = (
        account.user.username
        if account
        else founder.username
        if founder
        else "unknown-" + secrets.token_hex(16)
    )
    user = authenticate(username=username, password=data["password"])
    require(user is not None, "INVALID_CREDENTIALS", 401)
    return user


@transaction.atomic
def login_google(data):
    verifier = import_string(settings.GOOGLE_TOKEN_VERIFIER)
    claims = verifier(data["id_token"])
    sub = claims["sub"]
    email = claims["email"].strip().lower()
    name = (claims.get("name") or email.split("@")[0])[:150]

    account = Account.objects.select_related("user").filter(google_sub=sub).first()
    if account:
        require(account.user.is_active, "INVALID_CREDENTIALS", 401)
        record(account.user, "identity.google_login", account.user.pk)
        return account.user

    # Link to an existing non-superuser account only when email is already verified
    account = (
        Account.objects.select_related("user")
        .filter(
            user__email__iexact=email,
            email_verified=True,
            user__is_active=True,
            user__is_superuser=False,
        )
        .first()
    )
    if account:
        account.google_sub = sub
        account.save(update_fields=["google_sub"])
        record(account.user, "identity.google_linked", account.user.pk)
        return account.user

    # Never auto-link or create duplicate for an active superuser email
    require(
        not get_user_model()
        .objects.filter(email__iexact=email, is_superuser=True)
        .exists(),
        "INVALID_CREDENTIALS",
        401,
    )
    user = get_user_model().objects.create_user(
        username="google-" + secrets.token_hex(16),
        password=None,
        first_name=name,
        email=email,
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])
    Account.objects.create(
        user=user,
        phone="",
        phone_verified=False,
        email_verified=True,
        is_merchant=False,
        google_sub=sub,
    )
    record(user, "identity.google_register", user.pk)
    return user


def me_data(actor):
    require_actor(actor)
    account = Account.objects.filter(user=actor).first()
    sess = session_data(actor)
    return {
        "id": actor.pk,
        "name": actor.first_name or actor.username,
        "phone": account.phone if account else "",
        "email": actor.email,
        "phone_verified": bool(account and account.phone_verified),
        "email_verified": bool(account and account.email_verified),
        "preferred_city": account.preferred_city if account else "",
        "preferred_locale": account.preferred_locale if account else "ar",
        "role": sess["role"],
        "merchant": sess["merchant"],
    }


@transaction.atomic
def update_me(actor, data):
    require_actor(actor)
    user = get_user_model().objects.select_for_update().get(pk=actor.pk)
    account, _ = Account.objects.select_for_update().get_or_create(
        user=user, defaults={"phone": ""}
    )
    if "name" in data:
        user.first_name = data["name"].strip()
        user.save(update_fields=["first_name"])
    changed = []
    for field in ("preferred_city", "preferred_locale"):
        if field in data:
            setattr(account, field, data[field])
            changed.append(field)
    if changed:
        account.save(update_fields=changed)
    return me_data(user)


def verify(actor, data):
    require_actor(actor)
    with transaction.atomic():
        user = get_user_model().objects.select_for_update().get(pk=actor.pk)
        if "code" not in data:
            issue_otp(user, "verify", data["channel"])
            return
        valid = consume_otp(user, "verify", data["channel"], data["code"])
        if valid:
            account = Account.objects.select_for_update().get(user=user)
            setattr(
                account,
                data["channel"] == "whatsapp" and "phone_verified" or "email_verified",
                True,
            )
            try:
                with transaction.atomic():
                    account.save()
            except IntegrityError:
                raise DomainError("ACCOUNT_UNAVAILABLE", 409) from None
            record(user, "identity.verified", user.pk, channel=data["channel"])
    require(
        valid, "INVALID_OTP"
    )  # Outside transaction so failed-attempt counters commit.


def recover(data):
    account = (
        Account.objects.select_related("user")
        .filter(phone=data["phone"], phone_verified=True, user__is_active=True)
        .first()
    )
    user = account.user if account else None
    if "code" not in data:
        if user:
            with transaction.atomic():
                user = get_user_model().objects.select_for_update().get(pk=user.pk)
                account = Account.objects.filter(user=user).first()
                verified = account and (
                    account.phone_verified
                    if data["channel"] == "whatsapp"
                    else account.email_verified
                )
                if verified:
                    try:
                        with transaction.atomic():
                            issue_otp(user, "recover", data["channel"])
                    except DomainError:
                        pass  # Generic acknowledgement does not disclose account/delivery state.
        return
    valid = False
    if user:
        with transaction.atomic():
            user = get_user_model().objects.select_for_update().get(pk=user.pk)
            valid = consume_otp(user, "recover", data["channel"], data["code"])
            if valid:
                user.set_password(data["password"])
                user.save(update_fields=["password"])
                record(user, "identity.recovered", user.pk)
    require(valid, "INVALID_OTP")
