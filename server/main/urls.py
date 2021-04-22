from django.urls import path
from django.conf.urls import url, include
from rest_framework import routers

from . import views

router = routers.DefaultRouter()
router.register('UserTenantSubscriptions',                      views.UserTenantSubscriptionViewSet)
router.register('Tenants',                                      views.TenantViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/Datasets',         views.DatasetViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/Assets',           views.AssetViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/DataRepos',        views.DataRepoViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/Applications',     views.ApplicationViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/Timers',           views.TimerViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/Pipelines',        views.PipelineViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/PipelineGroups',   views.PipelineGroupViewSet)



urlpatterns = [
    url(r'', include(router.urls)),
]
