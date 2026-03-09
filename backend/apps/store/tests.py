from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from ninja_jwt.tokens import RefreshToken

from apps.store.models import DailyUniqueVisit, Product


class DailyUniqueVisitMiddlewareTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Produto teste",
            description="Descricao",
            price="10.00",
            is_active=True,
            has_colors=False,
        )

    def test_counts_same_visitor_only_once_per_day(self):
        headers = {
            "HTTP_USER_AGENT": "pytest-browser",
            "REMOTE_ADDR": "10.0.0.1",
        }

        self.client.get(f"/seo/produto/{self.product.slug}/", **headers)
        self.client.get(f"/seo/produto/{self.product.slug}/", **headers)

        self.assertEqual(DailyUniqueVisit.objects.count(), 1)

    def test_counts_different_visitors_separately(self):
        self.client.get(
            f"/seo/produto/{self.product.slug}/",
            HTTP_USER_AGENT="browser-a",
            REMOTE_ADDR="10.0.0.1",
        )
        self.client.get(
            f"/seo/produto/{self.product.slug}/",
            HTTP_USER_AGENT="browser-b",
            REMOTE_ADDR="10.0.0.2",
        )

        self.assertEqual(DailyUniqueVisit.objects.count(), 2)


class DailyUniqueVisitApiTests(TestCase):
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username="staff@example.com",
            email="staff@example.com",
            password="password123",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username="user@example.com",
            email="user@example.com",
            password="password123",
            is_staff=False,
        )
        today = timezone.localdate()
        DailyUniqueVisit.objects.create(date=today, visitor_hash="hash-1", first_path="/")
        DailyUniqueVisit.objects.create(date=today, visitor_hash="hash-2", first_path="/produto")

    def test_staff_can_fetch_daily_unique_visits(self):
        token = str(RefreshToken.for_user(self.staff_user).access_token)
        response = self.client.get(
            "/api/admin/daily-unique-visits",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 2)

    def test_non_staff_cannot_fetch_daily_unique_visits(self):
        token = str(RefreshToken.for_user(self.regular_user).access_token)
        response = self.client.get(
            "/api/admin/daily-unique-visits",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

        self.assertEqual(response.status_code, 403)
