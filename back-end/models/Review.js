const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  comment: String,
  isVerified: { type: Boolean, default: false },
  isAnonymous: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  helpfulCount: { type: Number, default: 0 },
  // Helpful votes - Array of user IDs
  helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

// Static methods
reviewSchema.statics.findByHospitalId = function(hospitalId, options = {}) {
    const { limit = 10, offset = 0, rating = null, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let query = this.find({ hospitalId, isActive: true });
    
    if (rating) {
        query = query.where('rating').equals(rating);
    }
    
    query = query
        .populate('userId', 'name email')
        .sort({ [sortBy]: sortOrder === 'desc' || sortOrder === 'DESC' ? -1 : 1 })
        .skip(offset)
        .limit(limit);
        
    return query;
};

reviewSchema.statics.findByUserId = function(userId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    return this.find({ userId, isActive: true })
        .populate('hospitalId', 'name city')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
};

reviewSchema.statics.getHospitalStats = async function(hospitalId) {
    const stats = await this.aggregate([
        { $match: { hospitalId: new mongoose.Types.ObjectId(hospitalId), isActive: true } },
        {
            $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                averageRating: { $avg: '$rating' },
                fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
            }
        }
    ]);
    return stats[0] || { totalReviews: 0, averageRating: 0, fiveStar: 0, fourStar: 0, threeStar: 0, twoStar: 0, oneStar: 0 };
};

reviewSchema.statics.addHelpfulVote = async function(reviewId, userId, isHelpful) {
    if (!isHelpful) {
        // Remove vote
        const result = await this.updateOne(
            { _id: reviewId, helpfulVotes: userId },
            { 
                $pull: { helpfulVotes: userId },
                $inc: { helpfulCount: -1 } 
            }
        );
        return result.modifiedCount > 0;
    } else {
        // Add vote
        const review = await this.findOne({ _id: reviewId, helpfulVotes: userId });
        if (review) return false; // Already voted

        await this.findByIdAndUpdate(reviewId, {
            $addToSet: { helpfulVotes: userId },
            $inc: { helpfulCount: 1 }
        });
        return true;
    }
};

reviewSchema.statics.canUserReview = async function(userId, hospitalId, bookingId = null) {
    const existing = await this.findOne({ userId, hospitalId, isActive: true });
    if (existing) {
        return { canReview: false, reason: 'User has already reviewed this hospital' };
    }
    
    if (bookingId) {
        const Booking = mongoose.model('Booking');
        const booking = await Booking.findOne({ 
            _id: bookingId, 
            userId, 
            status: { $in: ['completed', 'confirmed'] } 
        });
        
        if (!booking) {
             return { canReview: false, reason: 'Invalid or incomplete booking' };
        }
    }
    
    return { canReview: true };
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
