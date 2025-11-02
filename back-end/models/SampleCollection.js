

class SampleCollection {
  constructor(database) {
    this.db = database;
  }

  /**
   * Create a new sample collection request
   */
  createRequest(requestData) {
    const {
      userId,
      hospitalId,
      testTypes, // Array of test type IDs
      patientName,
      patientPhone,
      collectionAddress,
      preferredTime,
      specialInstructions
    } = requestData;

    const stmt = this.db.prepare(`
      INSERT INTO sample_collection_requests (
        user_id, hospital_id, test_types, patient_name, patient_phone,
        collection_address, preferred_time, special_instructions, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(
      userId,
      hospitalId,
      JSON.stringify(testTypes),
      patientName,
      patientPhone,
      collectionAddress,
      preferredTime,
      specialInstructions
    );

    return this.getRequestById(result.lastInsertRowid);
  }

  /**
   * Get sample collection request by ID
   */
  getRequestById(requestId) {
    const stmt = this.db.prepare(`
      SELECT 
        scr.*,
        h.name as hospital_name,
        h.phone as hospital_phone,
        (h.street || ', ' || h.city || ', ' || h.state || ' ' || h.zipCode) as hospital_address,
        u.name as user_name,
        u.email as user_email,
        ca.name as agent_name,
        ca.phone as agent_phone
      FROM sample_collection_requests scr
      LEFT JOIN hospitals h ON scr.hospital_id = h.id
      LEFT JOIN users u ON scr.user_id = u.id
      LEFT JOIN collection_agents ca ON scr.agent_id = ca.id
      WHERE scr.id = ?
    `);

    const request = stmt.get(requestId);
    if (request && request.test_types) {
      request.test_types = JSON.parse(request.test_types);
    }
    return request;
  }

  /**
   * Get all requests for a user
   */
  getRequestsByUserId(userId, limit = 20, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT 
        scr.*,
        h.name as hospital_name,
        h.phone as hospital_phone,
        ca.name as agent_name,
        ca.phone as agent_phone
      FROM sample_collection_requests scr
      LEFT JOIN hospitals h ON scr.hospital_id = h.id
      LEFT JOIN collection_agents ca ON scr.agent_id = ca.id
      WHERE scr.user_id = ?
      ORDER BY scr.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const requests = stmt.all(userId, limit, offset);
    return requests.map(request => {
      if (request.test_types) {
        request.test_types = JSON.parse(request.test_types);
      }
      return request;
    });
  }

  /**
   * Get all requests for a hospital
   */
  getRequestsByHospitalId(hospitalId, status = null, limit = 50, offset = 0) {
    let query = `
      SELECT 
        scr.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        ca.name as agent_name,
        ca.phone as agent_phone
      FROM sample_collection_requests scr
      LEFT JOIN users u ON scr.user_id = u.id
      LEFT JOIN collection_agents ca ON scr.agent_id = ca.id
      WHERE scr.hospital_id = ?
    `;

    const params = [hospitalId];

    if (status) {
      query += ' AND scr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY scr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const requests = stmt.all(...params);

    return requests.map(request => {
      if (request.test_types) {
        request.test_types = JSON.parse(request.test_types);
      }
      return request;
    });
  }

  /**
   * Assign an agent to a collection request
   */
  assignAgent(requestId, agentId) {
    const stmt = this.db.prepare(`
      UPDATE sample_collection_requests 
      SET agent_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(agentId, requestId);
    return result.changes > 0;
  }

  /**
   * Update request status
   */
  updateStatus(requestId, status, additionalData = {}) {
    let query = 'UPDATE sample_collection_requests SET status = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [status, requestId];

    if (additionalData.collectionDate) {
      query += ', collection_date = ?';
      params.splice(-1, 0, additionalData.collectionDate);
    }

    if (additionalData.collectionTime) {
      query += ', collection_time = ?';
      params.splice(-1, 0, additionalData.collectionTime);
    }

    if (additionalData.estimatedPrice) {
      query += ', estimated_price = ?';
      params.splice(-1, 0, additionalData.estimatedPrice);
    }

    query += ' WHERE id = ?';

    const stmt = this.db.prepare(query);
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  /**
   * Get all test types
   */
  getAllTestTypes() {
    const stmt = this.db.prepare(`
      SELECT * FROM test_types 
      ORDER BY name
    `);
    return stmt.all();
  }

  /**
   * Get test types available at a specific hospital
   */
  getHospitalTestTypes(hospitalId) {
    const stmt = this.db.prepare(`
      SELECT 
        tt.*,
        hts.price,
        hts.home_collection_fee,
        hts.estimated_duration,
        hts.is_available
      FROM test_types tt
      INNER JOIN hospital_test_services hts ON tt.id = hts.test_type_id
      WHERE hts.hospital_id = ? 
        AND hts.is_available = 1
        AND hts.home_collection_available = 1
      ORDER BY tt.name
    `);
    return stmt.all(hospitalId);
  }

  /**
   * Get available collection agents for a hospital
   */
  getHospitalAgents(hospitalId) {
    const stmt = this.db.prepare(`
      SELECT * FROM collection_agents 
      WHERE hospital_id = ? AND is_active = 1
      ORDER BY name
    `);
    return stmt.all(hospitalId);
  }

  /**
   * Calculate estimated price for test types at a hospital
   */
  calculateEstimatedPrice(hospitalId, testTypeIds) {
    if (!testTypeIds || testTypeIds.length === 0) {
      return { total: 0, breakdown: [] };
    }

    const placeholders = testTypeIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT 
        tt.name,
        hts.price,
        hts.home_collection_fee
      FROM test_types tt
      INNER JOIN hospital_test_services hts ON tt.id = hts.test_type_id
      WHERE hts.hospital_id = ? AND tt.id IN (${placeholders})
    `);

    const tests = stmt.all(hospitalId, ...testTypeIds);
    
    let total = 0;
    const breakdown = tests.map(test => {
      const testTotal = (test.price || 0) + (test.home_collection_fee || 0);
      total += testTotal;
      return {
        name: test.name,
        price: test.price || 0,
        homeCollectionFee: test.home_collection_fee || 0,
        total: testTotal
      };
    });

    return { total, breakdown };
  }

  /**
   * Get statistics for a hospital
   */
  getHospitalStats(hospitalId) {
    const totalRequestsStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sample_collection_requests 
      WHERE hospital_id = ?
    `);

    const pendingRequestsStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sample_collection_requests 
      WHERE hospital_id = ? AND status = 'pending'
    `);

    const completedRequestsStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sample_collection_requests 
      WHERE hospital_id = ? AND status = 'completed'
    `);

    const totalRequests = totalRequestsStmt.get(hospitalId).count;
    const pendingRequests = pendingRequestsStmt.get(hospitalId).count;
    const completedRequests = completedRequestsStmt.get(hospitalId).count;

    return {
      totalRequests,
      pendingRequests,
      completedRequests,
      completionRate: totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(1) : 0
    };
  }
}

module.exports = SampleCollection;