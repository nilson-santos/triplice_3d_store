from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Order
from .notifications import schedule_order_status_notifications


@receiver(pre_save, sender=Order)
def capture_previous_order_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return

    previous = sender.objects.filter(pk=instance.pk).values("status").first()
    instance._previous_status = previous["status"] if previous else None


@receiver(post_save, sender=Order)
def notify_order_status_change(sender, instance, created, **kwargs):
    previous_status = getattr(instance, "_previous_status", None)
    if created or previous_status == instance.status:
        return

    schedule_order_status_notifications(instance, previous_status=previous_status)
