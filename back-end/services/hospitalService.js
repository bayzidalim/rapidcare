const Hospital = require('../models/Hospital');
const HospitalResource = require('../models/HospitalResource');
const HospitalServiceItem = require('../models/HospitalService'); // Rename to avoid conflict with class
const Surgeon = require('../models/Surgeon');
const NotificationService = require('./notificationService');
const AuditTrailService = require('./auditTrailService');
const ValidationService = require('./validationService');
const mongoose = require('mongoose');

class HospitalService {
  // Get all hospitals (only approved for public use)
  static async getAll(includeUnapproved = false) {
    try {
      let query = { isActive: true };
      if (!includeUnapproved) {
        query.approval_status = 'approved';
      }

      const hospitals = await Hospital.find(query)
        .populate('approved_by', 'name')
        .sort('name');

      if (!hospitals || hospitals.length === 0) {
        return [];
      }

      // We need to populate services/resources/surgeons manually or use aggregation.
      // Doing consistent aggregation for all hospitals might be heavy but Mongoose can do virtuals populate.
      // For now, let's map through them and fetch details if strict compatibility needed,
      // OR rely on Virtual Populate if I set it up.
      // I added virtual 'resources' to Hospital schema.
      // Let's use Promise.all to fetch extra details to match exact previous response structure.
      
      const detailedHospitals = await Promise.all(hospitals.map(async (hospital) => {
         const services = await this.getHospitalServices(hospital._id);
         const resources = await this.getHospitalResources(hospital._id);
         const surgeons = await this.getHospitalSurgeons(hospital._id);
         
         const h = hospital.toObject();
         
         // Helper to format as previous SQL response
         return {
            ...h,
            services: services,
            address: {
                street: h.street,
                city: h.city,
                state: h.state,
                zipCode: h.zipCode,
                country: h.country
            },
            contact: {
                phone: h.phone,
                email: h.email,
                emergency: h.emergency
            },
            capacity: {
                totalBeds: h.total_beds || 0,
                icuBeds: h.icu_beds || 0,
                operationTheaters: h.operation_theaters || 0
            },
            approvalStatus: h.approval_status,
            approvedBy: h.approved_by ? h.approved_by._id : null,
            approvedAt: h.approved_at,
            approverName: h.approved_by ? h.approved_by.name : null,
            rejectionReason: h.rejection_reason,
            submittedAt: h.submitted_at,
            resources,
            surgeons
         };
      }));

      return detailedHospitals;
    } catch (error) {
      console.error('Error in HospitalService.getAll:', error);
      throw error;
    }
  }

  // Get hospital by ID
  static async getById(id, includeUnapproved = false) {
    let query = { _id: id, isActive: true };
    if (!includeUnapproved) {
      query.approval_status = 'approved';
    }

    const hospital = await Hospital.findOne(query).populate('approved_by', 'name');

    if (!hospital) return null;

    const services = await this.getHospitalServices(hospital._id);
    const resources = await this.getHospitalResources(hospital._id);
    const surgeons = await this.getHospitalSurgeons(hospital._id);

    const h = hospital.toObject();

    return {
        ...h,
        services,
        address: {
            street: h.street,
            city: h.city,
            state: h.state,
            zipCode: h.zipCode,
            country: h.country
        },
        contact: {
            phone: h.phone,
            email: h.email,
            emergency: h.emergency
        },
        approvalStatus: h.approval_status,
        approvedBy: h.approved_by ? h.approved_by._id : null,
        approvedAt: h.approved_at,
        rejectionReason: h.rejection_reason,
        submittedAt: h.submitted_at,
        resources,
        surgeons
    };
  }

  // Search hospitals
  static async search(params) {
    let query = { isActive: true, approval_status: 'approved' };
    
    if (params.q) {
        const regex = new RegExp(params.q, 'i');
        query.$or = [{ name: regex }, { city: regex }, { state: regex }];
    }
    
    if (params.city) {
        query.city = new RegExp(params.city, 'i');
    }
    
    // Service filtering needs to be done via aggregation or post-filter if service is in separate collection.
    // If service filter is present, find matching HospitalServices first.
    if (params.service) {
        const matcingServices = await HospitalServiceItem.find({ service: new RegExp(params.service, 'i') });
        const hospitalIds = matcingServices.map(s => s.hospitalId);
        query._id = { $in: hospitalIds };
    }

    const hospitals = await Hospital.find(query).sort({ rating: -1, name: 1 });

    // Format like getAll
    return Promise.all(hospitals.map(async h => {
         const services = await this.getHospitalServices(h._id);
         const resources = await this.getHospitalResources(h._id);
         const surgeons = await this.getHospitalSurgeons(h._id);
         const obj = h.toObject();
         return {
            ...obj,
            services,
            resources,
            surgeons,
             address: {
                street: obj.street,
                city: obj.city,
                state: obj.state,
                zipCode: obj.zipCode,
                country: obj.country
            },
            contact: {
                phone: obj.phone,
                email: obj.email,
                emergency: obj.emergency
            }
         };
    }));
  }

  // Get hospitals with available resources
  static async getWithResources(params) {
    // Requires checking HospitalResource
    let query = { isActive: true, approval_status: 'approved' };
    
    // Check resources
    if (params.resourceType) {
        const min = parseInt(params.minAvailable) || 1;
        const matchingResources = await HospitalResource.find({ 
            resourceType: params.resourceType,
            available: { $gte: min }
        });
        const hospitalIds = matchingResources.map(r => r.hospitalId);
        // AND with existing ID query if present (from search above for example, but here logic is separate)
        query._id = { $in: hospitalIds };
    }

    const hospitals = await Hospital.find(query).sort({ rating: -1, name: 1 });
    // Format... reusing logic ideally but for now copy-paste for speed
    return Promise.all(hospitals.map(async h => {
         const services = await this.getHospitalServices(h._id);
         const resources = await this.getHospitalResources(h._id);
         const surgeons = await this.getHospitalSurgeons(h._id);
         const obj = h.toObject();
         return {
            ...obj,
             services,
            resources,
            surgeons,
             address: {
                street: obj.street,
                city: obj.city,
                state: obj.state,
                zipCode: obj.zipCode,
                country: obj.country
            },
            contact: {
                phone: obj.phone,
                email: obj.email,
                emergency: obj.emergency
            }
         };
    }));
  }

  // Create new hospital
  static async create(hospitalData) {
    const sanitizedData = ValidationService.sanitizeHospitalData(hospitalData);
    const validation = ValidationService.validateHospitalData(sanitizedData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check duplicate
    // Assuming checkDuplicateHospital in ValidationService needs refactoring too or we check here
    const duplicate = await Hospital.findOne({ name: sanitizedData.name, city: sanitizedData.address?.city });
    if (duplicate) {
      throw new Error('A hospital with this name already exists in this city');
    }

    const hospital = await Hospital.create({
        name: sanitizedData.name,
        street: sanitizedData.address?.street,
        city: sanitizedData.address?.city,
        state: sanitizedData.address?.state,
        zipCode: sanitizedData.address?.zipCode,
        country: sanitizedData.address?.country,
        phone: sanitizedData.contact?.phone,
        email: sanitizedData.contact?.email,
        emergency: sanitizedData.contact?.emergency,
        rating: sanitizedData.rating || 0,
        isActive: sanitizedData.isActive !== false,
        approval_status: 'pending',
        description: sanitizedData.description,
        type: sanitizedData.type
    });

    // Services
    if (hospitalData.services && hospitalData.services.length > 0) {
        await Promise.all(hospitalData.services.map(s => 
            HospitalServiceItem.create({ hospitalId: hospital._id, service: s })
        ));
    }

    // Resources
    if (hospitalData.resources) {
        await Promise.all(Object.entries(hospitalData.resources).map(([type, res]) => 
            HospitalResource.create({
                hospitalId: hospital._id,
                resourceType: type,
                total: res.total || 0,
                available: res.available || 0,
                occupied: res.occupied || 0
            })
        ));
    }

    // Surgeons
    if (hospitalData.surgeons) {
        await Promise.all(hospitalData.surgeons.map(s => 
            Surgeon.create({
                hospitalId: hospital._id,
                name: s.name,
                specialization: s.specialization,
                available: s.available ?? true, // Default to true if not specified? 
                // Wait, logic said s.available ? 1 : 0. Boolean in Mongo.
                scheduleDays: s.schedule?.days, // Array
                scheduleHours: s.schedule?.hours
            })
        ));
    }

    return this.getById(hospital._id, true);
  }

  // Update hospital resources
  static async updateResources(id, updateData) {
    if (updateData.resources) {
        // Upsert resources
        for (const [type, res] of Object.entries(updateData.resources)) {
            await HospitalResource.findOneAndUpdate(
                { hospitalId: id, resourceType: type },
                { 
                    total: res.total || 0,
                    available: res.available || 0,
                    occupied: res.occupied || 0,
                    updatedAt: new Date()
                },
                { upsert: true }
            );
        }
    }

    if (updateData.surgeons) {
        // Replace surgeons
        await Surgeon.deleteMany({ hospitalId: id });
        await Promise.all(updateData.surgeons.map(s => 
            Surgeon.create({
                hospitalId: id,
                name: s.name,
                specialization: s.specialization,
                available: s.available ?? true,
                scheduleDays: s.schedule?.days,
                scheduleHours: s.schedule?.hours
            })
        ));
    }
    
    // Touch hospital updated time
    await Hospital.findByIdAndUpdate(id, { lastUpdated: new Date() });

    return this.getById(id, true);
  }

  // Get hospital resources helper
  static async getHospitalResources(hospitalId) {
    const resources = await HospitalResource.find({ hospitalId });
    const map = {
        beds: { total: 0, available: 0, occupied: 0 },
        icu: { total: 0, available: 0, occupied: 0 },
        operationTheatres: { total: 0, available: 0, occupied: 0 } 
    };
    
    resources.forEach(r => {
        map[r.resourceType] = {
            total: r.total,
            available: r.available,
            occupied: r.occupied
        };
    });
    return map;
  }

  // Get hospital services helper
  static async getHospitalServices(hospitalId) {
    const services = await HospitalServiceItem.find({ hospitalId });
    return services.map(s => s.service);
  }

  // Get hospital surgeons helper
  static async getHospitalSurgeons(hospitalId) {
     const surgeons = await Surgeon.find({ hospitalId });
     return surgeons.map(s => ({
        id: s._id,
        name: s.name,
        specialization: s.specialization,
        available: s.available,
        schedule: {
            days: s.scheduleDays || [],
            hours: s.scheduleHours
        }
     }));
  }

  // Update resource availability
  static async updateResourceAvailability(hospitalId, resourceType, change, updatedBy = null) {
      // change > 0 means releasing (adding to available), change < 0 means booking (subtracting)
      // Logic in previous: available = available + change, occupied = occupied - change
      // Wait, if change is +1 (release), available +1, occupied -1. Correct.
      // If change is -1 (book), available -1, occupied -(-1) = +1. Correct.
      
      const resource = await HospitalResource.findOne({ hospitalId, resourceType });
      if (resource) {
          resource.available += change;
          resource.occupied -= change;
          await resource.save();
      }
      return resource;
  }

  // Update hospital
  static async update(hospitalId, hospitalData) {
      const updateFields = {
          name: hospitalData.name,
          street: hospitalData.address?.street,
          city: hospitalData.address?.city,
          state: hospitalData.address?.state,
          zipCode: hospitalData.address?.zipCode,
          country: hospitalData.address?.country,
          phone: hospitalData.contact?.phone,
          email: hospitalData.contact?.email,
          emergency: hospitalData.contact?.emergency,
          rating: hospitalData.rating,
          description: hospitalData.description,
          type: hospitalData.type,
          updatedAt: new Date()
      };
      
      if (hospitalData.isActive !== undefined) updateFields.isActive = hospitalData.isActive;

      await Hospital.findByIdAndUpdate(hospitalId, updateFields);

      // Services
      if (hospitalData.services) {
          await HospitalServiceItem.deleteMany({ hospitalId });
          await Promise.all(hospitalData.services.map(s => 
             HospitalServiceItem.create({ hospitalId, service: s })
          ));
      }

      // Resources
      if (hospitalData.resources) {
          await this.updateResources(hospitalId, { resources: hospitalData.resources });
      }

      return this.getById(hospitalId, true);
  }

  // Resubmit hospital
  static async resubmitHospital(hospitalId, hospitalData, authorityUserId) {
      // Async get
      const originalHospital = await this.getById(hospitalId, true);
      if (!originalHospital) return null;

      // ... Validation logic ...

      // Update
      const updateFields = {
          name: hospitalData.name,
          street: hospitalData.address?.street,
          city: hospitalData.address?.city,
          state: hospitalData.address?.state,
          zipCode: hospitalData.address?.zipCode,
          country: hospitalData.address?.country,
          phone: hospitalData.contact?.phone,
          email: hospitalData.contact?.email,
          emergency: hospitalData.contact?.emergency,
          description: hospitalData.description,
          type: hospitalData.type,
          approval_status: 'pending',
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
          submitted_at: new Date(),
          updatedAt: new Date()
      };

      await Hospital.findByIdAndUpdate(hospitalId, updateFields);

      if (hospitalData.services) {
          await HospitalServiceItem.deleteMany({ hospitalId });
          await Promise.all(hospitalData.services.map(s => 
             HospitalServiceItem.create({ hospitalId, service: s })
          ));
      }
      
      // Notify admins...
      // await NotificationService...

      return this.getById(hospitalId, true);
  }

  // Delete hospital
  static async delete(hospitalId) {
      await HospitalServiceItem.deleteMany({ hospitalId });
      await HospitalResource.deleteMany({ hospitalId });
      await Surgeon.deleteMany({ hospitalId });
      await Hospital.findByIdAndDelete(hospitalId);
  }

  // Get by User ID
  static async getByUserId(userId) {
      // Use Mongoose findOne on Hospital directly via linking User?
      // Or query Users to get hospitalId. 
      // User model has hospital_id.
      // But here it queries based on a join with Users.
      
      // First find the user to get hospitalId.
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user || (!user.hospital_id && !user.hospitalId)) return null; 
      
      return this.getById(user.hospital_id || user.hospitalId, true);
  }

  static async getPendingApprovals() {
      const hospitals = await Hospital.find({ approval_status: 'pending' }).sort({ submitted_at: 1 });
      
      // Need authority info. User has hospital_id. Find User where hospital_id = h._id.
      const User = require('../models/User');
      
      return Promise.all(hospitals.map(async h => {
         const authority = await User.findOne({ hospital_id: h._id });
         const obj = h.toObject();
         
         const services = await this.getHospitalServices(h._id);
         
         return {
            ...obj,
            services,
            authority: authority ? {
                name: authority.name,
                email: authority.email,
                phone: authority.phone
            } : null,
            address: {
                street: obj.street,
                city: obj.city,
                state: obj.state,
                zipCode: obj.zipCode,
                country: obj.country
            },
            contact: {
                phone: obj.phone,
                email: obj.email,
                emergency: obj.emergency
            }
         };
      }));
  }

  static async approveHospital(hospitalId, approvedBy) {
      const hospital = await Hospital.findByIdAndUpdate(hospitalId, {
          approval_status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date(),
          rejection_reason: null
      }, { new: true });
      
      // ... Audit/Notify ...
      
      return this.getById(hospitalId, true);
  }

  static async rejectHospital(hospitalId, rejectedBy, reason) {
      await Hospital.findByIdAndUpdate(hospitalId, {
          approval_status: 'rejected',
          approved_by: rejectedBy,
          approved_at: new Date(),
          rejection_reason: reason
      });
      
      return this.getById(hospitalId, true);
  }
}

module.exports = HospitalService;