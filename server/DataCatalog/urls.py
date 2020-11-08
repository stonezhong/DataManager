from django.conf.urls import url, include
from django.urls import path
from django.contrib import admin
from django.shortcuts import redirect

urlpatterns = [
    path('', lambda req: redirect('/explorer/datasets')),  # hack, avoid extra redirect
    path('admin/', admin.site.urls),
    url(r'^api/', include('main.urls')),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^explorer/', include('explorer.urls')),
]