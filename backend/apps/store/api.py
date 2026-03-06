from typing import List
import unicodedata

from ninja import NinjaAPI, Schema, ModelSchema
from django.shortcuts import get_object_or_404
from .models import Product, Order, OrderItem, Category, Banner, Color, ProductImage
from uuid import UUID
from django.conf import settings
from ninja_jwt.authentication import JWTAuth
import mercadopago
from apps.users.models import UserProfile

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
        fields = ['id', 'name', 'slug', 'description', 'price', 'is_active', 'image', 'categories', 'has_colors', 'size']
    
    @staticmethod
    def resolve_image(obj, context):
        request = context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

class OrderItemSchema(Schema):
    product_id: int
    quantity: int

class OrderPixCreateSchema(Schema):
    customer_cpf: str
    shipping_type: str = "PICKUP_STORE"
    shipping_address_zipcode: str | None = None
    shipping_address_street: str | None = None
    shipping_address_number: str | None = None
    shipping_address_complement: str | None = None
    shipping_address_neighborhood: str | None = None
    shipping_address_city: str | None = None
    shipping_address_state: str | None = None
    items: List[OrderItemSchema]

class TrackingRequestSchema(Schema):
    customer_email: str

class TrackedProductSchema(Schema):
    name: str
    quantity: int
    image: str | None = None

class TrackedOrderSchema(Schema):
    id: UUID
    order_number: str
    status: str
    payment_status: str | None = None
    created_at: str
    items: List[TrackedProductSchema]
    total: float

class OrderResponseSchema(Schema):
    id: UUID
    order_number: str
    whatsapp_url: str | None = None
    qr_code_base64: str | None = None
    qr_code_copia_e_cola: str | None = None
    payment_status: str | None = None

class ErrorResponseSchema(Schema):
    error: str

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

def _normalize_payment_status(raw_status) -> str | None:
    if raw_status is None:
        return None
    if isinstance(raw_status, str):
        return raw_status
    return str(raw_status)


def _extract_qr_data(payment: dict) -> tuple[str | None, str | None]:
    point_of_interaction = payment.get("point_of_interaction") or {}
    transaction_data = point_of_interaction.get("transaction_data") or {}
    return transaction_data.get("qr_code_base64"), transaction_data.get("qr_code")


def _has_complete_address(address_data: dict[str, str | None]) -> bool:
    required_fields = [
        address_data.get("zipcode"),
        address_data.get("street"),
        address_data.get("number"),
        address_data.get("neighborhood"),
        address_data.get("city"),
        address_data.get("state"),
    ]
    return all(bool(value and str(value).strip()) for value in required_fields)


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char)).strip().lower()


@api.post("/checkout/pix", response={200: OrderResponseSchema, 400: ErrorResponseSchema, 502: ErrorResponseSchema}, auth=JWTAuth())
def checkout_pix(request, payload: OrderPixCreateSchema):
    user = request.user
    sdk = mercadopago.SDK(getattr(settings, 'MERCADOPAGO_ACCESS_TOKEN', ''))
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    # Clean CPF for MP API
    clean_cpf = ''.join(filter(str.isdigit, payload.customer_cpf))

    payload_address = {
        "zipcode": payload.shipping_address_zipcode,
        "street": payload.shipping_address_street,
        "number": payload.shipping_address_number,
        "complement": payload.shipping_address_complement,
        "neighborhood": payload.shipping_address_neighborhood,
        "city": payload.shipping_address_city,
        "state": payload.shipping_address_state,
    }
    shipping_type = (payload.shipping_type or "PICKUP_STORE").strip().upper()

    if shipping_type not in {"PICKUP_STORE", "FREE_DELIVERY_FOZ"}:
        return 400, {"error": "Tipo de frete inválido."}

    if shipping_type == "FREE_DELIVERY_FOZ":
        if not _has_complete_address(payload_address):
            return 400, {"error": "Para entrega em Foz do Iguaçu, preencha CEP, rua, número, bairro, cidade e estado."}

        payload_city = _normalize_text(payload_address.get("city"))
        if payload_city != "foz do iguacu":
            return 400, {"error": "Entrega grátis disponível apenas para endereços em Foz do Iguaçu. Selecione retirada na loja."}

        profile.registration_address_zipcode = payload_address["zipcode"]
        profile.registration_address_street = payload_address["street"]
        profile.registration_address_number = payload_address["number"]
        profile.registration_address_complement = payload_address["complement"]
        profile.registration_address_neighborhood = payload_address["neighborhood"]
        profile.registration_address_city = payload_address["city"]
        profile.registration_address_state = payload_address["state"]
        profile.save()

    order_shipping_address = (
        {
            "shipping_address_zipcode": profile.registration_address_zipcode,
            "shipping_address_street": profile.registration_address_street,
            "shipping_address_number": profile.registration_address_number,
            "shipping_address_complement": profile.registration_address_complement,
            "shipping_address_neighborhood": profile.registration_address_neighborhood,
            "shipping_address_city": profile.registration_address_city,
            "shipping_address_state": profile.registration_address_state,
        }
        if shipping_type == "FREE_DELIVERY_FOZ"
        else {
            "shipping_address_zipcode": None,
            "shipping_address_street": None,
            "shipping_address_number": None,
            "shipping_address_complement": None,
            "shipping_address_neighborhood": None,
            "shipping_address_city": None,
            "shipping_address_state": None,
        }
    )

    order = Order.objects.create(
        user=user,
        customer_name=user.first_name or user.username,
        customer_email=user.email,
        customer_phone=getattr(profile, 'phone', '') or '',
        customer_cpf=clean_cpf,
        shipping_type=shipping_type,
        **order_shipping_address,
        status='PENDING'
    )
    
    total_price = 0
    items_text = []
    
    for item in payload.items:
        product = get_object_or_404(Product, id=item.product_id)
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=item.quantity,
            price_at_time=product.price
        )
        total_price += float(product.price) * item.quantity
        items_text.append(f"{item.quantity}x {product.name}")

    payment_data = {
        "transaction_amount": float(total_price),
        "description": f"Pedido #{order.order_number} - Triplice 3D",
        "payment_method_id": "pix",
        "payer": {
            "email": user.email,
            "first_name": user.first_name,
            "identification": {
                "type": "CPF",
                "number": clean_cpf
            }
        },
        "external_reference": str(order.id)
    }
    
    payment_response = sdk.payment().create(payment_data)
    payment = payment_response.get("response", {})
    if not isinstance(payment, dict):
        return 502, {"error": "Falha ao gerar PIX no provedor de pagamento."}
    
    qr_code_base64 = None
    qr_code_copia_e_cola = None
    
    mp_status = _normalize_payment_status(payment.get("status"))
    if mp_status:
        if payment.get("id") is not None:
            order.payment_id = str(payment.get("id"))
        order.payment_status = mp_status
        if payment.get("payment_method_id") is not None:
            order.payment_method = str(payment.get("payment_method_id"))

        if mp_status == "approved":
            order.status = 'CONFIRMED'
        elif mp_status in {"rejected", "cancelled"}:
            order.status = 'CANCELLED'
        else:
            order.status = 'PENDING'
            
        order.save()
        qr_code_base64, qr_code_copia_e_cola = _extract_qr_data(payment)
    else:
        return 502, {"error": "Falha ao gerar PIX no provedor de pagamento."}
            
    return {
        "id": order.id,
        "order_number": order.order_number,
        "qr_code_base64": qr_code_base64,
        "qr_code_copia_e_cola": qr_code_copia_e_cola,
        "payment_status": mp_status
    }


@api.post("/checkout/pix/{order_id}/regenerate", response={200: OrderResponseSchema, 502: ErrorResponseSchema}, auth=JWTAuth())
def regenerate_checkout_pix(request, order_id: UUID):
    user = request.user
    order = get_object_or_404(Order, id=order_id, user=user)

    total_price = 0.0
    for item in order.items.all():
        total_price += float(item.price_at_time) * item.quantity

    sdk = mercadopago.SDK(getattr(settings, 'MERCADOPAGO_ACCESS_TOKEN', ''))
    clean_cpf = ''.join(filter(str.isdigit, order.customer_cpf or ''))

    payment_data = {
        "transaction_amount": float(total_price),
        "description": f"Pedido #{order.order_number} - Triplice 3D",
        "payment_method_id": "pix",
        "payer": {
            "email": order.customer_email or user.email,
            "first_name": order.customer_name or user.first_name,
            "identification": {
                "type": "CPF",
                "number": clean_cpf
            }
        },
        "external_reference": str(order.id)
    }

    payment_response = sdk.payment().create(payment_data)
    payment = payment_response.get("response", {})
    if not isinstance(payment, dict):
        return 502, {"error": "Falha ao regenerar PIX no provedor de pagamento."}

    qr_code_base64 = None
    qr_code_copia_e_cola = None

    mp_status = _normalize_payment_status(payment.get("status"))
    if mp_status:
        if payment.get("id") is not None:
            order.payment_id = str(payment.get("id"))
        order.payment_status = mp_status
        if payment.get("payment_method_id") is not None:
            order.payment_method = str(payment.get("payment_method_id"))

        if mp_status == "approved":
            order.status = 'CONFIRMED'
        elif mp_status in {"rejected", "cancelled"}:
            order.status = 'CANCELLED'
        else:
            order.status = 'PENDING'

        order.save()
        qr_code_base64, qr_code_copia_e_cola = _extract_qr_data(payment)
    else:
        return 502, {"error": "Falha ao regenerar PIX no provedor de pagamento."}

    return {
        "id": order.id,
        "order_number": order.order_number,
        "qr_code_base64": qr_code_base64,
        "qr_code_copia_e_cola": qr_code_copia_e_cola,
        "payment_status": mp_status
    }

@api.post("/orders/track", response=List[TrackedOrderSchema])
def track_orders(request, payload: TrackingRequestSchema):
    orders = Order.objects.filter(customer_email=payload.customer_email).prefetch_related('items__product').order_by('-created_at')
    
    results = []
    for order in orders:
        items = []
        total = 0
        for item in order.items.all():
            total += float(item.price_at_time) * item.quantity
            img_url = None
            if item.product.image:
                img_url = request.build_absolute_uri(item.product.image.url)
            items.append({
                "name": item.product.name,
                "quantity": item.quantity,
                "image": img_url
            })
        
        results.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "payment_status": _normalize_payment_status(order.payment_status),
            "created_at": order.created_at.isoformat(),
            "items": items,
            "total": total
        })
    return results

@api.get("/orders/my", response=List[TrackedOrderSchema], auth=JWTAuth())
def my_orders(request):
    user = request.user
    orders = Order.objects.filter(user=user).prefetch_related('items__product').order_by('-created_at')
    
    results = []
    for order in orders:
        items = []
        total = 0
        for item in order.items.all():
            total += float(item.price_at_time) * item.quantity
            img_url = None
            if item.product.image:
                img_url = request.build_absolute_uri(item.product.image.url)
            items.append({
                "name": item.product.name,
                "quantity": item.quantity,
                "image": img_url
            })
        
        results.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "payment_status": _normalize_payment_status(order.payment_status),
            "created_at": order.created_at.isoformat(),
            "items": items,
            "total": total
        })
    return results

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

import hmac
import hashlib

def _verify_mp_signature(request, secret):
    """
    Verify the authenticity of the Mercado Pago webhook signature.
    """
    x_signature = request.headers.get("x-signature")
    x_request_id = request.headers.get("x-request-id")
    
    # We need to get the data ID from the JSON body or params
    try:
        data = request.json
        data_id = data.get("data", {}).get("id") or data.get("id")
    except Exception:
        return False
    
    if not x_signature or not secret or not x_request_id or not data_id:
        return False

    # Parse x-signature (format: ts=...,v1=...)
    try:
        parts = dict(part.split('=') for part in x_signature.split(','))
        ts = parts.get('ts')
        v1 = parts.get('v1')
    except Exception:
        return False
    
    if not ts or not v1:
        return False

    # Construct manifest string
    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    
    # Generate HMAC-SHA256
    generated_hash = hmac.new(
        secret.encode(),
        manifest.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(str(generated_hash), str(v1))


@api.post("/webhooks/mercadopago", auth=None)
def mercadopago_webhook(request):
    """
    Handle asynchronous notifications from Mercado Pago.
    Documentation: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
    """
    # Optional Security: Verify signature if secret is configured
    webhook_secret = getattr(settings, 'MERCADOPAGO_WEBHOOK_SECRET', None)
    if webhook_secret and not _verify_mp_signature(request, webhook_secret):
        print("Webhook: Signature verification failed.")
        return 403, {"error": "Invalid signature"}

    # 1. Get notification data
    try:
        data = request.json
    except Exception:
        return 400, {"error": "Invalid JSON"}

    topic = data.get("type") or data.get("topic")
    resource_id = data.get("data", {}).get("id") or data.get("id")

    if topic == "payment" and resource_id:
        # 2. Fetch payment details from MP SDK
        sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
        payment_info = sdk.payment().get(resource_id)
        payment = payment_info.get("response")

        if payment and isinstance(payment, dict):
            external_reference = payment.get("external_reference")
            mp_payment_status = _normalize_payment_status(payment.get("status"))
            
            # 3. Update the corresponding Order
            if external_reference:
                try:
                    # Validating if it's a valid UUID
                    order_id = UUID(external_reference)
                    order = Order.objects.get(id=order_id)
                    
                    order.payment_status = mp_payment_status
                    if payment.get("id"):
                        order.payment_id = str(payment.get("id"))
                    if payment.get("payment_method_id"):
                        order.payment_method = str(payment.get("payment_method_id"))

                    if mp_payment_status == "approved":
                        order.status = "CONFIRMED"
                    elif mp_payment_status in ["rejected", "cancelled"]:
                        order.status = "CANCELLED"
                    # We don't change to PENDING if it's already in another status to avoid race conditions
                    
                    order.save()
                    print(f"Webhook: Order {order.order_number} updated to {mp_payment_status}")
                except (Order.DoesNotExist, ValueError):
                    print(f"Webhook: Order with ID {external_reference} not found or invalid.")

    return 200, {"status": "ok"}
