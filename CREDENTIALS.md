# Project Login Credentials

This file contains the login credentials for all users and hospitals in the system.
**Note:** All passwords have been reset to `password123` for development convenience.

## Prerequisites
Ensure the database is seeded and credentials assigned:
```bash
cd back-end
npm run seed
npm run assign:credentials
```

## 👥 Standard Users

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **User (Patient)** | `user@example.com` | `password123` | Standard patient account |
| **Admin** | `admin@example.com` | `password123` | System administrator |

## 🏥 Hospital Credentials (Authorities)

These accounts allow login as a Hospital Authority for specific hospitals.

| ID | Hospital Name | Email (Username) | Password |
| :--- | :--- | :--- | :--- |
| 760 | **Dhaka Medical College Hospital** | `info@dmch.gov.bd` | `password123` |
| 761 | **Chittagong Medical College Hospital** | `contact@cmch.gov.bd` | `password123` |
| 762 | **Rajshahi Medical College Hospital** | `info@rmch.gov.bd` | `password123` |
| 763 | **Ibn Sina Hospital** | `ibnsinahospital@rapidcare.com` | `password123` |
| 769 | **Eye hospital** | `info@gmail.com` | `password123` |
| 770 | **Test General Hospital** | `info@testgeneralhospital.com` | `password123` |
| 772 | **Test Resubmission Hospital** | `test@hospital.com` | `password123` |
| 775 | **Test Emergency Hospital** | `test@testhospital.com` | `password123` |
| 776 | **Updated Test Emergency Hospital** | `updated@testhospital.com` | `password123` |

---
Generated on: 12/10/2025, 10:25:24 AM
