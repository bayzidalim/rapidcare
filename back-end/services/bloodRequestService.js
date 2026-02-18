const BloodRequest = require('../models/BloodRequest');
const MatchedDonor = require('../models/MatchedDonor');
const mongoose = require('mongoose');

class BloodRequestService {
  // Create new blood request
  static async create(requestData) {
    const request = await BloodRequest.create({
        requesterId: requestData.requesterId,
        requesterName: requestData.requesterName,
        requesterPhone: requestData.requesterPhone,
        bloodType: requestData.bloodType,
        units: requestData.units,
        urgency: requestData.urgency || 'medium',
        hospitalName: requestData.hospitalName,
        hospitalAddress: requestData.hospitalAddress,
        hospitalContact: requestData.hospitalContact,
        patientName: requestData.patientName,
        patientAge: requestData.patientAge,
        medicalCondition: requestData.medicalCondition,
        requiredBy: requestData.requiredBy,
        notes: requestData.notes,
        status: 'pending'
    });

    return this.getById(request._id);
  }

  // Get blood request by ID
  static async getById(id) {
    const request = await BloodRequest.findById(id);

    if (!request) return null;

    // Get matched donors
    const matchedDonors = await MatchedDonor.find({ bloodRequestId: id });

    return {
      ...request.toObject(),
      matchedDonors: matchedDonors.map(d => d.toObject())
    };
  }

  // Get blood requests by requester ID
  static async getByRequesterId(requesterId) {
    const requests = await BloodRequest.find({ requesterId }).sort({ createdAt: -1 });

    // Fetch matched donors for each request?
    // Using Promise.all can be heavy if many requests.
    // Ideally use virtual population or aggregation.
    // For now, mapping is safe enough for "my requests" page.
    return Promise.all(requests.map(async request => {
        const donors = await this.getMatchedDonors(request._id);
        return {
            ...request.toObject(),
            matchedDonors: donors
        };
    }));
  }

  // Get all blood requests
  static async getAll() {
    // Custom sort for urgency
    // Can use aggregation addField to assign weight, then sort.
    const requests = await BloodRequest.aggregate([
        {
            $addFields: {
                urgencyWeight: {
                    $switch: {
                        branches: [
                            { case: { $eq: ["$urgency", "high"] }, then: 1 },
                            { case: { $eq: ["$urgency", "medium"] }, then: 2 },
                            { case: { $eq: ["$urgency", "low"] }, then: 3 }
                        ],
                        default: 4
                    }
                }
            }
        },
        { $sort: { urgencyWeight: 1, createdAt: -1 } }
    ]);
    
    // Matched donors?
    // If list is long, maybe distinct query is better, or just return basic info.
    // Original code returned matched donors for ALL requests.
    return Promise.all(requests.map(async request => {
        const donors = await this.getMatchedDonors(request._id);
        return {
            ...request,
            matchedDonors: donors
        };
    }));
  }

  // Get active blood requests
  static async getActive() {
    const requests = await BloodRequest.aggregate([
        { $match: { status: { $in: ['pending', 'matched'] } } },
        {
            $addFields: {
                urgencyWeight: {
                    $switch: {
                        branches: [
                            { case: { $eq: ["$urgency", "high"] }, then: 1 },
                            { case: { $eq: ["$urgency", "medium"] }, then: 2 },
                            { case: { $eq: ["$urgency", "low"] }, then: 3 }
                        ],
                        default: 4
                    }
                }
            }
        },
        { $sort: { urgencyWeight: 1, createdAt: -1 } }
    ]);

    return Promise.all(requests.map(async request => {
        const donors = await this.getMatchedDonors(request._id);
        return {
            ...request,
            matchedDonors: donors
        };
    }));
  }

  // Update blood request status
  static async updateStatus(id, status) {
    return BloodRequest.findByIdAndUpdate(id, { 
        status, 
        updatedAt: new Date() 
    });
  }

  // Add matched donor
  static async addMatchedDonor(bloodRequestId, donorData) {
    const match = await MatchedDonor.create({
        bloodRequestId,
        donorId: donorData.donorId,
        donorName: donorData.donorName,
        donorPhone: donorData.donorPhone,
        status: 'pending',
        matchedAt: new Date()
    });

    // Update request status to matched
    await this.updateStatus(bloodRequestId, 'matched');

    return match.toObject();
  }

  // Update donor status
  static async updateDonorStatus(bloodRequestId, donorId, status) {
    return MatchedDonor.findOneAndUpdate(
        { bloodRequestId, donorId },
        { status },
        { new: true }
    );
  }

  // Get matched donors for a request
  static async getMatchedDonors(bloodRequestId) {
    const donors = await MatchedDonor.find({ bloodRequestId }).sort({ matchedAt: -1 });
    return donors.map(d => d.toObject());
  }

  // Search blood requests
  static async search(params) {
    const query = {};

    if (params.bloodType) {
        query.bloodType = params.bloodType;
    }

    if (params.urgency) {
        query.urgency = params.urgency;
    }

    if (params.status) {
        query.status = params.status;
    }

    if (params.city) {
        // Regex search on hospitalAddress
        query.hospitalAddress = new RegExp(params.city, 'i');
    }

    if (params.requesterId) {
        query.requesterId = params.requesterId;
    }

    // Use aggregation for sorting by urgency
    const requests = await BloodRequest.aggregate([
        { $match: query },
        {
            $addFields: {
                urgencyWeight: {
                    $switch: {
                        branches: [
                            { case: { $eq: ["$urgency", "high"] }, then: 1 },
                            { case: { $eq: ["$urgency", "medium"] }, then: 2 },
                            { case: { $eq: ["$urgency", "low"] }, then: 3 }
                        ],
                        default: 4
                    }
                }
            }
        },
        { $sort: { urgencyWeight: 1, createdAt: -1 } }
    ]);

    return Promise.all(requests.map(async request => {
        const donors = await this.getMatchedDonors(request._id);
        return {
            ...request,
            id: request._id, // Ensure id is present for frontend
            matchedDonors: donors
        };
    }));
  }

  // Get blood request statistics
  static async getStats() {
    const stats = await BloodRequest.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                matched: { $sum: { $cond: [{ $eq: ["$status", "matched"] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                highUrgency: { $sum: { $cond: [{ $eq: ["$urgency", "high"] }, 1, 0] } },
                mediumUrgency: { $sum: { $cond: [{ $eq: ["$urgency", "medium"] }, 1, 0] } },
                lowUrgency: { $sum: { $cond: [{ $eq: ["$urgency", "low"] }, 1, 0] } }
            }
        }
    ]);

    if (!stats || stats.length === 0) {
        return {
          total: 0,
          pending: 0,
          matched: 0,
          completed: 0,
          cancelled: 0,
          highUrgency: 0,
          mediumUrgency: 0,
          lowUrgency: 0
        };
    }

    return stats[0];
  }

  // Get blood type statistics
  static async getBloodTypeStats() {
    const stats = await BloodRequest.aggregate([
        {
            $group: {
                _id: "$bloodType",
                count: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                matched: { $sum: { $cond: [{ $eq: ["$status", "matched"] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
            }
        },
        { $sort: { count: -1 } }
    ]);

    return stats.map(s => ({
        bloodType: s._id,
        count: s.count,
        pending: s.pending,
        matched: s.matched,
        completed: s.completed
    }));
  }

  // Delete blood request
  static async delete(id) {
    // Delete matched donors first
    await MatchedDonor.deleteMany({ bloodRequestId: id });
    
    // Delete the request
    return BloodRequest.findByIdAndDelete(id);
  }
}

module.exports = BloodRequestService;