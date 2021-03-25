from django.urls import path
from django.conf.urls import url, include
from rest_framework import routers

from . import views

router = routers.DefaultRouter()
router.register('Datasets',                 views.DatasetViewSet)
router.register('DatasetInstances',         views.DatasetInstanceViewSet)
router.register('DataLocation',             views.DataLocationViewSet)
router.register('Pipelines',                views.PipelineViewSet)
router.register('PipelineGroups',           views.PipelineGroupViewSet)
router.register('PipelineInstances',        views.PipelineInstanceViewSet)
router.register('Applications',             views.ApplicationViewSet)
router.register('Timers',                   views.TimerViewSet)
router.register('ScheduledEvents',          views.ScheduledEventViewSet)
router.register('DataRepos',                views.DataRepoViewSet)
router.register('Tenants',                  views.TenantViewSet)
router.register('UserTenantSubscriptions',  views.UserTenantSubscriptionViewSet)

urlpatterns = [
    url(r'', include(router.urls)),
]