from django.core.exceptions import ValidationError
from django.http import Http404

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
