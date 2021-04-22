from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login', views.login, name='login'),
    path('logout', views.logout, name='logout'),
    path('signup', views.signup, name='signup'),
    path('signup-validate', views.signup_validate, name='signup-validate'),
    path('datalakes', views.datalakes, name='datalakes'),

    path('<int:tenant_id>/datasets', views.datasets, name='datasets'),
    path('<int:tenant_id>/dataset', views.dataset, name='dataset'),
    path('<int:tenant_id>/pipelines', views.pipelines, name='pipelines'),
    path('<int:tenant_id>/pipeline', views.pipeline, name='pipeline'),
    path('<int:tenant_id>/executions', views.pipeline_groups, name='executions'),
    path('<int:tenant_id>/execution', views.pipeline_group, name='execution'),
    path('<int:tenant_id>/applications', views.applications, name='applications'),
    path('<int:tenant_id>/application', views.application, name='application'),
    path('<int:tenant_id>/asset', views.dataset_instance, name='asset'),
    path('<int:tenant_id>/schedulers', views.schedulers, name='schedulers'),
    path('<int:tenant_id>/datarepos', views.datarepos, name='datarepos'),
    path('<int:tenant_id>/datarepo', views.datarepo, name='datarepo'),
    path('test', views.test, name='test'), # for testing UI components
]
