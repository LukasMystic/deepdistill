import os
import sys
import io
import uuid
import logging
import asyncio
import requests # Added for Brevo API
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

# --- 1. ENV VARS SETUP ---
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, status, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

import torch
import torch.nn as nn
from torchvision import transforms, models as torchvision_models
from PIL import Image

# --- External Services (Safe Import) ---
try:
    import pymongo
    from bson import ObjectId
    import cloudinary
    import cloudinary.uploader
    from passlib.context import CryptContext
    from jose import JWTError, jwt
    from email_validator import validate_email, EmailNotValidError
    # We no longer strictly need fastapi_mail if using API, but keeping for compatibility
    from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
except ImportError:
    print("⚠️  Warning: Missing dependencies. Run: pip install -r backend/requirements.txt")
    # Dummy classes for safe execution if deps missing
    class CryptContext: 
        def __init__(self, **kwargs): pass
        def hash(self, p): return p + "_hashed"
        def verify(self, p, h): return h == p + "_hashed"
    class ObjectId: 
        def __init__(self, oid): self.oid = str(oid)
    JWTError = Exception
    FastMail = None 

# --- LOCAL IMPORTS ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import config  # Your new config file
    # We import get_student_model for the baseline checkpoints (timm style)
    from models import get_student_model 
except ImportError:
    print("⚠️  Warning: Could not import local modules (config/models). Ensure they exist.")
    class ConfigMock:
        NUM_CLASSES = 200
        IMAGE_SIZE = 64
        DEVICE = "cpu"
    config = ConfigMock()
    # Fallback if models.py is missing entirely
    def get_student_model(num_classes=200):
        print(f"⚠️ models.py missing, returning torchvision fallback with {num_classes} classes")
        model = torchvision_models.efficientnet_b0(pretrained=False)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
        return model

# =============================================================================
# 2. CONFIGURATION & MOCK SWITCH
# =============================================================================
MONGO_URI = os.getenv("MONGO_URI", "").strip()
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_key_123") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# --- EMAIL CONFIGURATION (BREVO API MODE) ---
# For Hugging Face Spaces, we MUST use the HTTP API, not SMTP ports.
MAIL_API_KEY = os.getenv("MAIL_PASSWORD") # Reuse the Brevo Key (xkeysib-...)
MAIL_SENDER_EMAIL = os.getenv("MAIL_FROM", "noreply@deepdistill.app")
MAIL_SENDER_NAME = "DeepDistill Admin"

# --- MOCK DATABASE (In-Memory) ---
MOCK_USERS: Dict[str, dict] = {} 
MOCK_HISTORY: List[dict] = []

# Auth Setup
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Cloudinary Setup
if CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )

# MongoDB Setup
db_client = None
db = None

if MONGO_URI:
    print(f"🔄 Connecting to MongoDB...")
    try:
        db_client = pymongo.MongoClient(
            MONGO_URI, 
            serverSelectionTimeoutMS=5000, 
            tlsAllowInvalidCertificates=True,
            uuidRepresentation='standard'
        )
        db_client.admin.command('ping')
        db = db_client["deep_distill_db"]
        print("✅ Connected to MongoDB Atlas")
    except Exception as e:
        print(f"⚠️  DB Connection Error: {e}")
        print("🚀  Falling back to MOCK MODE. App is running normally!")
        db = None 
        db_client = None
else:
    print("⚠️  No MONGO_URI found. Running in MOCK MODE.")

# =============================================================================
# 3. DATA MODELS
# =============================================================================
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    is_verified: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# =============================================================================
# 4. HELPER FUNCTIONS
# =============================================================================
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def cleanup_unverified_user(user):
    # This function checks a single user upon login
    if user.get("is_verified", False):
        return False 
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at)
        except:
            created_at = datetime.utcnow()

    if not created_at: return False

    if datetime.utcnow() - created_at > timedelta(hours=24):
        if db is not None:
            db.users.delete_one({"_id": user["_id"]})
        else:
            if user["email"] in MOCK_USERS:
                del MOCK_USERS[user["email"]]
        return True 
    
    return False

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = None
    if db is not None:
        user = db.users.find_one({"email": email})
        if user:
            user["id"] = str(user["_id"])
    elif email in MOCK_USERS:
        user = MOCK_USERS[email]
        
    if not user:
        raise credentials_exception

    if cleanup_unverified_user(user):
        raise HTTPException(
            status_code=401, 
            detail="Account deleted: Email not verified within 24 hours."
        )

    return user

async def send_email_via_api(subject: str, recipients: List[str], html_content: str):
    """
    Sends email using Brevo's HTTP API.
    This works on Hugging Face Spaces where SMTP ports (25, 465, 587) are blocked.
    """
    if not MAIL_API_KEY:
        print("⚠️ MAIL_PASSWORD (API Key) missing. Skipping email.")
        return

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": MAIL_API_KEY,
        "content-type": "application/json"
    }
    
    # Brevo API Payload
    payload = {
        "sender": {"name": MAIL_SENDER_NAME, "email": MAIL_SENDER_EMAIL},
        "to": [{"email": email} for email in recipients],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201, 202]:
            print(f"✅ Email sent via API to {recipients}")
        else:
            print(f"❌ Brevo API Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Email API Connection Error: {e}")

# =============================================================================
# 5. APP SETUP & AI MODELS
# =============================================================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global dictionary to store all loaded models
models_dict = {}
device = torch.device(config.DEVICE if torch.cuda.is_available() else 'cpu')

# TinyImageNet has 200 classes.
# This list is a standard mapping of TinyImageNet labels.
# ✅ CORRECT LIST: Sorted by WNID (Folder Name)
TINY_IMAGENET_LABELS = [
    "goldfish", "European fire salamander", "bullfrog", "tailed frog", "American alligator", "boa constrictor", "trilobite", "scorpion", "black widow", "tarantula", "centipede", "goose", "koala", "jellyfish", "brain coral", "snail", "slug", "sea slug", "American lobster", "spiny lobster", "black stork", "king penguin", "albatross", "dugong", "Chihuahua", "Yorkshire terrier", "golden retriever", "Labrador retriever", "German shepherd", "standard poodle", "tabby", "Persian cat", "Egyptian cat", "cougar", "lion", "brown bear", "ladybug", "fly", "bee", "grasshopper", "walking stick", "cockroach", "mantis", "dragonfly", "monarch", "sulphur butterfly", "sea cucumber", "guinea pig", "hog", "ox", "bison", "bighorn", "gazelle", "Arabian camel", "orangutan", "chimpanzee", "baboon", "African elephant", "lesser panda", "abacus", "academic gown", "altar", "apron", "backpack", "bannister", "barbershop", "barn", "barrel", "basketball", "bathtub", "beach wagon", "beacon", "beaker", "beer bottle", "bikini", "binoculars", "birdhouse", "bow tie", "brass", "broom", "bucket", "bullet train", "butcher shop", "candle", "cannon", "cardigan", "cash machine", "CD player", "chain", "chest", "Christmas stocking", "cliff dwelling", "computer keyboard", "confectionery", "convertible", "crane", "dam", "desk", "dining table", "drumstick", "dumbbell", "flagpole", "fountain", "freight car", "frying pan", "fur coat", "gasmask", "go-kart", "gondola", "hourglass", "iPod", "jinrikisha", "kimono", "lampshade", "lawn mower", "lifeboat", "limousine", "magnetic compass", "maypole", "military uniform", "miniskirt", "moving van", "nail", "neck brace", "obelisk", "oboe", "organ", "parking meter", "pay-phone", "picket fence", "pill bottle", "plunger", "pole", "police van", "poncho", "pop bottle", "potter's wheel", "projectile", "punching bag", "reel", "refrigerator", "remote control", "rocking chair", "rugby ball", "sandal", "school bus", "scoreboard", "sewing machine", "snorkel", "sock", "sombrero", "space heater", "spider web", "sports car", "steel arch bridge", "stopwatch", "sunglasses", "suspension bridge", "swimming trunks", "syringe", "teapot", "teddy", "thatch", "torch", "tractor", "triumphal arch", "trolleybus", "turnstile", "umbrella", "vestment", "viaduct", "volleyball", "water jug", "water tower", "wok", "wooden spoon", "comic book", "plate", "guacamole", "ice cream", "ice lolly", "pretzel", "mashed potato", "cauliflower", "bell pepper", "mushroom", "orange", "lemon", "banana", "pomegranate", "meat loaf", "pizza", "potpie", "espresso", "alp", "cliff", "coral reef", "lakeside", "seashore", "acorn"
]


def inspect_and_load_architecture(model_key: str, checkpoint_path: str, arch_name: str, num_classes: int):
    """
    Intelligently loads model architecture based on the checkpoint file content.
    Includes DEBUG checks for label size mismatches.
    """
    try:
        # Load state dict first to inspect keys
        state = torch.load(checkpoint_path, map_location=device)
        if isinstance(state, dict) and 'model_state_dict' in state:
            state = state['model_state_dict']
        
        # Determine Architecture Type
        has_features = any(k.startswith('features.') for k in state.keys())
        has_conv_stem = any(k.startswith('conv_stem') for k in state.keys())
        
        model = None
        
        if "efficientnet_b0" in arch_name:
            if has_features:
                print(f"[{model_key}] Detected Torchvision format")
                model = torchvision_models.efficientnet_b0(weights=None)
                model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
            elif has_conv_stem:
                print(f"[{model_key}] Detected Custom/Timm format")
                model = get_student_model(num_classes=num_classes)
            else:
                print(f"[{model_key}] Unknown format, defaulting to Torchvision")
                model = torchvision_models.efficientnet_b0(weights=None)
                model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
                
        elif "efficientnet_b2" in arch_name:
            model = torchvision_models.efficientnet_b2(weights=None)
            model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
            
        elif "resnet18" in arch_name:
            model = torchvision_models.resnet18(weights=None)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
            
        else:
            print(f"⚠️ Unknown architecture {arch_name}, skipping")
            return None

        # Load weights
        model.to(device)
        model.load_state_dict(state, strict=True)
        model.eval()

        # --- DEBUG: CHECK LABEL MISMATCH ---
        final_layer = None
        # Try to find the final classification layer
        if hasattr(model, 'classifier') and isinstance(model.classifier, nn.Sequential):
            # EfficientNet usually has classifier as Sequential(Dropout, Linear)
            if len(model.classifier) > 1 and isinstance(model.classifier[-1], nn.Linear):
                final_layer = model.classifier[-1]
        elif hasattr(model, 'classifier') and isinstance(model.classifier, nn.Linear):
            final_layer = model.classifier
        elif hasattr(model, 'fc') and isinstance(model.fc, nn.Linear):
            # ResNet usually uses 'fc'
            final_layer = model.fc
        
        if final_layer and hasattr(final_layer, 'out_features'):
            out_features = final_layer.out_features
            num_labels_defined = len(TINY_IMAGENET_LABELS)
            if out_features != num_labels_defined:
                print(f"⚠️  [DEBUG] Label Mismatch for {model_key}!")
                print(f"    - Model Output Classes: {out_features}")
                print(f"    - Label List Length:    {num_labels_defined}")
                print(f"    - This WILL cause index errors if the model predicts a class >= {num_labels_defined}")
            else:
                print(f"✅ [DEBUG] {model_key} verified: {out_features} output classes match label list.")
        else:
            print(f"⚠️  [DEBUG] Could not automatically verify output layer size for {model_key}.")
        # -----------------------------------

        return model

    except Exception as e:
        print(f"❌ Failed to load {model_key} from {checkpoint_path}: {e}")
        return None

# =============================================================================
# MODEL CONFIGURATION & LOADING
# =============================================================================

# Map friendly names to (path_suffix, architecture_type)
MODEL_CHECKPOINTS = {
    "baseline_b0_tiny": ("checkpoints/baseline_b0_tinyimagenet/best_model.pth", "efficientnet_b0"),
    "distilled_b0": ("checkpoints/distilled_b0/best_model.pth", "efficientnet_b0"),
    "b0_aktp_tiny": ("checkpoints_aktp/b0_aktp_tiny_best.pth", "efficientnet_b0"),
    "teacher_b2_tiny": ("checkpoints_aktp/teacher_b2_tiny.pth", "efficientnet_b2"),
    "teacher_r18_tiny": ("checkpoints_aktp/teacher_r18_tiny.pth", "resnet18"),
}

# Define transforms
TINY_IMAGENET_TRANSFORM = transforms.Compose([
    transforms.Resize(config.IMAGE_SIZE),
    transforms.CenterCrop(config.IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

MODEL_PREPROCESSING = {
    "baseline_b0_tiny": TINY_IMAGENET_TRANSFORM,
    "distilled_b0": TINY_IMAGENET_TRANSFORM,
    "b0_aktp_tiny": TINY_IMAGENET_TRANSFORM,
    "teacher_b2_tiny": TINY_IMAGENET_TRANSFORM,
    "teacher_r18_tiny": TINY_IMAGENET_TRANSFORM,
}

# --- BACKGROUND TASKS ---
async def periodic_cleanup_task():
    """Background task to cleanup unverified users older than 24h"""
    while True:
        try:
            print("🧹 Running periodic cleanup of unverified users...")
            cutoff = datetime.utcnow() - timedelta(hours=24)
            
            if db is not None:
                # Delete unverified users created before cutoff
                result = db.users.delete_many({
                    "is_verified": False,
                    "created_at": {"$lt": cutoff}
                })
                if result.deleted_count > 0:
                    print(f"🗑️  Deleted {result.deleted_count} unverified users.")
            else:
                # Mock DB Cleanup
                to_delete = []
                for email, user in MOCK_USERS.items():
                    # Handle potential string dates in mock
                    created_at = user.get("created_at")
                    if isinstance(created_at, str):
                        try: created_at = datetime.fromisoformat(created_at)
                        except: continue
                    
                    if created_at and not user.get("is_verified", False) and created_at < cutoff:
                        to_delete.append(email)
                
                for email in to_delete:
                    del MOCK_USERS[email]
                if to_delete:
                    print(f"🗑️  Deleted {len(to_delete)} unverified users (Mock).")
                    
        except Exception as e:
            print(f"⚠️ Cleanup task error: {e}")
            
        # Run every hour (3600 seconds)
        await asyncio.sleep(3600)

async def load_models_logic():
    global models_dict
    print(f"🚀 Initializing models on {device}...")
    print(f"ℹ️  Expect {len(TINY_IMAGENET_LABELS)} classes based on label list.")
    
    base_dirs = [
        os.getcwd(),
        os.path.join(os.getcwd(), "deepdistill", "backend"),
        os.path.join(os.getcwd(), "backend"),
        os.path.join(os.getcwd(), "deepdistill")
    ]

    for model_key, (rel_path, arch) in MODEL_CHECKPOINTS.items():
        loaded_model = None
        
        # Find valid path
        for base in base_dirs:
            clean_rel_path = rel_path.replace("\\", os.sep).replace("/", os.sep)
            full_path = os.path.join(base, clean_rel_path)
            
            if os.path.exists(full_path):
                # Use the smart loader that checks file content
                loaded_model = inspect_and_load_architecture(model_key, full_path, arch, config.NUM_CLASSES)
                if loaded_model:
                    models_dict[model_key] = loaded_model
                    print(f"✅ Loaded {model_key}")
                    break
        
        if not loaded_model:
            print(f"⚠️ Could not load {model_key} (File not found or mismatch)")

@app.on_event("startup")
async def startup_event():
    # 1. Load Models
    await load_models_logic()
    
    # 2. Start Cleanup Task
    asyncio.create_task(periodic_cleanup_task())

# =============================================================================
# 6. AUTH ENDPOINTS (Unchanged)
# =============================================================================

@app.post("/auth/register", response_model=Token)
async def register(background_tasks: BackgroundTasks, user_data: UserRegister):
    verification_token = str(uuid.uuid4())
    
    # Check User Existence
    if db is not None:
        if db.users.find_one({"email": user_data.email}):
            raise HTTPException(400, "Email already registered")
    elif user_data.email in MOCK_USERS:
        raise HTTPException(400, "Email already registered")

    # Create User Data
    new_user = {
        "full_name": user_data.full_name,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "avatar_url": None,
        "created_at": datetime.utcnow(),
        "is_verified": False,
        "verification_token": verification_token
    }

    # Insert into DB or Mock
    if db is not None:
        res = db.users.insert_one(new_user)
        user_response = UserResponse(id=str(res.inserted_id), **new_user)
    else:
        new_user["id"] = str(uuid.uuid4())
        MOCK_USERS[user_data.email] = new_user
        user_response = UserResponse(**new_user)

    # SEND EMAIL (API WRAPPER)
    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        verify_link = f"{frontend_url}/verify?token={verification_token}"
        
        html = f"""
        <p>Welcome to DeepDistill, {user_data.full_name}!</p>
        <p>Please verify your email within 24 hours.</p>
        <a href="{verify_link}" style="padding: 10px 20px; background-color: blue; color: white; text-decoration: none;">Verify Email</a>
        """
        
        background_tasks.add_task(
            send_email_via_api, 
            subject="Verify your DeepDistill Account",
            recipients=[user_data.email],
            html_content=html
        )
    except Exception as e:
        print(f"❌ Email Prep Failed: {e}")
    
    access_token = create_access_token(data={"sub": user_data.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user_response}

@app.post("/auth/verify")
async def verify_email(token: str = Form(...)):
    if db is not None:
        user = db.users.find_one({"verification_token": token})
        if user:
            db.users.update_one({"_id": user["_id"]}, {"$set": {"is_verified": True, "verification_token": None}})
            return {"message": "Email verified successfully!"}
    
    for email, u in MOCK_USERS.items():
        if u.get("verification_token") == token:
            MOCK_USERS[email]["is_verified"] = True
            MOCK_USERS[email]["verification_token"] = None
            return {"message": "Email verified successfully (Mock)!"}
            
    raise HTTPException(400, "Invalid verification token")

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = None
    if db is not None:
        user_doc = db.users.find_one({"email": form_data.username})
        if user_doc:
            user_doc["id"] = str(user_doc["_id"])
            user = user_doc
    elif form_data.username in MOCK_USERS:
        user = MOCK_USERS[form_data.username]

    if not user:
        raise HTTPException(401, "Incorrect email or password")

    if cleanup_unverified_user(user):
        raise HTTPException(401, "Account deleted: Email not verified within 24 hours.")

    if not verify_password(form_data.password, user["password"]):
        raise HTTPException(401, "Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/auth/forgot-password")
async def forgot_password(background_tasks: BackgroundTasks, email: str = Form(...)):
    user_found = None
    if db is not None:
        user_found = db.users.find_one({"email": email})
    elif email in MOCK_USERS:
        user_found = MOCK_USERS[email]

    if user_found:
        reset_token = str(uuid.uuid4())
        if db is not None:
            db.users.update_one(
                {"_id": user_found["_id"]}, 
                {"$set": {"reset_token": reset_token, "reset_token_exp": datetime.utcnow() + timedelta(hours=1)}}
            )
        else:
            MOCK_USERS[email]["reset_token"] = reset_token
            MOCK_USERS[email]["reset_token_exp"] = datetime.utcnow() + timedelta(hours=1)

        try:
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            reset_link = f"{frontend_url}/reset-password?token={reset_token}" 
            html = f"<p>Click here to reset your password: <a href='{reset_link}'>Reset Password</a></p>"
            
            background_tasks.add_task(
                send_email_via_api,
                subject="Reset Password",
                recipients=[email],
                html_content=html
            )
        except Exception as e:
            print(f"❌ Forgot Password Email Failed: {e}")

    return {"message": "If that email exists, we sent a reset link."}

@app.post("/auth/reset-password")
async def reset_password(token: str = Form(...), new_password: str = Form(...)):
    user_found = None
    if db is not None:
        user_found = db.users.find_one({"reset_token": token})
    else:
        for email, u in MOCK_USERS.items():
            if u.get("reset_token") == token:
                user_found = u
                break
    
    if not user_found:
        raise HTTPException(400, "Invalid or expired token")

    expiry = user_found.get("reset_token_exp")
    if expiry and expiry < datetime.utcnow():
         raise HTTPException(400, "Token expired")

    new_hash = get_password_hash(new_password)
    
    if db is not None:
        db.users.update_one(
            {"_id": user_found["_id"]}, 
            {"$set": {"password": new_hash, "reset_token": None, "reset_token_exp": None}}
        )
    else:
        MOCK_USERS[user_found["email"]]["password"] = new_hash
        MOCK_USERS[user_found["email"]]["reset_token"] = None
        MOCK_USERS[user_found["email"]]["reset_token_exp"] = None
        
    return {"message": "Password updated successfully!"}


# =============================================================================
# 7. USER PROFILE
# =============================================================================

@app.get("/user/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.put("/user/avatar")
async def update_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    image_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={current_user['email']}"
    if CLOUDINARY_CLOUD_NAME:
        try:
            content = await file.read()
            upload_result = cloudinary.uploader.upload(content, folder="user_avatars")
            image_url = upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary error: {e}")
            
    if db is not None:
        db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": {"avatar_url": image_url}})
    else:
        MOCK_USERS[current_user["email"]]["avatar_url"] = image_url
        
    return {"avatar_url": image_url}

# =============================================================================
# 8. INFERENCE & HISTORY
# =============================================================================

def get_topk(model, img_tensor, k=5):
    """Run inference on a single model and return top K results"""
    if model is None: return []
    try:
        with torch.no_grad():
            logits = model(img_tensor)
            probs = torch.softmax(logits, dim=1)
            top_probs, top_indices = torch.topk(probs, k, dim=1)
            results = []
            for i in range(k):
                idx = int(top_indices[0][i].item())
                prob = float(top_probs[0][i].item()) * 100 
                
                # --- DEBUG CHECK: Index Validity ---
                if idx < len(TINY_IMAGENET_LABELS):
                    name = TINY_IMAGENET_LABELS[idx]
                else:
                    # Print debug info to console for the developer
                    print(f"⚠️  [DEBUG] Inference Error: Predicted Class Index {idx} is out of bounds!")
                    print(f"    - Max available label index: {len(TINY_IMAGENET_LABELS) - 1}")
                    name = f"Unknown Class {idx} (OutOfBounds)"
                
                results.append({"class_id": idx, "class_name": name, "probability": round(prob, 2)})
            return results
    except Exception as e:
        print(f"Error during inference: {e}")
        return []

@app.post("/api/predict")
async def predict(file: UploadFile = File(...), current_user: Optional[dict] = Depends(get_current_user)):
    # 1. Read & Upload
    try:
        image_data = await file.read()
        image_url = None
        if CLOUDINARY_CLOUD_NAME:
            try:
                upload_result = cloudinary.uploader.upload(image_data, folder="inference_history")
                image_url = upload_result.get("secure_url")
            except Exception as e:
                print(f"⚠️ Cloudinary upload failed: {e}")
    except Exception as e:
        raise HTTPException(500, f"File processing error: {e}")

    # Fallback/Mock if no models loaded
    if not models_dict: 
        print("⚠️ No models loaded. Using Mock Data with FULL schema.")
        # We Mock ALL expected keys so the frontend doesn't break
        mock_result = {
            "baseline_b0_tiny": [{"class_name": "Goldfish (Mock)", "probability": 84.1}],
            "distilled_b0": [{"class_name": "Goldfish (Mock)", "probability": 92.1}],
            "b0_aktp_tiny": [{"class_name": "Goldfish (Mock)", "probability": 91.5}],
            "teacher_b2_tiny": [{"class_name": "Goldfish (Mock)", "probability": 95.0}],
            "teacher_r18_tiny": [{"class_name": "Goldfish (Mock)", "probability": 94.8}],
            "image_url": image_url
        }
        # Save mock history
        if current_user:
            entry = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "image_url": image_url,
                "result": mock_result,
                "timestamp": datetime.now() if db is not None else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            if db is not None: db.history.insert_one(entry)
            else: MOCK_HISTORY.insert(0, entry)
        return mock_result

    try:
        # 2. Preprocess & Predict per Model
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        result_data = {}
        
        # Iterate over loaded models and apply their specific preprocessing
        for model_name, model_instance in models_dict.items():
            # Get the correct transform for this model
            transform = MODEL_PREPROCESSING.get(model_name, TINY_IMAGENET_TRANSFORM)
            
            # Apply transform
            img_tensor = transform(image).unsqueeze(0).to(device)
            
            # Run inference
            result_data[model_name] = get_topk(model_instance, img_tensor)
        
        # 3. Save History
        if current_user:
            user_id_val = current_user["id"]
            entry = {
                "user_id": user_id_val,
                "image_url": image_url,
                "result": result_data, # Saves all keys automatically
                "timestamp": datetime.utcnow()
            }
            if db is not None:
                db.history.insert_one(entry)
            else:
                entry["id"] = str(uuid.uuid4())
                entry["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                MOCK_HISTORY.insert(0, entry)

        return {**result_data, "image_url": image_url}

    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(500, str(e))

@app.get("/api/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    if db is not None:
        cursor = db.history.find({"user_id": current_user["id"]}).sort("timestamp", -1).limit(20)
        history = []
        for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc.pop("_id")
            if "user_id" in doc: doc["user_id"] = str(doc["user_id"])
            if isinstance(doc["timestamp"], datetime):
                doc["timestamp"] = doc["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
            history.append(doc)
        return history
    
    user_history = [h for h in MOCK_HISTORY if h["user_id"] == current_user["id"]]
    return user_history

@app.get("/api/health")
async def health():
    return {
        "status": "ok", 
        "mode": "DB" if db is not None else "MOCK",
        "loaded_models": list(models_dict.keys())
    }

# =============================================================================
# 9. STATIC FILES & SPA SERVING
# =============================================================================
frontend_build_dir = os.path.join(os.getcwd(), "frontend/build")
if os.path.exists(frontend_build_dir):
    static_dir = os.path.join(frontend_build_dir, "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api") or full_path.startswith("auth"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_build_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_build_dir, "index.html"))