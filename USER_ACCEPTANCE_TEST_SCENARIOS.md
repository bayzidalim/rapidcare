# Hospital Booking System - User Acceptance Test Scenarios

## Overview

This document contains comprehensive User Acceptance Test (UAT) scenarios for the Hospital Booking System. These tests validate that the system meets all business requirements and provides a satisfactory user experience for all user types.

## Test Environment Setup

### Prerequisites
- Backend server running on `http://localhost:5000`
- Frontend application running on `http://localhost:3000`
- Clean database state
- Test data seeded (hospitals, users, etc.)

### Test Users
- **Regular User**: `user-uat@example.com` / `password123`
- **Hospital Authority**: `authority-uat@example.com` / `password123`
- **Admin User**: `admin-uat@example.com` / `password123`

---

## UAT-001: Regular User Booking Resources

### Scenario: Patient books a hospital bed for emergency treatment

**User Type**: Regular User  
**Priority**: High  
**Requirements Covered**: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3

#### Test Steps:

1. **User Registration & Login**
   - Navigate to registration page
   - Fill out registration form with valid details
   - Verify email confirmation (if implemented)
   - Login with credentials
   - **Expected**: User successfully logged in and redirected to dashboard

2. **Hospital Discovery**
   - Navigate to hospitals page
   - View list of available hospitals
   - Filter hospitals by location/services (if available)
   - **Expected**: List of approved hospitals displayed with resource availability

3. **Resource Booking**
   - Select a hospital with available beds
   - Click "Book Resource" or similar action
   - Fill out booking form:
     - Patient Name: "John Doe"
     - Patient Age: 35
     - Gender: Male
     - Medical Condition: "Chest pain, suspected heart attack"
     - Urgency: High
     - Emergency Contact: "Jane Doe", "01234567890", "Spouse"
     - Scheduled Date: Tomorrow
     - Estimated Duration: 48 hours
   - Submit booking request
   - **Expected**: Booking created with "pending" status and unique reference number

4. **Booking Confirmation**
   - Verify booking confirmation page displays
   - Note booking reference number
   - Check booking appears in user dashboard
   - **Expected**: Booking reference displayed, status shows "pending"

5. **Notification Verification**
   - Check for booking submission notification
   - Verify notification appears in notification center
   - **Expected**: "Booking submitted" notification received

#### Acceptance Criteria:
- ✅ User can register and login successfully
- ✅ User can view available hospitals and resources
- ✅ User can submit booking request with all required information
- ✅ Booking receives unique reference number
- ✅ User receives confirmation and notification
- ✅ Booking appears in user's booking history

---

## UAT-002: Hospital Authority Workflow

### Scenario: Hospital authority manages incoming booking requests

**User Type**: Hospital Authority  
**Priority**: High  
**Requirements Covered**: 2.4, 2.5, 2.6, 3.1, 3.2, 3.3

#### Test Steps:

1. **Hospital Authority Login**
   - Login as hospital authority user
   - Navigate to hospital management dashboard
   - **Expected**: Dashboard shows hospital-specific information and pending bookings

2. **View Pending Bookings**
   - Navigate to pending bookings section
   - View list of pending booking requests
   - **Expected**: List shows booking from UAT-001 with all patient details

3. **Review Booking Details**
   - Click on pending booking to view full details
   - Review patient information, medical condition, urgency
   - Check resource availability
   - **Expected**: All booking information clearly displayed

4. **Approve Booking**
   - Select the pending booking
   - Click "Approve" button
   - Add authority notes: "Approved for emergency treatment. Bed 101 assigned."
   - Confirm approval
   - **Expected**: Booking status changes to "approved", resource availability updated

5. **Verify Resource Update**
   - Check hospital resource dashboard
   - Verify available bed count decreased by 1
   - **Expected**: Resource counts updated correctly

6. **Notification to Patient**
   - Verify system sends approval notification to patient
   - **Expected**: Patient receives "Booking approved" notification

#### Alternative Flow - Decline Booking:

1. **Decline Booking**
   - Select a different pending booking
   - Click "Decline" button
   - Select decline reason: "Resource not available at requested time"
   - Add notes: "Please try booking for next week"
   - Confirm decline
   - **Expected**: Booking status changes to "declined"

2. **Verify No Resource Impact**
   - Check resource availability remains unchanged
   - **Expected**: Resource counts not affected by declined booking

#### Acceptance Criteria:
- ✅ Hospital authority can view pending bookings for their hospital
- ✅ Authority can approve bookings with notes
- ✅ Authority can decline bookings with reasons
- ✅ Resource availability updates correctly on approval
- ✅ Patients receive appropriate notifications
- ✅ Declined bookings don't affect resource counts

---

## UAT-003: Booking History and Status Tracking

### Scenario: Users track their booking status and history

**User Type**: Regular User  
**Priority**: Medium  
**Requirements Covered**: 4.1, 4.2, 4.3, 4.4

#### Test Steps:

1. **Access Booking History**
   - Login as regular user
   - Navigate to "My Bookings" or dashboard
   - **Expected**: List of all user's bookings displayed

2. **View Booking Details**
   - Click on approved booking from UAT-001
   - Review booking details and status history
   - **Expected**: Complete booking information and status timeline shown

3. **Track Status Changes**
   - Verify booking shows progression: Pending → Approved
   - Check timestamps for each status change
   - View authority notes from approval
   - **Expected**: Clear status history with timestamps and notes

4. **Search by Reference Number**
   - Use booking reference number to search
   - **Expected**: Booking found and displayed correctly

5. **Filter Bookings**
   - Filter by status (approved, pending, completed)
   - Filter by date range (if available)
   - **Expected**: Filtering works correctly

#### Acceptance Criteria:
- ✅ Users can view complete booking history
- ✅ Booking status changes are tracked with timestamps
- ✅ Users can search bookings by reference number
- ✅ Status progression is clear and informative
- ✅ Authority notes are visible to patients

---

## UAT-004: Notification System

### Scenario: Users receive timely notifications for booking events

**User Type**: All User Types  
**Priority**: High  
**Requirements Covered**: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6

#### Test Steps:

1. **Booking Submission Notifications**
   - Create new booking as regular user
   - Check notification appears immediately
   - **Expected**: "Booking submitted" notification for user and hospital authority

2. **Approval Notifications**
   - Hospital authority approves booking
   - Check user receives approval notification
   - **Expected**: "Booking approved" notification with details

3. **Decline Notifications**
   - Hospital authority declines a booking
   - Check user receives decline notification with reason
   - **Expected**: "Booking declined" notification with reason

4. **Notification Management**
   - Mark notifications as read
   - View notification history
   - **Expected**: Read/unread status managed correctly

5. **Real-time Updates**
   - Verify notifications appear without page refresh
   - Check notification count updates in real-time
   - **Expected**: Real-time notification delivery working

#### Acceptance Criteria:
- ✅ Users receive notifications for all booking events
- ✅ Notifications include relevant details and context
- ✅ Notification status (read/unread) is managed properly
- ✅ Real-time notification delivery works
- ✅ Notification history is accessible

---

## UAT-005: Resource Management and Availability Tracking

### Scenario: System accurately tracks and displays resource availability

**User Type**: Hospital Authority  
**Priority**: High  
**Requirements Covered**: 6.1, 6.2, 6.3, 6.4

#### Test Steps:

1. **View Current Resources**
   - Login as hospital authority
   - Navigate to resource management dashboard
   - **Expected**: Current resource counts displayed (total, available, occupied)

2. **Resource Impact from Bookings**
   - Note current available bed count
   - Approve a bed booking
   - Verify available count decreases by 1
   - **Expected**: Resource counts update immediately

3. **Complete Booking and Release Resources**
   - Mark an approved booking as "completed"
   - Verify available count increases by 1
   - **Expected**: Resources released back to available pool

4. **Multiple Resource Types**
   - Test with different resource types (beds, ICU, operation theatres)
   - Verify each type tracked independently
   - **Expected**: Each resource type managed separately

5. **Resource Conflicts**
   - Attempt to approve booking when no resources available
   - **Expected**: System prevents over-allocation with appropriate error message

#### Acceptance Criteria:
- ✅ Resource availability displayed accurately
- ✅ Bookings correctly impact resource counts
- ✅ Completed bookings release resources
- ✅ System prevents resource over-allocation
- ✅ Different resource types managed independently

---

## UAT-006: System Handles Edge Cases and Error Conditions

### Scenario: System gracefully handles various error conditions

**User Type**: All User Types  
**Priority**: Medium  
**Requirements Covered**: 7.1, 7.2, 7.3, 7.4

#### Test Steps:

1. **Invalid Input Handling**
   - Submit booking form with missing required fields
   - Enter invalid data (negative age, invalid phone number)
   - **Expected**: Clear validation errors displayed

2. **Network Error Handling**
   - Simulate network disconnection during booking submission
   - **Expected**: Appropriate error message and retry option

3. **Session Expiry**
   - Let session expire and attempt to perform actions
   - **Expected**: Redirect to login with session expired message

4. **Concurrent Booking Conflicts**
   - Multiple users attempt to book last available resource
   - **Expected**: Only one booking succeeds, others get appropriate error

5. **Database Error Recovery**
   - Test system behavior during temporary database issues
   - **Expected**: Graceful error handling with user-friendly messages

#### Acceptance Criteria:
- ✅ Form validation prevents invalid submissions
- ✅ Network errors handled gracefully
- ✅ Session management works correctly
- ✅ Concurrent access conflicts resolved properly
- ✅ Database errors don't crash the system

---

## UAT-007: Mobile and Accessibility Testing

### Scenario: System works well on mobile devices and for users with disabilities

**User Type**: All User Types  
**Priority**: Medium  
**Requirements Covered**: 8.1, 8.2, 8.3, 8.4

#### Test Steps:

1. **Mobile Responsiveness**
   - Access system on mobile device (or simulate mobile viewport)
   - Test all major workflows on mobile
   - **Expected**: All features accessible and usable on mobile

2. **Touch Interface**
   - Test touch interactions (tap, swipe, pinch-to-zoom)
   - **Expected**: Touch interactions work smoothly

3. **Keyboard Navigation**
   - Navigate entire system using only keyboard
   - Test tab order and focus management
   - **Expected**: All interactive elements accessible via keyboard

4. **Screen Reader Compatibility**
   - Test with screen reader software (if available)
   - Check for proper ARIA labels and semantic HTML
   - **Expected**: Content accessible to screen readers

5. **High Contrast and Zoom**
   - Test with high contrast mode
   - Test with browser zoom at 200%
   - **Expected**: Content remains readable and functional

#### Acceptance Criteria:
- ✅ System fully functional on mobile devices
- ✅ Touch interactions work properly
- ✅ Keyboard navigation covers all features
- ✅ Screen reader compatibility maintained
- ✅ High contrast and zoom accessibility supported

---

## UAT-008: Performance and Load Testing

### Scenario: System performs well under normal and peak loads

**User Type**: All User Types  
**Priority**: Medium  
**Requirements Covered**: Performance and scalability

#### Test Steps:

1. **Page Load Performance**
   - Measure page load times for all major pages
   - **Expected**: Pages load within 3 seconds on standard connection

2. **Form Submission Performance**
   - Time booking form submission and processing
   - **Expected**: Forms submit and process within 2 seconds

3. **Search and Filter Performance**
   - Test hospital search and filtering with large datasets
   - **Expected**: Search results appear within 1 second

4. **Concurrent User Testing**
   - Simulate multiple users performing actions simultaneously
   - **Expected**: System remains responsive with multiple concurrent users

5. **Database Query Performance**
   - Monitor database query execution times
   - **Expected**: Database queries execute efficiently

#### Acceptance Criteria:
- ✅ Page load times meet performance targets
- ✅ Form submissions process quickly
- ✅ Search functionality is responsive
- ✅ System handles concurrent users well
- ✅ Database performance is optimized

---

## UAT Test Execution Checklist

### Pre-Test Setup
- [ ] Test environment prepared and verified
- [ ] Test data seeded (hospitals, users, resources)
- [ ] All test user accounts created and verified
- [ ] Backend and frontend services running
- [ ] Database in clean state

### Test Execution
- [ ] UAT-001: Regular User Booking Resources
- [ ] UAT-002: Hospital Authority Workflow  
- [ ] UAT-003: Booking History and Status Tracking
- [ ] UAT-004: Notification System
- [ ] UAT-005: Resource Management and Availability Tracking
- [ ] UAT-006: System Handles Edge Cases and Error Conditions
- [ ] UAT-007: Mobile and Accessibility Testing
- [ ] UAT-008: Performance and Load Testing

### Post-Test Activities
- [ ] Document all test results
- [ ] Log any defects or issues found
- [ ] Verify all acceptance criteria met
- [ ] Obtain stakeholder sign-off
- [ ] Plan any necessary remediation

## Test Results Summary Template

### Test Execution Summary
- **Total Test Scenarios**: 8
- **Passed**: ___
- **Failed**: ___
- **Blocked**: ___
- **Not Executed**: ___

### Critical Issues Found
1. [Issue Description] - [Severity] - [Status]
2. [Issue Description] - [Severity] - [Status]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

### Sign-off
- **Business Stakeholder**: _________________ Date: _______
- **Technical Lead**: _________________ Date: _______
- **QA Lead**: _________________ Date: _______

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Status**: Ready for Execution