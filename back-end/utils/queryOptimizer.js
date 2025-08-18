const Database = require('better-sqlite3');

class QueryOptimizer {
  constructor(db) {
    this.db = db;
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Create optimized indexes for booking system
  createOptimizedIndexes() {
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
      'CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status)',
      'CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city)',
      'CREATE INDEX IF NOT EXISTS idx_hospitals_type ON hospitals(type)',
      
      // Hospital resources indexes
      'CREATE INDEX IF NOT EXISTS idx_hospital_resources_hospital_type ON hospital_resources(hospitalId, resourceType)',
      'CREATE INDEX IF NOT EXISTS idx_hospital_resources_available ON hospital_resources(available)',
      
      // User indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      
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
    
    indexes.forEach(indexSQL => {
      try {
        this.db.exec(indexSQL);
      } catch (error) {
        console.error('Error creating index:', error.message);
      }
    });
    
    console.log('Database indexes created successfully');
  }

  // Analyze query performance
  analyzeQuery(sql, params = []) {
    const start = process.hrtime.bigint();
    
    try {
      const stmt = this.db.prepare(sql);
      const result = params.length > 0 ? stmt.all(params) : stmt.all();
      
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
        WHERE h.status = 'approved'
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
  }

  // Optimize database settings
  optimizeDatabase() {
    const optimizations = [
      'PRAGMA journal_mode = WAL',
      'PRAGMA synchronous = NORMAL',
      'PRAGMA cache_size = 10000',
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 268435456', // 256MB
      'PRAGMA optimize'
    ];

    console.log('Applying database optimizations...');
    
    optimizations.forEach(pragma => {
      try {
        this.db.exec(pragma);
      } catch (error) {
        console.error('Error applying optimization:', error.message);
      }
    });
    
    console.log('Database optimizations applied');
  }

  // Get database statistics
  getDatabaseStats() {
    const stats = {};
    
    try {
      // Table sizes
      const tables = ['bookings', 'hospitals', 'users', 'hospital_resources', 'booking_notifications'];
      
      tables.forEach(table => {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        stats[table] = count.count;
      });
      
      // Database size
      const dbSize = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
      stats.databaseSize = dbSize.size;
      
      // Index usage
      const indexStats = this.db.prepare(`
        SELECT name, tbl_name 
        FROM sqlite_master 
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
      `).all();
      stats.indexCount = indexStats.length;
      
      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error.message);
      return {};
    }
  }

  // Vacuum database to reclaim space
  vacuumDatabase() {
    console.log('Starting database vacuum...');
    const start = Date.now();
    
    try {
      this.db.exec('VACUUM');
      const duration = Date.now() - start;
      console.log(`Database vacuum completed in ${duration}ms`);
    } catch (error) {
      console.error('Error during vacuum:', error.message);
    }
  }

  // Analyze database and suggest optimizations
  analyzeAndOptimize() {
    console.log('Analyzing database performance...');
    
    const stats = this.getDatabaseStats();
    console.log('Database statistics:', stats);
    
    // Run ANALYZE to update query planner statistics
    this.db.exec('ANALYZE');
    
    // Create indexes if they don't exist
    this.createOptimizedIndexes();
    
    // Apply optimizations
    this.optimizeDatabase();
    
    console.log('Database analysis and optimization completed');
  }
}

module.exports = QueryOptimizer;