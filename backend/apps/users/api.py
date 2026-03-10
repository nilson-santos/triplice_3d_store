from ninja import Router, Schema
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from ninja_jwt.tokens import RefreshToken
import pyotp
from core.settings import SECRET_KEY
from .models import UserProfile
from django.core.mail import send_mail
from typing import Optional
from typing import Optional, List
from ninja_jwt.authentication import JWTAuth
from apps.store.models import Product

router = Router()

class StandardResponse(Schema):
    message: str

class ErrorResponse(Schema):
    error: str

class RegisterIn(Schema):
    name: str
    email: str
    phone: str

class VerifyOtpIn(Schema):
    email: str
    code: str

class RequestCodeIn(Schema):
    email: str

class TokenOut(Schema):
    access: str
    refresh: str
    user_name: str
    email_verified: bool
    is_staff: bool


class RefreshIn(Schema):
    refresh: str


class AccessOut(Schema):
    access: str


class ProfileAddressStatusOut(Schema):
    has_registration_address: bool
    registration_address_zipcode: str | None = None
    registration_address_street: str | None = None
    registration_address_number: str | None = None
    registration_address_complement: str | None = None
    registration_address_neighborhood: str | None = None
    registration_address_city: str | None = None
    registration_address_state: str | None = None

def generate_otp_for_user(user: UserProfile) -> str:
    if not user.otp_secret:
        user.otp_secret = pyotp.random_base32()
        user.save()
    totp = pyotp.TOTP(user.otp_secret, interval=300) # Valid for 5 minutes
    return totp.now()

def verify_otp_for_user(user: UserProfile, code: str) -> bool:
    if not user.otp_secret: return False
    totp = pyotp.TOTP(user.otp_secret, interval=300)
    return totp.verify(code)

@router.post("/register", response={201: StandardResponse, 400: ErrorResponse})
def register(request, payload: RegisterIn):
    if User.objects.filter(username=payload.email).exists():
        return 400, {"error": "E-mail já cadastrado"}
    
    user = User.objects.create_user(
        username=payload.email,
        email=payload.email,
        first_name=payload.name
    )
    user.set_unusable_password()
    user.save()
    
    profile = UserProfile.objects.create(
        user=user,
        phone=payload.phone
    )
    
    otp = generate_otp_for_user(profile)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px 10px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 30px 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02); text-align: center;">
            <h2 style="color: #111827; margin-bottom: 24px; font-size: 24px; font-weight: 700;">Tríplice 3D</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                Olá {user.first_name},<br><br>
                Bem-vindo(a)! Aqui está o seu código de acesso para entrar.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <p style="font-size: 32px; font-weight: 800; color: #000000; letter-spacing: 6px; margin: 0; font-family: monospace;">{otp}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                Este código é válido por <strong>5 minutos</strong>.<br>Se você não fez essa solicitação, pode ignorar este e-mail.
            </p>
        </div>
    </body>
    </html>
    """
    
    try:
        send_mail(
            "Seu código de acesso - Tríplice 3D",
            f"Olá {user.first_name},\n\nSeu código de acesso é: {otp}\n\nVálido por 5 minutos.",
            None,
            [user.email],
            fail_silently=False,
            html_message=html_content
        )
    except Exception as e:
        print("Erro ao enviar email:", e)
        # Continue process even if email fails on dev environment without proper SMTP
        pass
        
    return 201, {"message": "Conta criada. Verifique seu e-mail."}

@router.post("/verify-otp", response={200: TokenOut, 400: ErrorResponse})
def verify_otp(request, payload: VerifyOtpIn):
    try:
        user = User.objects.get(username=payload.email)
        profile = user.profile
    except User.DoesNotExist:
        return 400, {"error": "Usuário não encontrado"}

    if verify_otp_for_user(profile, payload.code):
        if not profile.email_verified:
            profile.email_verified = True
            profile.save()
        
        # Issue token automatically upon validation
        refresh = RefreshToken.for_user(user)
        return 200, {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user_name": user.first_name,
            "email_verified": profile.email_verified,
            "is_staff": user.is_staff
        }
        
    return 400, {"error": "Código inválido ou expirado"}


@router.post("/request-code", response={200: StandardResponse, 404: ErrorResponse})
def request_code(request, payload: RequestCodeIn):
    try:
        user = User.objects.get(username=payload.email)
        profile = user.profile
    except User.DoesNotExist:
        return 404, {"error": "Conta não encontrada. Por favor, crie sua conta."}

    otp = generate_otp_for_user(profile)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px 10px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 30px 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02); text-align: center;">
            <h2 style="color: #111827; margin-bottom: 24px; font-size: 24px; font-weight: 700;">Tríplice 3D</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                Olá {user.first_name},<br><br>
                Recebemos um pedido de acesso para a sua conta. Use o código abaixo para entrar no site:
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <p style="font-size: 32px; font-weight: 800; color: #000000; letter-spacing: 6px; margin: 0; font-family: monospace;">{otp}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                Este código é válido por <strong>5 minutos</strong>.<br>Se você não fez essa solicitação, pode ignorar este e-mail tranquilamente.
            </p>
        </div>
    </body>
    </html>
    """
    
    try:
        send_mail(
            "Seu código de acesso - Tríplice 3D",
            f"Olá {user.first_name},\n\nSeu código de acesso é: {otp}\n\nVálido por 5 minutos.",
            None,
            [user.email],
            fail_silently=False,
            html_message=html_content
        )
    except Exception as e:
        print("Erro ao enviar email:", e)
        pass 
        
    return 200, {"message": "Código enviado para seu e-mail."}


@router.post("/refresh", response={200: AccessOut, 400: ErrorResponse})
def refresh_access_token(request, payload: RefreshIn):
    try:
        refresh = RefreshToken(payload.refresh)
        user_id = refresh.get("user_id")
        if not user_id:
            return 400, {"error": "Refresh token inválido"}

        user = User.objects.filter(id=user_id, is_active=True).first()
        if not user:
            return 400, {"error": "Usuário inválido"}

        return 200, {"access": str(refresh.access_token)}
    except Exception:
        return 400, {"error": "Refresh token inválido ou expirado"}


@router.get("/profile/address-status", response=ProfileAddressStatusOut, auth=JWTAuth())
def profile_address_status(request):
    user = request.user
    profile = getattr(user, "profile", None)

    if not profile:
        return {
            "has_registration_address": False,
            "registration_address_zipcode": None,
            "registration_address_street": None,
            "registration_address_number": None,
            "registration_address_complement": None,
            "registration_address_neighborhood": None,
            "registration_address_city": None,
            "registration_address_state": None,
        }

    return {
        "has_registration_address": profile.has_registration_address(),
        "registration_address_zipcode": profile.registration_address_zipcode,
        "registration_address_street": profile.registration_address_street,
        "registration_address_number": profile.registration_address_number,
        "registration_address_complement": profile.registration_address_complement,
        "registration_address_neighborhood": profile.registration_address_neighborhood,
        "registration_address_city": profile.registration_address_city,
        "registration_address_state": profile.registration_address_state,
    }

class FavoriteSchema(Schema):
    product_id: int
    product_name: str
    product_slug: str
    product_price: float
    product_image: str | None = None

@router.get("/favorites", response=List[FavoriteSchema], auth=JWTAuth())
def get_favorites(request):
    user = request.user
    favorites = user.favorites.all().select_related('product')
    
    result = []
    for fav in favorites:
        img_url = None
        if fav.product.image:
            img_url = request.build_absolute_uri(fav.product.image.url)
            
        result.append({
            "product_id": fav.product.id,
            "product_name": fav.product.name,
            "product_slug": fav.product.slug,
            "product_price": float(fav.product.price),
            "product_image": img_url
        })
    return result

class ToggleFavoriteIn(Schema):
    product_id: int

@router.post("/favorites/toggle", response=StandardResponse, auth=JWTAuth())
def toggle_favorite(request, payload: ToggleFavoriteIn):
    user = request.user
    try:
        product = Product.objects.get(id=payload.product_id)
    except Product.DoesNotExist:
        return 404, {"error": "Produto não encontrado"}

    from .models import Favorite
    fav, created = Favorite.objects.get_or_create(user=user, product=product)
    
    if not created:
        fav.delete()
        return 200, {"message": "Removido dos favoritos"}
        
    return 200, {"message": "Adicionado aos favoritos"}
