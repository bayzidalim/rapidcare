const Database = require('better-sqlite3');

function addBookingReference(db) {
  console.log('Running migration: Add booking reference column');
  
  try {
    // Check if the column already exists
    const tableInfo = db.prepare("PRAGMA table_info(bookings)").all();
    const hasBookingReference = tableInfo.some(column => column.name === 'bookingReference');
    
    if (!hasBookingReference) {
      console.log('Adding bookingReference column to bookings table...');
      
      // Add the bookingReference column
      db.exec(`
        ALTER TABLE bookings 
        ADD COLUMN bookingReference TEXT UNIQUE
      `);
      
      // Generate booking references for existing bookings
      const existingBookings = db.prepare(`
        SELECT id, createdAt FROM bookings 
        WHERE bookingReference IS NULL
      `).all();
      
      const updateStmt = db.prepare(`
        UPDATE bookings 
        SET bookingReference = ? 
        WHERE id = ?
      `);
      
      existingBookings.forEach(booking => {
        // Generate a booking reference based on ID and timestamp
        const date = new Date(booking.createdAt);
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const bookingRef = `BK${year}${month}${day}${booking.id.toString().padStart(4, '0')}`;
        
        updateStmt.run(bookingRef, booking.id);
      });
      
      console.log(`Updated ${existingBookings.length} existing bookings with booking references`);
    } else {
      console.log('bookingReference column already exists, skipping...');
    }
    
    console.log('Migration completed: Add booking reference column');
    return true;
  } catch (error) {
    console.error('Migration failed: Add booking reference column', error);
    return false;
  }
}

module.exports = { addBookingReference };