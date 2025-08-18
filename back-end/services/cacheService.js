class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  // Set cache entry with TTL
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + ttl);
  }

  // Get cache entry
  get(key) {
    const expiry = this.ttlMap.get(key);
    
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  // Check if key exists and is not expired
  has(key) {
    const expiry = this.ttlMap.get(key);
    
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return false;
    }
    
    return this.cache.has(key);
  }

  // Delete cache entry
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }

  // Get or set pattern
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    const cached = this.get(key);
    
    if (cached !== null) {
      return cached;
    }
    
    try {
      const value = await fetchFunction();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error(`Cache fetch error for key ${key}:`, error);
      throw error;
    }
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, expiry] of this.ttlMap.entries()) {
      if (now > expiry) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Estimate memory usage (rough calculation)
  estimateMemoryUsage() {
    let size = 0;
    
    for (const [key, value] of this.cache.entries()) {
      size += JSON.stringify(key).length;
      size += JSON.stringify(value).length;
    }
    
    return size;
  }

  // Cache invalidation patterns
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  // Specific cache methods for booking system
  
  // Hospital cache methods
  cacheHospitals(hospitals, ttl = 10 * 60 * 1000) { // 10 minutes
    this.set('hospitals:all', hospitals, ttl);
  }

  getCachedHospitals() {
    return this.get('hospitals:all');
  }

  cacheHospitalResources(hospitalId, resources, ttl = 2 * 60 * 1000) { // 2 minutes
    this.set(`hospital:${hospitalId}:resources`, resources, ttl);
  }

  getCachedHospitalResources(hospitalId) {
    return this.get(`hospital:${hospitalId}:resources`);
  }

  invalidateHospitalCache(hospitalId = null) {
    if (hospitalId) {
      this.invalidatePattern(`hospital:${hospitalId}:`);
    } else {
      this.invalidatePattern('hospital:');
    }
    this.delete('hospitals:all');
  }

  // Booking cache methods
  cacheUserBookings(userId, bookings, ttl = 5 * 60 * 1000) { // 5 minutes
    this.set(`user:${userId}:bookings`, bookings, ttl);
  }

  getCachedUserBookings(userId) {
    return this.get(`user:${userId}:bookings`);
  }

  cachePendingBookings(hospitalId, bookings, ttl = 1 * 60 * 1000) { // 1 minute
    this.set(`hospital:${hospitalId}:pending`, bookings, ttl);
  }

  getCachedPendingBookings(hospitalId) {
    return this.get(`hospital:${hospitalId}:pending`);
  }

  invalidateBookingCache(userId = null, hospitalId = null) {
    if (userId) {
      this.invalidatePattern(`user:${userId}:`);
    }
    if (hospitalId) {
      this.invalidatePattern(`hospital:${hospitalId}:`);
    }
    // Also invalidate general booking caches
    this.invalidatePattern('bookings:');
  }

  // Notification cache methods
  cacheNotificationCount(userId, count, ttl = 30 * 1000) { // 30 seconds
    this.set(`user:${userId}:notifications:count`, count, ttl);
  }

  getCachedNotificationCount(userId) {
    return this.get(`user:${userId}:notifications:count`);
  }

  invalidateNotificationCache(userId) {
    this.invalidatePattern(`user:${userId}:notifications:`);
  }

  // Statistics cache methods
  cacheHospitalStats(hospitalId, stats, ttl = 15 * 60 * 1000) { // 15 minutes
    this.set(`hospital:${hospitalId}:stats`, stats, ttl);
  }

  getCachedHospitalStats(hospitalId) {
    return this.get(`hospital:${hospitalId}:stats`);
  }

  // Cache warming methods
  async warmCache(db) {
    console.log('Warming cache...');
    
    try {
      // Warm hospital cache
      const hospitals = db.prepare(`
        SELECT h.*, 
               GROUP_CONCAT(hr.resourceType || ':' || hr.available) as resources
        FROM hospitals h
        LEFT JOIN hospital_resources hr ON h.id = hr.hospitalId
        WHERE h.status = 'approved'
        GROUP BY h.id
      `).all();
      
      this.cacheHospitals(hospitals);
      
      // Warm individual hospital resource caches
      hospitals.forEach(hospital => {
        const resources = db.prepare(`
          SELECT * FROM hospital_resources WHERE hospitalId = ?
        `).all(hospital.id);
        
        this.cacheHospitalResources(hospital.id, resources);
      });
      
      console.log(`Cache warmed with ${hospitals.length} hospitals`);
    } catch (error) {
      console.error('Error warming cache:', error);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;