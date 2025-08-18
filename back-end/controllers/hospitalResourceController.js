const Hospital = require('../models/Hospital');
const ResourceAuditLog = require('../models/ResourceAuditLog');

// Get all hospitals with resources
exports.getHospitalsWithResources = async (req, res) => {
    try {
        const { resourceType, city, minAvailable } = req.query;

        let hospitals;

        if (resourceType || city || minAvailable) {
            // Get filtered hospitals
            hospitals = Hospital.getAvailableForBooking(
                resourceType,
                minAvailable ? parseInt(minAvailable) : 1,
                city
            );

            // Group by hospital
            const hospitalMap = {};
            hospitals.forEach(row => {
                if (!hospitalMap[row.id]) {
                    hospitalMap[row.id] = {
                        id: row.id,
                        name: row.name,
                        description: row.description,
                        type: row.type,
                        street: row.street,
                        city: row.city,
                        state: row.state,
                        zipCode: row.zipCode,
                        country: row.country,
                        phone: row.phone,
                        email: row.email,
                        emergency: row.emergency,
                        rating: row.rating,
                        resources: {}
                    };
                }

                hospitalMap[row.id].resources[row.resourceType] = {
                    total: row.total,
                    available: row.available,
                    occupied: row.occupied,
                    reserved: row.reserved || 0,
                    maintenance: row.maintenance || 0
                };
            });

            hospitals = Object.values(hospitalMap);
        } else {
            // Get all hospitals with resources
            hospitals = Hospital.getWithResources();
        }

        res.json({
            success: true,
            data: hospitals,
            count: hospitals.length
        });
    } catch (error) {
        console.error('Error fetching hospitals with resources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hospitals'
        });
    }
};

// Get specific hospital resources
exports.getHospitalResources = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        const hospital = Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({
                success: false,
                error: 'Hospital not found'
            });
        }

        const resources = Hospital.getResources(hospitalId);
        const utilization = Hospital.getResourceUtilization(hospitalId);

        res.json({
            success: true,
            data: {
                hospital: {
                    id: hospital.id,
                    name: hospital.name,
                    city: hospital.city,
                    phone: hospital.phone,
                    email: hospital.email
                },
                resources,
                utilization
            }
        });
    } catch (error) {
        console.error('Error fetching hospital resources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hospital resources'
        });
    }
};

// Update hospital resources (for hospital authorities)
exports.updateHospitalResources = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const { resources } = req.body;

        // Check if user has permission to update this hospital's resources
        if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only update resources for your assigned hospital'
            });
        }

        if (!resources || !Array.isArray(resources)) {
            return res.status(400).json({
                success: false,
                error: 'Resources array is required'
            });
        }

        // Validate resource data
        const validResourceTypes = ['beds', 'icu', 'operationTheatres'];
        for (const resource of resources) {
            if (!validResourceTypes.includes(resource.resourceType)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid resource type: ${resource.resourceType}`
                });
            }

            if (resource.total < 0 || resource.available < 0 || resource.occupied < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Resource quantities cannot be negative'
                });
            }

            if (resource.available + resource.occupied > resource.total) {
                return res.status(400).json({
                    success: false,
                    error: `Available + Occupied cannot exceed total for ${resource.resourceType}`
                });
            }
        }

        Hospital.updateResources(parseInt(hospitalId), resources, req.user.id);

        const updatedResources = Hospital.getResources(hospitalId);

        res.json({
            success: true,
            data: updatedResources,
            message: 'Hospital resources updated successfully'
        });
    } catch (error) {
        console.error('Error updating hospital resources:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Update specific resource type
exports.updateResourceType = async (req, res) => {
    try {
        const { hospitalId, resourceType } = req.params;
        const { total, available, occupied, reserved, maintenance } = req.body;

        // Check if user has permission
        if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only update resources for your assigned hospital'
            });
        }

        // Validate resource type
        const validResourceTypes = ['beds', 'icu', 'operationTheatres'];
        if (!validResourceTypes.includes(resourceType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid resource type'
            });
        }

        // Validate quantities
        if (total < 0 || available < 0 || occupied < 0) {
            return res.status(400).json({
                success: false,
                error: 'Resource quantities cannot be negative'
            });
        }

        const resourceData = {
            total: parseInt(total),
            available: parseInt(available),
            occupied: parseInt(occupied) || 0,
            reserved: parseInt(reserved) || 0,
            maintenance: parseInt(maintenance) || 0
        };

        // Validate total capacity
        if (resourceData.available + resourceData.occupied + resourceData.reserved + resourceData.maintenance > resourceData.total) {
            return res.status(400).json({
                success: false,
                error: 'Sum of available, occupied, reserved, and maintenance cannot exceed total'
            });
        }

        Hospital.updateResourceType(parseInt(hospitalId), resourceType, resourceData, req.user.id);

        const updatedResource = Hospital.getResources(hospitalId).find(r => r.resourceType === resourceType);

        res.json({
            success: true,
            data: updatedResource,
            message: `${resourceType} resources updated successfully`
        });
    } catch (error) {
        console.error('Error updating resource type:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Check resource availability
exports.checkResourceAvailability = async (req, res) => {
    try {
        const { hospitalId, resourceType } = req.params;
        const { quantity } = req.query;

        const availability = Hospital.checkResourceAvailability(
            parseInt(hospitalId),
            resourceType,
            quantity ? parseInt(quantity) : 1
        );

        res.json({
            success: true,
            data: availability
        });
    } catch (error) {
        console.error('Error checking resource availability:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check resource availability'
        });
    }
};

// Get resource utilization statistics
exports.getResourceUtilization = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        // Check if user has permission
        if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only view utilization for your assigned hospital'
            });
        }

        const utilization = Hospital.getResourceUtilization(parseInt(hospitalId));

        res.json({
            success: true,
            data: utilization
        });
    } catch (error) {
        console.error('Error fetching resource utilization:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resource utilization'
        });
    }
};

// Get resource audit log
exports.getResourceAuditLog = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const { resourceType, actionType, startDate, endDate, limit } = req.query;

        // Check if user has permission
        if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only view audit logs for your assigned hospital'
            });
        }

        const options = {
            resourceType,
            actionType,
            startDate,
            endDate,
            limit: limit ? parseInt(limit) : 100
        };

        const auditLog = ResourceAuditLog.getByHospital(parseInt(hospitalId), options);

        res.json({
            success: true,
            data: auditLog,
            count: auditLog.length
        });
    } catch (error) {
        console.error('Error fetching resource audit log:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit log'
        });
    }
};

// Get resource summary for all hospitals (admin only)
exports.getResourceSummary = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.userType !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const summary = Hospital.getResourceSummary();

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching resource summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resource summary'
        });
    }
};

// Initialize default resources for a hospital
exports.initializeHospitalResources = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        // Check if user has permission
        if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only initialize resources for your assigned hospital'
            });
        }

        Hospital.initializeDefaultResources(parseInt(hospitalId), req.user.id);

        const resources = Hospital.getResources(hospitalId);

        res.json({
            success: true,
            data: resources,
            message: 'Default resources initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing hospital resources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize resources'
        });
    }
};

module.exports = exports;