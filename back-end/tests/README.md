# Rapid Assistance Unit Tests

This document describes the comprehensive unit tests implemented for the Rapid Assistance functionality.

## Test Coverage

### 1. Age-based Eligibility Validation Tests
- ✅ Allow rapid assistance for patients aged 60 and above
- ✅ Allow rapid assistance for patients over 60
- ✅ Reject rapid assistance for patients under 60
- ✅ Reject rapid assistance for patients significantly under 60
- ✅ Allow booking without rapid assistance for any age
- ✅ Handle missing age when rapid assistance is requested
- ✅ Handle undefined age when rapid assistance is requested
- ✅ Handle invalid age type when rapid assistance is requested
- ✅ Handle edge case of exactly 60 years old

### 2. Payment Calculation Tests
- ✅ Calculate 200৳ charge when rapid assistance is selected
- ✅ Calculate 0৳ charge when rapid assistance is not selected
- ✅ Calculate 0৳ charge when rapid assistance is null
- ✅ Calculate 0৳ charge when rapid assistance is undefined
- ✅ Add 200৳ to total payment when rapid assistance is selected for eligible patient
- ✅ Not add rapid assistance charge when not selected

### 3. Booking Creation Tests
- ✅ Create booking with rapid assistance for eligible patient
- ✅ Create booking without rapid assistance for eligible patient when not selected
- ✅ Reject booking creation with rapid assistance for ineligible patient
- ✅ Create booking without rapid assistance for ineligible patient when not selected

### 4. Assistant Assignment Tests
- ✅ Assign assistant with valid Bangladeshi name and phone number
- ✅ Assign different assistants on multiple calls (randomization)

### 5. Rapid Assistance Update Tests
- ✅ Update booking to add rapid assistance for eligible patient
- ✅ Reject rapid assistance update for ineligible patient
- ✅ Handle booking not found error

### 6. Controller-level Tests
- ✅ Create booking with rapid assistance through API for eligible patient
- ✅ Reject booking with rapid assistance through API for ineligible patient
- ✅ Create booking without rapid assistance through API for any age
- ✅ Handle missing patient age when rapid assistance is requested through API
- ✅ Handle booking service errors gracefully

### 7. Payment Processing Tests
- ✅ Process payment with rapid assistance charge for eligible patient
- ✅ Reject payment with rapid assistance for ineligible patient
- ✅ Process payment without rapid assistance charge when not requested
- ✅ Handle payment amount mismatch with rapid assistance
- ✅ Handle insufficient balance for payment with rapid assistance

## Test Files

### `tests/services/rapidAssistance.test.js`
Comprehensive unit tests for the ValidationService and BookingService rapid assistance functionality.

### `tests/controllers/bookingController.test.js`
Tests for the booking controller's rapid assistance validation and creation logic.

### `tests/controllers/paymentController.test.js`
Tests for payment processing with rapid assistance charges and validation.

## Running Tests

```bash
# Run all tests
npm test

# Run only rapid assistance tests
npm run test:rapid-assistance

# Run tests in watch mode
npm run test:watch
```

## Test Requirements Coverage

The tests cover all requirements specified in the task:

1. **Age-based eligibility validation** - Comprehensive tests for all age scenarios
2. **Payment calculation with rapid assistance charges (200৳ addition)** - Tests for charge calculation and total payment computation
3. **Booking creation with and without rapid assistance flag** - Tests for both scenarios with proper validation

All tests use proper mocking with Sinon to isolate units under test and verify correct behavior without database dependencies.

## Test Statistics

- **Total Tests**: 34
- **Passing**: 34
- **Failing**: 0
- **Coverage Areas**: Validation, Payment Calculation, Booking Creation, Assistant Assignment, Error Handling