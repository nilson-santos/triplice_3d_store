"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from apps.store.api import api

# Personalização do Admin
admin.site.site_header = "Loja Tríplice 3D"  # H1 no topo
admin.site.site_title = "Admin Loja Tríplice 3D"    # Título da aba do navegador
admin.site.index_title = "Admin Loja Tríplice 3D"   # Título na página principal

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
