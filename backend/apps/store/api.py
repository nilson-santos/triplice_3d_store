from typing import List
from ninja import NinjaAPI, Schema, ModelSchema
from django.shortcuts import get_object_or_404
from .models import Product, Order, OrderItem, Category
from uuid import UUID

api = NinjaAPI()

# Schemas
class CategorySchema(ModelSchema):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class ProductSchema(ModelSchema):
    category: CategorySchema
    image: str | None = None  # Handle image URL

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'is_active', 'image', 'category']
    
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

from ninja.pagination import paginate

@api.get("/categories", response=List[CategorySchema])
def list_categories(request):
    return Category.objects.filter(products__is_active=True).distinct()

# Endpoints

@api.get("/products", response=List[ProductSchema])
@paginate
def list_products(request, category_id: int = None):
    qs = Product.objects.filter(is_active=True).select_related('category')
    if category_id:
        qs = qs.filter(category_id=category_id)
    return qs

@api.get("/products/{product_id}", response=ProductSchema)
def get_product(request, product_id: int):
    return get_object_or_404(Product, id=product_id)

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
    # Message: "Olá! Gostaria de finalizar o Pedido #{order_number}. \nItens: ... \nTotal: R$..."
    nl = "%0A" # url encoded newline
    message = f"Olá! Gostaria de finalizar o *Pedido #{order.order_number}* de {order.customer_name}.{nl}{nl}*Itens:*{nl}"
    for it in items_text:
        message += f"- {it}{nl}"
    
    message += f"{nl}*Total Estimado:* R$ {total_price:.2f}"
    
    # Assuming user's phone number or a fixed store number. 
    # Usually this goes to the STORE'S number.
    # I'll use a placeholder STORE_NUMBER for now.
    import os
    store_number = os.environ.get('STORE_WHATSAPP_NUMBER', '5511999999999')
    whatsapp_url = f"https://wa.me/{store_number}?text={message}"

    return {
        "id": order.id,
        "order_number": order.order_number,
        "whatsapp_url": whatsapp_url
    }
