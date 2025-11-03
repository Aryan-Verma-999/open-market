# Equipment Marketplace - Operations Runbook

This runbook provides step-by-step procedures for common operational tasks and incident response.

## Table of Contents

1. [System Overview](#system-overview)
2. [Common Operations](#common-operations)
3. [Incident Response](#incident-response)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Emergency Procedures](#emergency-procedures)

## System Overview

### Architecture Components

- **Frontend**: React SPA served by Nginx
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **File Storage**: AWS S3
- **Monitoring**: Prometheus + Grafana
- **Load Balancer**: Nginx

### Key Metrics to Monitor

- **Response Time**: < 2 seconds for 95th percentile
- **Error Rate**: < 1% for 5xx errors
- **CPU Usage**: < 80% average
- **Memory Usage**: < 85% average
- **Disk Usage**: < 80% average
- **Database Connections**: < 80% of max

## Common Operations

### 1. Checking System Health

```bash
# Quick health check
curl -f http://localhost/health
curl -f http://localhost/api/health

# Detailed system status
docker-compose -f docker-compose.production.yml ps

# Check resource usage
docker stats --no-stream

# Check logs for errors
docker-compose -f docker-compose.production.yml logs --tail=100 backend | grep -i error
```

### 2. Viewing Logs

```bash
# Backend application logs
docker-compose -f docker-compose.production.yml logs -f backend

# Nginx access logs
docker-compose -f docker-compose.production.yml logs -f nginx

# Database logs
docker-compose -f docker-compose.production.yml logs -f postgres

# All services logs
docker-compose -f docker-compose.production.yml logs -f

# Filter logs by time
docker-compose -f docker-compose.production.yml logs --since="2024-01-01T10:00:00" backend
```

### 3. Database Operations

```bash
# Connect to database
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# Check database size
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT pg_size_pretty(pg_database_size('equipment_marketplace'));"

# Check active connections
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity;"

# Run database backup
./scripts/backup-database.sh

# Check slow queries
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### 4. Cache Operations

```bash
# Connect to Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli

# Check Redis memory usage
docker-compose -f docker-compose.production.yml exec redis redis-cli info memory

# Check cache hit rate
docker-compose -f docker-compose.production.yml exec redis redis-cli info stats | grep keyspace

# Clear specific cache keys
docker-compose -f docker-compose.production.yml exec redis redis-cli del "cache:key:pattern"

# Clear all cache (use with caution)
docker-compose -f docker-compose.production.yml exec redis redis-cli flushall
```

### 5. Application Deployment

```bash
# Deploy new version
./scripts/deploy.sh deploy

# Check deployment status
./scripts/deploy.sh health-check

# Rollback if needed
./scripts/deploy.sh rollback

# Create backup before deployment
./scripts/deploy.sh backup
```

## Incident Response

### Severity Levels

- **P0 (Critical)**: Complete service outage
- **P1 (High)**: Major functionality impaired
- **P2 (Medium)**: Minor functionality impaired
- **P3 (Low)**: Cosmetic issues or minor bugs

### Incident Response Process

1. **Detection & Assessment** (0-5 minutes)
2. **Initial Response** (5-15 minutes)
3. **Investigation & Resolution** (15+ minutes)
4. **Post-Incident Review** (24-48 hours)

### P0 - Critical Incidents

#### Symptoms
- Application completely down
- Database unavailable
- 5xx error rate > 50%

#### Immediate Actions
```bash
# 1. Check system status
docker-compose -f docker-compose.production.yml ps

# 2. Check resource usage
htop
df -h

# 3. Check logs for errors
docker-compose -f docker-compose.production.yml logs --tail=100 | grep -i error

# 4. Restart services if needed
docker-compose -f docker-compose.production.yml restart

# 5. If restart doesn't work, rollback
./scripts/deploy.sh rollback
```

### P1 - High Priority Incidents

#### Symptoms
- High error rates (5-50%)
- Slow response times (> 5 seconds)
- Database connection issues

#### Investigation Steps
```bash
# 1. Check application metrics
curl http://localhost/metrics

# 2. Check database performance
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 3. Check for long-running queries
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 4. Check Redis performance
docker-compose -f docker-compose.production.yml exec redis redis-cli --latency-history

# 5. Scale services if needed
docker-compose -f docker-compose.production.yml up -d --scale backend=2
```

## Troubleshooting Guide

### Application Won't Start

**Symptoms**: Services fail to start or immediately exit

**Diagnosis**:
```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Check startup logs
docker-compose -f docker-compose.production.yml logs backend

# Check environment variables
docker-compose -f docker-compose.production.yml exec backend env | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET)"
```

**Solutions**:
1. Check environment configuration
2. Verify database connectivity
3. Check disk space
4. Restart services

### High Memory Usage

**Symptoms**: Memory usage > 85%, OOM kills

**Diagnosis**:
```bash
# Check memory usage by container
docker stats --no-stream

# Check system memory
free -h

# Check for memory leaks in application
docker-compose -f docker-compose.production.yml exec backend node --expose-gc -e "global.gc(); console.log(process.memoryUsage());"
```

**Solutions**:
1. Restart affected services
2. Scale horizontally
3. Optimize queries
4. Clear cache if needed

### Database Connection Issues

**Symptoms**: Connection timeouts, pool exhaustion

**Diagnosis**:
```bash
# Check database status
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Check connection count
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity;"

# Check for blocking queries
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT blocked_locks.pid AS blocked_pid, blocked_activity.usename AS blocked_user, blocking_locks.pid AS blocking_pid, blocking_activity.usename AS blocking_user, blocked_activity.query AS blocked_statement, blocking_activity.query AS current_statement_in_blocking_process FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid AND blocking_locks.pid != blocked_locks.pid JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.GRANTED;"
```

**Solutions**:
1. Restart database service
2. Kill long-running queries
3. Increase connection pool size
4. Optimize slow queries

### High CPU Usage

**Symptoms**: CPU usage > 80%, slow response times

**Diagnosis**:
```bash
# Check CPU usage by container
docker stats --no-stream

# Check system load
uptime

# Profile application (if profiling enabled)
curl http://localhost/api/profile
```

**Solutions**:
1. Scale services horizontally
2. Optimize inefficient code
3. Add caching
4. Restart services

### SSL Certificate Issues

**Symptoms**: HTTPS not working, certificate warnings

**Diagnosis**:
```bash
# Check certificate expiration
openssl x509 -in /etc/nginx/ssl/fullchain.pem -text -noout | grep "Not After"

# Test SSL configuration
curl -I https://your-domain.com

# Check certificate chain
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**Solutions**:
1. Renew certificate: `sudo certbot renew`
2. Update certificate in Docker: `sudo cp /etc/letsencrypt/live/your-domain.com/* /etc/nginx/ssl/`
3. Restart nginx: `docker-compose -f docker-compose.production.yml restart nginx`

## Maintenance Procedures

### Daily Maintenance

```bash
# Check system health
./scripts/integration-test.sh

# Check disk space
df -h

# Check for errors in logs
docker-compose -f docker-compose.production.yml logs --since="24h" | grep -i error

# Verify backups
ls -la /var/backups/equipment-marketplace/
```

### Weekly Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up old Docker images
docker system prune -f

# Analyze database performance
docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "ANALYZE;"

# Check SSL certificate expiration
openssl x509 -in /etc/nginx/ssl/fullchain.pem -text -noout | grep "Not After"
```

### Monthly Maintenance

```bash
# Security audit
./scripts/security-audit.sh

# Update dependencies
cd backend && npm audit fix
cd frontend && npm audit fix

# Performance review
# Review Grafana dashboards for trends
# Optimize slow queries
# Review and update monitoring alerts

# Backup verification
# Test backup restoration process
```

## Emergency Procedures

### Complete System Failure

1. **Assess the situation**
   ```bash
   # Check if server is responsive
   ping your-server-ip
   
   # Try to SSH to server
   ssh user@your-server-ip
   ```

2. **If server is responsive**
   ```bash
   # Check Docker status
   sudo systemctl status docker
   
   # Restart Docker if needed
   sudo systemctl restart docker
   
   # Restart application
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **If server is not responsive**
   - Contact hosting provider
   - Restore from backup server
   - Update DNS to point to backup

### Data Corruption

1. **Stop the application immediately**
   ```bash
   docker-compose -f docker-compose.production.yml down
   ```

2. **Assess the damage**
   ```bash
   # Check database integrity
   docker-compose -f docker-compose.production.yml up -d postgres
   docker-compose -f docker-compose.production.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT pg_database_size('equipment_marketplace');"
   ```

3. **Restore from backup**
   ```bash
   # Find latest backup
   ls -la /var/backups/equipment-marketplace/
   
   # Restore database
   docker-compose -f docker-compose.production.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < /var/backups/equipment-marketplace/latest_backup.sql
   ```

### Security Breach

1. **Immediate containment**
   ```bash
   # Block suspicious IPs
   sudo ufw deny from suspicious-ip
   
   # Change all passwords
   # Rotate JWT secrets
   # Revoke API keys
   ```

2. **Investigation**
   ```bash
   # Check access logs
   docker-compose -f docker-compose.production.yml logs nginx | grep suspicious-activity
   
   # Check for unauthorized access
   docker-compose -f docker-compose.production.yml logs backend | grep -i "unauthorized\|failed\|error"
   ```

3. **Recovery**
   - Patch security vulnerabilities
   - Update all credentials
   - Notify users if needed
   - Document incident

## Contact Information

### Emergency Contacts

- **On-Call Engineer**: [Phone] - [Email]
- **Database Administrator**: [Phone] - [Email]
- **Security Team**: [Phone] - [Email]
- **Hosting Provider Support**: [Phone] - [Account ID]

### Escalation Matrix

1. **Level 1**: On-Call Engineer
2. **Level 2**: Technical Lead
3. **Level 3**: Engineering Manager
4. **Level 4**: CTO

### External Services

- **AWS Support**: [Account ID] - [Support Plan]
- **Domain Registrar**: [Provider] - [Account]
- **SSL Certificate Provider**: [Provider] - [Account]
- **Email Service**: [Provider] - [Account]

## Useful Commands Reference

### Docker Commands
```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View container logs
docker logs <container-id>

# Execute command in container
docker exec -it <container-id> /bin/bash

# View container resource usage
docker stats

# Clean up unused resources
docker system prune -f
```

### Database Commands
```bash
# Connect to database
psql -U username -d database_name

# List databases
\l

# List tables
\dt

# Describe table
\d table_name

# Show running queries
SELECT * FROM pg_stat_activity;

# Kill query
SELECT pg_terminate_backend(pid);
```

### System Commands
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check network connections
netstat -tulpn

# Check system logs
journalctl -f
```

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date + 3 months]