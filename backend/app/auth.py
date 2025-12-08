# backend/app/auth.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from passlib.hash import pbkdf2_sha256  # <-- use pbkdf2 instead of bcrypt
import os
import jwt
from typing import Optional

from .db import users  # Mongo users collection

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "change_me_in_prod")
JWT_ALGO = os.getenv("JWT_ALGO", "HS256")
JWT_EXP_MIN = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

# ----- Request models -----

class RegisterPayload(BaseModel):
    name: str
    email: EmailStr
    password: str  # simple string; passlib will handle hashing


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


# ----- JWT helpers -----

def create_token(payload: dict, minutes: int = JWT_EXP_MIN):
    to_encode = payload.copy()
    expire = datetime.utcnow() + timedelta(minutes=minutes)
    to_encode.update({"exp": expire})
    t = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGO)
    if isinstance(t, bytes):
        t = t.decode("utf-8")
    return t


def verify_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----- Routes -----

@router.post("/register")
async def register(p: RegisterPayload):
    # ensure lowercase email and uniqueness
    email = p.email.lower()
    if users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # hash password with pbkdf2_sha256
    hashed = pbkdf2_sha256.hash(p.password)

    doc = {
        "name": p.name,
        "email": email,
        "password": hashed,
        "created_at": datetime.utcnow(),
    }

    res = users.insert_one(doc)

    user = {
        "_id": str(res.inserted_id),
        "name": doc["name"],
        "email": doc["email"],
        "created_at": doc["created_at"].isoformat(),
    }

    token = create_token({"sub": user["email"], "user_id": user["_id"]})
    return {"token": token, "user": user}


@router.post("/login")
async def login(p: LoginPayload):
    email = p.email.lower()
    u = users.find_one({"email": email})

    # verify password using pbkdf2_sha256
    if not u or not pbkdf2_sha256.verify(p.password, u.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    safe_user = {k: u[k] for k in u if k != "password"}
    safe_user["_id"] = str(safe_user.get("_id"))

    token = create_token({"sub": safe_user["email"], "user_id": safe_user["_id"]})
    return {"token": token, "user": safe_user}


@router.get("/me")
async def me(request: Request):
    auth = (request.headers.get("authorization") or
            request.headers.get("Authorization") or "")

    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")

    token = auth.split(" ", 1)[1]
    data = verify_token(token)
    email = data.get("sub")

    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    safe_user = {k: user[k] for k in user if k != "password"}
    safe_user["_id"] = str(safe_user.get("_id"))
    return {"user": safe_user}
