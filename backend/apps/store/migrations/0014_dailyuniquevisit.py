from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0013_cart_cartitem'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyUniqueVisit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True, default=django.utils.timezone.localdate)),
                ('visitor_hash', models.CharField(max_length=64)),
                ('first_path', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Acesso único diário',
                'verbose_name_plural': 'Acessos únicos diários',
            },
        ),
        migrations.AddConstraint(
            model_name='dailyuniquevisit',
            constraint=models.UniqueConstraint(fields=('date', 'visitor_hash'), name='unique_daily_visitor_hash'),
        ),
    ]
