const db = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

/**
 * Script to assign username and password for every hospital
 * Creates a hospital-authority user account for each hospital
 */

const assignHospitalCredentials = async () => {
  try {
    console.log('Starting hospital credential assignment...\n');

    // Get all hospitals
    const hospitals = db.prepare('SELECT id, name, email, phone FROM hospitals').all();
    
    if (hospitals.length === 0) {
      console.log('No hospitals found in the database.');
      return;
    }

    console.log(`Found ${hospitals.length} hospitals\n`);

    const results = [];

    for (const hospital of hospitals) {
      try {
        // Generate consistent email/username
        // If hospital has an email, use it. Otherwise generate one.
        // Actually, for easy credentials, let's try to stick to hospital email if valid, or a generated one.
        
        let email = hospital.email;
        if (!email || !email.includes('@')) {
            const cleanName = hospital.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20);
            email = `${cleanName}@rapidcare.com`;
        }

        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user already exists for this hospital
        const existingUser = db.prepare(
          'SELECT id, email FROM users WHERE hospital_id = ? AND userType = ?'
        ).get(hospital.id, 'hospital-authority');

        let userId;

        if (existingUser) {
          // Update existing user
          // Keep existing email if it's already set (unless we want to force standardization)
          // To ensure "easy to remember", let's force the email we determined above.
          
          db.prepare(`
            UPDATE users 
            SET email = ?, password = ?, name = ?, phone = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(email, hashedPassword, `${hospital.name} Admin`, hospital.phone, existingUser.id);
          
          userId = existingUser.id;
          console.log(`✓ Updated credentials for: ${hospital.name} (${email})`);
        } else {
          // Create new user
          const result = db.prepare(`
            INSERT INTO users (email, password, name, phone, userType, hospital_id, can_add_hospital, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            email,
            hashedPassword,
            `${hospital.name} Admin`,
            hospital.phone || '+880-1700-000000',
            'hospital-authority',
            hospital.id,
            1,
            1
          );

          userId = result.lastInsertRowid;
          console.log(`✓ Created new account for: ${hospital.name} (${email})`);
        }

        // Store credentials for output
        results.push({
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          username: email,
          password: password,
          role: 'Hospital Authority'
        });

      } catch (error) {
        console.error(`✗ Error processing ${hospital.name}:`, error.message);
      }
    }

    // Generate Markdown Content
    let mdContent = `# Project Login Credentials

This file contains the login credentials for all users and hospitals in the system.
**Note:** All passwords have been reset to \`password123\` for development convenience.

## Prerequisites
Ensure the database is seeded and credentials assigned:
\`\`\`bash
cd back-end
npm run seed
npm run assign:credentials
\`\`\`

## 👥 Standard Users

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **User (Patient)** | \`user@example.com\` | \`password123\` | Standard patient account |
| **Admin** | \`admin@example.com\` | \`password123\` | System administrator |

## 🏥 Hospital Credentials (Authorities)

These accounts allow login as a Hospital Authority for specific hospitals.

| ID | Hospital Name | Email (Username) | Password |
| :--- | :--- | :--- | :--- |
`;

    results.forEach(cred => {
      mdContent += `| ${cred.hospitalId} | **${cred.hospitalName}** | \`${cred.username}\` | \`${cred.password}\` |\n`;
    });

    mdContent += `
---
Generated on: ${new Date().toLocaleString()}
`;

    // Write to CREDENTIALS.md in root
    const rootDir = path.resolve(__dirname, '../../');
    const credentialsPath = path.join(rootDir, 'CREDENTIALS.md');
    
    fs.writeFileSync(credentialsPath, mdContent);
    console.log(`\n✓ Successfully updated ${credentialsPath}`);

    return results;

  } catch (error) {
    console.error('Error assigning hospital credentials:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  assignHospitalCredentials()
    .then(() => {
      console.log('Credential assignment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to assign credentials:', error);
      process.exit(1);
    });
}

module.exports = { assignHospitalCredentials };
