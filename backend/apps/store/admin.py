from django.contrib import admin
from .models import Category, Product, Order, OrderItem, PromotionalPopup, Banner, Color, ProductImage, Cart, CartItem

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_default')
    list_editable = ('is_default',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'image')
    search_fields = ('name',)

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    def display_categories(self, obj):
        return ", ".join([c.name for c in obj.categories.all()])
    display_categories.short_description = 'Categorias'

    list_display = ('name', 'display_categories', 'price', 'has_colors', 'is_active')
    list_filter = ('categories', 'is_active', 'has_colors')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ('categories',)
    inlines = [ProductImageInline]

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('price_at_time',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    def order_display(self, obj):
        return f"#{obj.order_number}"

    order_display.short_description = "Pedido"
    
    list_display = ('order_display', 'customer_name', 'shipping_type', 'status', 'created_at')
    list_filter = ('shipping_type', 'status', 'created_at')
    search_fields = ('customer_name', 'id')
    ordering = ['-created_at']
    inlines = [OrderItemInline]
    readonly_fields = ('id', 'created_at', 'shipping_type')

@admin.register(PromotionalPopup)
class PromotionalPopupAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'frequency', 'created_at')
    list_filter = ('is_active', 'frequency')
    search_fields = ('title',)

@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'is_active', 'created_at')
    list_filter = ('is_active',)
    list_editable = ('order', 'is_active')
    search_fields = ('title',)

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity')
    list_filter = ('cart',)
    search_fields = ('product__name', 'cart__user__username')
