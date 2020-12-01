def PatchRequestMiddleware(get_response):

    def middleware(request):
        if request.method == "POST" and request.headers.get('X-Data-Manager-Use-Method') == "PATCH":
            request.method = "PATCH"
        response = get_response(request)
        return response

    return middleware