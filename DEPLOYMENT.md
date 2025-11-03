# Equipment Marketplace - Deployment Guide

This guide covers the complete deployment process for the Equipment Marketplace application in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Security Configuration](#security-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Backup and Recovery](#backup-and-recovery)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or newer (recommended)
- **CPU**: Minimum 2 cores, 4 cores recommended
- **RAM**: Minimum 4GB, 8GB recommended
- **Storage**: Minimum 50GB SSD
- **Network**: Static IP address and domain name

### Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y git curl wget htop nginx certbot python3-certbot-nginx
```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/equipment-marketplace.git
cd equipment-marketplace
```

### 2. Environment Configuration

```bash
# Copy production environment template
cp .env.production .env

# Edit environment variables
nano .env
```

**Critical Environment Variables:**

```bash
# Application
NODE_ENV=production
DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

# Database (Use strong passwords)
DATABASE_URL=postgresql://username:secure_password@postgres:5432/equipment_marketplace
POSTGRES_PASSWORD=your_very_secure_database_password

# JWT (Generate strong secret)
JWT_SECRET=$(openssl rand -base64 32)

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-s3-bucket-name

# Email Configuration
EMAIL_FROM=noreply@your-domain.com
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 3. DNS Configuration

Configure your DNS records:

```
A     your-domain.com        -> YOUR_SERVER_IP
A     api.your-domain.com    -> YOUR_SERVER_IP
CNAME www.your-domain.com    -> your-domain.com
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL Certificate Setup

```bash
# Install SSL certificate using Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# Create SSL directory for Docker
sudo mkdir -p /etc/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /etc/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /etc/nginx/ssl/
```

### 3. Security Audit

```bash
# Run security audit
chmod +x scripts/security-audit.sh
./scripts/security-audit.sh
```

## Database Setup

### 1. Database Initialization

The database will be automatically initialized when you start the application. However, you can manually set it up:

```bash
# Start only the database service
docker-compose -f docker-compose.production.yml up -d postgres

# Wait for database to be ready
sleep 30

# Run migrations
docker-compose -f docker-compose.production.yml exec backend npx prisma migrate deploy

# Seed initial data
docker-compose -f docker-compose.production.yml exec backend npx prisma db seed
```

### 2. Database Backup Setup

```bash
# Create backup directory
mkdir -p /var/backups/equipment-marketplace

# Add to crontab for daily backups
echo "0 2 * * * /path/to/equipment-marketplace/scripts/backup-database.sh" | sudo crontab -
```

## Application Deployment

### 1. Build and Deploy

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh deploy
```

### 2. Manual Deployment Steps

If you prefer manual deployment:

```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Health Checks

```bash
# Check application health
curl -f http://localhost/health
curl -f http://localhost/api/health

# Or use the deployment script
./scripts/deploy.sh health-check
```

## Monitoring Setup

### 1. Start Monitoring Services

```bash
# Start Prometheus and Grafana
docker-compose -f docker-compose.production.yml up -d prometheus grafana

# Access Grafana
# URL: http://your-domain.com:3001
# Username: admin
# Password: (from GRAFANA_PASSWORD in .env)
```

### 2. Configure Alerts

1. Access Grafana dashboard
2. Import monitoring dashboards from `monitoring/grafana/dashboards/`
3. Configure notification channels (email, Slack, etc.)
4. Set up alert rules based on your requirements

### 3. Log Management

```bash
# View application logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f nginx

# Set up log rotation
sudo nano /etc/logrotate.d/equipment-marketplace
```

## SSL/TLS Configuration

### 1. Certificate Renewal

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 2. Security Headers

The nginx configuration includes security headers. Verify with:

```bash
curl -I https://your-domain.com
```

Should include:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`

## Backup and Recovery

### 1. Automated Backups

```bash
# Database backup script
cat > scripts/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/equipment-marketplace"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > "$BACKUP_DIR/db_backup_$DATE.sql"
find "$BACKUP_DIR" -name "db_backup_*.sql" -mtime +7 -delete
EOF

chmod +x scripts/backup-database.sh
```

### 2. File Backups

```bash
# Backup uploaded files (if using local storage)
rsync -av ./uploads/ /var/backups/equipment-marketplace/uploads/
```

### 3. Recovery Procedures

```bash
# Restore database from backup
docker-compose -f docker-compose.production.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < backup_file.sql

# Restore files
rsync -av /var/backups/equipment-marketplace/uploads/ ./uploads/
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check system resources
htop
df -h

# Restart services
docker-compose -f docker-compose.production.yml restart
```

#### 2. Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Reset database connection
docker-compose -f docker-compose.production.yml restart postgres backend
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Update certificate in Docker
sudo cp /etc/letsencrypt/live/your-domain.com/* /etc/nginx/ssl/
docker-compose -f docker-compose.production.yml restart nginx
```

#### 4. Performance Issues

```bash
# Check system resources
htop
iotop
docker stats

# Check application metrics
curl http://localhost/metrics

# Scale services if needed
docker-compose -f docker-compose.production.yml up -d --scale backend=2
```

### Emergency Procedures

#### 1. Rollback Deployment

```bash
./scripts/deploy.sh rollback
```

#### 2. Emergency Shutdown

```bash
docker-compose -f docker-compose.production.yml down
```

#### 3. Data Recovery

```bash
# Restore from latest backup
./scripts/deploy.sh backup
# Follow recovery procedures above
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor application health and performance
- Check error logs
- Verify backup completion

#### Weekly
- Update system packages
- Review security logs
- Check disk space and clean up old logs

#### Monthly
- Update Docker images
- Review and update dependencies
- Security audit
- Performance optimization review

### Update Procedures

#### 1. Application Updates

```bash
# Pull latest code
git pull origin main

# Deploy updates
./scripts/deploy.sh deploy
```

#### 2. System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker
sudo apt update && sudo apt install docker-ce docker-ce-cli containerd.io

# Restart services if needed
docker-compose -f docker-compose.production.yml restart
```

#### 3. Security Updates

```bash
# Run security audit
./scripts/security-audit.sh

# Update SSL certificates
sudo certbot renew

# Update dependencies
cd backend && npm audit fix
cd frontend && npm audit fix
```

## Performance Optimization

### 1. Database Optimization

```bash
# Analyze database performance
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT * FROM pg_stat_activity;"

# Optimize queries
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "ANALYZE;"
```

### 2. Caching Optimization

```bash
# Monitor Redis performance
docker-compose -f docker-compose.production.yml exec redis redis-cli info memory

# Clear cache if needed
docker-compose -f docker-compose.production.yml exec redis redis-cli flushall
```

### 3. Load Balancing

For high-traffic scenarios, consider:
- Multiple backend instances
- Database read replicas
- CDN for static assets
- Load balancer (nginx, HAProxy, or cloud load balancer)

## Support and Documentation

- **Application Logs**: `/var/log/equipment-marketplace/`
- **Backup Location**: `/var/backups/equipment-marketplace/`
- **Configuration Files**: `./config/`
- **Monitoring**: `http://your-domain.com:3001` (Grafana)

For additional support, refer to:
- Application documentation in `/docs`
- Docker Compose documentation
- Nginx documentation
- PostgreSQL documentation

---

**Important**: Always test deployment procedures in a staging environment before applying to production.