from django.contrib import admin
from .models import Category, Product, Order, OrderItem, PromotionalPopup

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    def display_categories(self, obj):
        return ", ".join([c.name for c in obj.categories.all()])
    display_categories.short_description = 'Categorias'

    list_display = ('name', 'display_categories', 'price', 'is_active')
    list_filter = ('categories', 'is_active')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ('categories',)

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('price_at_time',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    def order_display(self, obj):
        return f"#{obj.order_number}"

    order_display.short_description = "Pedido"
    
    list_display = ('order_display', 'customer_name', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer_name', 'id')
    inlines = [OrderItemInline]
    readonly_fields = ('id', 'created_at')

@admin.register(PromotionalPopup)
class PromotionalPopupAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'frequency', 'created_at')
    list_filter = ('is_active', 'frequency')
    search_fields = ('title',)
