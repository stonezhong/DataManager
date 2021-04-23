from django.core.exceptions import ValidationError, PermissionDenied
from django.http import Http404
from main.models import Tenant

def get_model_by_pk(model_class, pk, tenant_id):
    """
    Get a model by primary key, raise Http404 if
    the model does not exist or not in the tenant specified
    """
    try:
        model = model_class.objects.get(pk=pk)
    except model_class.DoesNotExist:
        raise Http404
    except ValidationError:
        raise Http404
    if model.tenant_id != tenant_id:
        raise Http404
    return model

def get_tenant(tenant_id):
    try:
        tenant = Tenant.objects.get(pk=tenant_id)
    except Tenant.DoesNotExist:
        raise Http404
    except ValidationError:
        raise Http404
    return tenant


def tenant_access_check_for_ui(request, tenant_id):
    """
    Check if user is authenticated and have access to the tenant
    For Web UI only
    """
    if not request.user.is_authenticated:
        raise PermissionDenied()

    tenant = get_tenant(tenant_id)
    if not tenant.is_user_subscribed(request.user):
        raise PermissionDenied()

    return tenant
