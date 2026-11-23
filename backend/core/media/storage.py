"""R2 adapter: quarantine/evidence private; only sanitized listing derivatives public."""

from django.conf import settings
from django.utils.module_loading import import_string
from core.common.domain import require


def storage():
    return import_string(settings.MEDIA_STORAGE_BACKEND)()


class R2Storage:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is not None:
            return self._client
        import boto3
        from botocore.config import Config

        require(
            all(
                [
                    settings.R2_ACCOUNT_ID,
                    settings.R2_ACCESS_KEY_ID,
                    settings.R2_SECRET_ACCESS_KEY,
                    settings.R2_PRIVATE_BUCKET,
                    settings.R2_PUBLIC_BUCKET,
                    settings.R2_PUBLIC_DOMAIN,
                ]
            ),
            "STORAGE_UNAVAILABLE",
            503,
        )
        require(
            settings.R2_PRIVATE_BUCKET != settings.R2_PUBLIC_BUCKET,
            "STORAGE_UNAVAILABLE",
            503,
        )
        self._client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(
                signature_version="s3v4",
                connect_timeout=5,
                read_timeout=15,
                retries={"max_attempts": 2},
            ),
        )

        return self._client

    def bucket(self, key):
        return (
            settings.R2_PUBLIC_BUCKET
            if key.startswith("public/")
            else settings.R2_PRIVATE_BUCKET
        )

    def upload_url(self, key, content_type, size):
        url = self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.R2_PRIVATE_BUCKET,
                "Key": key,
                "ContentType": content_type,
                "ContentLength": size,
            },
            ExpiresIn=600,
        )
        return {
            "url": url,
            "headers": {"Content-Type": content_type, "Content-Length": str(size)},
        }

    def read(self, key, limit):
        response = self.client.get_object(Bucket=self.bucket(key), Key=key)
        try:
            require(response["ContentLength"] <= limit, "INVALID_MEDIA")
            return response["Body"].read(limit + 1)
        finally:
            response["Body"].close()

    def write(self, key, data, content_type):
        self.client.put_object(
            Bucket=self.bucket(key),
            Key=key,
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=3600"
            if key.startswith("public/")
            else "no-store",
        )

    def private_url(self, key, seconds):
        require(not key.startswith("public/"), "INVALID_MEDIA")
        return self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.R2_PRIVATE_BUCKET,
                "Key": key,
                "ResponseContentDisposition": "attachment",
                "ResponseCacheControl": "no-store",
            },
            ExpiresIn=min(seconds, 900),
        )

    def public_url(self, key):
        require(bool(settings.R2_PUBLIC_DOMAIN), "STORAGE_UNAVAILABLE", 503)
        require(key.startswith("public/"), "INVALID_MEDIA")
        return settings.R2_PUBLIC_DOMAIN.rstrip("/") + "/" + key

    def delete(self, key):
        self.client.delete_object(Bucket=self.bucket(key), Key=key)


class LocalDiskStorage:
    """Signed local-disk storage for single-server EC2 staging without Cloudflare R2."""

    def _safe_path(self, key):
        from pathlib import Path

        root = Path(settings.MEDIA_LOCAL_ROOT).resolve()
        target = (root / key).resolve()
        require(str(target).startswith(str(root) + "/"), "INVALID_MEDIA")
        return target

    def upload_url(self, key, content_type, size):
        from django.core.signing import TimestampSigner

        base = (settings.MEDIA_LOCAL_BASE_URL or "").rstrip("/")
        require(bool(base), "STORAGE_UNAVAILABLE", 503)
        token = TimestampSigner(salt="local-upload").sign_object(
            {"key": key, "content_type": content_type, "size": size}
        )
        return {
            "url": f"{base}/media-transfer/upload/{token}",
            "headers": {"Content-Type": content_type},
        }

    def read(self, key, limit):
        path = self._safe_path(key)
        require(path.exists(), "INVALID_MEDIA")
        data = path.read_bytes()
        require(len(data) <= limit, "INVALID_MEDIA")
        return data

    def write(self, key, data, content_type):
        path = self._safe_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def private_url(self, key, seconds):
        from django.core.signing import TimestampSigner

        require(not key.startswith("public/"), "INVALID_MEDIA")
        base = (settings.MEDIA_LOCAL_BASE_URL or "").rstrip("/")
        require(bool(base), "STORAGE_UNAVAILABLE", 503)
        token = TimestampSigner(salt="local-private").sign_object({"key": key})
        return f"{base}/media-transfer/private/{token}"

    def public_url(self, key):
        require(key.startswith("public/"), "INVALID_MEDIA")
        domain = (settings.R2_PUBLIC_DOMAIN or "").rstrip("/")
        require(bool(domain), "STORAGE_UNAVAILABLE", 503)
        return f"{domain}/{key}"

    def delete(self, key):
        path = self._safe_path(key)
        if path.exists():
            path.unlink()
