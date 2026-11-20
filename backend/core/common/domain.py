"""Transport-independent domain errors and authorization primitives."""


class DomainError(Exception):
    def __init__(self, code, status=400):
        self.code, self.status = code, status
        super().__init__(code)


def require_actor(actor):
    if not actor or not actor.is_authenticated or not actor.is_active:
        raise DomainError("UNAUTHORIZED", 401)


def require(condition, code="INVALID_STATE", status=400):
    if not condition:
        raise DomainError(code, status)
