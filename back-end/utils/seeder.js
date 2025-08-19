const HospitalService = require('../services/hospitalService');
const UserService = require('../services/userService');
require('dotenv').config();

const sampleHospitals = [
  {
    name: "Dhaka Medical College Hospital",
    address: {
      street: "32 Shahbag Avenue",
      city: "Dhaka",
      state: "Dhaka",
      zipCode: "1000",
      country: "Bangladesh"
    },
    contact: {
      phone: "+880-2-55165088",
      email: "info@dmch.gov.bd",
      emergency: "+880-2-55165088"
    },
    resources: {
      beds: {
        total: 200,
        available: 45,
        occupied: 155
      },
      icu: {
        total: 30,
        available: 8,
        occupied: 22
      },
      operationTheatres: {
        total: 8,
        available: 3,
        occupied: 5
      }
    },
    surgeons: [
      {
        name: "Dr. Mohammad Rahman",
        specialization: "Cardiovascular Surgery",
        available: true,
        schedule: {
          days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          hours: "8:00 AM - 6:00 PM"
        }
      },
      {
        name: "Dr. Nusrat Jahan",
        specialization: "Neurology",
        available: true,
        schedule: {
          days: ["Sunday", "Tuesday", "Thursday"],
          hours: "9:00 AM - 5:00 PM"
        }
      }
    ],
    services: ["Emergency Care", "Cardiology", "Neurology", "Orthopedics", "Pediatrics"],
    rating: 4.5
  },
  {
    name: "Chittagong Medical College Hospital",
    address: {
      street: "Chawk Bazar",
      city: "Chattogram",
      state: "Chattogram",
      zipCode: "4000",
      country: "Bangladesh"
    },
    contact: {
      phone: "+880-31-619441",
      email: "contact@cmch.gov.bd",
      emergency: "+880-31-619441"
    },
    resources: {
      beds: {
        total: 150,
        available: 25,
        occupied: 125
      },
      icu: {
        total: 20,
        available: 5,
        occupied: 15
      },
      operationTheatres: {
        total: 6,
        available: 2,
        occupied: 4
      }
    },
    surgeons: [
      {
        name: "Dr. Farhana Akter",
        specialization: "General Surgery",
        available: true,
        schedule: {
          days: ["Monday", "Wednesday", "Saturday"],
          hours: "7:00 AM - 7:00 PM"
        }
      }
    ],
    services: ["Emergency Care", "General Surgery", "Oncology", "Radiology"],
    rating: 4.2
  },
  {
    name: "Rajshahi Medical College Hospital",
    address: {
      street: "Laxmipur",
      city: "Rajshahi",
      state: "Rajshahi",
      zipCode: "6000",
      country: "Bangladesh"
    },
    contact: {
      phone: "+880-721-775393",
      email: "info@rmch.gov.bd",
      emergency: "+880-721-775393"
    },
    resources: {
      beds: {
        total: 100,
        available: 15,
        occupied: 85
      },
      icu: {
        total: 15,
        available: 3,
        occupied: 12
      },
      operationTheatres: {
        total: 4,
        available: 1,
        occupied: 3
      }
    },
    surgeons: [
      {
        name: "Dr. Shafiqul Islam",
        specialization: "Orthopedic Surgery",
        available: true,
        schedule: {
          days: ["Sunday", "Tuesday", "Thursday"],
          hours: "8:00 AM - 6:00 PM"
        }
      }
    ],
    services: ["Emergency Care", "Orthopedics", "Physical Therapy", "Rehabilitation"],
    rating: 4.0
  }
];

const seedDatabase = async (options = {}) => {
  const { 
    force = false, 
    dryRun = false, 
    skipUsers = false, 
    skipHospitals = false 
  } = options;
  
  try {
    console.log('🌱 Starting database seeding...');
    
    if (dryRun) {
      console.log('🧪 DRY RUN MODE - No data will be inserted');
    }
    
    // Production safety check
    if (process.env.NODE_ENV === 'production' && !force && !dryRun) {
      console.log('⚠️  Production environment detected');
      
      if (process.env.SEED_DATA !== 'true') {
        console.log('🚫 Seeding skipped in production (set SEED_DATA=true to enable)');
        return { success: true, seeded: false, reason: 'production_skip' };
      }
      
      console.log('✅ SEED_DATA=true detected, proceeding with seeding');
    }
    
    console.log('📊 Connected to SQLite database');
    
    let results = {
      hospitals: { created: 0, existing: 0 },
      users: { created: 0, existing: 0 },
      assignments: 0
    };

    // Seed hospitals
    if (!skipHospitals) {
      console.log('\n🏥 Seeding hospitals...');
      
      if (dryRun) {
        console.log(`🧪 Would create ${sampleHospitals.length} hospitals`);
        results.hospitals.created = sampleHospitals.length;
      } else {
        const hospitals = [];
        for (const hospitalData of sampleHospitals) {
          try {
            // Check if hospital already exists
            const existingHospitals = HospitalService.getAll();
            const exists = existingHospitals.find(h => h.name === hospitalData.name);
            
            if (exists) {
              hospitals.push(exists);
              results.hospitals.existing++;
              console.log(`  ✓ Hospital "${hospitalData.name}" already exists`);
            } else {
              const hospital = HospitalService.create(hospitalData);
              hospitals.push(hospital);
              results.hospitals.created++;
              console.log(`  ✅ Created hospital "${hospitalData.name}"`);
            }
          } catch (error) {
            console.error(`  ❌ Failed to create hospital "${hospitalData.name}":`, error.message);
          }
        }
        console.log(`📊 Hospitals: ${results.hospitals.created} created, ${results.hospitals.existing} existing`);
      }
    }

    // Seed users
    if (!skipUsers) {
      console.log('\n👥 Seeding users...');
      
      const sampleUsers = [
        {
          email: 'demo@rapidcare.com',
          password: 'demo123456',
          name: 'Demo User',
          phone: '+880-1711-000001',
          userType: 'user'
        },
        {
          email: 'hospital@rapidcare.com',
          password: 'hospital123456',
          name: 'Dr. Hospital Authority',
          phone: '+880-1711-000002',
          userType: 'hospital-authority'
        },
        {
          email: 'admin@rapidcare.com',
          password: 'admin123456',
          name: 'System Administrator',
          phone: '+880-1711-000003',
          userType: 'admin'
        }
      ];
      
      if (dryRun) {
        console.log(`🧪 Would create ${sampleUsers.length} users`);
        results.users.created = sampleUsers.length;
      } else {
        const users = [];
        for (const userData of sampleUsers) {
          try {
            const existingUser = UserService.getByEmail(userData.email);
            
            if (existingUser) {
              users.push(existingUser);
              results.users.existing++;
              console.log(`  ✓ User "${userData.email}" already exists`);
            } else {
              const user = await UserService.register(userData);
              users.push(user);
              results.users.created++;
              console.log(`  ✅ Created user "${userData.email}" (${userData.userType})`);
            }
          } catch (error) {
            console.error(`  ❌ Failed to create user "${userData.email}":`, error.message);
          }
        }
        console.log(`📊 Users: ${results.users.created} created, ${results.users.existing} existing`);
        
        // Assign hospitals to hospital authorities (only if we have both hospitals and users)
        if (!skipHospitals && users.length > 1) {
          console.log('\n🔗 Assigning hospitals to authorities...');
          
          try {
            const hospitals = HospitalService.getAll();
            if (hospitals.length > 0) {
              // Find hospital authority user
              const hospitalAuthUser = users.find(u => u.userType === 'hospital-authority');
              if (hospitalAuthUser) {
                UserService.assignHospital(hospitalAuthUser.id, hospitals[0].id, 'manager');
                results.assignments++;
                console.log(`  ✅ Assigned "${hospitals[0].name}" to "${hospitalAuthUser.name}"`);
              }
            }
          } catch (error) {
            console.error('  ❌ Failed to assign hospitals:', error.message);
          }
        }
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📊 Summary:', JSON.stringify(results, null, 2));
    
    return { success: true, results, dryRun };
    
  } catch (error) {
    console.error('💥 Error seeding database:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️  Production seeding failure - application will continue without sample data');
      return { success: false, error: error.message };
    } else {
      throw error;
    }
  }
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  args.forEach(arg => {
    switch (arg) {
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-users':
        options.skipUsers = true;
        break;
      case '--skip-hospitals':
        options.skipHospitals = true;
        break;
      case '--help':
        console.log('RapidCare Database Seeder');
        console.log('Usage: node seeder.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --force         Force seeding in production');
        console.log('  --dry-run       Show what would be seeded without making changes');
        console.log('  --skip-users    Skip user seeding');
        console.log('  --skip-hospitals Skip hospital seeding');
        console.log('  --help          Show this help message');
        console.log('');
        console.log('Environment Variables:');
        console.log('  SEED_DATA=true  Enable seeding in production');
        process.exit(0);
        break;
    }
  });
  
  seedDatabase(options)
    .then(result => {
      if (result.success) {
        console.log('✅ Seeding completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Seeding failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Seeding error:', error.message);
      process.exit(1);
    });
}

module.exports = { seedDatabase }; 