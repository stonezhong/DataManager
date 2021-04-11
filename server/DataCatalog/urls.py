from django.conf.urls import url, include
from django.urls import path
from django.contrib import admin
from django.shortcuts import redirect

# from explorer import views

urlpatterns = [
    path('', lambda req: redirect('/explorer')),  # hack, avoid extra redirect
    path('admin/', admin.site.urls),
    url(r'^api/', include('main.urls')),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^explorer/', include('explorer.urls')),
#    path('.well-known/acme-challenge/mlhSihbAVhD1xOT4H8RsFj5cVLepXtkG3Xc82plLLZQ', views.letsencrypt, name='letsencrypt'),
]