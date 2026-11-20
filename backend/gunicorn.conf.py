"""Bounded process resources; no query strings, cookies or headers in access logs."""
import os
bind = '0.0.0.0:8000'
workers = int(os.environ.get('WEB_CONCURRENCY', '2'))
worker_class = 'sync'
timeout = 45
graceful_timeout = 30
max_requests = 1000
max_requests_jitter = 100
accesslog = '-'
access_log_format = '%(s)s %(M)sms'
errorlog = '-'
capture_output = False
# Django controls trusted ingress; do not independently trust arbitrary peers.
forwarded_allow_ips = ''
