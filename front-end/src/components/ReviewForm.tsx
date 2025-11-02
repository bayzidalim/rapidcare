'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Star } from 'lucide-react';
import { reviewAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ReviewFormProps {
  bookingId: number;
  hospitalId: number;
  hospitalName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReviewForm({
  bookingId,
  hospitalId,
  hospitalName,
  isOpen,
  onClose,
  onSuccess
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await reviewAPI.createReview({
        hospitalId,
        bookingId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        isAnonymous
      });

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });

      // Reset form
      setRating(0);
      setTitle('');
      setComment('');
      setIsAnonymous(false);
      
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setTitle('');
      setComment('');
      setIsAnonymous(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Review Your Experience</DialogTitle>
          <DialogDescription>
            Share your experience at {hospitalName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-gray-600 ml-2">
                  {rating} out of 5 stars
                </span>
              )}
            </div>
          </div>

          {/* Title (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="title">Review Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Summarize your experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              disabled={isSubmitting}
            />
          </div>

          {/* Comment (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="anonymous" className="cursor-pointer text-sm">
              Submit anonymously
            </Label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
