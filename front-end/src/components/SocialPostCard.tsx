'use client';

import { useState } from 'react';
import { socialAPI } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageSquare, 
  Eye, 
  Shield, 
  Trash2,
  ShieldCheck,
  ShieldOff,
  Smile,
  Frown,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import type { SocialPost } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface SocialPostCardProps {
  post: SocialPost;
  onDeleted?: () => void;
  onVerified?: () => void;
}

export default function SocialPostCard({ post, onDeleted, onVerified }: SocialPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.hasUserLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  const currentUser = getCurrentUser();
  const isOwner = currentUser?.id === post.userId;
  const isAdmin = currentUser?.userType === 'admin';
  const canDelete = isAdmin; // Only admins can delete posts

  const postTypeConfig = {
    experience: {
      icon: <Smile className="w-4 h-4" />,
      label: 'Experience',
      color: 'bg-green-100 text-green-700 border-green-200',
    },
    complaint: {
      icon: <Frown className="w-4 h-4" />,
      label: 'Complaint',
      color: 'bg-red-100 text-red-700 border-red-200',
    },
    problem: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Problem',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    moment: {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Moment',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
  };

  const config = postTypeConfig[post.postType];

  const handleLike = async () => {
    if (!currentUser) return;

    try {
      const response = await socialAPI.toggleLike(post.id);
      setIsLiked(response.data.liked);
      setLikesCount(prev => response.data.liked ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      setIsDeleting(true);
      await socialAPI.deletePost(post.id);
      onDeleted?.();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      if (post.isAdminVerified) {
        await socialAPI.unverifyPost(post.id);
      } else {
        await socialAPI.verifyPost(post.id);
      }
      onVerified?.();
    } catch (error) {
      console.error('Error verifying post:', error);
      alert('Failed to update verification status');
    } finally {
      setIsVerifying(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await socialAPI.getComments(post.id);
      setComments(response.data.data);
      setShowComments(true);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      setIsAddingComment(true);
      await socialAPI.addComment(post.id, newComment);
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  return (
    <Card className="border-gray-200 bg-white/80 backdrop-blur hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={`${config.color} border`}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
              {post.isAdminVerified && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Admin Verified
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="font-medium">{post.userName}</span>
              <span>•</span>
              <span>{post.hospitalName}</span>
              {post.hospitalCity && (
                <>
                  <span>•</span>
                  <span>{post.hospitalCity}</span>
                </>
              )}
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerify}
                disabled={isVerifying}
                className={post.isAdminVerified ? 'border-orange-300 text-orange-700 hover:bg-orange-50' : 'border-green-300 text-green-700 hover:bg-green-50'}
              >
                {post.isAdminVerified ? (
                  <>
                    <ShieldOff className="w-4 h-4 mr-1" />
                    Unverify
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    Verify
                  </>
                )}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 whitespace-pre-wrap mb-4">{post.content}</p>

        {/* Engagement Stats */}
        <div className="flex items-center space-x-6 py-3 border-t border-gray-200">
          <button
            onClick={handleLike}
            disabled={!currentUser}
            className={`flex items-center space-x-2 transition-all duration-200 ${
              isLiked 
                ? 'text-red-600' 
                : 'text-gray-600 hover:text-red-600'
            } ${!currentUser && 'opacity-50 cursor-not-allowed'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked && 'fill-current'}`} />
            <span className="font-medium">{likesCount}</span>
          </button>
          <button
            onClick={() => showComments ? setShowComments(false) : loadComments()}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">{post.commentsCount}</span>
          </button>
          <div className="flex items-center space-x-2 text-gray-600">
            <Eye className="w-5 h-5" />
            <span className="font-medium">{post.viewsCount}</span>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Comments</h4>
            
            {/* Add Comment */}
            {currentUser && (
              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isAddingComment}
                  size="sm"
                  className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isAddingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{comment.userName}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
