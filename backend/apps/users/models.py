from django.db import models
from django.contrib.auth.models import User
import uuid

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    cpf = models.CharField(max_length=14, blank=True, null=True)
    registration_address_zipcode = models.CharField(max_length=20, blank=True, null=True)
    registration_address_street = models.CharField(max_length=255, blank=True, null=True)
    registration_address_number = models.CharField(max_length=50, blank=True, null=True)
    registration_address_complement = models.CharField(max_length=255, blank=True, null=True)
    registration_address_neighborhood = models.CharField(max_length=150, blank=True, null=True)
    registration_address_city = models.CharField(max_length=150, blank=True, null=True)
    registration_address_state = models.CharField(max_length=50, blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    
    # OTP generation fields
    otp_secret = models.CharField(max_length=32, blank=True, null=True)
    reset_token = models.UUIDField(default=uuid.uuid4, editable=False, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def has_registration_address(self) -> bool:
        required_fields = [
            self.registration_address_zipcode,
            self.registration_address_street,
            self.registration_address_number,
            self.registration_address_neighborhood,
            self.registration_address_city,
            self.registration_address_state,
        ]
        return all(bool(value and str(value).strip()) for value in required_fields)

    def __str__(self):
        return f"{self.user.username} Profile"

class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    product = models.ForeignKey('store.Product', on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')

    def __str__(self):
        return f"{self.user.username} - {self.product.title}"
