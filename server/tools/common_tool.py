def none_or(v,cb):
    if v is None:
        return v
    else:
        return cb(v)

# python does not have question op, let's create one
def q(expr, cb_true, cb_false):
    if expr:
        return cb_true()
    else:
        return cb_false()
