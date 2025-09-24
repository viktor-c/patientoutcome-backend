#!/bin/bash

# Production Deployment Script for Patient Outcome Backend

set -e  # Exit on any error

echo "🚀 Starting Patient Outcome Backend Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose first."
    exit 1
fi

# Determine which docker compose command to use
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f .env.template ]; then
        cp .env.template .env
        print_warning "Please edit .env file with your production configuration before proceeding."
        print_warning "Press Enter to continue once you've configured the .env file..."
        read
    else
        print_error ".env.template file not found. Cannot create .env file."
        exit 1
    fi
fi

# Build and start the application
print_status "Building Docker images..."
$DOCKER_COMPOSE -f docker-compose.prod.yml build

print_status "Starting services..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to start..."
sleep 10

# Check if backend is healthy
print_status "Checking backend health..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost/health-check >/dev/null 2>&1; then
        print_status "Backend is healthy! ✅"
        break
    else
        if [ $attempt -eq $max_attempts ]; then
            print_error "Backend health check failed after $max_attempts attempts"
            print_error "Check logs with: $DOCKER_COMPOSE -f docker-compose.prod.yml logs"
            exit 1
        fi
        print_status "Attempt $attempt/$max_attempts - Backend not ready yet, waiting..."
        sleep 5
        ((attempt++))
    fi
done

print_status "Deployment completed successfully! 🎉"
print_status ""
print_status "Your backend is now running at: http://localhost"
print_status "Health check endpoint: http://localhost/health-check"
print_status ""
print_status "Useful commands:"
print_status "  View logs: $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f"
print_status "  Stop services: $DOCKER_COMPOSE -f docker-compose.prod.yml down"
print_status "  Restart services: $DOCKER_COMPOSE -f docker-compose.prod.yml restart"
print_status "  View running containers: docker ps"
