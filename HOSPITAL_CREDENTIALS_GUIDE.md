# Hospital Credentials Management Guide

## Overview

Every hospital in the RapidCare system now has dedicated login credentials for hospital authorities to manage their facilities.

## Quick Commands

### Assign/Update Credentials for All Hospitals
```bash
cd back-end
npm run assign:credentials
```

### View Existing Credentials
```bash
cd back-end
npm run view:credentials
```

## What Was Created

### 1. Credential Assignment Script
**Location:** `back-end/utils/assignHospitalCredentials.js`

This script:
- Scans all approved hospitals in the database
- Creates a hospital-authority user account for each hospital
- Generates secure random passwords
- Links accounts to their respective hospitals
- Saves credentials to files for reference

### 2. Credential Viewer Script
**Location:** `back-end/utils/viewHospitalCredentials.js`

Displays all hospital credentials without regenerating them.

### 3. Credential Files
- **JSON Format:** `back-end/hospital_credentials.json`
- **Readable Format:** `HOSPITAL_CREDENTIALS.md` (root directory)

Both files are automatically added to `.gitignore` for security.

## Current Hospital Accounts

8 hospital accounts have been created:

1. **Dhaka Medical College Hospital**
   - Email: info@dmch.gov.bd
   - Password: Hospital@760b9gg

2. **Chittagong Medical College Hospital**
   - Email: contact@cmch.gov.bd
   - Password: Hospital@761r10j

3. **Rajshahi Medical College Hospital**
   - Email: info@rmch.gov.bd
   - Password: Hospital@762hr9n

4. **Ibn Sina Hospital**
   - Email: ibnsinahospital763@rapidcare.com
   - Password: Hospital@763y85g

5. **Eye hospital**
   - Email: info@gmail.com
   - Password: Hospital@76957q0

6. **Test General Hospital**
   - Email: info@testgeneralhospital.com
   - Password: Hospital@770pnl8

7. **Test Emergency Hospital**
   - Email: test@testhospital.com
   - Password: Hospital@775ctpu

8. **Updated Test Emergency Hospital**
   - Email: updated@testhospital.com
   - Password: Hospital@776gwl2

## How to Use

### For Hospital Staff
1. Go to http://localhost:3000/login
2. Enter your hospital's email and password
3. You'll have access to:
   - Manage hospital resources (beds, ICU, operation theatres)
   - Update hospital information
   - View bookings and payments
   - Manage pricing
   - View analytics

### For Administrators
1. Run `npm run assign:credentials` to create accounts for new hospitals
2. Run `npm run view:credentials` to see all credentials
3. Share credentials securely with hospital staff
4. Advise hospitals to change passwords after first login

## Security Features

✅ Passwords are hashed with bcrypt before storage
✅ Credential files are in `.gitignore`
✅ Random password generation for security
✅ Each hospital has isolated access to their data
✅ Role-based access control (hospital-authority)

## Adding New Hospitals

When new hospitals are added to the system:

1. Ensure the hospital is approved in the database
2. Run: `npm run assign:credentials`
3. The script will create accounts for new hospitals only
4. Existing hospital accounts will be updated (not duplicated)

## Troubleshooting

### "No credentials file found"
Run: `npm run assign:credentials`

### "UNIQUE constraint failed"
This is normal - it means the account already exists and was updated.

### Need to reset a password
Run: `npm run assign:credentials` - it will generate new passwords for all hospitals.

### Can't login with credentials
1. Verify the hospital is approved in the database
2. Check that the user account exists: `SELECT * FROM users WHERE hospital_id = {hospital_id}`
3. Ensure the frontend is running on http://localhost:3000

## Production Recommendations

1. **Change Default Passwords:** Hospitals should change passwords after first login
2. **Implement Password Reset:** Add forgot password functionality
3. **Two-Factor Authentication:** Enable 2FA for hospital accounts
4. **Audit Logging:** Monitor hospital authority actions
5. **Regular Security Reviews:** Audit access and permissions quarterly

## Files Modified

- ✅ Created: `back-end/utils/assignHospitalCredentials.js`
- ✅ Created: `back-end/utils/viewHospitalCredentials.js`
- ✅ Created: `back-end/utils/README.md`
- ✅ Updated: `back-end/package.json` (added npm scripts)
- ✅ Updated: `.gitignore` (added credential files)
- ✅ Created: `HOSPITAL_CREDENTIALS.md`
- ✅ Created: `back-end/hospital_credentials.json`

## Support

For issues or questions about hospital credentials:
1. Check the credential files for current passwords
2. Review the backend logs for error messages
3. Verify database connectivity
4. Ensure all migrations have been run

---

**Last Updated:** November 14, 2025
**Total Hospital Accounts:** 8
