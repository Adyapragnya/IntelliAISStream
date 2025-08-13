# Dockerfile
FROM python:3.10-slim

# Install system packages
RUN apt-get update && apt-get install -y \
    g++ \
    libgdal-dev \
    libexpat1 \
    libexpat1-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for GDAL
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Create app directory
WORKDIR /app

# Copy files
COPY . .

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Expose port
EXPOSE 8000

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
