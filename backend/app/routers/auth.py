from fastapi import APIRouter, HTTPException, Response, status

from app import schemas
from app.auth_store import AccountRecord, EmailTakenError
from app.deps import AuthStoreDep, CurrentUserDep, NowDep, TokenDep
from app.services import auth

router = APIRouter(prefix="/v1", tags=["auth"])


def _response(token: str, account: AccountRecord) -> schemas.AuthResponse:
    return schemas.AuthResponse(token=token, account=schemas.Account.model_validate(account))


@router.post(
    "/auth/sign-up", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED
)
def sign_up(payload: schemas.SignUpRequest, store: AuthStoreDep, now: NowDep):
    try:
        account = store.create_account(
            payload.email, auth.hash_password(payload.password), payload.timezone
        )
    except EmailTakenError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists. Try signing in."
        ) from None
    return _response(auth.start_session(store, account, now), account)


@router.post("/auth/sign-in", response_model=schemas.AuthResponse)
def sign_in(payload: schemas.SignInRequest, store: AuthStoreDep, now: NowDep):
    account = auth.authenticate(store, payload.email, payload.password)
    if account is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if payload.timezone is not None and payload.timezone != account.timezone:
        account = store.update_account(account.id, timezone=payload.timezone)
    return _response(auth.start_session(store, account, now), account)


@router.post("/auth/sign-out", status_code=status.HTTP_204_NO_CONTENT)
def sign_out(store: AuthStoreDep, token: TokenDep):
    """Ends this device's session. Other devices stay signed in."""
    auth.end_session(store, token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=schemas.Account)
def get_account(account: CurrentUserDep):
    return account


@router.patch("/me", response_model=schemas.Account)
def update_account(payload: schemas.AccountUpdate, store: AuthStoreDep, account: CurrentUserDep):
    return store.update_account(account.id, timezone=payload.timezone)
