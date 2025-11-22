'use client';

import { useState } from 'react';
import { socialAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Smile, Frown, AlertCircle, TrendingUp } from 'lucide-react';
import type { Hospital } from '@/lib/types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  hospitals: Hospital[];
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated, hospitals }: CreatePostModalProps) {
  const [formData, setFormData] = useState({
    hospitalId: '',
    postType: 'experience' as 'experience' | 'complaint' | 'problem' | 'moment',
    title: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const postTypes = [
    {
      value: 'experience',
      label: 'Experience',
      icon: <Smile className="w-5 h-5" />,
      color: 'border-green-300 hover:bg-green-50 data-[selected=true]:bg-green-100 data-[selected=true]:border-green-500',
      description: 'Share a positive experience',
    },
    {
      value: 'complaint',
      label: 'Complaint',
      icon: <Frown className="w-5 h-5" />,
      color: 'border-red-300 hover:bg-red-50 data-[selected=true]:bg-red-100 data-[selected=true]:border-red-500',
      description: 'Report an issue or complaint',
    },
    {
      value: 'problem',
      label: 'Problem',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'border-orange-300 hover:bg-orange-50 data-[selected=true]:bg-orange-100 data-[selected=true]:border-orange-500',
      description: 'Highlight a problem',
    },
    {
      value: 'moment',
      label: 'Moment',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'border-blue-300 hover:bg-blue-50 data-[selected=true]:bg-blue-100 data-[selected=true]:border-blue-500',
      description: 'Share a memorable moment',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.hospitalId || !formData.title || !formData.content) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.title.length < 5 || formData.title.length > 200) {
      setError('Title must be between 5 and 200 characters');
      return;
    }

    if (formData.content.length < 10 || formData.content.length > 5000) {
      setError('Content must be between 10 and 5000 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await socialAPI.createPost({
        hospitalId: parseInt(formData.hospitalId),
        postType: formData.postType,
        title: formData.title,
        content: formData.content,
      });
      
      setFormData({
        hospitalId: '',
        postType: 'experience',
        title: '',
        content: '',
      });
      onPostCreated();
    } catch (error: any) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.error || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Post
            </CardTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Hospital Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.hospitalId}
                onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a hospital</option>
                {hospitals.filter(h => h.approvalStatus === 'approved').map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name} - {hospital.address.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Post Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Post Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {postTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, postType: type.value as any })}
                    data-selected={formData.postType === type.value}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 ${type.color}`}
                  >
                    <div className="flex items-center space-x-3">
                      {type.icon}
                      <div className="text-left">
                        <div className="font-semibold">{type.label}</div>
                        <div className="text-xs text-gray-600">{type.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter a descriptive title (5-200 characters)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={5}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Share your experience, complaint, problem, or moment in detail (10-5000 characters)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={8}
                required
                minLength={10}
                maxLength={5000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.content.length}/5000 characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
