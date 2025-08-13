def obj_snapshot(o, fields: list[str]):
    return {k: getattr(o, k) for k in fields}


def diff_simple(antes: dict, depois: dict):
    keys = set(antes) | set(depois)
    out = {}
    for k in keys:
        if antes.get(k) != depois.get(k):
            out[k] = {"antes": antes.get(k), "depois": depois.get(k)}
    return out
