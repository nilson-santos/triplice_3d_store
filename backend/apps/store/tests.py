from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import timezone
from ninja_jwt.tokens import RefreshToken

from apps.store.models import DailyUniqueVisit, Order, OrderItem, Product


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

    def test_public_track_visit_creates_single_daily_record_per_visitor(self):
        first_response = self.client.post(
            "/api/analytics/track-visit",
            data='{"visitor_id":"visitor-123","path":"/"}',
            content_type="application/json",
        )
        second_response = self.client.post(
            "/api/analytics/track-visit",
            data='{"visitor_id":"visitor-123","path":"/produto/teste"}',
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(DailyUniqueVisit.objects.filter(visitor_hash="visitor-123").count(), 1)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    BACKOFFICE_ORDER_EMAIL="financeiro@nilson.com.br",
)
class OrderEmailNotificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cliente@example.com",
            email="cliente@example.com",
            password="password123",
            first_name="Cliente Teste",
        )
        self.product = Product.objects.create(
            name="Produto email",
            description="Descricao",
            price="25.00",
            is_active=True,
            has_colors=False,
        )
        self.order = Order.objects.create(
            user=self.user,
            customer_name="Cliente Teste",
            customer_email="cliente@example.com",
            customer_phone="45999999999",
            status="PENDING",
            payment_status="pending",
            shipping_type="PICKUP_STORE",
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            price_at_time="25.00",
        )
        mail.outbox = []

    def test_sends_customer_and_backoffice_emails_when_order_is_confirmed(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.order.status = "CONFIRMED"
            self.order.payment_status = "approved"
            self.order.payment_method = "pix"
            self.order.save()

        self.assertEqual(len(mail.outbox), 2)
        recipients = sorted(mail.outbox[0].to + mail.outbox[1].to)
        self.assertEqual(recipients, ["cliente@example.com", "financeiro@nilson.com.br"])
        self.assertTrue(any("confirmado" in email.subject.lower() for email in mail.outbox))
        self.assertTrue(all("Status atual do pedido: Confirmado" in email.body for email in mail.outbox))
        self.assertTrue(all(email.alternatives for email in mail.outbox))
        self.assertTrue(all("Pagamento confirmado" in email.alternatives[0][0] for email in mail.outbox))

    def test_sends_status_update_emails_when_status_changes(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.order.status = "SHIPPED"
            self.order.payment_status = "approved"
            self.order.payment_method = "pix"
            self.order.save()

        self.assertEqual(len(mail.outbox), 2)
        self.assertTrue(all("Status atual do pedido: Enviado" in email.body for email in mail.outbox))
        self.assertTrue(all("Status anterior do pedido:" not in email.body for email in mail.outbox))
        self.assertTrue(all(email.alternatives for email in mail.outbox))
        self.assertTrue(all("Status atualizado para Enviado" in email.alternatives[0][0] or "Pedido em Enviado" in email.alternatives[0][0] for email in mail.outbox))
