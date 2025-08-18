'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { 
  Building2, 
  Bed, 
  Heart, 
  Clock, 
  Shield, 
  Users, 
  Phone,
  MapPin,
  Star,
  ArrowRight,
  LogIn
} from 'lucide-react';

export default function HomePage() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Emergency Care, Delivered Fast
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              RapidCare
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Access critical medical resources when you need them most. 
              Find and book hospital beds, ICUs, operation theatres, and surgeons in real-time with your emergency care partner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {authenticated ? (
                <>
                  <Link href="/hospitals">
                    <Button size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg bg-blue-600 hover:bg-blue-700">
                      Find Emergency Care
                      <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link href="/booking">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-50 hover:border-blue-300">
                      Book Resources Now
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg bg-blue-600 hover:bg-blue-700 group">
                      <LogIn className="mr-2 w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                      Get Help Now
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-50 hover:border-blue-300">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose RapidCare?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              When every second counts, we connect you with hospitals and medical facilities in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Real-Time Availability</CardTitle>
                <CardDescription>
                  Get instant updates on bed, ICU, and operation theatre availability across multiple hospitals.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Secure Booking</CardTitle>
                <CardDescription>
                  Safe and transparent payment system with instant confirmation for emergency bookings.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Expert Surgeons</CardTitle>
                <CardDescription>
                  Access to qualified surgeons with real-time availability and specialization information.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Blood Donation Network</CardTitle>
                <CardDescription>
                  Connect with blood donors and request blood units when needed for emergency situations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Location Based</CardTitle>
                <CardDescription>
                  Find hospitals near you with detailed location information and contact details.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6 text-teal-600" />
                </div>
                <CardTitle>24/7 Support</CardTitle>
                <CardDescription>
                  Round-the-clock customer support to assist you during emergency situations.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600">Partner Hospitals</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-gray-600">Successful Bookings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Availability</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">99%</div>
              <div className="text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Access Emergency Care?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            When every second counts, RapidCare connects you with critical medical resources instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {authenticated ? (
              <>
                <Link href="/hospitals">
                  <Button size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg bg-blue-600 hover:bg-blue-700">
                    Find Care Now
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/donate-blood">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-red-50 hover:border-red-300">
                    Donate Blood
                    <Heart className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg bg-blue-600 hover:bg-blue-700 group">
                    <LogIn className="mr-2 w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                    Login to Get Started
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-50 hover:border-blue-300">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">RapidCare</span>
              </div>
              <p className="text-gray-400">
                Your emergency care partner - delivering fast access to critical medical resources.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/hospitals" className="hover:text-white">Find Emergency Care</Link></li>
                <li><Link href="/booking" className="hover:text-white">Book Resources</Link></li>
                <li><Link href="/donate-blood" className="hover:text-white">Blood Donation</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Emergency Contacts</Link></li>
                <li><Link href="#" className="hover:text-white">Medical Guidelines</Link></li>
                <li><Link href="#" className="hover:text-white">FAQ</Link></li>
                <li><Link href="#" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Emergency: 999</li>
                <li>Support: +8801843957709</li>
                <li>Email: support@rapidcare.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 RapidCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
