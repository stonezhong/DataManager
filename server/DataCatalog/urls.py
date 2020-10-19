from django.conf.urls import url, include
from django.urls import path
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
    url(r'^api/', include('main.urls')),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^explorer/', include('explorer.urls')),
]