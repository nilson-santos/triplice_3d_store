from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from .models import Product
import requests
import os

def seo_product_view(request, slug):
    product = get_object_or_404(Product, slug=slug)
    
    title = product.name
    description = product.description[:200] + "..." if product.description else "Confira este produto na Tríplice 3D!"
    
    # URL completa da imagem
    image_url = ""
    if product.image:
        image_url = request.build_absolute_uri(product.image.url)
    
    url = request.build_absolute_uri(f"/produto/{slug}")

    meta_tags = f"""
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:url" content="{url}">
    <meta property="og:type" content="product">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{image_url}">
    """

    # O ideal é injetar no index.html do frontend para que quando o bot do whatsapp ler o HTML base ele ache as tags.
    # Podemos buscar o index.html da porta do frontend (em docker é http://frontend:80/)
    frontend_url = os.environ.get('FRONTEND_INTERNAL_URL', 'http://frontend:80/')
    
    try:
        # A view do Nginx retorna index.html na raiz
        res = requests.get(frontend_url, timeout=3)
        if res.status_code == 200:
            html = res.text
            # Injeta as meta tags antes do fechamento do </head>
            html = html.replace('</head>', f'{meta_tags}</head>')
            return HttpResponse(html)
    except Exception as e:
        print(f"Erro ao buscar index.html do frontend: {e}")
        
    # Fallback: Se não conseguir buscar o HTML, retorna um HTML basico com redirect pro JS depois (mas bots vão ler as tags)
    fallback_html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>{title}</title>
        {meta_tags}
    </head>
    <body>
        <script>
            window.location.href = "{url}";
        </script>
    </body>
    </html>
    """
    return HttpResponse(fallback_html)
