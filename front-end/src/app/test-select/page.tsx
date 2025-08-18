'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TestSelectPage() {
  const [hospital, setHospital] = useState('');
  const [resource, setResource] = useState('');
  const [urgency, setUrgency] = useState('');

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple Select Test</h1>
      
      {/* New Simple API */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold">New Simple API</h2>
        
        <div>
          <label className="block text-sm font-medium mb-2">Hospital (Simple):</label>
          <Select 
            value={hospital} 
            onValueChange={setHospital}
            placeholder="Select a hospital"
          >
            <SelectItem value="1">City Hospital - New York</SelectItem>
            <SelectItem value="2">General Hospital - Boston</SelectItem>
            <SelectItem value="3">Medical Center - Chicago</SelectItem>
          </Select>
          <p className="text-sm text-gray-600 mt-1">Selected: {hospital}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Resource Type (Simple):</label>
          <Select 
            value={resource} 
            onValueChange={setResource}
            placeholder="Select resource type"
          >
            <SelectItem value="beds">Hospital Bed</SelectItem>
            <SelectItem value="icu">ICU</SelectItem>
            <SelectItem value="operationTheatres">Operation Theatre</SelectItem>
          </Select>
          <p className="text-sm text-gray-600 mt-1">Selected: {resource}</p>
        </div>
      </div>

      {/* Old Complex API (for backward compatibility) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Old Complex API (Backward Compatible)</h2>
        
        <div>
          <label className="block text-sm font-medium mb-2">Urgency (Complex):</label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger>
              <SelectValue placeholder="Select urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - Routine care</SelectItem>
              <SelectItem value="medium">Medium - Standard priority</SelectItem>
              <SelectItem value="high">High - Urgent care needed</SelectItem>
              <SelectItem value="critical">Critical - Emergency</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600 mt-1">Selected: {urgency}</p>
        </div>
      </div>
    </div>
  );
}