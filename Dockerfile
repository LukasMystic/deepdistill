
FROM node:18-alpine as build-step

WORKDIR /app/frontend


COPY frontend/package.json frontend/package-lock.json ./


RUN npm install
COPY frontend/ ./
RUN npm run build


FROM python:3.10-slim

RUN useradd -m -u 1000 user

WORKDIR /app


ENV REFRESHED_AT=2023-12-10_v3

ENV FRONTEND_URL="https://bembeng123-deepdistill.hf.space"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY backend/ ./backend

COPY --from=build-step /app/frontend/build /app/frontend/build

RUN chown -R user:user /app

USER user

EXPOSE 7860


CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]