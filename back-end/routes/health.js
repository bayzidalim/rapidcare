const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Health Check Endpoints for Production Monitoring
 * 
 * These endpoints provide comprehensive health information
 * for monitoring systems and load balancers.
 */

// Basic health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Test database connection
    try {
      const dbPath = path.join(__dirname, '..', 'database.sqlite');
      const db = new Database(dbPath);
      const result = db.prepare('SELECT 1 as test').get();
      db.close();
      
      health.database = {
        status: 'connected',
        type: 'sqlite'
      };
    } catch (dbError) {
      health.database = {
        status: 'disconnected',
        error: dbError.message
      };
      health.status = 'unhealthy';
    }

    // Check disk space
    try {
      const stats = fs.statSync(path.join(__dirname, '..'));
      health.storage = {
        status: 'available'
      };
    } catch (storageError) {
      health.storage = {
        status: 'error',
        error: storageError.message
      };
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check with system metrics
router.get('/health/detailed', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version
    };

    // System metrics
    health.system = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      loadavg: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown'
      }
    };

    // Process metrics
    health.process = {
      pid: process.pid,
      memory: process.memoryUsage(),
      cpu_usage: process.cpuUsage()
    };

    // Database health check
    try {
      const dbPath = path.join(__dirname, '..', 'database.sqlite');
      const db = new Database(dbPath);
      
      // Test basic query
      const testResult = db.prepare('SELECT 1 as test').get();
      
      // Get database size
      const stats = fs.statSync(dbPath);
      
      // Test table counts
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const hospitalCount = db.prepare('SELECT COUNT(*) as count FROM hospitals').get();
      const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
      
      // Check database integrity
      const integrityCheck = db.pragma('integrity_check');
      
      db.close();
      
      health.database = {
        status: 'connected',
        type: 'sqlite',
        size_bytes: stats.size,
        integrity: integrityCheck[0].integrity_check === 'ok' ? 'ok' : 'error',
        tables: {
          users: userCount.count,
          hospitals: hospitalCount.count,
          bookings: bookingCount.count
        }
      };
    } catch (dbError) {
      health.database = {
        status: 'disconnected',
        error: dbError.message
      };
      health.status = 'unhealthy';
    }

    // Storage health check
    try {
      const appDir = path.join(__dirname, '..');
      const stats = fs.statSync(appDir);
      
      // Check log directory
      const logDir = path.join(appDir, 'logs');
      const logDirExists = fs.existsSync(logDir);
      
      // Check upload directory
      const uploadDir = path.join(appDir, 'uploads');
      const uploadDirExists = fs.existsSync(uploadDir);
      
      health.storage = {
        status: 'available',
        directories: {
          logs: logDirExists,
          uploads: uploadDirExists
        }
      };
    } catch (storageError) {
      health.storage = {
        status: 'error',
        error: storageError.message
      };
    }

    // External services health check
    health.external_services = {};

    // Check bKash API connectivity (if configured)
    if (process.env.BKASH_BASE_URL) {
      try {
        const fetch = require('node-fetch');
        const response = await fetch(process.env.BKASH_BASE_URL, {
          method: 'HEAD',
          timeout: 5000
        });
        
        health.external_services.bkash = {
          status: response.ok ? 'connected' : 'error',
          response_time: response.headers.get('x-response-time') || 'unknown'
        };
      } catch (bkashError) {
        health.external_services.bkash = {
          status: 'disconnected',
          error: bkashError.message
        };
      }
    }

    // Check email service (if configured)
    if (process.env.SMTP_HOST) {
      health.external_services.email = {
        status: 'configured',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT
      };
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to serve requests
    const checks = [];

    // Database readiness
    try {
      const dbPath = path.join(__dirname, '..', 'database.sqlite');
      const db = new Database(dbPath);
      db.prepare('SELECT 1').get();
      db.close();
      checks.push({ name: 'database', status: 'ready' });
    } catch (error) {
      checks.push({ name: 'database', status: 'not_ready', error: error.message });
    }

    // Required directories
    const requiredDirs = ['logs', 'uploads'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, '..', dir);
      if (fs.existsSync(dirPath)) {
        checks.push({ name: `directory_${dir}`, status: 'ready' });
      } else {
        checks.push({ name: `directory_${dir}`, status: 'not_ready' });
      }
    }

    const allReady = checks.every(check => check.status === 'ready');
    const status = allReady ? 'ready' : 'not_ready';

    res.status(allReady ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      checks
    });

  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  });
});

// Metrics endpoint (Prometheus format)
router.get('/metrics', async (req, res) => {
  try {
    const metrics = [];
    
    // Process metrics
    const memUsage = process.memoryUsage();
    metrics.push(`# HELP nodejs_memory_usage_bytes Memory usage in bytes`);
    metrics.push(`# TYPE nodejs_memory_usage_bytes gauge`);
    metrics.push(`nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
    metrics.push(`nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
    metrics.push(`nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
    metrics.push(`nodejs_memory_usage_bytes{type="external"} ${memUsage.external}`);

    // Uptime
    metrics.push(`# HELP nodejs_process_uptime_seconds Process uptime in seconds`);
    metrics.push(`# TYPE nodejs_process_uptime_seconds counter`);
    metrics.push(`nodejs_process_uptime_seconds ${process.uptime()}`);

    // System metrics
    metrics.push(`# HELP system_memory_total_bytes Total system memory in bytes`);
    metrics.push(`# TYPE system_memory_total_bytes gauge`);
    metrics.push(`system_memory_total_bytes ${os.totalmem()}`);

    metrics.push(`# HELP system_memory_free_bytes Free system memory in bytes`);
    metrics.push(`# TYPE system_memory_free_bytes gauge`);
    metrics.push(`system_memory_free_bytes ${os.freemem()}`);

    // Load average
    const loadavg = os.loadavg();
    metrics.push(`# HELP system_load_average System load average`);
    metrics.push(`# TYPE system_load_average gauge`);
    metrics.push(`system_load_average{period="1m"} ${loadavg[0]}`);
    metrics.push(`system_load_average{period="5m"} ${loadavg[1]}`);
    metrics.push(`system_load_average{period="15m"} ${loadavg[2]}`);

    // Database metrics
    try {
      const dbPath = path.join(__dirname, '..', 'database.sqlite');
      const db = new Database(dbPath);
      
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const hospitalCount = db.prepare('SELECT COUNT(*) as count FROM hospitals').get();
      const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
      
      metrics.push(`# HELP rapidcare_users_total Total number of users`);
      metrics.push(`# TYPE rapidcare_users_total gauge`);
      metrics.push(`rapidcare_users_total ${userCount.count}`);

      metrics.push(`# HELP rapidcare_hospitals_total Total number of hospitals`);
      metrics.push(`# TYPE rapidcare_hospitals_total gauge`);
      metrics.push(`rapidcare_hospitals_total ${hospitalCount.count}`);

      metrics.push(`# HELP rapidcare_bookings_total Total number of bookings`);
      metrics.push(`# TYPE rapidcare_bookings_total gauge`);
      metrics.push(`rapidcare_bookings_total ${bookingCount.count}`);

      // Database size
      const stats = fs.statSync(dbPath);
      metrics.push(`# HELP rapidcare_database_size_bytes Database file size in bytes`);
      metrics.push(`# TYPE rapidcare_database_size_bytes gauge`);
      metrics.push(`rapidcare_database_size_bytes ${stats.size}`);

      db.close();
    } catch (error) {
      // Database metrics unavailable
      metrics.push(`# Database metrics unavailable: ${error.message}`);
    }

    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n') + '\n');

  } catch (error) {
    res.status(500).send(`# Error generating metrics: ${error.message}\n`);
  }
});

// Database status endpoint
router.get('/health/database', async (req, res) => {
  try {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    const db = new Database(dbPath);
    
    // Basic connectivity test
    const testResult = db.prepare('SELECT 1 as test').get();
    
    // Get database info
    const stats = fs.statSync(dbPath);
    const pragma = {
      journal_mode: db.pragma('journal_mode', { simple: true }),
      foreign_keys: db.pragma('foreign_keys', { simple: true }),
      cache_size: db.pragma('cache_size', { simple: true }),
      page_size: db.pragma('page_size', { simple: true }),
      page_count: db.pragma('page_count', { simple: true })
    };
    
    // Check integrity
    const integrityCheck = db.pragma('integrity_check');
    
    // Get table information
    const tables = db.prepare(`
      SELECT name, COUNT(*) as row_count 
      FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    const tableInfo = {};
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        tableInfo[table.name] = count.count;
      } catch (error) {
        tableInfo[table.name] = `Error: ${error.message}`;
      }
    }
    
    db.close();
    
    res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      database: {
        type: 'sqlite',
        file_size: stats.size,
        file_path: dbPath,
        pragma,
        integrity: integrityCheck[0].integrity_check,
        tables: tableInfo
      }
    });

  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;