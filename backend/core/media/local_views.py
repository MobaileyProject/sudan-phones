"""Signed local-disk transfer endpoints mirroring R2 presigned PUT/GET URLs."""

import mimetypes
from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.media.storage import LocalDiskStorage


@csrf_exempt
def local_upload(request, token):
    if request.method == "OPTIONS":
        return HttpResponse(status=204)
    if request.method != "PUT":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        payload = TimestampSigner(salt="local-upload").unsign_object(token, max_age=600)
    except (BadSignature, SignatureExpired):
        return JsonResponse({"error": "Invalid or expired upload token"}, status=403)
    body = request.body
    if len(body) != payload["size"] or len(body) > settings.MEDIA_DOCUMENT_MAX_BYTES:
        return JsonResponse({"error": "Size mismatch"}, status=400)
    LocalDiskStorage().write(payload["key"], body, payload["content_type"])
    return HttpResponse(status=200)


def local_private_download(request, token):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        payload = TimestampSigner(salt="local-private").unsign_object(token, max_age=900)
    except (BadSignature, SignatureExpired):
        return JsonResponse({"error": "Invalid or expired download token"}, status=403)
    key = payload["key"]
    data = LocalDiskStorage().read(key, settings.MEDIA_DOCUMENT_MAX_BYTES)
    content_type = mimetypes.guess_type(key)[0] or "application/octet-stream"
    response = HttpResponse(data, content_type=content_type)
    response["Cache-Control"] = "no-store"
    response["Content-Disposition"] = f'inline; filename="{key.split("/")[-1]}"'
    return response


def local_public_media(request, key):
    if request.method not in ("GET", "HEAD"):
        return JsonResponse({"error": "Method not allowed"}, status=405)
    clean_key = f"public/{key.lstrip('/')}"
    try:
        data = LocalDiskStorage().read(clean_key, settings.MEDIA_DOCUMENT_MAX_BYTES)
    except Exception:
        return JsonResponse({"error": "Not found"}, status=404)
    content_type = mimetypes.guess_type(clean_key)[0] or "application/octet-stream"
    response = HttpResponse(data, content_type=content_type)
    response["Cache-Control"] = "public, max-age=3600"
    return response
