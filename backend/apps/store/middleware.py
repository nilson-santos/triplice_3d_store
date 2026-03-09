import hashlib

from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone

from .models import DailyUniqueVisit


class DailyUniqueVisitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if self._should_track(request, response.status_code):
            visitor_hash = self._build_visitor_hash(request)
            if visitor_hash:
                try:
                    DailyUniqueVisit.objects.get_or_create(
                        date=timezone.localdate(),
                        visitor_hash=visitor_hash,
                        defaults={"first_path": request.path[:255]},
                    )
                except (OperationalError, ProgrammingError):
                    pass

        return response

    def _should_track(self, request, status_code: int) -> bool:
        if request.method != 'GET':
            return False
        if status_code >= 400:
            return False
        if request.path.startswith('/api/'):
            return False
        if request.path.startswith('/admin/'):
            return False
        if request.path.startswith('/media/'):
            return False
        if request.path.startswith('/static/'):
            return False
        return True

    def _build_visitor_hash(self, request) -> str | None:
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
        client_ip = forwarded_for.split(',')[0].strip() if forwarded_for else request.META.get('REMOTE_ADDR', '').strip()
        user_agent = request.META.get('HTTP_USER_AGENT', '').strip()

        if not client_ip and not user_agent:
            return None

        raw_value = f"{client_ip}|{user_agent}"
        return hashlib.sha256(raw_value.encode('utf-8')).hexdigest()
