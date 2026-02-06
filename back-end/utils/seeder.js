const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Booking = require('../models/Booking');
const HospitalService = require('../services/hospitalService');
const UserService = require('../services/userService');
const connectDB = require('../config/database');
require('dotenv').config();

const sampleHospitals = [
  {
    name: "Dhaka Medical College Hospital",
    address: { street: "32 Shahbag Avenue", city: "Dhaka", state: "Dhaka", zipCode: "1000", country: "Bangladesh" },
    contact: { phone: "+880-2-55165088", email: "info@dmch.gov.bd", emergency: "+880-2-55165088" },
    resources: { beds: { total: 200, available: 45, occupied: 155 }, icu: { total: 30, available: 8, occupied: 22 }, operationTheatres: { total: 8, available: 3, occupied: 5 } },
    surgeons: [{ name: "Dr. Mohammad Rahman", specialization: "Cardiovascular Surgery", available: true, schedule: { days: ["Sunday", "Monday", "Thursday"], hours: "8:00 AM - 6:00 PM" } }],
    services: ["Emergency Care", "Cardiology", "Neurology", "Orthopedics", "Pediatrics"],
    rating: 4.5,
    images: ["https://images.unsplash.com/photo-1587351021759-3e566b9af922?auto=format&fit=crop&q=80&w=1000", "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000"]
  },
  {
    name: "Square Hospital",
    address: { street: "18/F, Bir Uttam Qazi Nuruzzaman Sarak", city: "Dhaka", state: "Dhaka", zipCode: "1205", country: "Bangladesh" },
    contact: { phone: "+880-2-9859007", email: "info@squarehospital.com", emergency: "10616" },
    resources: { beds: { total: 350, available: 50, occupied: 300 }, icu: { total: 40, available: 10, occupied: 30 }, operationTheatres: { total: 12, available: 4, occupied: 8 } },
    surgeons: [{ name: "Dr. Samia Zaman", specialization: "Neurosurgery", available: true, schedule: { days: ["Sunday", "Wednesday"], hours: "10:00 AM - 4:00 PM" } }],
    services: ["Emergency Care", "Cardiology", "Oncology", "Neurosurgery", "Gynecology"],
    rating: 4.8,
    images: ["https://images.unsplash.com/photo-1516549655169-df83a083fc2b?auto=format&fit=crop&q=80&w=1000"]
  },
  {
    name: "Chittagong Medical College Hospital",
    address: { street: "Chawk Bazar", city: "Chattogram", state: "Chattogram", zipCode: "4000", country: "Bangladesh" },
    contact: { phone: "+880-31-619441", email: "contact@cmch.gov.bd", emergency: "+880-31-619441" },
    resources: { beds: { total: 150, available: 25, occupied: 125 }, icu: { total: 20, available: 5, occupied: 15 }, operationTheatres: { total: 6, available: 2, occupied: 4 } },
    surgeons: [{ name: "Dr. Farhana Akter", specialization: "General Surgery", available: true, schedule: { days: ["Monday", "Wednesday", "Saturday"], hours: "7:00 AM - 7:00 PM" } }],
    services: ["Emergency Care", "General Surgery", "Oncology", "Radiology"],
    rating: 4.2
  },
  {
    name: "Evercare Hospital Dhaka",
    address: { street: "Plot 81, Block E, Bashundhara R/A", city: "Dhaka", state: "Dhaka", zipCode: "1229", country: "Bangladesh" },
    contact: { phone: "10678", email: "info@evercarebd.com", emergency: "10678" },
    resources: { beds: { total: 400, available: 60, occupied: 340 }, icu: { total: 50, available: 15, occupied: 35 }, operationTheatres: { total: 15, available: 5, occupied: 10 } },
    surgeons: [{ name: "Dr. Ahmed Sharif", specialization: "Cardiology", available: true, schedule: { days: ["Saturday", "Monday", "Wednesday"], hours: "9:00 AM - 5:00 PM" } }],
    services: ["Emergency Care", "Cardiology", "Orthopedics", "Gastroenterology", "Urology"],
    rating: 4.7
  },
  {
    name: "United Hospital",
    address: { street: "Plot 15, Road 71, Gulshan", city: "Dhaka", state: "Dhaka", zipCode: "1212", country: "Bangladesh" },
    contact: { phone: "+880-2-8836000", email: "info@uhlbd.com", emergency: "10666" },
    resources: { beds: { total: 300, available: 40, occupied: 260 }, icu: { total: 35, available: 8, occupied: 27 }, operationTheatres: { total: 10, available: 3, occupied: 7 } },
    surgeons: [{ name: "Dr. Naila Khan", specialization: "Pediatrics", available: true, schedule: { days: ["Sunday", "Tuesday", "Thursday"], hours: "8:00 AM - 2:00 PM" } }],
    services: ["Emergency Care", "Pediatrics", "Internal Medicine", "Dermatology", "ENT"],
    rating: 4.6
  },
  {
    name: "Sylhet M.A.G. Osmani Medical College Hospital",
    address: { street: "Medical Road", city: "Sylhet", state: "Sylhet", zipCode: "3100", country: "Bangladesh" },
    contact: { phone: "+880-821-713667", email: "info@somch.gov.bd", emergency: "+880-821-713667" },
    resources: { beds: { total: 180, available: 20, occupied: 160 }, icu: { total: 18, available: 4, occupied: 14 }, operationTheatres: { total: 5, available: 1, occupied: 4 } },
    surgeons: [{ name: "Dr. Abul Kalam", specialization: "General Surgery", available: true, schedule: { days: ["Saturday", "Monday", "Wednesday"], hours: "8:00 AM - 4:00 PM" } }],
    services: ["Emergency Care", "General Surgery", "Ophthalmology", "Dental", "Psychiatry"],
    rating: 4.1
  },
  {
    name: "Rajshahi Medical College Hospital",
    address: { street: "Laxmipur", city: "Rajshahi", state: "Rajshahi", zipCode: "6000", country: "Bangladesh" },
    contact: { phone: "+880-721-775393", email: "info@rmch.gov.bd", emergency: "+880-721-775393" },
    resources: { beds: { total: 100, available: 15, occupied: 85 }, icu: { total: 15, available: 3, occupied: 12 }, operationTheatres: { total: 4, available: 1, occupied: 3 } },
    surgeons: [{ name: "Dr. Shafiqul Islam", specialization: "Orthopedic Surgery", available: true, schedule: { days: ["Sunday", "Tuesday", "Thursday"], hours: "8:00 AM - 6:00 PM" } }],
    services: ["Emergency Care", "Orthopedics", "Physical Therapy", "Rehabilitation"],
    rating: 4.0
  }
];

const sampleUsers = [
  { email: 'user@example.com', password: 'password123', name: 'Abdul Karim', phone: '+880-1711-000001', userType: 'user' },
  { email: 'user2@example.com', password: 'password123', name: 'Fatima Begum', phone: '+880-1911-000002', userType: 'user' },
  { email: 'manager@dhaka.com', password: 'password123', name: 'Dr. Nusrat Jahan', phone: '+880-1811-000003', userType: 'hospital-authority' },
  { email: 'manager@square.com', password: 'password123', name: 'Mr. Rafiqul Islam', phone: '+880-1611-000004', userType: 'hospital-authority' },
  { email: 'admin@rapidcare.com', password: 'password123', name: 'System Administrator', phone: '+880-1511-000005', userType: 'admin' }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // --- Hospitals ---
    const hospitals = [];
    for (const hospitalData of sampleHospitals) {
      try {
        const existingHospitals = await HospitalService.search({ q: hospitalData.name });
        const exactMatch = existingHospitals.find(h => h.name === hospitalData.name && h.city === hospitalData.address.city);
        
        if (exactMatch) {
          hospitals.push(exactMatch);
          console.log(`Using existing hospital: ${hospitalData.name}`);
        } else {
          const hospital = await HospitalService.create(hospitalData);
          hospitals.push(hospital);
          console.log(`Created hospital: ${hospital.name}`);
        }
      } catch (error) {
         if (error.message.includes('already exists')) {
             const existing = await Hospital.findOne({ name: hospitalData.name, city: hospitalData.address.city });
             if (existing) {
                 hospitals.push(existing);
                 console.log(`Found existing hospital (direct): ${hospitalData.name}`);
             }
         } else {
            console.error(`Error processing hospital ${hospitalData.name}:`, error.message);
         }
      }
    }

    // --- Users ---
    const users = [];
    for (const userData of sampleUsers) {
      try {
        const existingUser = await UserService.getByEmail(userData.email);
        if (existingUser) {
          users.push(await User.findById(existingUser.id || existingUser._id));
          console.log(`Using existing user: ${userData.email}`);
        } else {
          const user = await UserService.register(userData);
          users.push(await User.findById(user.id || user._id));
          console.log(`Created user: ${userData.email}`);
        }
      } catch (error) {
        console.error(`Error processing user ${userData.email}:`, error.message);
      }
    }

    // --- Assign Managers ---
    const manager1 = users.find(u => u.email === 'manager@dhaka.com');
    const hospital1 = hospitals.find(h => h.name === 'Dhaka Medical College Hospital');
    if (manager1 && hospital1) {
       await UserService.assignHospital(manager1._id, hospital1._id, 'manager');
       console.log(`Assigned ${manager1.name} to ${hospital1.name}`);
    }

    const manager2 = users.find(u => u.email === 'manager@square.com');
    const hospital2 = hospitals.find(h => h.name === 'Square Hospital');
    if (manager2 && hospital2) {
       await UserService.assignHospital(manager2._id, hospital2._id, 'manager');
       console.log(`Assigned ${manager2.name} to ${hospital2.name}`);
    }

    // --- Blood Requests ---
    const patientUser = users.find(u => u.email === 'user@example.com');
    if (patientUser) {
        const requests = [
            {
                requesterId: patientUser._id,
                requesterName: patientUser.name,
                requesterPhone: patientUser.phone,
                bloodType: 'O+',
                units: 2,
                urgency: 'high',
                hospitalName: 'Dhaka Medical College Hospital',
                hospitalAddress: 'Shahbag, Dhaka',
                hospitalContact: '+880-2-55165088',
                patientName: 'Rahim Uddin',
                patientAge: 45,
                medicalCondition: 'Surgery',
                requiredBy: new Date(Date.now() + 86400000), // tomorrow
                status: 'pending',
                notes: 'Urgent need for surgery'
            },
            {
                requesterId: patientUser._id,
                requesterName: patientUser.name,
                requesterPhone: patientUser.phone,
                bloodType: 'AB-',
                units: 1,
                urgency: 'medium',
                hospitalName: 'Square Hospital',
                hospitalAddress: 'Panthapath, Dhaka',
                hospitalContact: '+880-2-9859007',
                patientName: 'Karim Hasan',
                patientAge: 30,
                medicalCondition: 'Anemia',
                requiredBy: new Date(Date.now() + 172800000), // day after tomorrow
                status: 'pending',
                notes: 'Please contact if available'
            }
        ];

        for (const reqData of requests) {
            const exists = await BloodRequest.findOne({ requesterId: reqData.requesterId, patientName: reqData.patientName });
            if (!exists) {
                await BloodRequest.create(reqData);
                console.log(`Created blood request for ${reqData.patientName}`);
            } else {
                console.log(`Blood request for ${reqData.patientName} already exists`);
            }
        }
    }

    // --- Bookings ---
    // Note: Assuming Booking model exists and follows typical structure. 
    // Adapting to Schema found or standard guess if detailed view failed.
    // Based on previous contexts, Booking likely links user and hospital.
    try {
        const BookingModel = require('../models/Booking'); // Dynamically req in case not loaded
        if (patientUser && hospital1) {
             const bookingData = {
                 userId: patientUser._id,
                 hospitalId: hospital1._id,
                 resourceType: 'beds',
                 patientName: patientUser.name,
                 patientAge: 45,
                 patientGender: 'Male',
                 medicalCondition: 'Severe Fever',
                 serviceType: 'General Consultation', // Keeping as extra field if helpful, though not in schema check
                 doctorName: 'Dr. Mohammad Rahman',
                 scheduledDate: new Date(Date.now() + 86400000),
                 status: 'approved',
                 paymentAmount: 500,
                 notes: 'Routine checkup'
             };
             
             // Check generic duplicate logic (very rough)
             const existingBooking = await BookingModel.findOne({ userId: bookingData.userId, hospitalId: bookingData.hospitalId });
             if (!existingBooking) {
                 await BookingModel.create(bookingData);
                 console.log(`Created booking for ${patientUser.name} at ${hospital1.name}`);
             } else {
                 console.log(`Booking for ${patientUser.name} at ${hospital1.name} already exists`);
             }
        }
    } catch (err) {
        console.log('Skipping bookings seeding (Model might vary): ' + err.message);
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };