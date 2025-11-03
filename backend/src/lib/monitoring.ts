import { Request, Response, NextFunction } from 'express';
import { redis } from './redis';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  slowRequests: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  request?: {
    method: string;
    url: string;
    headers: any;
    body: any;
    ip: string;
    userAgent: string;
  };
  user?: {
    id: string;
    email: string;
  };
  metadata?: any;
}

class MonitoringService {
  private readonly METRICS_KEY = 'monitoring:metrics';
  private readonly ERROR_LOGS_KEY = 'monitoring:errors';
  private readonly PERFORMANCE_KEY = 'monitoring:performance';
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second

  /**
   * Request monitoring middleware
   */
  requestMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Track request start
      this.trackRequestStart(req);

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        
        // Track request completion
        MonitoringService.prototype.trackRequestEnd.call(
          MonitoringService.prototype,
          req,
          res,
          responseTime
        );

        // Call original end method
        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Track request start
   */
  private async trackRequestStart(req: Request): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      
      // Increment request counters
      await Promise.all([
        redis.hIncrBy(`${this.METRICS_KEY}:${today}`, 'total_requests', 1),
        redis.hIncrBy(`${this.METRICS_KEY}:${today}`, `requests_hour_${hour}`, 1),
        redis.hIncrBy(`${this.METRICS_KEY}:${today}`, `requests_${req.method.toLowerCase()}`, 1)
      ]);

      // Set expiry for daily metrics
      await redis.expire(`${this.METRICS_KEY}:${today}`, 86400 * 30); // Keep for 30 days
    } catch (error) {
      console.error('Failed to track request start:', error);
    }
  }

  /**
   * Track request completion
   */
  private async trackRequestEnd(req: Request, res: Response, responseTime: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statusCode = res.statusCode;
      const isError = statusCode >= 400;
      const isSlow = responseTime > this.SLOW_REQUEST_THRESHOLD;

      // Track response metrics
      const promises = [
        redis.hIncrBy(`${this.METRICS_KEY}:${today}`, 'total_response_time', responseTime),
        redis.hIncrBy(`${this.METRICS_KEY}:${today}`, `status_${Math.floor(statusCode / 100)}xx`, 1)
      ];

      if (isError) {
        promises.push(redis.hIncrBy(`${this.METRICS_KEY}:${today}`, 'error_count', 1));
      }

      if (isSlow) {
        promises.push(redis.hIncrBy(`${this.METRICS_KEY}:${today}`, 'slow_requests', 1));
        
        // Log slow request details
        promises.push(this.logSlowRequest(req, res, responseTime));
      }

      await Promise.all(promises);

      // Track endpoint-specific metrics
      const endpoint = this.normalizeEndpoint(req.path);
      await redis.zIncrBy(`${this.PERFORMANCE_KEY}:endpoints:${today}`, responseTime, endpoint);
      await redis.expire(`${this.PERFORMANCE_KEY}:endpoints:${today}`, 86400 * 7); // Keep for 7 days
    } catch (error) {
      console.error('Failed to track request end:', error);
    }
  }

  /**
   * Log slow request for analysis
   */
  private async logSlowRequest(req: Request, res: Response, responseTime: number): Promise<void> {
    try {
      const slowRequestData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      };

      await redis.zAdd('slow_requests', {
        score: responseTime,
        value: JSON.stringify(slowRequestData)
      });

      // Keep only last 1000 slow requests
      await redis.zRemRangeByRank('slow_requests', 0, -1001);
    } catch (error) {
      console.error('Failed to log slow request:', error);
    }
  }

  /**
   * Normalize endpoint for metrics grouping
   */
  private normalizeEndpoint(path: string): string {
    // Replace IDs with placeholders for better grouping
    return path
      .replace(/\/[a-f0-9]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUIDs
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-zA-Z0-9-_]{10,}/g, '/:id'); // Other long identifiers
  }

  /**
   * Log application errors
   */
  async logError(
    level: 'error' | 'warn' | 'info',
    message: string,
    error?: Error,
    req?: Request,
    metadata?: any
  ): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level,
        message,
        stack: error?.stack,
        metadata
      };

      // Add request context if available
      if (req) {
        errorLog.request = {
          method: req.method,
          url: req.originalUrl,
          headers: this.sanitizeHeaders(req.headers),
          body: this.sanitizeBody(req.body),
          ip: req.ip,
          userAgent: req.get('User-Agent') || ''
        };

        // Add user context if available
        if ((req as any).user) {
          errorLog.user = {
            id: (req as any).user.id,
            email: (req as any).user.email
          };
        }
      }

      // Store error log
      await redis.zAdd(this.ERROR_LOGS_KEY, {
        score: Date.now(),
        value: JSON.stringify(errorLog)
      });

      // Keep only last 10000 error logs
      await redis.zRemRangeByRank(this.ERROR_LOGS_KEY, 0, -10001);

      // Increment error counters
      const today = new Date().toISOString().split('T')[0];
      await redis.hIncrBy(`${this.METRICS_KEY}:${today}`, `${level}_count`, 1);

      // Log to console for immediate visibility
      console.error(`[${level.toUpperCase()}] ${message}`, {
        error: error?.message,
        stack: error?.stack,
        metadata
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(days: number = 1): Promise<PerformanceMetrics> {
    try {
      const dates = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      let totalRequests = 0;
      let totalResponseTime = 0;
      let errorCount = 0;
      let slowRequests = 0;

      // Aggregate metrics across days
      for (const date of dates) {
        const metrics = await redis.hGetAll(`${this.METRICS_KEY}:${date}`);
        
        totalRequests += parseInt(metrics.total_requests || '0');
        totalResponseTime += parseInt(metrics.total_response_time || '0');
        errorCount += parseInt(metrics.error_count || '0');
        slowRequests += parseInt(metrics.slow_requests || '0');
      }

      const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      return {
        requestCount: totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        slowRequests,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };
    }
  }

  /**
   * Get recent error logs
   */
  async getErrorLogs(limit: number = 100): Promise<ErrorLog[]> {
    try {
      const logs = await redis.zRange(this.ERROR_LOGS_KEY, -limit, -1, { REV: true });
      return logs.map(log => JSON.parse(log));
    } catch (error) {
      console.error('Failed to get error logs:', error);
      return [];
    }
  }

  /**
   * Get slow requests
   */
  async getSlowRequests(limit: number = 50): Promise<any[]> {
    try {
      const requests = await redis.zRange('slow_requests', -limit, -1, { REV: true });
      return requests.map((req: string) => JSON.parse(req));
    } catch (error) {
      console.error('Failed to get slow requests:', error);
      return [];
    }
  }

  /**
   * Get endpoint performance statistics
   */
  async getEndpointStats(days: number = 7): Promise<Array<{ endpoint: string; avgResponseTime: number; requestCount: number }>> {
    try {
      const dates = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      const endpointStats = new Map<string, { totalTime: number; count: number }>();

      // Aggregate endpoint stats across days
      for (const date of dates) {
        const endpoints = await redis.zRangeWithScores(`${this.PERFORMANCE_KEY}:endpoints:${date}`, 0, -1);
        
        endpoints.forEach((item: any) => {
          const endpoint = item.value;
          const responseTime = item.score;
          
          if (!endpointStats.has(endpoint)) {
            endpointStats.set(endpoint, { totalTime: 0, count: 0 });
          }
          
          const stats = endpointStats.get(endpoint)!;
          stats.totalTime += responseTime;
          stats.count += 1;
        });
      }

      // Calculate averages and sort by response time
      return Array.from(endpointStats.entries())
        .map(([endpoint, stats]) => ({
          endpoint,
          avgResponseTime: Math.round(stats.totalTime / stats.count),
          requestCount: stats.count
        }))
        .sort((a, b) => b.avgResponseTime - a.avgResponseTime);
    } catch (error) {
      console.error('Failed to get endpoint stats:', error);
      return [];
    }
  }

  /**
   * Health check endpoint data
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    database: boolean;
    redis: boolean;
    version: string;
  }> {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    
    // Check database connectivity
    let databaseHealthy = true;
    try {
      await redis.ping();
    } catch {
      databaseHealthy = false;
    }

    // Check Redis connectivity
    let redisHealthy = true;
    try {
      await redis.ping();
    } catch {
      redisHealthy = false;
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!databaseHealthy || !redisHealthy) {
      status = 'unhealthy';
    } else if (memory.heapUsed / memory.heapTotal > 0.9) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      memory,
      database: databaseHealthy,
      redis: redisHealthy,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Sanitize request headers for logging
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.token;
    delete sanitized.refreshToken;
    delete sanitized.apiKey;
    
    return sanitized;
  }

  /**
   * Clear old metrics and logs
   */
  async cleanup(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = cutoffDate.getTime();

      // Clean up old error logs
      await redis.zRemRangeByScore(this.ERROR_LOGS_KEY, 0, cutoffTimestamp);

      // Clean up old metrics
      const oldMetricKeys = await redis.keys(`${this.METRICS_KEY}:*`);
      const keysToDelete = oldMetricKeys.filter((key: string) => {
        const date = key.split(':')[2];
        return new Date(date).getTime() < cutoffTimestamp;
      });

      if (keysToDelete.length > 0) {
        await redis.del(keysToDelete);
      }

      console.log(`Cleaned up ${keysToDelete.length} old metric keys`);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }
}

export const monitoringService = new MonitoringService();

/**
 * Global error handler middleware
 */
export function errorHandler() {
  return async (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    await monitoringService.logError('error', err.message, err, req);

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? err.message : 'Something went wrong!',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: err.stack })
      }
    });
  };
}

/**
 * Unhandled rejection and exception handlers
 */
process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
  await monitoringService.logError('error', 'Unhandled Rejection', reason, undefined, { promise });
});

process.on('uncaughtException', async (error: Error) => {
  await monitoringService.logError('error', 'Uncaught Exception', error);
  process.exit(1);
});