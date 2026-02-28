import os
import django
import random
from decimal import Decimal
from io import BytesIO
from PIL import Image as PILImage
from django.core.files.base import ContentFile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ.setdefault('DEBUG', '1')

django.setup()

from apps.store.models import Category, Product, Color, ProductImage
from django.conf import settings

def run():
    print("Starting mock data generation...")
    
    # SAFETY CHECK: Only run if using SQLite (local development)
    db_engine = settings.DATABASES['default']['ENGINE']
    if 'sqlite3' not in db_engine:
        print("ERROR: Safety Triggered! The database is NOT SQLite.")
        print("To protect production, this script will now exit.")
        return
    
    print("Deleting old records...")
    ProductImage.objects.all().delete()
    Color.objects.all().delete()
    Product.objects.all().delete()
    Category.objects.all().delete()
    
    print("Creating categories...")
    categories_data = [
        {"name": "Eletrônicos", "slug": "eletronicos"},
        {"name": "Acessórios", "slug": "acessorios"},
        {"name": "Decoração", "slug": "decoracao"},
        {"name": "Impressão 3D", "slug": "impressao-3d"},
        {"name": "Games", "slug": "games"},
        {"name": "Colecionáveis", "slug": "colecionaveis"}
    ]
    categories = [Category.objects.create(**c) for c in categories_data]

    print("Creating colors...")
    colors_data = [
        "Preto", "Branco", "Cinza", "Azul", "Vermelho", "Madeira", "Transparente"
    ]
    created_colors = []
    for c in colors_data:
        color = Color.objects.create(name=c)
        created_colors.append(color)

        # Generate a dummy image file for the color
        img_io = BytesIO()
        img = PILImage.new('RGB', (100, 100), color=random.choice([(0,0,0), (255,255,255), (128,128,128), (0,0,255), (255,0,0), (139,69,19), (200,200,200)]))
        img.save(img_io, format='JPEG')
        img_file = ContentFile(img_io.getvalue(), name=f"color_{color.id}.jpg")
        color.image.save(f"color_{color.id}.jpg", img_file, save=True)
        
    print("Creating products...")
    
    words = ["Action Figure", "Suporte", "Luminária", "Vaso", "Enfeite", "Case", "Peça", "Miniatura", "Base", "Grip"]
    themes = ["Cyberpunk", "Medieval", "Espacial", "Geek", "Moderno", "Minimalista", "Rústico", "Místico"]
    
    for i in range(1, 37):
        base_name = f"{random.choice(words)} {random.choice(themes)}"
        
        product = Product.objects.create(
            name=f"{base_name} {i+1}",
            slug=f"produto-teste-{i}",
            description=f"Este é um produto de teste gerado automaticamente. Conta com múltiplas opções de cores e imagens secundárias. ID: {i+1}",
            price=Decimal(str(round(random.uniform(20.0, 250.0), 2))),
            is_active=True,
            has_colors=random.choice([True, False])
        )
        
        cats = random.sample(categories, k=random.randint(1, 2))
        product.categories.set(cats)
        
        for j in range(random.randint(2, 4)):
            ProductImage.objects.create(
                product=product,
                image=f"dummy_{i}_{j}.jpg",
                order=j
            )
        
    print("Mock data populated successfully! Created 36 products with variations.")

if __name__ == '__main__':
    run()
