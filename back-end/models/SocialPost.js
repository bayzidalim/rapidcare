const mongoose = require('mongoose');

// Comment Schema (Embedded in Post mostly, but better separate for scaling? 
// The original code has getComments() which implies fetching.
// Let's make a separate Schema for comments but keep it in this file or separate?
// I'll make it a model 'SocialPostComment' inside this file if possible, or usually separate file.
// But to keep file count same-ish, I'll export it from here if needed, or just use it internally.
// Actually, I'll create a separate model for comments to handle independent lifecycle/IDs properly.
// But wait, the original code had `getComments` on `SocialPost` class.

const socialPostCommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialPost', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const SocialPostComment = mongoose.model('SocialPostComment', socialPostCommentSchema);


const socialPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  postType: String,
  title: String,
  content: String,
  viewsCount: { type: Number, default: 0 },
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  isAdminVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  isActive: { type: Boolean, default: true },
  // Likes - Array of User IDs who liked
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static methods
socialPostSchema.statics.findAll = function(filters = {}) {
  let query = this.find({ isActive: true });

  if (filters.hospitalId) query = query.where('hospitalId').equals(filters.hospitalId);
  if (filters.postType) query = query.where('postType').equals(filters.postType);
  if (filters.isAdminVerified !== undefined) query = query.where('isAdminVerified').equals(filters.isAdminVerified);
  if (filters.userId) query = query.where('userId').equals(filters.userId);

  query = query
    .populate('userId', 'name email')
    .populate('hospitalId', 'name city')
    .populate('verifiedBy', 'name')
    .sort({ createdAt: -1 });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.skip(filters.offset);

  return query;
};

socialPostSchema.statics.verifyPost = function(id, adminId) {
    return this.findByIdAndUpdate(id, {
        isAdminVerified: true,
        verifiedBy: adminId,
        verifiedAt: new Date()
    }, { new: true });
};

socialPostSchema.statics.unverifyPost = function(id) {
    return this.findByIdAndUpdate(id, {
        isAdminVerified: false,
        verifiedBy: null,
        verifiedAt: null
    }, { new: true });
};

socialPostSchema.statics.incrementViews = function(id) {
    return this.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });
};

socialPostSchema.statics.likePost = async function(postId, userId) {
    // Check if matched
    const post = await this.findOne({ _id: postId, likes: userId });
    if (post) return false; // Already liked

    await this.findByIdAndUpdate(postId, {
        $addToSet: { likes: userId },
        $inc: { likesCount: 1 }
    });
    return true;
};

socialPostSchema.statics.unlikePost = async function(postId, userId) {
    const result = await this.updateOne(
        { _id: postId, likes: userId }, // Condition
        { 
            $pull: { likes: userId },
            $inc: { likesCount: -1 } 
        }
    );
    return result.modifiedCount > 0;
};

socialPostSchema.statics.hasUserLiked = async function(postId, userId) {
    const post = await this.findOne({ _id: postId, likes: userId });
    return !!post;
};

// Comment methods
socialPostSchema.statics.getComments = async function(postId) {
    return SocialPostComment.find({ postId, isActive: true })
        .populate('userId', 'name email')
        .sort({ createdAt: 1 });
};

socialPostSchema.statics.addComment = async function(postId, userId, content) {
    const comment = await SocialPostComment.create({
        postId,
        userId,
        content
    });
    
    // Update count on post
    await this.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    
    return comment._id;
};

socialPostSchema.statics.deleteComment = async function(commentId) {
    const comment = await SocialPostComment.findByIdAndUpdate(commentId, { isActive: false });
    if (comment) {
        // Decrease count
        await this.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    }
    return !!comment;
};

socialPostSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalPosts: { $sum: 1 },
                verifiedPosts: { $sum: { $cond: ['$isAdminVerified', 1, 0] } },
                totalLikes: { $sum: '$likesCount' },
                totalComments: { $sum: '$commentsCount' },
                totalViews: { $sum: '$viewsCount' }
            }
        }
    ]);
    return stats[0] || { totalPosts: 0, verifiedPosts: 0, totalLikes: 0, totalComments: 0, totalViews: 0 };
};


const SocialPost = mongoose.model('SocialPost', socialPostSchema);

module.exports = SocialPost;
