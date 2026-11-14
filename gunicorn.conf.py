"""Production settings shared by Railway and local Gunicorn smoke tests."""
import os

bind = f"0.0.0.0:{int(os.environ.get('PORT', '8000'))}"
workers = int(os.environ.get('WEB_CONCURRENCY', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
# Gemini requests have a 25-second upstream timeout.
timeout = 60
graceful_timeout = 30
accesslog = '-'
errorlog = '-'
# Avoid logging query strings or request bodies, which may contain user data.
access_log_format = '%(m)s %(U)s %(s)s %(L)s'

# Railway manages the service lifecycle; no local control socket is needed.
control_socket_disable = True
