from typing import List
from ninja import NinjaAPI, Schema, ModelSchema
from django.shortcuts import get_object_or_404
from .models import Product, Order, OrderItem, Category, Banner, Color, ProductImage
from uuid import UUID

api = NinjaAPI()

# Schemas
class CategorySchema(ModelSchema):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'is_default']

class ColorSchema(Schema):
    id: int
    name: str
    image: str | None = None

    @staticmethod
    def resolve_image(obj, context):
        request = context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

class ProductImageSchema(Schema):
    id: int
    image_url: str | None = None
    order: int

    @staticmethod
    def resolve_image_url(obj, context):
        request = context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

class ProductSchema(ModelSchema):
    categories: List[CategorySchema]
    images: List[ProductImageSchema]
    image: str | None = None  # Handle main image URL

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'is_active', 'image', 'categories', 'has_colors']
    
    @staticmethod
    def resolve_image(obj, context):
        request = context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

class OrderItemSchema(Schema):
    product_id: int
    quantity: int

class OrderCreateSchema(Schema):
    customer_name: str
    customer_phone: str
    items: List[OrderItemSchema]

class OrderResponseSchema(Schema):
    id: UUID
    order_number: str
    whatsapp_url: str

class BannerSchema(ModelSchema):
    image: str | None = None

    class Meta:
        model = Banner
        fields = ['id', 'title', 'image', 'link_url']

    @staticmethod
    def resolve_image(obj, context):
        request = context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

from ninja.pagination import paginate

@api.get("/categories", response=List[CategorySchema])
def list_categories(request):
    return Category.objects.filter(products__is_active=True).distinct()

@api.get("/colors", response=List[ColorSchema])
def list_colors(request):
    return Color.objects.all()

# Endpoints

@api.get("/products", response=List[ProductSchema])
@paginate
def list_products(request, category_id: int = None, search: str = None, ordering: str = None):
    qs = Product.objects.filter(is_active=True).prefetch_related('categories')
    if category_id:
        qs = qs.filter(categories__id=category_id)
    if search:
        qs = qs.filter(name__icontains=search)

    ordering_map = {
        'price_asc': 'price',
        'price_desc': '-price',
        'name_asc': 'name',
        'name_desc': '-name',
        'newest': '-created_at',
    }
    if ordering and ordering in ordering_map:
        qs = qs.order_by(ordering_map[ordering])
    else:
        qs = qs.order_by('-created_at')

    return qs

@api.get("/products/{slug}", response=ProductSchema)
def get_product(request, slug: str):
    return get_object_or_404(Product, slug=slug)

@api.get("/banners", response=List[BannerSchema])
def list_banners(request):
    return Banner.objects.filter(is_active=True)

@api.post("/orders", response=OrderResponseSchema)
def create_order(request, payload: OrderCreateSchema):
    # Create Order
    order = Order.objects.create(
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        status='PENDING'
    )
    
    total_price = 0
    items_text = []

    # Create Items
    for item in payload.items:
        product = get_object_or_404(Product, id=item.product_id)
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=item.quantity,
            price_at_time=product.price
        )
        total_price += product.price * item.quantity
        items_text.append(f"{item.quantity}x {product.name}")

    # Generate WhatsApp Link
    nl = "%0A" # url encoded newline
    message = f"Olá! Gostaria de finalizar o *Pedido #{order.order_number}* de {order.customer_name}.{nl}{nl}*Itens:*{nl}"
    for it in items_text:
        message += f"- {it}{nl}"
    
    message += f"{nl}*Total Estimado:* R$ {total_price:.2f}"
    
    import os
    store_number = os.environ.get('STORE_WHATSAPP_NUMBER', '5511999999999')
    whatsapp_url = f"https://wa.me/{store_number}?text={message}"

    return {
        "id": order.id,
        "order_number": order.order_number,
        "whatsapp_url": whatsapp_url
    }

from .models import PromotionalPopup

class PromotionalPopupSchema(ModelSchema):
    image: str | None = None

    class Meta:
        model = PromotionalPopup
        fields = ['id', 'title', 'image', 'link_url', 'frequency', 'period_days']

    @staticmethod
    def resolve_image(obj, context):
        request = context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

@api.get("/promotions/active", response=PromotionalPopupSchema)
def get_active_promotion(request):
    """
    Returns the most recently created active promotion.
    """
    promo = PromotionalPopup.objects.filter(is_active=True).order_by('-created_at').first()
    if not promo:
        return 404, {"message": "No active promotion found"}
    return promo

