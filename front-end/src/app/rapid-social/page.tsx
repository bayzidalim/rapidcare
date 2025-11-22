'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socialAPI, hospitalAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import Navigation from '@/components/Navigation';
import AnimatedPage, { ScrollReveal, AnimatedList, AnimatedListItem } from '@/components/AnimatedPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Heart, 
  Eye, 
  Shield, 
  Plus,
  Filter,
  TrendingUp,
  AlertCircle,
  Smile,
  Frown
} from 'lucide-react';
import type { SocialPost, Hospital, SocialStats } from '@/lib/types';
import SocialPostCard from '@/components/SocialPostCard';
import CreatePostModal from '@/components/CreatePostModal';

export default function RapidSocialPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    hospitalId: undefined as number | undefined,
    postType: undefined as string | undefined,
    isAdminVerified: undefined as boolean | undefined,
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Hydration-safe authentication check
    setAuthenticated(isAuthenticated());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      loadData();
    }
  }, [filters, isHydrated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [postsRes, hospitalsRes, statsRes] = await Promise.all([
        socialAPI.getAllPosts(filters),
        hospitalAPI.getAll(),
        socialAPI.getStats(),
      ]);

      setPosts(postsRes.data.data || []);
      setHospitals(hospitalsRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    setIsCreateModalOpen(false);
    loadData();
  };

  const handlePostDeleted = () => {
    loadData();
  };

  const handlePostVerified = () => {
    loadData();
  };

  const postTypeIcons = {
    experience: <Smile className="w-4 h-4" />,
    complaint: <Frown className="w-4 h-4" />,
    problem: <AlertCircle className="w-4 h-4" />,
    moment: <TrendingUp className="w-4 h-4" />,
  };

  const postTypeColors = {
    experience: 'bg-green-100 text-green-700 border-green-200',
    complaint: 'bg-red-100 text-red-700 border-red-200',
    problem: 'bg-orange-100 text-orange-700 border-orange-200',
    moment: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <AnimatedPage>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    Rapid Social
                  </h1>
                  <p className="text-gray-600">
                    Share your hospital experiences, complaints, and moments with the community
                  </p>
                </div>
                {isHydrated && authenticated && (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                )}
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <Card className="border-blue-200 bg-white/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Posts</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-white/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Verified</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.verifiedPosts}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200 bg-white/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Heart className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Likes</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalLikes}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-white/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Comments</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalComments}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-indigo-200 bg-white/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Views</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </AnimatedPage>

          {/* Filters */}
          <ScrollReveal>
            <Card className="border-gray-200 bg-white/80 backdrop-blur mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hospital
                    </label>
                    <select
                      value={filters.hospitalId || ''}
                      onChange={(e) => setFilters({ ...filters, hospitalId: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Hospitals</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Post Type
                    </label>
                    <select
                      value={filters.postType || ''}
                      onChange={(e) => setFilters({ ...filters, postType: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="experience">Experience</option>
                      <option value="complaint">Complaint</option>
                      <option value="problem">Problem</option>
                      <option value="moment">Moment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Status
                    </label>
                    <select
                      value={filters.isAdminVerified === undefined ? '' : filters.isAdminVerified.toString()}
                      onChange={(e) => setFilters({ ...filters, isAdminVerified: e.target.value === '' ? undefined : e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Posts</option>
                      <option value="true">Verified Only</option>
                      <option value="false">Unverified Only</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Posts List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <Card className="border-gray-200 bg-white/80 backdrop-blur">
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-4">
                  Be the first to share your hospital experience!
                </p>
                {isHydrated && authenticated && (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Post
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <AnimatedList className="space-y-4">
              {posts.map((post) => (
                <AnimatedListItem key={post.id}>
                  <SocialPostCard
                    post={post}
                    onDeleted={handlePostDeleted}
                    onVerified={handlePostVerified}
                  />
                </AnimatedListItem>
              ))}
            </AnimatedList>
          )}
        </div>

        {/* Create Post Modal */}
        <CreatePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onPostCreated={handlePostCreated}
          hospitals={hospitals}
        />
      </div>
    </>
  );
}
