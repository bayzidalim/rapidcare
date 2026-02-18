const SampleCollectionRequest = require('../models/SampleCollection');
const CollectionAgent = require('../models/CollectionAgent');
const Hospital = require('../models/Hospital');
const HospitalTestService = require('../models/HospitalTestService');
const TestType = require('../models/TestType');
const User = require('../models/User');
const ErrorHandler = require('../utils/errorHandler');
const NotificationService = require('./notificationService');
const mongoose = require('mongoose');

class SampleCollectionService {
    
    // Create new collection request
    static async createCollectionRequest(requestData) {
        // Validate hospital exists and offers home collection
        // We can check if any HospitalTestService allows home collection for this hospital
        // Or just trust the frontend sent a valid hospitalId? allow check.
        
        // This check logic was "SELECT * FROM hospitals WHERE id = ?". 
        // But we should verify if hospital actually supports tests.
        const services = await HospitalTestService.findOne({ 
            hospitalId: requestData.hospitalId, 
            homeCollectionAvailable: true, 
            isAvailable: true 
        });

        if (!services) {
             // Maybe hospital exists but no home collection services?
             // Or hospital doesn't exist.
             const hospital = await Hospital.findById(requestData.hospitalId);
             if (!hospital) throw ErrorHandler.createError('Hospital not found', 404);
             // If hospital exists but no services, warn?
        }

        // Calculate estimated price
        const priceInfo = await SampleCollectionRequest.calculateEstimatedPrice(
            requestData.hospitalId,
            requestData.testTypes
        );

        const newRequest = new SampleCollectionRequest({
            ...requestData,
            estimatedPrice: priceInfo.total,
            status: 'pending',
            approvalStatus: 'pending' // Default pending approval
        });

        await newRequest.save();

        // Notify hospital admins (TODO)
        
        return newRequest;
    }

    // Get user requests
    static async getUserRequests(userId) {
        return SampleCollectionRequest.find({ userId })
            .populate('hospitalId', 'name address phone')
            .populate('testTypes', 'name')
            .populate('agentId', 'name phone')
            .sort({ createdAt: -1 });
    }

    // Get hospital requests
    static async getHospitalRequests(hospitalId, status = null) {
        const query = { hospitalId };
        if (status) query.status = status;
        
        return SampleCollectionRequest.find(query)
            .populate('userId', 'name phone')
            .populate('testTypes', 'name')
            .populate('agentId', 'name phone')
            .sort({ createdAt: -1 });
    }

    // Get request by ID
    static async getRequestById(requestId) {
        const request = await SampleCollectionRequest.findById(requestId)
            .populate('hospitalId', 'name address phone')
            .populate('userId', 'name phone')
            .populate('testTypes', 'name')
            .populate('agentId', 'name phone specialization');
            
        if (!request) {
            throw ErrorHandler.createError('Request not found', 404);
        }
        
        return request;
    }

    // Update request status
    static async updateRequestStatus(requestId, status, userId = null) {
        const request = await SampleCollectionRequest.findById(requestId);
        if (!request) {
            throw ErrorHandler.createError('Request not found', 404);
        }

        const oldStatus = request.status;
        request.status = status;
        
        // If completed, maybe actual price should be set? For now assume estimated.
        
        await request.save();

        // Notify user
        await NotificationService.createNotification({
            userId: request.userId,
            title: 'Sample Collection Update',
            message: `Your sample collection request status has been updated to ${status}`,
            type: 'booking_update', // reuse booking type or add new
            relatedId: request._id
        });

        return request;
    }

    // Assign agent
    static async assignAgentToRequest(requestId, agentId) {
        const request = await SampleCollectionRequest.findById(requestId);
        if (!request) {
            throw ErrorHandler.createError('Request not found', 404);
        }

        const agent = await CollectionAgent.findById(agentId);
        if (!agent) {
             throw ErrorHandler.createError('Agent not found', 404);
        }

        request.agentId = agentId;
        request.status = 'assigned';
        await request.save();

        // Notify user
        await NotificationService.createNotification({
            userId: request.userId,
            title: 'Agent Assigned',
            message: `${agent.name} has been assigned for your sample collection.`,
            type: 'booking_update',
            relatedId: request._id
        });

        return request;
    }

    // Get hospital test types
    static async getHospitalTestTypes(hospitalId) {
        return SampleCollectionRequest.getHospitalTestTypes(hospitalId);
    }

    // Get all test types (global)
    static async getAllTestTypes() {
        return SampleCollectionRequest.getAllTestTypes();
    }

    // Calculate pricing
    static async calculatePricing(hospitalId, testTypeIds) {
        return SampleCollectionRequest.calculateEstimatedPrice(hospitalId, testTypeIds);
    }
    
    // Get hospitals offering sample collection
    static async getCollectionHospitals() {
        // Aggregate HospitalTestService to find hospitals with homeCollectionAvailable
        // Then lookup Hospital details
        
        const hospitals = await HospitalTestService.aggregate([
            { $match: { homeCollectionAvailable: true, isAvailable: true } },
            { $group: {
                _id: "$hospitalId",
                testCount: { $sum: 1 },
                minCollectionFee: { $min: "$homeCollectionFee" }
            }},
            { $lookup: {
                from: 'hospitals',
                localField: '_id',
                foreignField: '_id',
                as: 'hospital'
            }},
            { $unwind: "$hospital" },
            { $match: { "hospital.isActive": true } },
            { $project: {
                id: "$hospital._id",
                name: "$hospital.name",
                address: "$hospital.address", // Object in mongoose, string in sql? address is usually object { street, city... }
                phone: "$hospital.phone",
                testCount: 1,
                minCollectionFee: 1
            }}
        ]);
        
        return hospitals;
    }
    
    // Get hospital stats
    static async getHospitalStats(hospitalId) {
        const hId = new mongoose.Types.ObjectId(hospitalId);
        
        const stats = await SampleCollectionRequest.aggregate([
            { $match: { hospitalId: hId } },
            { $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                pendingRequests: { 
                    $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
                },
                weeklyRequests: {
                    $sum: { 
                        $cond: [
                            { $gte: ["$createdAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, 
                            1, 
                            0
                        ]
                    }
                }
            }}
        ]);
        
        return stats[0] || {
            totalRequests: 0,
            pendingRequests: 0,
            weeklyRequests: 0
        };
    }

    // Cancel request
    static async cancelRequest(requestId, userId = null) {
        const request = await SampleCollectionRequest.findById(requestId);
        if (!request) {
            throw ErrorHandler.createError('Request not found', 404);
        }
        
        // Authorization check if userId provided
        if (userId && request.userId.toString() !== userId.toString()) {
            throw ErrorHandler.createError('Unauthorized', 403);
        }

        if (['completed', 'collected', 'cancelled'].includes(request.status)) {
            throw ErrorHandler.createError('Cannot cancel request in current status', 400);
        }

        request.status = 'cancelled';
        await request.save();
        
        return request;
    }
    
    // Get pending approval requests
    static async getPendingApprovalRequests(hospitalId) {
        return SampleCollectionRequest.find({ 
            hospitalId, 
            approvalStatus: 'pending',
            status: { $ne: 'cancelled' } 
        })
        .populate('userId', 'name')
        .populate('testTypes', 'name')
        .sort({ createdAt: 1 });
    }
    
    // Approve request
    static async approveRequest(requestId, approvedBy) {
        const request = await SampleCollectionRequest.findById(requestId);
        if (!request) throw ErrorHandler.createError('Request not found', 404);
        
        request.approvalStatus = 'approved';
        request.approvedBy = approvedBy;
        request.approvedAt = new Date();
        // Keep status as pending until agent assigned? Or maybe 'approved'?
        // Schema has 'pending', 'assigned', 'collected', 'completed', 'cancelled'
        // Let's keep status 'pending' but approvalStatus 'approved'
        
        await request.save();
        
        // Notify user
        await NotificationService.createNotification({
            userId: request.userId,
            title: 'Request Approved',
            message: 'Your sample collection request has been approved.',
            type: 'booking_update',
            relatedId: request._id
        });
        
        return request;
    }
    
    // Reject request
    static async rejectRequest(requestId, rejectedBy, reason) {
        const request = await SampleCollectionRequest.findById(requestId);
        if (!request) throw ErrorHandler.createError('Request not found', 404);
        
        request.approvalStatus = 'rejected';
        request.rejectionReason = reason;
        request.status = 'cancelled'; // Reject implies cancel?
        request.approvedBy = rejectedBy; // or rejectedBy field (schema reuses approvedBy for actor)
        request.approvedAt = new Date();
        
        await request.save();
        
        // Notify user
         await NotificationService.createNotification({
            userId: request.userId,
            title: 'Request Rejected',
            message: `Your sample collection request has been rejected. Reason: ${reason}`,
            type: 'booking_update',
            relatedId: request._id
        });
        
        return request;
    }
    
    // Get available agents
    static async getAvailableAgents(hospitalId) {
        return CollectionAgent.find({ hospitalId, isActive: true });
    }
}

module.exports = SampleCollectionService;