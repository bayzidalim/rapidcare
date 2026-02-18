const mongoose = require('mongoose');
const SocialPost = require('./models/SocialPost');
const User = require('./models/User');
const Hospital = require('./models/Hospital');
const connectDB = require('./config/database');

async function getSamplePosts() {
  // Get a valid user ID (any user)
  const user = await User.findOne({ userType: { $ne: 'admin' } });
  if (!user) {
    console.log('No suitable user found for creating posts');
    return [];
  }
  const userId = user._id;

  // Get valid hospital IDs
  const hospitals = await Hospital.find({ approval_status: 'approved' }).limit(3);
  if (hospitals.length === 0) {
      console.log('No approved hospitals found');
      return [];
  }

  const hospitalIds = hospitals.map(h => h._id);

  return [
    {
      userId: userId,
      hospitalId: hospitalIds[0],
      postType: 'experience',
      title: 'Excellent Emergency Care at Dhaka Medical College Hospital',
      content: 'I had to visit the emergency room last night with severe chest pain. The staff was incredibly professional and caring. They immediately attended to me, ran all necessary tests, and kept me informed throughout the process. The doctors were knowledgeable and took time to explain everything. I felt safe and well-cared for during a scary situation. Highly recommend this hospital for emergency care!'
    },
    {
      userId: userId,
      hospitalId: hospitalIds[0],
      postType: 'complaint',
      title: 'Long Wait Times in Outpatient Department',
      content: 'I had an appointment scheduled for 10 AM but had to wait for over 2 hours to see the doctor. The waiting area was crowded and there was no clear communication about the delay. While the doctor was good once I finally saw them, the wait time management needs serious improvement. This is not the first time this has happened.'
    },
    {
      userId: userId,
      hospitalId: hospitalIds[0],
      postType: 'problem',
      title: 'Billing Department Issues',
      content: 'There seems to be a recurring problem with the billing department. I was charged for services I did not receive, and when I tried to get it corrected, I was transferred between multiple departments. It took three visits to finally get the issue resolved. The hospital needs to streamline their billing process and improve communication between departments.'
    },
    {
      userId: userId,
      hospitalId: hospitalIds[0],
      postType: 'moment',
      title: 'Nurse Sarah Made My Day',
      content: 'During my recent stay, Nurse Sarah went above and beyond to make me comfortable. She not only provided excellent medical care but also took time to chat and lift my spirits when I was feeling down. She remembered my preferences and always had a smile. Healthcare workers like her are the reason this hospital is special. Thank you, Sarah!'
    },
    {
      userId: userId,
      hospitalId: hospitalIds[1] || hospitalIds[0],
      postType: 'experience',
      title: 'Outstanding Maternity Care',
      content: 'I delivered my baby at this hospital and the experience was wonderful. The maternity ward is modern and comfortable. The nurses and doctors were supportive throughout labor and delivery. They respected my birth plan and made me feel empowered. The postpartum care was excellent too. I would definitely recommend this hospital to expecting mothers!'
    },
    {
      userId: userId,
      hospitalId: hospitalIds[1] || hospitalIds[0],
      postType: 'complaint',
      title: 'Parking Situation is Terrible',
      content: 'The parking at this hospital is a nightmare. There are never enough spots, and I often have to circle for 20-30 minutes to find parking. For a hospital that serves so many patients, this is unacceptable. They need to either expand the parking lot or provide valet service. It adds unnecessary stress to already stressful hospital visits.'
    },
    {
      userId: userId,
      hospitalId: hospitalIds[2] || hospitalIds[0],
      postType: 'experience',
      title: 'Professional and Caring Staff',
      content: 'The medical staff at this hospital are truly exceptional. From the reception desk to the doctors, everyone was professional, courteous, and genuinely caring. They took time to answer all my questions and made sure I understood my treatment plan. This level of care makes all the difference when you\'re dealing with health issues.'
    },
    {
      userId: userId,
      hospitalId: hospitalIds[2] || hospitalIds[0],
      postType: 'moment',
      title: 'Doctor Went Above and Beyond',
      content: 'Dr. Rahman stayed late to ensure my surgery was successful and personally checked on me multiple times during recovery. His dedication and compassion were truly remarkable. It\'s doctors like him who restore faith in the healthcare system. Forever grateful for his care!'
    }
  ];
}

async function seedSocialPosts() {
  console.log('🌱 Seeding social posts...');

  try {
    await connectDB();

    // Check if posts already exist
    const count = await SocialPost.countDocuments();
    
    if (count > 0) {
      console.log(`⚠️  Database already has ${count} social posts. Skipping seed.`);
      console.log('   To reseed, delete existing posts first.');
      return;
    }

    // Get sample posts
    const samplePosts = await getSamplePosts();
    if (samplePosts.length === 0) return;

    // Insert sample posts
    const createdPosts = await SocialPost.insertMany(samplePosts);
    // createdPosts will work, but for ensuring logic I usually use create. insertMany skips validation unless specified.
    
    console.log(`✅ Successfully seeded ${createdPosts.length} social posts`);

    // Get a user for interaction
    const user = await User.findOne({ userType: { $ne: 'admin' } });
    const admin = await User.findOne({ userType: 'admin' });
    
    if (createdPosts.length > 0 && user) {
        const posts = createdPosts;

        // Add likes
        for (const post of posts) {
            const likeCount = Math.floor(Math.random() * 6);
            for (let i = 0; i < likeCount; i++) {
                // We use the same user for simplicity, but in real seed we might want different users.
                // Since we only fetched one user, one user can only like once.
                // So max likes per post = 1 if only 1 user.
                // Let's find more users if possible.
                const users = await User.find({ userType: { $ne: 'admin' } }).limit(5);
                if (users.length > 0) {
                     const randomUser = users[Math.floor(Math.random() * users.length)];
                     await SocialPost.likePost(post._id, randomUser._id);
                }
            }
        }

        // Add comments
        const sampleComments = [
            'Thank you for sharing your experience!',
            'I had a similar experience at this hospital.',
            'This is very helpful information.',
            'I hope the hospital addresses this issue.',
            'Great to hear positive feedback!',
        ];

        for (const post of posts) {
            const commentCount = Math.floor(Math.random() * 4);
            const users = await User.find({ userType: { $ne: 'admin' } }).limit(5);
            
            for (let i = 0; i < commentCount; i++) {
                if (users.length > 0) {
                    const randomUser = users[Math.floor(Math.random() * users.length)];
                    const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
                    await SocialPost.addComment(post._id, randomUser._id, randomComment);
                }
            }
        }

        // Add views
        for (const post of posts) {
             const viewCount = Math.floor(Math.random() * 100) + 10;
             // Update directly as incrementViews increments by 1
             await SocialPost.findByIdAndUpdate(post._id, { viewsCount: viewCount });
        }

        // Verify some posts
        if (admin) {
            for (const post of posts) {
                if (Math.random() > 0.5) {
                    await SocialPost.verifyPost(post._id, admin._id);
                }
            }
        }
    }

    // Display summary
    const stats = await SocialPost.getStats();

    console.log('\n📊 Social Posts Summary:');
    console.log(`   Total Posts: ${stats.totalPosts}`);
    console.log(`   Verified Posts: ${stats.verifiedPosts}`);
    console.log(`   Total Likes: ${stats.totalLikes}`);
    console.log(`   Total Comments: ${stats.totalComments}`);
    console.log(`   Total Views: ${stats.totalViews}`);

  } catch (error) {
    console.error('❌ Error seeding social posts:', error);
    process.exit(1);
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seedSocialPosts()
    .then(() => {
      console.log('\n✨ Social posts seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Social posts seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSocialPosts };
