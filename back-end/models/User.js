const db = require('../config/database');

class User {
  static create(userData) {
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, phone, userType, isActive)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userData.email,
      userData.password,
      userData.name,
      userData.phone,
      userData.userType || 'user',
      userData.isActive !== undefined ? userData.isActive : 1
    );
    
    return result.lastInsertRowid;
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static update(id, updateData) {
    const stmt = db.prepare(`
      UPDATE users 
      SET name = ?, phone = ?, userType = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      updateData.name, 
      updateData.phone, 
      updateData.userType,
      updateData.isActive !== undefined ? updateData.isActive : 1,
      id
    );
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static getAll() {
    const stmt = db.prepare('SELECT * FROM users ORDER BY createdAt DESC');
    return stmt.all();
  }

  // Sequelize-style methods for admin controller
  static async findAll(options = {}) {
    let query = 'SELECT * FROM users';
    const params = [];
    
    if (options.where) {
      const conditions = [];
      Object.keys(options.where).forEach(key => {
        conditions.push(`${key} = ?`);
        params.push(options.where[key]);
      });
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    if (options.attributes) {
      if (options.attributes.exclude) {
        const excludeFields = options.attributes.exclude;
        const allFields = ['id', 'name', 'email', 'phone', 'userType', 'isActive', 'createdAt', 'updatedAt'];
        const includeFields = allFields.filter(field => !excludeFields.includes(field));
        query = query.replace('*', includeFields.join(', '));
      }
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static async findByPk(id, options = {}) {
    const user = this.findById(id);
    if (!user) return null;
    
    if (options.attributes && options.attributes.exclude) {
      const excludeFields = options.attributes.exclude;
      excludeFields.forEach(field => {
        delete user[field];
      });
    }
    
    return user;
  }

  static count(options = {}) {
    let query = 'SELECT COUNT(*) as count FROM users';
    const params = [];
    if (options.where) {
      const conditions = [];
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (
          typeof value === 'number' ||
          typeof value === 'string' ||
          typeof value === 'bigint' ||
          value === null
        ) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
        // else skip unsupported types
      });
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }

  static async findOne(options = {}) {
    let query = 'SELECT * FROM users';
    const params = [];
    
    if (options.where) {
      const conditions = [];
      Object.keys(options.where).forEach(key => {
        conditions.push(`${key} = ?`);
        params.push(options.where[key]);
      });
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' LIMIT 1';
    
    const stmt = db.prepare(query);
    return stmt.get(...params);
  }
}

module.exports = User; 