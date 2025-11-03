# RapidCare - Product Specification Document
## Comprehensive Testing Suite Documentation for TestSprite

---

## 1. Executive Summary

### 1.1 Product Overview
**RapidCare** is an emergency medical resource booking platform that connects patients with hospitals in real-time during critical medical situations. The system enables users to find and book hospital beds, ICUs, operation theatres, surgeons, request blood donations, and schedule home medical sample collection services.

### 1.2 Product Vision
To revolutionize emergency healthcare access by providing a unified digital platform that connects patients with critical medical resources instantly, ensuring no life is lost due to delayed care or resource unavailability.

### 1.3 Product Mission
To become the leading emergency healthcare platform globally, reducing emergency response times and improving patient outcomes through innovative technology and seamless resource coordination.

### 1.4 Technology Stack
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, React Hook Form, Zod validation
- **Backend**: Node.js + Express.js with SQLite database
- **Authentication**: JWT-based with role-based access control
- **Payment**: bKash integration for Bangladesh market
- **Deployment**: Vercel (frontend), Render/Railway (backend)

---

## 2. Product Goals and Objectives

### 2.1 Primary Goals
1. **Instant Resource Access**: Provide real-time availability of critical medical resources
2. **Seamless Booking Experience**: Streamline emergency medical resource booking process
3. **Financial Transparency**: Ensure transparent payment processing with automatic reconciliation
4. **Multi-Stakeholder Platform**: Serve patients, hospitals, donors, and administrators
5. **Emergency-First Design**: Optimize for life-critical situations with minimal friction

### 2.2 Success Metrics
- Booking completion rate > 90%
- Average booking time < 2 minutes
- Payment success rate > 95%
- Real-time resource accuracy > 99%
- User satisfaction score > 4.5/5
- Platform availability > 99.9%

---

## 3. Target Users

### 3.1 Patients/General Users
**Primary persona**: Individuals needing emergency medical care or services

**User needs**:
- Quick access to available hospital resources
- Secure payment processing
- Real-time booking confirmations
- Blood donation requests during emergencies
- Home sample collection services
- Transparent pricing information

**Key workflows**:
- Search for hospitals with available resources
- Book beds, ICUs, operation theatres
- Request surgeon availability
- Submit blood donation requests
- Schedule home medical sample collection
- Make secure bKash payments
- Track booking status in real-time

### 3.2 Hospital Authorities
**Primary persona**: Medical facility representatives managing hospital operations

**User needs**:
- Register and manage hospital listings
- Update real-time resource availability
- Approve/manage surgeon listings
- Handle booking requests and confirmations
- Configure service pricing
- Monitor financial performance
- Manage collection agents
- View revenue analytics

**Key workflows**:
- Register hospital with platform
- Update real-time bed/ICU/OT availability
- Review and approve booking requests
- Configure pricing for resources and tests
- Assign collection agents to requests
- Monitor revenue and financial statements
- View hospital performance analytics

### 3.3 System Administrators
**Primary persona**: Platform overseers maintaining system operations

**User needs**:
- User account management and permissions
- Hospital listing approval and oversight
- Financial monitoring and reporting
- System configuration and maintenance
- Security incident response
- Platform analytics and insights
- Audit trail access

**Key workflows**:
- Approve/reject hospital registrations
- Manage user accounts and roles
- Monitor financial reconciliation
- View system-wide analytics
- Audit security and compliance logs
- Configure system parameters
- Handle fraud detection alerts

### 3.4 Collection Agents
**Primary persona**: Medical professionals handling home sample collection

**User needs**:
- Receive and manage collection requests
- Update request status in real-time
- Communicate with patients
- Report collection completion

**Key workflows**:
- View assigned collection requests
- Update collection status
- Navigate to patient locations
- Complete collection documentation
- Report completion to hospital

---

## 4. Core Features and Functionality

### 4.1 User Authentication & Authorization

#### 4.1.1 Registration Flow
- **User Types**: Regular users, Hospital authorities, Administrators
- **Required Fields**: Name, Email, Password, Phone, User Type
- **Validation**: Email uniqueness, password strength, phone format
- **Default Balance**: New users receive 10,000 BDT starting balance
- **Hospital Authority Setup**: Automatic creation of authority record with permissions

**Acceptance Criteria**:
- Users can register with valid credentials
- Email uniqueness is enforced
- Passwords are hashed with bcrypt (salt rounds: 10)
- Hospital authorities get appropriate permissions
- Registration creates user balance automatically
- Welcome message with JWT token returned

#### 4.1.2 Login Flow
- **Authentication Method**: Email + Password
- **Token Generation**: JWT with 24-hour expiration
- **Session Management**: Token stored in localStorage
- **Role Verification**: Role-based access control
- **Rate Limiting**: 5 attempts per 15 minutes

**Acceptance Criteria**:
- Users can login with correct credentials
- Invalid credentials return appropriate error
- JWT token issued on successful login
- Token includes user ID and role information
- Rate limiting prevents brute force attacks
- Failed login attempts are logged

#### 4.1.3 Authorization System
- **Roles**: user, hospital-authority, admin
- **Permission Levels**: Feature-based access control
- **Token Validation**: Middleware verifies JWT on protected routes
- **Session Timeout**: Automatic redirect after token expiration
- **Financial Operations**: Additional authentication layer required

**Acceptance Criteria**:
- Protected routes verify JWT token
- Role-based access is enforced
- Token expiration triggers re-authentication
- Unauthorized access returns 403 error
- Financial endpoints require additional verification

### 4.2 Hospital Management

#### 4.2.1 Hospital Search
- **Real-time Polling**: Updates every 3-5 seconds
- **Filters**: Location, services, resource availability
- **Search Parameters**: Name, city, services
- **Pagination**: Configurable page size
- **Availability Indicators**: Real-time bed/ICU/OT counts

**Acceptance Criteria**:
- Users can search hospitals by name, city, services
- Results show real-time availability
- Polling updates resource counts automatically
- Filters work correctly in combination
- Pagination handles large result sets
- Empty states display appropriately

#### 4.2.2 Hospital Details
- **Information Display**: Name, address, contact, services
- **Resource Availability**: Current beds, ICUs, operation theatres
- **Surgeon Listing**: Available surgeons with specializations
- **Pricing Information**: Resource pricing and policies
- **Reviews**: User ratings and feedback
- **Location**: Address with map integration

**Acceptance Criteria**:
- All hospital details display correctly
- Resource counts update in real-time
- Surgeon availability shows accurately
- Pricing breakdown is transparent
- Reviews are visible and sortable
- Location information is complete

#### 4.2.3 Hospital Registration (Hospital Authority)
- **Required Information**: Name, address, contact, services
- **Initial Resources**: Bed, ICU, OT capacity setup
- **Approval Workflow**: Admin approval required
- **Status Tracking**: Pending, Approved, Rejected states
- **Rejection Handling**: Reason provided and appealable

**Acceptance Criteria**:
- Hospital authorities can register facilities
- All required fields validated
- Submission creates pending approval status
- Admins receive approval notifications
- Rejected hospitals see detailed reasons
- Approved hospitals become searchable

#### 4.2.4 Resource Management (Hospital Authority)
- **Real-time Updates**: Instant availability changes
- **Resource Types**: Beds, ICUs, Operation Theatres
- **Surgeon Management**: Add, update, remove surgeons
- **Availability Scheduling**: Time-based availability
- **Bulk Updates**: Multiple resources at once

**Acceptance Criteria**:
- Resources update in real-time
- Availability changes reflect immediately
- Surgeon listings update correctly
- Bulk updates process atomically
- Validation prevents negative availability
- Historical changes are logged

### 4.3 Booking System

#### 4.3.1 Resource Booking
- **Resource Types**: Bed, ICU, Operation Theatre
- **Patient Information**: Name, age, gender, contact
- **Medical Details**: Condition, urgency, notes
- **Scheduling**: Preferred date/time selection
- **Surgeon Selection**: Optional surgeon booking
- **Pricing Calculation**: Automatic cost breakdown
- **Service Charge**: 30% platform fee

**Acceptance Criteria**:
- Users can book all resource types
- Patient information validated
- Pricing calculated correctly
- Service charge applied transparently
- Booking creates pending status
- Hospital receives notification
- Confirmation sent to user

#### 4.3.2 Booking Management
- **Status Tracking**: Pending, Confirmed, Completed, Cancelled
- **History View**: All user bookings with filters
- **Details**: Full booking information display
- **Cancellation**: With refund policy application
- **Modification**: Date/time changes (hospital approval)
- **Notifications**: Real-time status updates

**Acceptance Criteria**:
- Users see all bookings in dashboard
- Status updates reflect in real-time
- Cancellation triggers refund process
- Modification requests create approval workflow
- Notifications sent on all status changes
- Filters work correctly

#### 4.3.3 Booking Approval (Hospital Authority)
- **Approval Queue**: All pending bookings
- **Decision Actions**: Approve, Reject, Modify
- **Capacity Checking**: Automated availability verification
- **Surgeon Assignment**: Manual or automatic assignment
- **Notes**: Communication with patients
- **Bulk Processing**: Multiple approvals at once

**Acceptance Criteria**:
- Hospital sees all pending bookings
- Approval triggers booking confirmation
- Rejection returns detailed reason
- Capacity checked before approval
- Surgeon assignment works correctly
- Bulk operations complete successfully
- User notified of decision

### 4.4 Payment System

#### 4.4.1 Payment Processing
- **Payment Method**: bKash mobile financial services
- **Currency**: BDT (Bangladeshi Taka)
- **Integration**: bKash gateway API
- **Transaction Flow**: Initiate → Verify → Complete
- **Retry Logic**: Failed payment retries
- **Receipt Generation**: Automatic receipt creation

**Acceptance Criteria**:
- Payment initiates successfully
- bKash integration works correctly
- Transaction verification accurate
- Failed payments trigger retry
- Receipt generated automatically
- Booking confirmed after payment
- Balance updated correctly

#### 4.4.2 Payment History
- **User View**: All personal transactions
- **Hospital View**: Revenue by hospital
- **Admin View**: Platform-wide transactions
- **Filters**: Date range, status, amount
- **Export**: CSV export functionality
- **Search**: Transaction ID, booking ID search

**Acceptance Criteria**:
- All transactions display correctly
- Filters work as expected
- Search finds transactions accurately
- Export generates valid CSV
- Pagination handles large datasets
- Status indicators correct

#### 4.4.3 Financial Reconciliation
- **Daily Reconciliation**: Automated daily checks
- **Balance Verification**: User and hospital balances
- **Discrepancy Detection**: Automated alerts
- **Transaction Integrity**: Verification processes
- **Report Generation**: Detailed reconciliation reports
- **Audit Trail**: Complete financial audit logs

**Acceptance Criteria**:
- Daily reconciliation runs successfully
- Discrepancies detected accurately
- Alerts sent to administrators
- Reports generated correctly
- Audit logs complete and accurate
- Balance integrity maintained

### 4.5 Blood Donation Network

#### 4.5.1 Blood Request Creation
- **Patient Information**: Name, blood type, units needed
- **Urgency Level**: High, Medium, Low
- **Hospital Selection**: Receiving hospital
- **Contact Details**: Requester contact information
- **Medical Context**: Patient condition
- **Timeline**: Required by date/time

**Acceptance Criteria**:
- Users can create blood requests
- Blood type validated
- Urgency levels work correctly
- Hospital selection validated
- Contact information required
- Request creates active status
- Donors notified immediately

#### 4.5.2 Donor Matching
- **Compatibility Check**: Blood type compatibility
- **Search Interface**: Available requests listing
- **Match Submission**: Donor information and availability
- **Notification System**: Real-time donor matching
- **Status Updates**: Matched, Pending, Completed
- **Multi-donor Support**: Multiple donors per request

**Acceptance Criteria**:
- Compatibility verified correctly
- Donors can find matching requests
- Match submission works successfully
- Notifications sent to all parties
- Status updates reflect accurately
- Multiple matches handled correctly

#### 4.5.3 Request Management
- **Active Requests**: Display of open requests
- **Status Tracking**: Active, Matched, Fulfilled, Cancelled
- **Donor Communication**: Direct messaging
- **Completion Workflow**: Verification and closure
- **Statistics**: Success rates and metrics

**Acceptance Criteria**:
- Requests display correctly
- Status changes reflected in real-time
- Communication features work
- Completion process validates properly
- Statistics calculate accurately
- Filters and search functional

### 4.6 Home Sample Collection (Rapid Collection)

#### 4.6.1 Service Discovery
- **Hospital Listing**: Hospitals offering collection
- **Test Types**: Available medical tests
- **Pricing**: Test pricing with service charge
- **Coverage Areas**: Geographic availability
- **Availability Times**: Scheduling options

**Acceptance Criteria**:
- Hospitals offering collection display
- Test types listed with descriptions
- Pricing shown transparently
- Coverage areas mapped correctly
- Availability times validated
- No authentication required for browsing

#### 4.6.2 Request Submission
- **Hospital Selection**: Choose hospital
- **Test Selection**: Multiple tests supported
- **Patient Details**: Name, phone, address
- **Collection Time**: Preferred scheduling
- **Special Instructions**: Notes for agent
- **Pricing Calculation**: Automatic total
- **Payment**: bKash integration

**Acceptance Criteria**:
- Request submission works without auth
- Multiple tests selectable
- Address validation works
- Time selection validated
- Pricing calculated correctly
- Payment integrated successfully
- Agent assignment automatic

#### 4.6.3 Request Tracking
- **Status Updates**: Real-time status changes
- **Agent Assignment**: Automatic assignment tracking
- **Location Tracking**: Agent location updates
- **Communication**: Direct messaging
- **Completion Verification**: Photo/notes upload
- **Results Delivery**: Hospital notification

**Acceptance Criteria**:
- Status updates display in real-time
- Agent assignment visible
- Location tracking accurate
- Communication features work
- Verification process functional
- Results notification sent

#### 4.6.4 Agent Management
- **Agent Assignment**: Automatic assignment logic
- **Request Queue**: Pending assignments
- **Update Interface**: Status update forms
- **Navigation**: Patient location access
- **Completion Workflow**: Verification and reporting

**Acceptance Criteria**:
- Automatic assignment works correctly
- Queue displays pending requests
- Updates reflected immediately
- Navigation links accurate
- Completion process validated
- Reports generated correctly

### 4.7 Notification System

#### 4.7.1 Real-time Notifications
- **Channel Support**: In-app, Email, SMS
- **Notification Types**: Booking, Payment, Blood, Collection, System
- **Priority Levels**: Critical, High, Medium, Low
- **Delivery Status**: Sent, Delivered, Read
- **Action Buttons**: Direct navigation to related content

**Acceptance Criteria**:
- Notifications sent on events
- Multi-channel delivery works
- Priority ordering correct
- Status tracking accurate
- Action buttons navigate correctly
- Mark as read functionality works

#### 4.7.2 Notification Preferences
- **User Settings**: Customizable preferences
- **Channel Selection**: Choose delivery channels
- **Frequency Control**: Notification frequency
- **Category Control**: Toggle categories
- **Quiet Hours**: Do-not-disturb periods

**Acceptance Criteria**:
- Preferences save correctly
- Channel selection works
- Frequency settings apply
- Category toggles function
- Quiet hours enforced
- Settings persist across sessions

### 4.8 Admin Dashboard

#### 4.8.1 System Statistics
- **User Metrics**: Total, active, new users
- **Hospital Metrics**: Total, active, pending
- **Booking Metrics**: Total, by status
- **Revenue Metrics**: Daily, weekly, monthly
- **Blood Request Metrics**: Total, active, fulfilled
- **Collection Metrics**: Total, by status

**Acceptance Criteria**:
- All metrics display correctly
- Real-time updates work
- Date range filters functional
- Charts render properly
- Export features work
- Data accuracy verified

#### 4.8.2 User Management
- **User Listing**: All users with filters
- **Account Actions**: Suspend, activate, delete
- **Role Management**: Role assignment/modification
- **Balance Management**: Manual adjustments
- **Activity Logs**: User action history

**Acceptance Criteria**:
- User listing displays correctly
- Filters work accurately
- Account actions execute successfully
- Role changes applied immediately
- Balance adjustments logged
- Activity logs complete

#### 4.8.3 Hospital Approval
- **Pending Requests**: New registrations
- **Review Interface**: Detailed hospital information
- **Decision Actions**: Approve, reject, request info
- **Bulk Processing**: Multiple approvals
- **Notification**: Automatic decision notifications

**Acceptance Criteria**:
- Pending requests display
- Review interface complete
- Decisions execute correctly
- Bulk processing works
- Notifications sent
- History tracked

#### 4.8.4 Financial Management
- **Revenue Tracking**: Platform and hospital revenue
- **Transaction Monitoring**: All payment transactions
- **Reconciliation**: Financial reconciliation reports
- **Fraud Detection**: Suspicious activity alerts
- **Analytics**: Revenue trends and forecasting

**Acceptance Criteria**:
- Revenue displays accurately
- Transactions monitor correctly
- Reconciliation reports accurate
- Fraud alerts triggered appropriately
- Analytics calculate correctly
- Export features work

#### 4.8.5 Audit Trail
- **System Logs**: All system activities
- **Filter Options**: User, action, date, resource
- **Detail View**: Complete activity details
- **Search**: Advanced search functionality
- **Export**: Log export for compliance
- **Security Monitoring**: Alert on suspicious activity

**Acceptance Criteria**:
- All activities logged
- Filters work correctly
- Detail view complete
- Search finds entries
- Export generates valid files
- Security alerts triggered

---

## 5. User Flows

### 5.1 Patient Booking Flow

1. **Search for Hospital**
   - Navigate to hospitals page
   - Apply filters (location, services, availability)
   - Review search results
   - Click on hospital for details

2. **Review Hospital Details**
   - View resource availability
   - Check surgeon options
   - Review pricing
   - Read hospital reviews

3. **Initiate Booking**
   - Click "Book Now" for resource type
   - Fill patient information form
   - Select preferred date/time
   - Choose surgeon (optional)
   - Review pricing breakdown

4. **Complete Payment**
   - Review total amount
   - Click "Pay with bKash"
   - Enter bKash credentials
   - Verify payment
   - Receive confirmation

5. **Track Booking**
   - View booking in dashboard
   - Receive status updates
   - Get hospital confirmation
   - Access booking details
   - Print receipt if needed

### 5.2 Blood Request Flow

1. **Create Request**
   - Navigate to blood donation
   - Click "Request Blood"
   - Fill patient information
   - Select blood type and units
   - Choose hospital
   - Set urgency level

2. **Submit Request**
   - Review request details
   - Submit for processing
   - Receive confirmation
   - Wait for donor matches

3. **Donor Matching**
   - Receive notifications of matches
   - Review donor informa