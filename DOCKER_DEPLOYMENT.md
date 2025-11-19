# Docker Deployment Guide

This guide explains how to deploy the Patient Outcome Backend as a production Docker container.

## 🚀 Quick Start

### Prerequisites
- Docker (version 20.0 or higher)
- Docker Compose (version 2.0 or higher)

### Option 1: Automated Deployment (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd /path/to/patientoutcome-backend
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

   The script will:
   - Check prerequisites
   - Create `.env` file from template if needed
   - Build the Docker images
   - Start the services
   - Perform health checks
   - Provide useful information

### Option 2: Manual Deployment

1. **Create environment file**:
   ```bash
   cp .env.template .env
   # Edit .env with your production values
   ```

2. **Build and start services**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Check logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## 🏗️ Architecture

The deployment includes:

- **Backend Container**: Node.js application running on port 80
- **MongoDB Container**: Database with persistent storage
- **Health Checks**: Automatic monitoring of service health
- **Resource Limits**: Production-ready resource constraints

## 🔧 Configuration

### Environment Variables

Edit the `.env` file with your production configuration:

```bash
# Application
NODE_ENV=production
HOST=0.0.0.0
PORT=8080
CORS_ORIGIN=https://your-frontend-domain.com

# Database
MONGODB_URI=mongodb://username:password@mongodb:27017/database?authSource=admin
MONGODB_USERNAME=your-username
MONGODB_PASSWORD=your-secure-password
MONGODB_DATABASE=clinical-patientoutcome

# Security
SESSION_SECRET=your-very-secure-session-secret

# Rate Limiting
COMMON_RATE_LIMIT_MAX_REQUESTS=100
COMMON_RATE_LIMIT_WINDOW_MS=900000
```

### Important Security Notes

🔐 **Before deploying to production:**

1. **Change default passwords**: Update MongoDB credentials
2. **Generate secure session secret**: Use a cryptographically secure random string
3. **Configure CORS**: Set appropriate frontend domain
4. **Use HTTPS**: Configure SSL/TLS in production
5. **Secure environment variables**: Use Docker secrets or external secret management

## 📊 Monitoring & Management

### Health Checks

The backend includes built-in health checks:
- **Endpoint**: `http://localhost/health`
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds

### Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ This will delete data!)
docker-compose -f docker-compose.prod.yml down -v

# View running containers
docker ps

# Execute command in backend container
docker-compose -f docker-compose.prod.yml exec backend bash

# View resource usage
docker stats
```

### Backup Database

```bash
# Backup MongoDB
docker-compose -f docker-compose.prod.yml exec mongodb mongodump --authenticationDatabase admin -u patientmanager -p 1234Test --db clinical-patientoutcome --out /backup

# Copy backup from container
docker cp $(docker-compose -f docker-compose.prod.yml ps -q mongodb):/backup ./backup
```

## 🔄 Updates & Maintenance

### Updating the Application

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart**:
   ```bash
   docker-compose -f docker-compose.prod.yml build --no-cache
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Zero-Downtime Deployment

For production environments, consider using:
- Blue-green deployment
- Rolling updates with multiple replicas
- Load balancer health checks

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Check what's using port 80
   sudo lsof -i :80
   # Change port in docker-compose.prod.yml if needed
   ```

2. **Database connection issues**:
   ```bash
   # Check MongoDB logs
   docker-compose -f docker-compose.prod.yml logs mongodb
   
   # Test database connectivity
   docker-compose -f docker-compose.prod.yml exec backend ping mongodb
   ```

3. **Application not starting**:
   ```bash
   # Check backend logs
   docker-compose -f docker-compose.prod.yml logs backend
   
   # Check environment variables
   docker-compose -f docker-compose.prod.yml exec backend env
   ```

### Performance Tuning

1. **Adjust resource limits** in `docker-compose.prod.yml`
2. **Configure MongoDB** with appropriate settings for your workload
3. **Monitor application metrics** and adjust accordingly

## 📁 File Structure

```
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Development/testing setup
├── docker-compose.prod.yml    # Production deployment
├── .dockerignore             # Docker build exclusions
├── .env.template             # Environment template
├── deploy.sh                 # Automated deployment script
└── DOCKER_DEPLOYMENT.md      # This guide
```

## 🆘 Support

If you encounter issues:

1. Check the logs first
2. Verify environment configuration
3. Ensure all prerequisites are met
4. Review this documentation

For additional help, consult the main project README or contact the development team.
