"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  FileText,
  Printer,
  Download,
  Share2,
  Building2,
  Bed,
  Heart,
  Scissors
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingConfirmationProps {
  booking: {
    id: number;
    bookingReference: string;
    patientName: string;
    patientAge: number;
    patientGender: string;
    medicalCondition: string;
    urgency: string;
    resourceType: string;
    scheduledDate: string;
    estimatedDuration: number;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
    notes?: string;
    status: string;
    createdAt: string;
    hospital: {
      name: string;
      phone?: string;
      email?: string;
      emergency?: string;
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  className?: string;
  showActions?: boolean;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  className,
  showActions = true
}) => {
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'beds': return <Bed className="w-5 h-5" />;
      case 'icu': return <Heart className="w-5 h-5" />;
      case 'operationTheatres': return <Scissors className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getResourceLabel = (type: string) => {
    switch (type) {
      case 'beds': return 'Hospital Bed';
      case 'icu': return 'ICU';
      case 'operationTheatres': return 'Operation Theatre';
      default: return type;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a simplified version for download
    const content = `
BOOKING CONFIRMATION
====================

Booking Reference: ${booking.bookingReference}
Date: ${new Date(booking.createdAt).toLocaleDateString()}

PATIENT INFORMATION
-------------------
Name: ${booking.patientName}
Age: ${booking.patientAge}
Gender: ${booking.patientGender}
Medical Condition: ${booking.medicalCondition}
Urgency: ${booking.urgency.toUpperCase()}

BOOKING DETAILS
---------------
Resource: ${getResourceLabel(booking.resourceType)}
Scheduled Date: ${new Date(booking.scheduledDate).toLocaleDateString()}
Duration: ${booking.estimatedDuration} hours
Status: ${booking.status.toUpperCase()}

HOSPITAL INFORMATION
--------------------
Name: ${booking.hospital.name}
Phone: ${booking.hospital.phone || 'N/A'}
Emergency: ${booking.hospital.emergency || 'N/A'}
Address: ${[booking.hospital.street, booking.hospital.city, booking.hospital.state, booking.hospital.zipCode].filter(Boolean).join(', ')}

EMERGENCY CONTACT
-----------------
Name: ${booking.emergencyContactName}
Phone: ${booking.emergencyContactPhone}
Relationship: ${booking.emergencyContactRelationship}

${booking.notes ? `NOTES\n-----\n${booking.notes}` : ''}

Generated on: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${booking.bookingReference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Booking Confirmation',
      text: `Booking confirmed for ${booking.patientName} at ${booking.hospital.name}. Reference: ${booking.bookingReference}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
    }
  };

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Print-friendly header */}
      <div className="print:block hidden mb-6">
        <h1 className="text-2xl font-bold text-center">BOOKING CONFIRMATION</h1>
        <p className="text-center text-gray-600 mt-2">
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Success indicator - hidden in print */}
      <div className="print:hidden mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600">
          Your booking request has been submitted successfully.
        </p>
      </div>

      {/* Action buttons - hidden in print */}
      {showActions && (
        <div className="print:hidden flex justify-center gap-3 mb-6">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleShare} variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      )}

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:pb-4">
          <CardTitle className="flex items-center justify-between">
            <span>Booking Details</span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {booking.bookingReference}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 print:space-y-4">
          {/* Patient Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium">{booking.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Age & Gender</p>
                <p className="font-medium">{booking.patientAge} years, {booking.patientGender}</p>
              </div>
              <div className="md:col-span-2 print:col-span-2">
                <p className="text-sm text-gray-600">Medical Condition</p>
                <p className="font-medium">{booking.medicalCondition}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Urgency Level</p>
                <Badge className={getUrgencyColor(booking.urgency)}>
                  {booking.urgency.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="print:border-gray-300" />

          {/* Booking Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Booking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Resource Type</p>
                <div className="flex items-center gap-2 font-medium">
                  {getResourceIcon(booking.resourceType)}
                  {getResourceLabel(booking.resourceType)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant="outline" className="capitalize">
                  {booking.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Scheduled Date</p>
                <p className="font-medium">
                  {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Duration</p>
                <div className="flex items-center gap-1 font-medium">
                  <Clock className="w-4 h-4" />
                  {booking.estimatedDuration} hours
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Booking Date</p>
                <p className="font-medium">
                  {new Date(booking.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <Separator className="print:border-gray-300" />

          {/* Hospital Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Hospital Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Hospital Name</p>
                <p className="font-medium">{booking.hospital.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <p className="font-medium">{booking.hospital.phone || 'N/A'}</p>
                </div>
              </div>
              {booking.hospital.emergency && (
                <div>
                  <p className="text-sm text-gray-600">Emergency Line</p>
                  <p className="font-medium text-red-600">{booking.hospital.emergency}</p>
                </div>
              )}
              <div className="md:col-span-2 print:col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <div className="flex items-start gap-1">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <p className="font-medium">
                    {[
                      booking.hospital.street,
                      booking.hospital.city,
                      booking.hospital.state,
                      booking.hospital.zipCode
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="print:border-gray-300" />

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{booking.emergencyContactName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{booking.emergencyContactPhone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Relationship</p>
                <p className="font-medium">{booking.emergencyContactRelationship}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <>
              <Separator className="print:border-gray-300" />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Additional Notes
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md print:bg-transparent print:p-0">
                  {booking.notes}
                </p>
              </div>
            </>
          )}

          {/* Important Information */}
          <div className="bg-blue-50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-300">
            <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
            <ul className="text-sm text-blue-800 space-y-1 print:text-black">
              <li>• Please arrive 15 minutes before your scheduled time</li>
              <li>• Bring a valid ID and any relevant medical documents</li>
              <li>• Contact the hospital if you need to reschedule</li>
              <li>• Keep this confirmation for your records</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Print footer */}
      <div className="print:block hidden mt-6 text-center text-sm text-gray-600">
        <p>This is a computer-generated document. No signature required.</p>
        <p>For questions, please contact the hospital directly.</p>
      </div>
    </div>
  );
};

export default BookingConfirmation;