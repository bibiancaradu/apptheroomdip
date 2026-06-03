from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "theroom-barberia-secret-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Helper Functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# Models
class UserBase(BaseModel):
    name: str
    username: str
    role: str  # "admin" or "employee"
    location_preference: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TimeEntryBase(BaseModel):
    date: str
    hours: float
    location: str  # "Costabissara" or "Vicenza Est"
    entry_type: str  # "work", "vacation", "sick", "permit", "other"
    comments: Optional[str] = None

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntryUpdate(BaseModel):
    hours: Optional[float] = None
    location: Optional[str] = None
    entry_type: Optional[str] = None
    comments: Optional[str] = None

class TimeEntryResponse(TimeEntryBase):
    id: str
    user_id: str
    user_name: str
    status: str  # "pending", "approved", "rejected"
    created_at: datetime
    updated_at: datetime

class ApprovalRequest(BaseModel):
    status: str  # "approved" or "rejected"


# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"username": login_data.username})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Username o password non corretti")
    
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            username=user["username"],
            role=user["role"],
            location_preference=user.get("location_preference"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        username=current_user["username"],
        role=current_user["role"],
        location_preference=current_user.get("location_preference"),
        created_at=current_user["created_at"]
    )


# User Management Routes (Admin only)
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono accedere a questa risorsa")
    
    users = await db.users.find().to_list(1000)
    return [UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        username=user["username"],
        role=user["role"],
        location_preference=user.get("location_preference"),
        created_at=user["created_at"]
    ) for user in users]

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono creare utenti")
    
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username già esistente")
    
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["created_at"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    return UserResponse(
        id=str(user_dict["_id"]),
        name=user_dict["name"],
        username=user_dict["username"],
        role=user_dict["role"],
        location_preference=user_dict.get("location_preference"),
        created_at=user_dict["created_at"]
    )

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserCreate, current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono modificare utenti")
    
    user_dict = user_data.dict()
    # If password is empty, don't update it
    if not user_dict.get("password"):
        user_dict.pop("password", None)
    else:
        user_dict["password"] = get_password_hash(user_dict["password"])
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": user_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    return UserResponse(
        id=str(updated_user["_id"]),
        name=updated_user["name"],
        username=updated_user["username"],
        role=updated_user["role"],
        location_preference=updated_user.get("location_preference"),
        created_at=updated_user["created_at"]
    )

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono eliminare utenti")
    
    # Don't allow deleting self
    if str(current_user["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare il tuo account")
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Also delete all time entries for this user
    await db.time_entries.delete_many({"user_id": user_id})
    
    return {"message": "Utente eliminato con successo"}


# Time Entry Routes
@api_router.post("/time-entries", response_model=TimeEntryResponse)
async def create_time_entry(entry_data: TimeEntryCreate, current_user = Depends(get_current_user)):
    entry_dict = entry_data.dict()
    entry_dict["user_id"] = str(current_user["_id"])
    entry_dict["user_name"] = current_user["name"]
    entry_dict["created_at"] = datetime.utcnow()
    entry_dict["updated_at"] = datetime.utcnow()
    
    # Set status based on entry type
    if entry_data.entry_type in ["vacation", "permit"]:
        entry_dict["status"] = "pending"
    else:
        entry_dict["status"] = "approved"
    
    result = await db.time_entries.insert_one(entry_dict)
    entry_dict["_id"] = result.inserted_id
    
    return TimeEntryResponse(
        id=str(entry_dict["_id"]),
        user_id=entry_dict["user_id"],
        user_name=entry_dict["user_name"],
        date=entry_dict["date"],
        hours=entry_dict["hours"],
        location=entry_dict["location"],
        entry_type=entry_dict["entry_type"],
        comments=entry_dict.get("comments"),
        status=entry_dict["status"],
        created_at=entry_dict["created_at"],
        updated_at=entry_dict["updated_at"]
    )

@api_router.get("/time-entries", response_model=List[TimeEntryResponse])
async def get_time_entries(
    month: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    query = {}
    
    # If not admin, only show own entries
    if current_user["role"] != "admin":
        query["user_id"] = str(current_user["_id"])
    elif user_id:  # Admin can filter by user_id
        query["user_id"] = user_id
    
    if month:
        # Filter by month (format: YYYY-MM)
        query["date"] = {"$regex": f"^{month}"}
    
    entries = await db.time_entries.find(query).sort("date", -1).to_list(1000)
    return [TimeEntryResponse(
        id=str(entry["_id"]),
        user_id=entry["user_id"],
        user_name=entry["user_name"],
        date=entry["date"],
        hours=entry["hours"],
        location=entry["location"],
        entry_type=entry["entry_type"],
        comments=entry.get("comments"),
        status=entry["status"],
        created_at=entry["created_at"],
        updated_at=entry["updated_at"]
    ) for entry in entries]

@api_router.put("/time-entries/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: str,
    entry_data: TimeEntryUpdate,
    current_user = Depends(get_current_user)
):
    # Get the entry
    entry = await db.time_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Voce non trovata")
    
    # Check permissions: only owner can edit (or admin)
    if current_user["role"] != "admin" and entry["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Non puoi modificare questa voce")
    
    # Check if entry is in current month (only for non-admin)
    if current_user["role"] != "admin":
        entry_date = datetime.fromisoformat(entry["date"])
        current_month = datetime.now().strftime("%Y-%m")
        entry_month = entry_date.strftime("%Y-%m")
        if entry_month != current_month:
            raise HTTPException(status_code=403, detail="Puoi modificare solo voci del mese corrente")
    
    update_dict = {k: v for k, v in entry_data.dict(exclude_unset=True).items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.time_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": update_dict}
    )
    
    updated_entry = await db.time_entries.find_one({"_id": ObjectId(entry_id)})
    return TimeEntryResponse(
        id=str(updated_entry["_id"]),
        user_id=updated_entry["user_id"],
        user_name=updated_entry["user_name"],
        date=updated_entry["date"],
        hours=updated_entry["hours"],
        location=updated_entry["location"],
        entry_type=updated_entry["entry_type"],
        comments=updated_entry.get("comments"),
        status=updated_entry["status"],
        created_at=updated_entry["created_at"],
        updated_at=updated_entry["updated_at"]
    )

@api_router.delete("/time-entries/{entry_id}")
async def delete_time_entry(entry_id: str, current_user = Depends(get_current_user)):
    # Get the entry
    entry = await db.time_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Voce non trovata")
    
    # Check permissions: only owner can delete (or admin)
    if current_user["role"] != "admin" and entry["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Non puoi eliminare questa voce")
    
    # Check if entry is in current month (only for non-admin)
    if current_user["role"] != "admin":
        entry_date = datetime.fromisoformat(entry["date"])
        current_month = datetime.now().strftime("%Y-%m")
        entry_month = entry_date.strftime("%Y-%m")
        if entry_month != current_month:
            raise HTTPException(status_code=403, detail="Puoi eliminare solo voci del mese corrente")
    
    await db.time_entries.delete_one({"_id": ObjectId(entry_id)})
    return {"message": "Voce eliminata con successo"}


# Approval Routes (Admin only)
@api_router.get("/approvals", response_model=List[TimeEntryResponse])
async def get_pending_approvals(
    status_filter: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono accedere a questa risorsa")
    
    # Filter only requestable types (vacation, permit) regardless of status
    query: dict = {"entry_type": {"$in": ["vacation", "permit"]}}
    
    if status_filter and status_filter in ["pending", "approved", "rejected"]:
        query["status"] = status_filter
    else:
        # Default: only show pending
        query["status"] = "pending"
    
    entries = await db.time_entries.find(query).sort("date", -1).to_list(1000)
    return [TimeEntryResponse(
        id=str(entry["_id"]),
        user_id=entry["user_id"],
        user_name=entry["user_name"],
        date=entry["date"],
        hours=entry["hours"],
        location=entry["location"],
        entry_type=entry["entry_type"],
        comments=entry.get("comments"),
        status=entry["status"],
        created_at=entry["created_at"],
        updated_at=entry["updated_at"]
    ) for entry in entries]

@api_router.put("/approvals/{entry_id}", response_model=TimeEntryResponse)
async def approve_or_reject_entry(
    entry_id: str,
    approval_data: ApprovalRequest,
    current_user = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono approvare richieste")
    
    if approval_data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status non valido")
    
    result = await db.time_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": {"status": approval_data.status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Voce non trovata")
    
    updated_entry = await db.time_entries.find_one({"_id": ObjectId(entry_id)})
    return TimeEntryResponse(
        id=str(updated_entry["_id"]),
        user_id=updated_entry["user_id"],
        user_name=updated_entry["user_name"],
        date=updated_entry["date"],
        hours=updated_entry["hours"],
        location=updated_entry["location"],
        entry_type=updated_entry["entry_type"],
        comments=updated_entry.get("comments"),
        status=updated_entry["status"],
        created_at=updated_entry["created_at"],
        updated_at=updated_entry["updated_at"]
    )


# Seed initial data
@api_router.post("/seed")
async def seed_data():
    try:
        # Check if already seeded
        existing_users = await db.users.count_documents({})
        if existing_users > 0:
            return {"message": "Database già inizializzato", "existing_users": existing_users}
        
        # Create initial users
        users_data = [
            {"name": "Marius", "username": "marius", "password": get_password_hash("marius2025"), "role": "admin", "created_at": datetime.utcnow()},
            {"name": "Jessica", "username": "jessica", "password": get_password_hash("jessica2025"), "role": "employee", "created_at": datetime.utcnow()},
            {"name": "Andrea", "username": "andrea", "password": get_password_hash("andrea2025"), "role": "employee", "created_at": datetime.utcnow()},
            {"name": "Francesca", "username": "francesca", "password": get_password_hash("francesca2025"), "role": "employee", "created_at": datetime.utcnow()},
            {"name": "Giada", "username": "giada", "password": get_password_hash("giada2025"), "role": "employee", "created_at": datetime.utcnow()},
            {"name": "Leonardo", "username": "leonardo", "password": get_password_hash("leonardo2025"), "role": "employee", "created_at": datetime.utcnow()},
        ]
        
        await db.users.insert_many(users_data)
        
        return {
            "message": "Database inizializzato con successo",
            "users": [
                {"username": "marius", "password": "marius2025", "role": "admin"},
                {"username": "jessica", "password": "jessica2025", "role": "employee"},
                {"username": "andrea", "password": "andrea2025", "role": "employee"},
                {"username": "francesca", "password": "francesca2025", "role": "employee"},
                {"username": "giada", "password": "giada2025", "role": "employee"},
                {"username": "leonardo", "password": "leonardo2025", "role": "employee"},
            ]
        }
    except Exception as e:
        import traceback
        error_details = {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
        logger.error(f"Seed failed: {error_details}")
        raise HTTPException(status_code=500, detail=error_details)


# Health check endpoint
@api_router.get("/health")
async def health_check():
    try:
        # Test MongoDB connection
        await db.command("ping")
        users_count = await db.users.count_documents({})
        return {
            "status": "ok",
            "mongodb": "connected",
            "users_count": users_count,
            "db_name": os.environ.get('DB_NAME', 'not set')
        }
    except Exception as e:
        return {
            "status": "error",
            "mongodb": "disconnected",
            "error": str(e),
            "type": type(e).__name__
        }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
