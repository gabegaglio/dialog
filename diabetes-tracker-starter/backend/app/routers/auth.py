from fastapi import APIRouter, Depends, HTTPException, Header

router = APIRouter()

# MVP stub: in real setup, verify JWT here.
async def get_current_user(authorization: str | None = Header(default=None)):
    # TODO: Verify Supabase/Auth0/Clerk JWT and map to internal user id.
    # For MVP, treat presence of any Authorization header as "authenticated".
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {'userId': 'demo-user'}

@router.get('/me')
async def me(user = Depends(get_current_user)):
    return user
