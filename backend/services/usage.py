"""Per-user Anthropic API cost tracking (estimates)."""
import logging

logger = logging.getLogger('services.ai')

# $ per 1M tokens: (input, output)
PRICING = {
    'claude-opus-4-8': (5.0, 25.0),
    'claude-opus-4-7': (5.0, 25.0),
    'claude-opus-4-6': (5.0, 25.0),
    'claude-sonnet-4-6': (3.0, 15.0),
    'claude-haiku-4-5': (1.0, 5.0),
    'claude-fable-5': (10.0, 50.0),
}
WEB_SEARCH_COST = 0.01  # $ per search request


def cost_for(model, input_tokens, output_tokens, web_searches=0):
    pin, pout = PRICING.get(model, (3.0, 15.0))
    return (input_tokens / 1e6) * pin + (output_tokens / 1e6) * pout + web_searches * WEB_SEARCH_COST


def _fields(usage_obj):
    inp = (getattr(usage_obj, 'input_tokens', 0) or 0)
    inp += (getattr(usage_obj, 'cache_read_input_tokens', 0) or 0)
    inp += (getattr(usage_obj, 'cache_creation_input_tokens', 0) or 0)
    out = (getattr(usage_obj, 'output_tokens', 0) or 0)
    stu = getattr(usage_obj, 'server_tool_use', None)
    web = (getattr(stu, 'web_search_requests', 0) or 0) if stu else 0
    return inp, out, web


def record_usage(user, kind, model, usage_obj, web_searches=None):
    """Persist one ApiUsage row from an Anthropic usage object. Best-effort."""
    from services.models import ApiUsage
    try:
        inp, out, web = _fields(usage_obj)
        if web_searches is not None:
            web = web_searches
        cost = cost_for(model, inp, out, web)
        ApiUsage.objects.create(user=user, kind=kind, model=model, input_tokens=inp,
                                output_tokens=out, web_searches=web, cost_usd=round(cost, 6))
        return cost
    except Exception:  # noqa: BLE001
        logger.warning('failed to record API usage', exc_info=True)
        return 0.0
