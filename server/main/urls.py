from django.urls import path
from django.conf.urls import url, include
from rest_framework import routers

from . import views

router = routers.DefaultRouter()
router.register('UserTenantSubscriptions',              views.UserTenantSubscriptionViewSet)
router.register('Tenants',                              views.TenantViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/Datasets', views.DatasetViewSet)
router.register(r'(?P<tenant_id_str>\d{1,5})/Assets',   views.AssetViewSet)

router.register('DataLocation',             views.DataLocationViewSet)
router.register('Pipelines',                views.PipelineViewSet)
router.register('PipelineGroups',           views.PipelineGroupViewSet)
router.register('PipelineInstances',        views.PipelineInstanceViewSet)
router.register('Applications',             views.ApplicationViewSet)
router.register('Timers',                   views.TimerViewSet)
router.register('ScheduledEvents',          views.ScheduledEventViewSet)
router.register('DataRepos',                views.DataRepoViewSet)


urlpatterns = [
    url(r'', include(router.urls)),
]