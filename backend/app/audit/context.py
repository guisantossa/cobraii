from contextvars import ContextVar

actor_id_ctx = ContextVar("actor_id", default=None)
request_ctx = ContextVar("request", default=None)
