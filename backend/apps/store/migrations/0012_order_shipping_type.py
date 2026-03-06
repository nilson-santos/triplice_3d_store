from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0011_order_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='shipping_type',
            field=models.CharField(
                choices=[
                    ('PICKUP_STORE', 'Retirada na loja (grátis)'),
                    ('FREE_DELIVERY_FOZ', 'Entrega em Foz do Iguaçu (grátis)'),
                ],
                default='PICKUP_STORE',
                max_length=30,
            ),
        ),
    ]
