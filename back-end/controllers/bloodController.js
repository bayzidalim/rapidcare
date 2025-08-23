const BloodRequestService = require('../services/bloodRequestService');

// Create blood request
exports.createBloodRequest = async (req, res) => {
  try {
    const {
      requesterName,
      requesterPhone,
      requesterEmail,
      bloodType,
      units,
      urgency,
      hospitalName,
      hospitalAddress,
      hospitalContact,
      patientName,
      patientAge,
      medicalCondition,
      requiredBy,
      notes
    } = req.body;

    // Guest-specific validation
    if (req.isGuest) {
      // For guest users, require all contact information
      if (!requesterName || !requesterPhone) {
        return res.status(400).json({
          success: false,
          error: 'Name and phone number are required for guest blood donations'
        });
      }
      
      // Basic phone validation
      if (!/^\+?[\d\s\-\(\)]{10,}$/.test(requesterPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid phone number'
        });
      }
    }

    const requestData = {
      requesterId: req.user ? req.user.id : null, // null for guest users
      requesterName: requesterName || (req.user ? req.user.name : null),
      requesterPhone: requesterPhone || (req.user ? req.user.phone : null),
      requesterEmail: requesterEmail || (req.user ? req.user.email : null),
      bloodType,
      units,
      urgency,
      hospitalName,
      hospitalAddress,
      hospitalContact,
      patientName,
      patientAge,
      medicalCondition,
      requiredBy,
      notes,
      isGuestRequest: req.isGuest || false
    };

    const bloodRequest = BloodRequestService.create(requestData);

    res.status(201).json({
      success: true,
      data: bloodRequest,
      message: req.isGuest 
        ? 'Thank you for your blood donation request. We will contact you soon with next steps.'
        : 'Blood request created successfully',
      isGuest: req.isGuest || false
    });
  } catch (error) {
    console.error('Error creating blood request:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all blood requests
exports.getAllBloodRequests = async (req, res) => {
  try {
    const { status, bloodType, urgency } = req.query;
    let bloodRequests = BloodRequestService.search({ status, bloodType, urgency });

    // For guest users, only show active/pending requests and limit sensitive information
    if (req.isGuest) {
      bloodRequests = bloodRequests
        .filter(request => ['pending', 'active'].includes(request.status))
        .map(request => ({
          id: request.id,
          bloodType: request.bloodType,
          units: request.units,
          urgency: request.urgency,
          hospitalName: request.hospitalName,
          hospitalAddress: request.hospitalAddress,
          patientAge: request.patientAge,
          medicalCondition: request.medicalCondition,
          requiredBy: request.requiredBy,
          createdAt: request.createdAt,
          status: request.status
          // Exclude sensitive contact information for privacy
        }));
    }

    res.json({
      success: true,
      data: bloodRequests,
      count: bloodRequests.length,
      isGuest: req.isGuest || false
    });
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blood requests'
    });
  }
};

// Get specific blood request
exports.getBloodRequestById = async (req, res) => {
  try {
    let bloodRequest = BloodRequestService.getById(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        error: 'Blood request not found'
      });
    }

    // For guest users, only show active/pending requests and limit sensitive information
    if (req.isGuest) {
      if (!['pending', 'active'].includes(bloodRequest.status)) {
        return res.status(404).json({
          success: false,
          error: 'Blood request not found'
        });
      }

      // Remove sensitive contact information for privacy
      bloodRequest = {
        id: bloodRequest.id,
        bloodType: bloodRequest.bloodType,
        units: bloodRequest.units,
        urgency: bloodRequest.urgency,
        hospitalName: bloodRequest.hospitalName,
        hospitalAddress: bloodRequest.hospitalAddress,
        hospitalContact: bloodRequest.hospitalContact,
        patientAge: bloodRequest.patientAge,
        medicalCondition: bloodRequest.medicalCondition,
        requiredBy: bloodRequest.requiredBy,
        notes: bloodRequest.notes,
        createdAt: bloodRequest.createdAt,
        status: bloodRequest.status
      };
    }

    res.json({
      success: true,
      data: bloodRequest,
      isGuest: req.isGuest || false
    });
  } catch (error) {
    console.error('Error fetching blood request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blood request'
    });
  }
};

// Update blood request status
exports.updateBloodRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    BloodRequestService.updateStatus(id, status);
    const bloodRequest = BloodRequestService.getById(id);

    res.json({
      success: true,
      data: bloodRequest,
      message: 'Blood request status updated successfully'
    });
  } catch (error) {
    console.error('Error updating blood request status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Match donor to blood request
exports.matchDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const { donorId, donorName, donorPhone } = req.body;

    const donorData = { donorId, donorName, donorPhone };
    const matchedDonor = BloodRequestService.addMatchedDonor(id, donorData);
    const bloodRequest = BloodRequestService.getById(id);

    res.json({
      success: true,
      data: bloodRequest,
      message: 'Donor matched successfully'
    });
  } catch (error) {
    console.error('Error matching donor:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update donor status
exports.updateDonorStatus = async (req, res) => {
  try {
    const { id, donorId } = req.params;
    const { status } = req.body;

    BloodRequestService.updateDonorStatus(id, donorId, status);
    const bloodRequest = BloodRequestService.getById(id);

    res.json({
      success: true,
      data: bloodRequest,
      message: 'Donor status updated successfully'
    });
  } catch (error) {
    console.error('Error updating donor status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Search blood requests
exports.searchBloodRequests = async (req, res) => {
  try {
    const { bloodType, city, urgency } = req.query;
    let bloodRequests = BloodRequestService.search({ bloodType, city, urgency });

    // For guest users, only show active/pending requests and limit sensitive information
    if (req.isGuest) {
      bloodRequests = bloodRequests
        .filter(request => ['pending', 'active'].includes(request.status))
        .map(request => ({
          id: request.id,
          bloodType: request.bloodType,
          units: request.units,
          urgency: request.urgency,
          hospitalName: request.hospitalName,
          hospitalAddress: request.hospitalAddress,
          patientAge: request.patientAge,
          medicalCondition: request.medicalCondition,
          requiredBy: request.requiredBy,
          createdAt: request.createdAt,
          status: request.status
        }));
    }

    res.json({
      success: true,
      data: bloodRequests,
      count: bloodRequests.length,
      isGuest: req.isGuest || false
    });
  } catch (error) {
    console.error('Error searching blood requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search blood requests'
    });
  }
};

// Get current user's blood requests (for profile page)
exports.getCurrentUserBloodRequests = async (req, res) => {
  try {
    const bloodRequests = BloodRequestService.search({ requesterId: req.user.id });

    res.json({
      success: true,
      data: bloodRequests,
      count: bloodRequests.length
    });
  } catch (error) {
    console.error('Error fetching current user blood requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blood requests'
    });
  }
}; 