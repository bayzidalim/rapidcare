'use client';

import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ThumbsUp, ThumbsDown, User, Shield, Calendar } from 'lucide-react';
import { Review } from '@/lib/types';
import { reviewAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ReviewCardProps {
  review: Review;
  showHospitalName?: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canVote?: boolean;
}

export function ReviewCard({
  review,
  showHospitalName = false,
  onUpdate,
  onDelete,
  canEdit = false,
  canVote = true
}: ReviewCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const { toast } = useToast();

  const handleHelpfulVote = async (isHelpful: boolean) => {
    if (!canVote || isVoting) return;

    setIsVoting(true);
    try {
      await reviewAPI.addHelpfulVote(review.id, isHelpful);
      setHelpfulCount(prev => isHelpful ? prev + 1 : Math.max(0, prev - 1));
      toast({
        title: "Thank you for your feedback",
        description: isHelpful ? "Marked as helpful" : "Removed helpful vote",
      });
    } catch (error) {
      console.error('Error voting on review:', error);
      toast({
        title: "Error",
        description: "Failed to vote on review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {review.isAnonymous ? 'Anonymous' : review.userName || 'User'}
              </span>
              {review.isVerified && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(review.createdAt)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
          {canEdit && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onUpdate}
                className="h-8 px-2"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 px-2 text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {showHospitalName && review.hospitalName && (
        <div className="mb-2">
          <span className="text-sm text-gray-600">
            Review for <span className="font-medium">{review.hospitalName}</span>
          </span>
        </div>
      )}

      {review.title && (
        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
      )}

      {review.comment && (
        <p className="text-gray-700 text-sm leading-relaxed mb-3">
          {review.comment}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {canVote && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleHelpfulVote(true)}
                disabled={isVoting}
                className="h-8 px-2 text-green-600 hover:text-green-700"
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                Helpful ({helpfulCount})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleHelpfulVote(false)}
                disabled={isVoting}
                className="h-8 px-2 text-gray-600 hover:text-gray-700"
              >
                <ThumbsDown className="w-3 h-3 mr-1" />
                Not helpful
              </Button>
            </>
          )}
        </div>
        
        {!canVote && helpfulCount > 0 && (
          <span className="text-sm text-gray-500">
            {helpfulCount} people found this helpful
          </span>
        )}
      </div>
    </div>
  );
}
