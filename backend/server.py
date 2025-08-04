from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import pymongo
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import uuid
import requests

load_dotenv()

app = FastAPI(title="Daily Reminder App API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.daily_reminder_app

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    datetime: str  # ISO format
    priority: str  # "Low", "Medium", "High"
    recurrence: Optional[str] = None  # "daily", "weekly", "monthly", "custom"
    recurrence_days: Optional[List[str]] = None  # For custom recurrence

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    datetime: Optional[str] = None
    priority: Optional[str] = None
    recurrence: Optional[str] = None
    recurrence_days: Optional[List[str]] = None

class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    completed: bool = False

class HabitCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    frequency: str  # "daily", "weekly", "monthly"

class HabitLog(BaseModel):
    habit_id: str
    date: str  # YYYY-MM-DD format

class NoteCreate(BaseModel):
    title: str
    content: str

class UserSettings(BaseModel):
    modules: dict  # {"todo": True, "habits": False, "notes": True, "weather": True}

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

# Authentication endpoints
@app.post("/api/auth/register")
async def register(user: UserRegister):
    # Check if user already exists
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_doc = {
        "user_id": str(uuid.uuid4()),
        "email": user.email,
        "full_name": user.full_name,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow(),
        "settings": {
            "modules": {
                "todo": True,
                "habits": True,
                "notes": True,
                "weather": True
            }
        }
    }
    
    result = db.users.insert_one(user_doc)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "full_name": user_doc["full_name"]
        }
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": db_user["user_id"],
            "email": db_user["email"],
            "full_name": db_user["full_name"]
        }
    }

@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPassword):
    user = db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If email exists, reset instructions have been sent"}
    
    # In a real app, you'd send an email with reset link
    # For now, we'll just return a mock token
    reset_token = create_access_token(
        data={"sub": request.email, "purpose": "password_reset"},
        expires_delta=timedelta(hours=1)
    )
    
    return {
        "message": "Reset token generated",
        "reset_token": reset_token  # In real app, this would be sent via email
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "settings": current_user.get("settings", {})
    }

# Reminder endpoints
@app.get("/api/reminders")
async def get_reminders(current_user: dict = Depends(get_current_user)):
    reminders = list(db.reminders.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("datetime", 1))
    return reminders

@app.post("/api/reminders")
async def create_reminder(reminder: ReminderCreate, current_user: dict = Depends(get_current_user)):
    reminder_doc = {
        "reminder_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "title": reminder.title,
        "description": reminder.description,
        "datetime": reminder.datetime,
        "priority": reminder.priority,
        "recurrence": reminder.recurrence,
        "recurrence_days": reminder.recurrence_days,
        "created_at": datetime.utcnow().isoformat(),
        "completed": False
    }
    
    db.reminders.insert_one(reminder_doc)
    return {"message": "Reminder created successfully", "reminder": reminder_doc}

@app.put("/api/reminders/{reminder_id}")
async def update_reminder(
    reminder_id: str, 
    reminder: ReminderUpdate, 
    current_user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in reminder.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = db.reminders.update_one(
        {"reminder_id": reminder_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"message": "Reminder updated successfully"}

@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    result = db.reminders.delete_one(
        {"reminder_id": reminder_id, "user_id": current_user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"message": "Reminder deleted successfully"}

# Todo endpoints
@app.get("/api/todos")
async def get_todos(current_user: dict = Depends(get_current_user)):
    todos = list(db.todos.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1))
    return todos

@app.post("/api/todos")
async def create_todo(todo: TodoCreate, current_user: dict = Depends(get_current_user)):
    todo_doc = {
        "todo_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "title": todo.title,
        "description": todo.description,
        "completed": todo.completed,
        "created_at": datetime.utcnow().isoformat()
    }
    
    db.todos.insert_one(todo_doc)
    return {"message": "Todo created successfully", "todo": todo_doc}

@app.put("/api/todos/{todo_id}")
async def update_todo(todo_id: str, todo: TodoCreate, current_user: dict = Depends(get_current_user)):
    result = db.todos.update_one(
        {"todo_id": todo_id, "user_id": current_user["user_id"]},
        {"$set": {"title": todo.title, "description": todo.description, "completed": todo.completed}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    return {"message": "Todo updated successfully"}

@app.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: str, current_user: dict = Depends(get_current_user)):
    result = db.todos.delete_one(
        {"todo_id": todo_id, "user_id": current_user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    return {"message": "Todo deleted successfully"}

# Weather endpoint
@app.get("/api/weather")
async def get_weather(lat: float, lon: float, current_user: dict = Depends(get_current_user)):
    # Mock weather data for now - you can integrate with a real weather API
    weather_data = {
        "location": "Current Location",
        "temperature": 22,
        "condition": "Sunny",
        "humidity": 60,
        "wind_speed": 8
    }
    return weather_data

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)