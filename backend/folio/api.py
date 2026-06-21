from ninja import NinjaAPI

from users.auth import TokenAuth

api = NinjaAPI(title='Folio API', version='1.0', auth=TokenAuth())

from users.api import auth_router, profile_router  # noqa: E402
from cv.api import router as cv_router  # noqa: E402
from resumes.api import custom_router, topical_router  # noqa: E402
from applications.api import (dashboard_router, jd_router,  # noqa: E402
                              router as applications_router)

api.add_router('/auth', auth_router)
api.add_router('/profile', profile_router)
api.add_router('/cv', cv_router)
api.add_router('/topical', topical_router)
api.add_router('/custom', custom_router)
api.add_router('/applications', applications_router)
api.add_router('/jd', jd_router)
api.add_router('/dashboard', dashboard_router)
