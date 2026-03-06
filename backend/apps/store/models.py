from django.db import models
from django.utils.text import slugify
import uuid

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    is_default = models.BooleanField(default=False, help_text="If checked, this category will be pre-selected on the storefront")

    def __str__(self):
        return self.name

class Color(models.Model):
    name = models.CharField("Nome da Cor/Textura", max_length=50)
    image = models.ImageField("Imagem da Textura/Cor", upload_to='colors/', null=True, blank=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField("Nome do Produto", max_length=200)
    slug = models.SlugField("Slug", max_length=200, unique=True, blank=True)
    description = models.TextField("Descrição", blank=True)
    price = models.DecimalField("Preço", max_digits=10, decimal_places=2)
    is_active = models.BooleanField("Ativo", default=True)
    image = models.ImageField("Imagem Principal", upload_to='products/', null=True, blank=True)
    categories = models.ManyToManyField(Category, related_name='products', verbose_name="Categorias")
    has_colors = models.BooleanField("Requer Cores", default=True)
    size = models.CharField("Tamanho", max_length=100, blank=True, help_text="Ex: 10x15x20cm")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/gallery/')
    order = models.PositiveIntegerField(default=0, help_text="Order in the gallery")
    
    class Meta:
        ordering = ['order', 'id']
        
    def __str__(self):
        return f"Image for {self.product.name}"

import random

def generate_order_number():
    return str(random.randint(1000, 9999))

class Order(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('SHIPPED', 'Shipped'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    SHIPPING_TYPE_CHOICES = [
        ('PICKUP_STORE', 'Retirada na loja (grátis)'),
        ('FREE_DELIVERY_FOZ', 'Entrega em Foz do Iguaçu (grátis)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=8, unique=True, default=generate_order_number, editable=False)
    
    # Guest Checkout Fields
    customer_name = models.CharField(max_length=200)
    customer_email = models.EmailField(max_length=255, blank=True, null=True)
    customer_cpf = models.CharField(max_length=14, blank=True, null=True)
    customer_phone = models.CharField(max_length=20)
    
    # Shipping Address Fields
    shipping_address_zipcode = models.CharField(max_length=20, blank=True, null=True)
    shipping_address_street = models.CharField(max_length=255, blank=True, null=True)
    shipping_address_number = models.CharField(max_length=50, blank=True, null=True)
    shipping_address_complement = models.CharField(max_length=255, blank=True, null=True)
    shipping_address_neighborhood = models.CharField(max_length=150, blank=True, null=True)
    shipping_address_city = models.CharField(max_length=150, blank=True, null=True)
    shipping_address_state = models.CharField(max_length=50, blank=True, null=True)
    shipping_type = models.CharField(max_length=30, choices=SHIPPING_TYPE_CHOICES, default='PICKUP_STORE')
    
    # Mercado Pago Fields
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    payment_status = models.CharField(max_length=50, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.order_number} - {self.customer_name}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='order_items', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"

class PromotionalPopup(models.Model):
    FREQUENCY_CHOICES = [
        ('SESSION', 'Every Session'),
        ('ONCE', 'Once per User'),
        ('PERIOD', 'Periodically (every X days)'),
    ]

    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='popups/')
    link_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='ONCE')
    period_days = models.PositiveIntegerField(null=True, blank=True, help_text="Used if frequency is Periodically")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Banner(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='banners/')
    link_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Lower numbers appear first")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title
