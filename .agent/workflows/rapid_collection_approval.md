---
description: Rapid Collection Approval Workflow
---

# Rapid Collection Approval Workflow

This workflow describes the process for users to request home sample collection and for hospital authorities to approve or reject these requests.

## 1. User Request (Frontend)
1.  **Navigate:** User goes to `/rapid-collection`.
2.  **Select Hospital:** User searches for and selects a hospital (e.g., "Dhaka Medical College Hospital").
    *   *Note:* Only hospitals with `home_collection_available = 1` in `hospital_test_services` are listed.
3.  **Select Tests:** User selects one or more available tests.
4.  **Enter Details:** User provides patient name, phone, address, and preferred time.
5.  **Submit:** User submits the request.
    *   **API:** `POST /api/sample-collection/submit-request`
    *   **Status:** Request is created with `approval_status: 'pending'`.

## 2. Hospital Authority Approval (Dashboard)
1.  **Login:** Hospital Authority logs in.
2.  **Navigate:** Go to Dashboard -> "Sample Collection" tab.
3.  **View Pending:** The "Pending" tab lists all requests with `approval_status: 'pending'`.
4.  **Action:**
    *   **Approve:** Click "Approve Request".
        *   **API:** `PUT /api/sample-collection/hospital/requests/:id/approve`
        *   **Result:** Status changes to `approved`. An agent is auto-assigned if available.
    *   **Reject:** Click "Reject Request" and provide a reason.
        *   **API:** `PUT /api/sample-collection/hospital/requests/:id/reject`
        *   **Result:** Status changes to `rejected`.

## 3. Post-Approval
*   **Approved:** The request moves to the "Approved" tab in the dashboard. The user can see the status in their "My Bookings" or similar view (if implemented).
*   **Rejected:** The request moves to the "Rejected" tab.

## Troubleshooting
*   **Request not appearing?** Check if the `hospital_id` in `sample_collection_requests` matches the logged-in authority's hospital ID.
*   **Duplicate Hospitals:** Ensure there are no duplicate hospital entries in the database with the same name.
