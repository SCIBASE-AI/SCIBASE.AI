--- a/app/api/v1/__init__.py
+++ b/app/api/v1/__init__.py
@@ -1,4 +1,5 @@
 from fastapi import APIRouter
 
 from app.api.v1 import challenges, submissions, users
+from app.api.v1 import bounty
 
 api_router = APIRouter()
@@ -8,4 +9,5 @@
 api_router.include_router(challenges.router, prefix="/challenges", tags=["challenges"])
 api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
 api_router.include_router(users.router, prefix="/users", tags=["users"])
+api_router.include_router(bounty.router, tags=["bounty"])
 
