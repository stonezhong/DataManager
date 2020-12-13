from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('datasets', views.datasets, name='datasets'),
    path('dataset', views.dataset, name='dataset'),
    path('pipelines', views.pipelines, name='pipelines'),
    path('pipeline', views.pipeline, name='pipeline'),
    path('executions', views.pipeline_groups, name='executions'),
    path('execution', views.pipeline_group, name='execution'),
    path('applications', views.applications, name='applications'),
    path('application', views.application, name='application'),
    path('asset', views.dataset_instance, name='asset'),
    path('schedulers', views.schedulers, name='schedulers'),
    path('logout', views.logout, name='logout'),
    path('login', views.login, name='login'),
    path('test', views.test, name='test'), # for testing UI components
]
