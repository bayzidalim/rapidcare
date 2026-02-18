const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Review = require('./models/Review');
const Hospital = require('./models/Hospital');
const User = require('./models/User');

const seedDummyReviews = async () => {
  try {
     // Ensure DB connection
     if (mongoose.connection.readyState === 0) {
        await connectDB();
    }

    console.log('🌱 Seeding dummy reviews...');

    // Get all hospitals
    const hospitals = await Hospital.find({ isActive: true });
    console.log(`Found ${hospitals.length} hospitals`);

    // Get all users (excluding admin)
    const users = await User.find({ userType: { $ne: 'admin' }, isActive: true });
    console.log(`Found ${users.length} users`);

    if (hospitals.length === 0 || users.length === 0) {
      console.log('❌ No hospitals or users found. Please seed hospitals and users first.');
      return;
    }

    // Sample review data
    const reviewTemplates = [
      {
        titles: [
          "Excellent care and service!",
          "Great hospital with professional staff",
          "Highly recommended for emergency care",
          "Outstanding medical facilities",
          "Very satisfied with the treatment",
          "Professional and caring staff",
          "Clean and well-maintained facility",
          "Quick and efficient service",
          "Great experience overall",
          "Would definitely come back"
        ],
        comments: [
          "The staff was very professional and caring. The facilities are clean and well-maintained. I would definitely recommend this hospital to others.",
          "Excellent service from start to finish. The doctors were knowledgeable and the nurses were very attentive. The waiting time was reasonable.",
          "Great hospital with modern facilities. The staff was friendly and helpful. The treatment was effective and I felt well taken care of.",
          "Very satisfied with the care I received. The doctors were thorough and explained everything clearly. The facilities are top-notch.",
          "Professional staff and excellent facilities. The treatment was successful and I felt comfortable throughout my stay.",
          "Outstanding medical care. The staff was very knowledgeable and caring. I would highly recommend this hospital.",
          "Clean, modern facility with professional staff. The treatment was effective and the recovery was smooth.",
          "Great experience overall. The staff was friendly and the facilities were excellent. I felt well taken care of.",
          "Excellent medical care and service. The staff was professional and the facilities were clean and modern.",
          "Highly recommended hospital. The staff was caring and the treatment was successful. Great facilities and service."
        ]
      }
    ];

    const negativeReviewTemplates = [
      {
        titles: [
          "Could be better",
          "Average experience",
          "Room for improvement",
          "Not what I expected",
          "Decent but not great"
        ],
        comments: [
          "The service was okay but could be improved. The staff was friendly but the waiting time was longer than expected.",
          "Average hospital experience. The facilities are decent but not exceptional. The staff was professional but not very engaging.",
          "The treatment was effective but the overall experience could be better. The facilities are clean but somewhat outdated.",
          "Decent care but there's room for improvement. The staff was helpful but the process could be more streamlined.",
          "The hospital is okay but not exceptional. The staff was professional but the facilities could be more modern."
        ]
      }
    ];

    let reviewCount = 0;
    const maxReviewsPerHospital = 15;

    // Generate reviews for each hospital
    const reviewsToInsert = [];

    for (const hospital of hospitals) {
      const numReviews = Math.floor(Math.random() * maxReviewsPerHospital) + 5; // 5-20 reviews per hospital
      
      for (let i = 0; i < numReviews; i++) {
        // Select a random user
        const user = users[Math.floor(Math.random() * users.length)];
        
        // 80% chance of positive review (4-5 stars), 20% chance of negative (1-3 stars)
        const isPositive = Math.random() < 0.8;
        const rating = isPositive 
          ? Math.floor(Math.random() * 2) + 4 // 4-5 stars
          : Math.floor(Math.random() * 3) + 1; // 1-3 stars
        
        const templates = isPositive ? reviewTemplates[0] : negativeReviewTemplates[0];
        const title = templates.titles[Math.floor(Math.random() * templates.titles.length)];
        const comment = templates.comments[Math.floor(Math.random() * templates.comments.length)];
        
        // 20% chance of anonymous review
        const isAnonymous = Math.random() < 0.2;
        
        // 30% chance of verified review (linked to booking)
        const isVerified = Math.random() < 0.3;
        
        reviewsToInsert.push({
            userId: user._id,
            hospitalId: hospital._id,
            bookingId: null, // Don't link to bookings for now to avoid constraint issues
            rating: rating,
            title: title,
            comment: comment,
            isVerified: false, // Set to false to avoid booking constraint
            isAnonymous: isAnonymous,
            isActive: true,
            helpfulVotes: [] // Array of user IDs
        });
      }
    }

    if(reviewsToInsert.length > 0) {
        await Review.insertMany(reviewsToInsert);
        reviewCount = reviewsToInsert.length;
    }

    console.log(`✅ Seeded ${reviewCount} dummy reviews`);

    // Display some statistics
    const stats = await Review.aggregate([
        { $match: { isActive: true } },
        { $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: "$rating" },
            fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            fourStar: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            threeStar: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            twoStar: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } }
        }}
    ]);

    const stat = stats[0] || { totalReviews: 0 };
    
    console.log('\n📊 Review Statistics:');
    console.log(`Total Reviews: ${stat.totalReviews}`);
    console.log(`Average Rating: ${stat.averageRating ? parseFloat(stat.averageRating.toFixed(2)) : 0}`);
    console.log(`5 Stars: ${stat.fiveStar}`);
    console.log(`4 Stars: ${stat.fourStar}`);
    console.log(`3 Stars: ${stat.threeStar}`);
    console.log(`2 Stars: ${stat.twoStar}`);
    console.log(`1 Star: ${stat.oneStar}`);

    // Show sample reviews
    console.log('\n📝 Sample Reviews:');
    const sampleReviews = await Review.find({ isActive: true })
        .populate('userId', 'name')
        .populate('hospitalId', 'name')
        .sort({ createdAt: -1 })
        .limit(5);

    sampleReviews.forEach((review, index) => {
      console.log(`\n${index + 1}. ${review.hospitalId ? review.hospitalId.name : 'Unknown Hospital'}`);
      console.log(`   Rating: ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} (${review.rating}/5)`);
      console.log(`   Title: ${review.title}`);
      console.log(`   Comment: ${review.comment}`);
      console.log(`   By: ${review.isAnonymous ? 'Anonymous' : (review.userId ? review.userId.name : 'Unknown User')}`);
      console.log(`   Verified: ${review.isVerified ? 'Yes' : 'No'}`);
      console.log(`   Helpful: ${review.helpfulVotes ? review.helpfulVotes.length : 0} votes`);
    });

  } catch (error) {
    console.error('❌ Error seeding dummy reviews:', error);
    throw error;
  }
};

// Run the seeder
if (require.main === module) {
  seedDummyReviews();
}

module.exports = seedDummyReviews;
