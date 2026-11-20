"""Bounded public primitives only. Optional cache failures must not stop browsing."""
from django.core.cache import cache
from redis.exceptions import RedisError


def cached(key, producer, timeout=15):
    key = 'public:v1:' + key
    try:
        value = cache.get(key)
    except (OSError, RedisError):
        value = None
    if value is not None:
        return value
    value = producer()
    try:
        cache.set(key, value, timeout=timeout)
    except (OSError, RedisError):
        pass
    return value
