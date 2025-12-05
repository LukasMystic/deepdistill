# ==================================
# Stage 1: Build Frontend (React)
# ==================================
FROM node:18-alpine as build-step

WORKDIR /app/frontend

# Copy frontend dependency files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies and build
RUN npm install
COPY frontend/ ./
RUN npm run build

# ==================================
# Stage 2: Backend (FastAPI + AI)
# ==================================
FROM python:3.10-slim

# Set up a new user named "user" with user ID 1000
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system dependencies
# FIX: Replaced 'libgl1-mesa-glx' (deprecated) with 'libgl1'
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./

# Install Python dependencies
# Note: We use --no-cache-dir to keep the image small
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy backend code
COPY backend/ ./backend

# Copy built frontend assets from Stage 1 to a static directory
COPY --from=build-step /app/frontend/build /app/frontend/build

# Change ownership of the app directory to the non-root user
RUN chown -R user:user /app

# Switch to the non-root user
USER user

# Expose the port Hugging Face Spaces expects
EXPOSE 7860

# Start command
# We point to the backend folder where main.py resides
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]