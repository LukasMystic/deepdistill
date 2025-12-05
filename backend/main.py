import os
import sys
import io
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import requests

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
from torchvision import transforms
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
    from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
except ImportError:
    print("⚠️  Warning: Missing dependencies. Run: pip install -r backend/requirements.txt")
    # Dummy classes
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
from models import get_student_model

# =============================================================================
# 2. CONFIGURATION & MOCK SWITCH
# =============================================================================
MONGO_URI = os.getenv("MONGO_URI", "").strip()
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_key_123") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# --- EMAIL CONFIGURATION (RESEND + SMTP FALLBACK) ---
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000") # Important for Hugging Face

# SMTP Config (Legacy/Render)
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME or "onboarding@resend.dev")
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

mail_conf = None
if MAIL_USERNAME and MAIL_PASSWORD and FastMail:
    mail_conf = ConnectionConfig(
        MAIL_USERNAME=MAIL_USERNAME,
        MAIL_PASSWORD=MAIL_PASSWORD,
        MAIL_FROM=MAIL_FROM,
        MAIL_PORT=MAIL_PORT,
        MAIL_SERVER=MAIL_SERVER,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )

# --- RESEND EMAIL HELPER (HTTP) ---
def send_email_via_resend(to_email: str, subject: str, html_body: str):
    """Sends email via Resend HTTP API to bypass SMTP blocking."""
    if not RESEND_API_KEY:
        print("❌ Resend API Key missing.")
        return

    try:
        # If you haven't verified a domain on Resend, you MUST use onboarding@resend.dev
        from_email = "DeepDistill <onboarding@resend.dev>" 
        
        response = requests.post(
            "https://api.resend.com/emails",
            json={
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_body
            },
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
        )
        response.raise_for_status()
        print(f"✅ Email sent via Resend to {to_email}")
    except Exception as e:
        print(f"❌ Resend Failed: {e}")

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
        # --- FIX: AGGRESSIVE CONNECTION SETTINGS ---
        db_client = pymongo.MongoClient(
            MONGO_URI, 
            serverSelectionTimeoutMS=5000, 
            tlsAllowInvalidCertificates=True, # Bypass SSL errors (Common on college wifi)
            uuidRepresentation='standard'
        )
        # Force a connection check immediately
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

baseline_model = None
distilled_model = None
device = torch.device('cpu')

CIFAR100_LABELS = [
    'apple', 'aquarium_fish', 'baby', 'bear', 'beaver', 'bed', 'bee', 'beetle', 
    'bicycle', 'bottle', 'bowl', 'boy', 'bridge', 'bus', 'butterfly', 'camel', 
    'can', 'castle', 'caterpillar', 'cattle', 'chair', 'chimpanzee', 'clock', 
    'cloud', 'cockroach', 'couch', 'crab', 'crocodile', 'cup', 'dinosaur', 
    'dolphin', 'elephant', 'flatfish', 'forest', 'fox', 'girl', 'hamster', 
    'house', 'kangaroo', 'keyboard', 'lamp', 'lawn_mower', 'leopard', 'lion', 
    'lizard', 'lobster', 'man', 'maple_tree', 'motorcycle', 'mountain', 'mouse', 
    'mushroom', 'oak_tree', 'orange', 'orchid', 'otter', 'palm_tree', 'pear', 
    'pickup_truck', 'pine_tree', 'plain', 'plate', 'poppy', 'porcupine', 
    'possum', 'rabbit', 'raccoon', 'ray', 'road', 'rocket', 'rose', 'sea', 
    'seal', 'shark', 'shrew', 'skunk', 'skyscraper', 'snail', 'snake', 'spider', 
    'squirrel', 'streetcar', 'sunflower', 'sweet_pepper', 'table', 'tank', 
    'telephone', 'television', 'tiger', 'tractor', 'train', 'trout', 'tulip', 
    'turtle', 'wardrobe', 'whale', 'willow_tree', 'wolf', 'woman', 'worm'
]

@app.on_event("startup")
async def load_models():
    global baseline_model, distilled_model
    try:
        print("Initializing models...")
        baseline_model = get_student_model(num_classes=100)
        distilled_model = get_student_model(num_classes=100)
        
        baseline_path = "./checkpoints/baseline_b0/best_model.pth"
        distilled_path = "./checkpoints/distilled_b0/best_model.pth"
        
        def load_safe(model, path):
            if not os.path.exists(path):
                alt_path = os.path.join("backend", path)
                if os.path.exists(alt_path):
                    path = alt_path
            
            if os.path.exists(path):
                try:
                    state = torch.load(path, map_location=device)
                    if isinstance(state, dict) and 'model_state_dict' in state:
                        state = state['model_state_dict']
                    model.load_state_dict(state)
                    model.eval()
                    return True
                except Exception as e:
                    print(f"Failed to load weights at {path}: {e}")
                    return False
            return False

        load_safe(baseline_model, baseline_path)
        load_safe(distilled_model, distilled_path)
            
        print("✅ Models loaded")
    except Exception as e:
        print(f"Error loading models: {e}")

# =============================================================================
# 6. AUTH ENDPOINTS
# =============================================================================

@app.post("/auth/register", response_model=Token)
async def register(background_tasks: BackgroundTasks, user_data: UserRegister):
    verification_token = str(uuid.uuid4())
    
    print(f"📝 Registering user: {user_data.email}") # DEBUG

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

    # SEND EMAIL (Resend Logic Added)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    verify_link = f"{frontend_url}/verify?token={verification_token}"
    
    html = f"""
    <p>Welcome to DeepDistill, {user_data.full_name}!</p>
    <p>Please verify your email within 24 hours.</p>
    <a href="{verify_link}" style="padding: 10px 20px; background-color: blue; color: white; text-decoration: none;">Verify Email</a>
    """
    
    if RESEND_API_KEY:
        # Preferred Method for Hugging Face Spaces
        background_tasks.add_task(send_email_via_resend, user_data.email, "Verify your DeepDistill Account", html)
    elif mail_conf and FastMail:
        # Fallback to SMTP
        try:
            message = MessageSchema(
                subject="Verify your DeepDistill Account",
                recipients=[user_data.email],
                body=html,
                subtype=MessageType.html
            )
            fm = FastMail(mail_conf)
            background_tasks.add_task(fm.send_message, message)
            print(f"📧 SMTP Email task added for {user_data.email}")
        except Exception as e:
            print(f"❌ SMTP Email Failed: {e}")
    else:
        # Mock for Dev
        print(f"=== MOCK VERIFY LINK: {verify_link} ===")

    access_token = create_access_token(data={"sub": user_data.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user_response}

@app.post("/auth/verify")
async def verify_email(token: str = Form(...)):
    print(f"🔍 Verifying token: {token}") # DEBUG
    if db is not None:
        user = db.users.find_one({"verification_token": token})
        if user:
            db.users.update_one({"_id": user["_id"]}, {"$set": {"is_verified": True, "verification_token": None}})
            print("✅ Email verified in DB") # DEBUG
            return {"message": "Email verified successfully!"}
    
    for email, u in MOCK_USERS.items():
        if u.get("verification_token") == token:
            MOCK_USERS[email]["is_verified"] = True
            MOCK_USERS[email]["verification_token"] = None
            print("✅ Email verified in MOCK") # DEBUG
            return {"message": "Email verified successfully (Mock)!"}
            
    print("❌ Invalid verification token") # DEBUG
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
    print(f"🔑 Forgot password request for: {email}")
    user_found = None
    
    # 1. Check if user exists
    if db is not None:
        user_found = db.users.find_one({"email": email})
    elif email in MOCK_USERS:
        user_found = MOCK_USERS[email]

    # 2. Generate token and send email ONLY if user exists
    if user_found:
        reset_token = str(uuid.uuid4())
        
        # SAVE THE TOKEN TO DB (Crucial Step!)
        if db is not None:
            db.users.update_one(
                {"_id": user_found["_id"]}, 
                {"$set": {"reset_token": reset_token, "reset_token_exp": datetime.utcnow() + timedelta(hours=1)}}
            )
        else:
            MOCK_USERS[email]["reset_token"] = reset_token
            MOCK_USERS[email]["reset_token_exp"] = datetime.utcnow() + timedelta(hours=1)

        # Prepare Email Content
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}" 
        
        html = f"""
        <p>You requested a password reset.</p>
        <p>Click the button below to reset your password (valid for 1 hour):</p>
        <a href="{reset_link}" style="padding: 10px 20px; background-color: red; color: white; text-decoration: none;">Reset Password</a>
        <p>If you didn't ask for this, ignore this email.</p>
        """

        # SEND EMAIL (Resend Priority)
        if RESEND_API_KEY:
            background_tasks.add_task(send_email_via_resend, email, "Reset Your DeepDistill Password", html)
            return {"message": "Reset email sent via Resend."}
            
        elif mail_conf and FastMail:
            try:
                message = MessageSchema(
                    subject="Reset Your DeepDistill Password",
                    recipients=[email],
                    body=html,
                    subtype=MessageType.html
                )
                fm = FastMail(mail_conf)
                background_tasks.add_task(fm.send_message, message)
                return {"message": "Reset email sent via SMTP."}
            except Exception as e:
                print(f"Email Error: {e}")
                raise HTTPException(500, "Error sending email")
        else:
             print(f"=== MOCK RESET LINK: {reset_link} ===")

    # Always return success to prevent email enumeration
    return {"message": "If that email exists, we sent a reset link."}

@app.post("/auth/reset-password")
async def reset_password(token: str = Form(...), new_password: str = Form(...)):
    print(f"🔐 Resetting password with token: {token}")
    
    user_found = None
    
    # 1. Find user by token
    if db is not None:
        user_found = db.users.find_one({"reset_token": token})
    else:
        for email, u in MOCK_USERS.items():
            if u.get("reset_token") == token:
                user_found = u
                break
    
    if not user_found:
        raise HTTPException(400, "Invalid or expired token")

    # 2. Check Expiry
    # Note: In a real app, check timestamps. For now assuming simple existence is enough or adding simple check
    expiry = user_found.get("reset_token_exp")
    if expiry and expiry < datetime.utcnow():
         raise HTTPException(400, "Token expired")

    # 3. Update Password
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
        
    return {"message": "Password updated successfully! You can now login."}


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
    if model is None: return []
    with torch.no_grad():
        logits = model(img_tensor)
        probs = torch.softmax(logits, dim=1)
        top_probs, top_indices = torch.topk(probs, k, dim=1)
        results = []
        for i in range(k):
            idx = int(top_indices[0][i].item())
            prob = float(top_probs[0][i].item()) * 100 
            name = CIFAR100_LABELS[idx] if idx < 100 else "Unknown"
            results.append({"class_id": idx, "class_name": name.replace("_", " ").title(), "probability": round(prob, 2)})
        return results

@app.post("/api/predict")
async def predict(file: UploadFile = File(...), current_user: Optional[dict] = Depends(get_current_user)):
    # 1. Read & Upload
    try:
        image_data = await file.read()
        image_url = None
        if CLOUDINARY_CLOUD_NAME:
            try:
                # Seek back not needed if we pass bytes directly
                upload_result = cloudinary.uploader.upload(image_data, folder="inference_history")
                image_url = upload_result.get("secure_url")
                print(f"✅ Image uploaded: {image_url}") # DEBUG
            except Exception as e:
                print(f"⚠️ Cloudinary upload failed: {e}")
    except Exception as e:
        raise HTTPException(500, f"File processing error: {e}")

    # Fallback/Mock
    if not baseline_model: 
        print("⚠️ Using Mock Model") # DEBUG
        import random
        mock_result = {
            "baseline": [{"class_name": "Apple (Mock)", "probability": 85.2}],
            "distilled": [{"class_name": "Apple (Mock)", "probability": 92.1}],
            "image_url": image_url
        }
        if current_user:
            entry = {
                "id": str(uuid.uuid4()),
                "user_id": ObjectId(current_user["id"]) if db is not None else current_user["id"], # Ensure correct type
                "image_url": image_url,
                "result": mock_result,
                "timestamp": datetime.now() if db is not None else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            if db is not None: db.history.insert_one(entry)
            else: MOCK_HISTORY.insert(0, entry)
        return mock_result

    try:
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        transform = transforms.Compose([
            # 1. Squash to 32x32 (Native CIFAR size)
            transforms.Resize((32, 32)),
            
            # 2. Upscale back to 224x224 (Simulates the blurry look)
            transforms.Resize((224, 224), interpolation=transforms.InterpolationMode.NEAREST),
            
            transforms.ToTensor(),
            
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        img_tensor = transform(image).unsqueeze(0).to(device)
        
        base_res = get_topk(baseline_model, img_tensor)
        dist_res = get_topk(distilled_model, img_tensor)
        
        result_data = {"baseline": base_res, "distilled": dist_res}
        
        if current_user:
            print(f"💾 Saving history for user: {current_user['id']}") # DEBUG
            
            # Ensure user_id is always stored consistently
            # If using Mock DB, keep as string. If Real DB, convert to ObjectId.
            # --- normalize to string user id for DB and mock ---
            user_id_val = current_user["id"]  # current_user["id"] is already string per get_current_user

            entry = {
                "user_id": user_id_val,  # <-- always a string
                "image_url": image_url,
                "result": result_data,
                "timestamp": datetime.utcnow()  # store real datetime in DB
            }
            if db is not None:
                res = db.history.insert_one(entry)
                print(f"✅ Saved to DB with ID: {res.inserted_id}")
            else:
                entry["id"] = str(uuid.uuid4())
                entry["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                MOCK_HISTORY.insert(0, entry)
                print("✅ Saved to Mock History")


        return {**result_data, "image_url": image_url}

    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(500, str(e))

@app.get("/api/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    print(f"🔍 Fetching history for user: {current_user['id']}") # DEBUG
    if db is not None:
        # QUERY using ObjectId to match how it was saved
       # current_user["id"] is a string like "6932d8e6c605409433255af0"
        cursor = db.history.find({"user_id": current_user["id"]}).sort("timestamp", -1).limit(20)

        history = []
        for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc.pop("_id")
            # Convert ObjectId to string in result if nested (rare but safe)
            if "user_id" in doc: doc["user_id"] = str(doc["user_id"])
                
            if isinstance(doc["timestamp"], datetime):
                doc["timestamp"] = doc["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
            history.append(doc)
        print(f"✅ Found {len(history)} records") # DEBUG
        return history
    
    user_history = [h for h in MOCK_HISTORY if h["user_id"] == current_user["id"]]
    print(f"✅ Found {len(user_history)} mock records") # DEBUG
    return user_history

@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": "DB" if db is not None else "MOCK"}

# =============================================================================
# 9. STATIC FILES & SPA SERVING (Docker Fix)
# =============================================================================

# Define the absolute path to the frontend build directory
# In Docker, this will be /app/frontend/build
frontend_build_dir = os.path.join(os.getcwd(), "frontend/build")

if os.path.exists(frontend_build_dir):
    # 1. Mount the 'static' folder (CSS/JS/Images)
    # React builds usually put assets in a 'static' subfolder
    static_dir = os.path.join(frontend_build_dir, "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # 2. Catch-all route for React SPA (Single Page Application)
    # This ensures that routes like /login or /dashboard return index.html
    # allowing React Router to handle the view.
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow API calls to pass through
        if full_path.startswith("api") or full_path.startswith("auth"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        # Check if a specific file exists (like favicon.ico, logo.png)
        file_path = os.path.join(frontend_build_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise, return index.html
        return FileResponse(os.path.join(frontend_build_dir, "index.html"))

else:
    print("⚠️ Frontend build directory not found. API is running, but UI is missing.")