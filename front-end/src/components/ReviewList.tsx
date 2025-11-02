'use client';

import React, { useState, useEffect } from 'react';
import { ReviewCard } from './ReviewCard';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Review, ReviewResponse } from '@/lib/types';
import { reviewAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Filter, Star } from 'lucide-react';

interface ReviewListProps {
  hospitalId: number;
  showHospitalName?: boolean;
  canEdit?: boolean;
  canVote?: boolean;
  onReviewUpdate?: () => void;
}

export function ReviewList({
  hospitalId,
  showHospitalName = false,
  canEdit = false,
  canVote = true,
  onReviewUpdate
}: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewResponse['stats'] | null>(null);
  const [pagination, setPagination] = useState<ReviewResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    rating: 'all',
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  });
  
  const { toast } = useToast();

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiFilters = {
        ...filters,
        rating: filters.rating === 'all' ? null : filters.rating
      };
      const response = await reviewAPI.getHospitalReviews(hospitalId, apiFilters);
      setReviews(response.data.reviews);
      setStats(response.data.stats);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      setError(error.response?.data?.error || 'Failed to load reviews');
      toast({
        title: "Error",
        description: "Failed to load reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [hospitalId, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleReviewUpdate = () => {
    fetchReviews();
    onReviewUpdate?.();
  };

  const handleReviewDelete = async (reviewId: number) => {
    try {
      await reviewAPI.deleteReview(reviewId);
      toast({
        title: "Review Deleted",
        description: "Your review has been deleted successfully.",
      });
      handleReviewUpdate();
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchReviews} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats and Filters */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm text-gray-600">
                    ({stats.totalReviews || 0} reviews)
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.ratingDistribution?.[`${rating}Star` as keyof typeof stats.ratingDistribution] || 0;
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center gap-1 text-sm">
                      <span className="text-gray-600">{rating}</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-600 w-6">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        <Select value={filters.rating} onValueChange={(value) => handleFilterChange('rating', value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            <SelectItem value="5">5 stars</SelectItem>
            <SelectItem value="4">4 stars</SelectItem>
            <SelectItem value="3">3 stars</SelectItem>
            <SelectItem value="2">2 stars</SelectItem>
            <SelectItem value="1">1 star</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="helpfulCount">Helpful</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DESC">Newest first</SelectItem>
            <SelectItem value="ASC">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews List */}
      {!reviews || reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No reviews found for this hospital.</p>
          <p className="text-sm text-gray-400">Be the first to write a review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              showHospitalName={showHospitalName}
              canEdit={canEdit}
              canVote={canVote}
              onUpdate={() => handleReviewUpdate()}
              onDelete={() => handleReviewDelete(review.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.pages || 1) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={pagination.page === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
