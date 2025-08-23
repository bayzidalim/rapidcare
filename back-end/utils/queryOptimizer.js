// Try better-sqlite3 first, fallback to sqlite3
let Database;
let useBetterSqlite3 = true;

try {
  Database = require('better-sqlite3');
  console.log('✅ better-sqlite3 loaded successfully in queryOptimizer');
} catch (error) {
  console.warn('⚠️  better-sqlite3 not available in queryOptimizer, using sqlite3 compatibility');
  useBetterSqlite3 = false;
  Database = null;
}

class QueryOptimizer {
  constructor(db) {
    this.db = db;
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.useBetterSqlite3 = db.useBetterSqlite3 || false;
  }

  // Create optimized indexes for booking system
  async createOptimizedIndexes() {
    const indexes = [
      // Booking indexes
      'CREATE INDEX IF NOT EXISTS idx_bookings_hospital_status ON bookings(hospitalId, status)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(userId, status)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(status, createdAt)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduledDate)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_urgency ON bookings(urgency)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_resource_type ON bookings(resourceType)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(bookingReference)',
      
      // Hospital indexes
      'CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(approval_status)',
      'CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city)',
      'CREATE INDEX IF NOT EXISTS idx_hospitals_type ON hospitals(type)',
      
      // Hospital resources indexes
      'CREATE INDEX IF NOT EXISTS idx_hospital_resources_hospital_type ON hospital_resources(hospitalId, resourceType)',
      'CREATE INDEX IF NOT EXISTS idx_hospital_resources_available ON hospital_resources(available)',
      
      // User indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_usertype ON users(userType)',
      
      // Notification indexes
      'CREATE INDEX IF NOT EXISTS idx_booking_notifications_user_read ON booking_notifications(userId, isRead)',
      'CREATE INDEX IF NOT EXISTS idx_booking_notifications_booking ON booking_notifications(bookingId)',
      'CREATE INDEX IF NOT EXISTS idx_booking_notifications_created ON booking_notifications(createdAt)',
      
      // Status history indexes
      'CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking ON booking_status_history(bookingId)',
      'CREATE INDEX IF NOT EXISTS idx_booking_status_history_changed_at ON booking_status_history(changedAt)',
      
      // Composite indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_bookings_hospital_status_urgency ON bookings(hospitalId, status, urgency)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_user_status_created ON bookings(userId, status, createdAt)',
    ];

    console.log('Creating optimized database indexes...');
    
    for (const indexSQL of indexes) {
      try {
        if (this.useBetterSqlite3) {
          this.db.exec(indexSQL);
        } else {
          await this.db.exec(indexSQL);
        }
      } catch (error) {
        console.error('Error creating index:', error.message);
      }
    }
    
    console.log('Database indexes created successfully');
  }

  // Analyze query performance
  async analyzeQuery(sql, params = []) {
    const start = process.hrtime.bigint();
    
    try {
      let result;
      if (this.useBetterSqlite3) {
        const stmt = this.db.prepare(sql);
        result = params.length > 0 ? stmt.all(params) : stmt.all();
      } else {
        const stmt = this.db.prepare(sql);
        result = params.length > 0 ? await stmt.all(params) : await stmt.all();
      }
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      
      if (duration > 100) { // Log slow queries (>100ms)
        console.warn(`Slow query detected (${duration.toFixed(2)}ms):`, sql);
      }
      
      return { result, duration };
    } catch (error) {
      console.error('Query analysis error:', error.message);
      throw error;
    }
  }

  // Cache frequently used queries
  getCachedQuery(key, queryFn, ttl = this.cacheTimeout) {
    const cached = this.queryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    const data = queryFn();
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }

  // Clear cache
  clearCache(key = null) {
    if (key) {
      this.queryCache.delete(key);
    } else {
      this.queryCache.clear();
    }
  }

  // Get optimized booking queries
  getOptimizedBookingQueries() {
    if (this.useBetterSqlite3) {
      return {
        // Get pending bookings for a hospital with optimized joins
        getPendingBookings: this.db.prepare(`
          SELECT 
            b.*,
            u.name as userName,
            u.email as userEmail,
            u.phone as userPhone,
            h.name as hospitalName,
            ROUND((julianday('now') - julianday(b.createdAt)) * 24, 1) as waitingTime
          FROM bookings b
          JOIN users u ON b.userId = u.id
          JOIN hospitals h ON b.hospitalId = h.id
          WHERE b.hospitalId = ? AND b.status = 'pending'
          ORDER BY 
            CASE b.urgency 
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            b.createdAt ASC
          LIMIT ?
        `),

        // Get user bookings with hospital info
        getUserBookings: this.db.prepare(`
          SELECT 
            b.*,
            h.name as hospitalName,
            h.phone as hospitalPhone,
            h.emergency as hospitalEmergency,
            h.city as hospitalCity,
            h.state as hospitalState
          FROM bookings b
          JOIN hospitals h ON b.hospitalId = h.id
          WHERE b.userId = ?
          ORDER BY b.createdAt DESC
          LIMIT ?
        `),

        // Get hospital resource availability
        getHospitalResources: this.db.prepare(`
          SELECT 
            h.*,
            hr.resourceType,
            hr.total,
            hr.available,
            hr.occupied,
            hr.reserved,
            hr.maintenance,
            hr.lastUpdated
          FROM hospitals h
          LEFT JOIN hospital_resources hr ON h.id = hr.hospitalId
          WHERE h.approval_status = 'approved'
          ORDER BY h.name
        `),

        // Get booking statistics for hospital
        getHospitalBookingStats: this.db.prepare(`
          SELECT 
            COUNT(*) as totalBookings,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingBookings,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedBookings,
            COUNT(CASE WHEN status = 'declined' THEN 1 END) as declinedBookings,
            COUNT(CASE WHEN urgency = 'critical' THEN 1 END) as criticalBookings,
            COUNT(CASE WHEN urgency = 'high' THEN 1 END) as highPriorityBookings,
            AVG(CASE WHEN status = 'approved' AND approvedAt IS NOT NULL 
                THEN (julianday(approvedAt) - julianday(createdAt)) * 24 
                END) as avgApprovalTimeHours
          FROM bookings 
          WHERE hospitalId = ? AND createdAt >= date('now', '-30 days')
        `),

        // Get unread notifications count
        getUnreadNotificationsCount: this.db.prepare(`
          SELECT COUNT(*) as count
          FROM booking_notifications
          WHERE userId = ? AND isRead = 0
        `),

        // Batch update resource availability
        updateResourceAvailability: this.db.prepare(`
          UPDATE hospital_resources 
          SET available = ?, occupied = ?, lastUpdated = CURRENT_TIMESTAMP, updatedBy = ?
          WHERE hospitalId = ? AND resourceType = ?
        `)
      };
    } else {
      // Return async versions for sqlite3
      return {
        getPendingBookings: this.db.prepare(`
          SELECT 
            b.*,
            u.name as userName,
            u.email as userEmail,
            u.phone as userPhone,
            h.name as hospitalName,
            ROUND((julianday('now') - julianday(b.createdAt)) * 24, 1) as waitingTime
          FROM bookings b
          JOIN users u ON b.userId = u.id
          JOIN hospitals h ON b.hospitalId = h.id
          WHERE b.hospitalId = ? AND b.status = 'pending'
          ORDER BY 
            CASE b.urgency 
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            b.createdAt ASC
          LIMIT ?
        `),
        getUserBookings: this.db.prepare(`
          SELECT 
            b.*,
            h.name as hospitalName,
            h.phone as hospitalPhone,
            h.emergency as hospitalEmergency,
            h.city as hospitalCity,
            h.state as hospitalState
          FROM bookings b
          JOIN hospitals h ON b.hospitalId = h.id
          WHERE b.userId = ?
          ORDER BY b.createdAt DESC
          LIMIT ?
        `),
        getHospitalResources: this.db.prepare(`
          SELECT 
            h.*,
            hr.resourceType,
            hr.total,
            hr.available,
            hr.occupied,
            hr.reserved,
            hr.maintenance,
            hr.lastUpdated
          FROM hospitals h
          LEFT JOIN hospital_resources hr ON h.id = hr.hospitalId
          WHERE h.approval_status = 'approved'
          ORDER BY h.name
        `),
        getHospitalBookingStats: this.db.prepare(`
          SELECT 
            COUNT(*) as totalBookings,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingBookings,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedBookings,
            COUNT(CASE WHEN status = 'declined' THEN 1 END) as declinedBookings,
            COUNT(CASE WHEN urgency = 'critical' THEN 1 END) as criticalBookings,
            COUNT(CASE WHEN urgency = 'high' THEN 1 END) as highPriorityBookings,
            AVG(CASE WHEN status = 'approved' AND approvedAt IS NOT NULL 
                THEN (julianday(approvedAt) - julianday(createdAt)) * 24 
                END) as avgApprovalTimeHours
          FROM bookings 
          WHERE hospitalId = ? AND createdAt >= date('now', '-30 days')
        `),
        getUnreadNotificationsCount: this.db.prepare(`
          SELECT COUNT(*) as count
          FROM booking_notifications
          WHERE userId = ? AND isRead = 0
        `),
        updateResourceAvailability: this.db.prepare(`
          UPDATE hospital_resources 
          SET available = ?, occupied = ?, lastUpdated = CURRENT_TIMESTAMP, updatedBy = ?
          WHERE hospitalId = ? AND resourceType = ?
        `)
      };
    }
  }

  // Optimize database settings
  async optimizeDatabase() {
    const optimizations = [
      'PRAGMA journal_mode = WAL',
      'PRAGMA synchronous = NORMAL',
      'PRAGMA cache_size = 10000',
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 268435456', // 256MB
      'PRAGMA optimize'
    ];

    console.log('Applying database optimizations...');
    
    for (const pragma of optimizations) {
      try {
        if (this.useBetterSqlite3) {
          this.db.exec(pragma);
        } else {
          await this.db.exec(pragma);
        }
      } catch (error) {
        console.error('Error applying optimization:', error.message);
      }
    }
    
    console.log('Database optimizations applied');
  }

  // Get database statistics
  async getDatabaseStats() {
    const stats = {};
    
    try {
      // Table sizes
      const tables = ['bookings', 'hospitals', 'users', 'hospital_resources', 'booking_notifications'];
      
      for (const table of tables) {
        try {
          let count;
          if (this.useBetterSqlite3) {
            count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
          } else {
            count = await this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
          }
          stats[table] = count ? count.count : 0;
        } catch (error) {
          console.warn(`Table ${table} might not exist yet:`, error.message);
          stats[table] = 0;
        }
      }
      
      // Database size
      try {
        let dbSize;
        if (this.useBetterSqlite3) {
          dbSize = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
        } else {
          dbSize = await this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
        }
        stats.databaseSize = dbSize ? dbSize.size : 0;
      } catch (error) {
        stats.databaseSize = 0;
      }
      
      // Index usage
      try {
        let indexStats;
        if (this.useBetterSqlite3) {
          indexStats = this.db.prepare(`
            SELECT name, tbl_name 
            FROM sqlite_master 
            WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
          `).all();
        } else {
          indexStats = await this.db.prepare(`
            SELECT name, tbl_name 
            FROM sqlite_master 
            WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
          `).all();
        }
        stats.indexCount = indexStats ? indexStats.length : 0;
      } catch (error) {
        stats.indexCount = 0;
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error.message);
      return {};
    }
  }

  // Vacuum database to reclaim space
  async vacuumDatabase() {
    console.log('Starting database vacuum...');
    const start = Date.now();
    
    try {
      if (this.useBetterSqlite3) {
        this.db.exec('VACUUM');
      } else {
        await this.db.exec('VACUUM');
      }
      const duration = Date.now() - start;
      console.log(`Database vacuum completed in ${duration}ms`);
    } catch (error) {
      console.error('Error during vacuum:', error.message);
    }
  }

  // Analyze database and suggest optimizations
  async analyzeAndOptimize() {
    console.log('Analyzing database performance...');
    
    const stats = await this.getDatabaseStats();
    console.log('Database statistics:', stats);
    
    // Run ANALYZE to update query planner statistics
    try {
      if (this.useBetterSqlite3) {
        this.db.exec('ANALYZE');
      } else {
        await this.db.exec('ANALYZE');
      }
    } catch (error) {
      console.error('Error running ANALYZE:', error.message);
    }
    
    // Create indexes if they don't exist
    await this.createOptimizedIndexes();
    
    // Apply optimizations
    await this.optimizeDatabase();
    
    console.log('Database analysis and optimization completed');
  }
}

module.exports = QueryOptimizer;