# People Management Module Specification

## 1. Roles Overview

### Admin

* Full user management access
* Role assignment control (Admin, HR, Employee)
* System integrity enforcement (must always have at least one Admin)

### HR

* Employee directory access
* Onboarding and offboarding management
* Profile editing and activity tracking access
* Document review authority

### Supervisor

* Access to direct and indirect reports
* Organizational visibility within hierarchy
* Notification access for onboarding/offboarding in reporting line

### Employee

* Self-service onboarding and profile management
* Document upload and clearance participation
* Limited profile visibility based on access rules

---

## 2. Admin Features

### User Management

* Add users (HR or Employee)
* Deactivate users (soft delete only)

  * Data and history must remain intact
* Change user roles
* System constraint:

  * Must always retain at least one Admin

---

## 3. HR Features

### 3.1 Employee Directory

* View all employees
* Search and filter employees
* View employee details:

  * Status (Onboarding, Active, Offboarding, Inactive)
  * Teams
  * Supervisor
* Full access to all employee profiles (no redaction)
* Edit employee profiles

### 3.2 Activity Tracker

* Track profile field changes:

  * Field name
  * Old value
  * New value
  * Timestamp
* Scope: profile edits only

---

## 4. Onboarding Module

### 4.1 Required Inputs

* Company Email
* Job Title
* Supervisor
* Department

### 4.2 Pre-filled Fields

* Personal Email
* First Name
* Last Name
* Middle Name
* Birthday
* Address
* Emergency Contact

### 4.3 Bulk Onboarding

* Upload `.xlsx` file
* Columns must support required + pre-filled fields

### 4.4 Required Documents

* Document Name
* Instructions / Notes
* Supported File Types

### 4.5 Custom Fields

* Text-only fields (MVP)
* Configurable as Required or Optional
* Visible after onboarding completion

### 4.6 Invitation System

* Email invitation sent on onboarding creation
* Resend invitation capability
* Editable email before account creation (resends invitation)
* Invitation statuses:

  * Accepted
  * Expired
  * Failed Delivery

### 4.7 Document Review

* Approve / Reject per document
* Rejection requires notes
* Employee can re-upload rejected documents

### 4.8 Completion Rule

Onboarding is complete when:

* All required fields are filled
* All required documents are approved

Result:

* Employee status becomes **Active**

### 4.9 Notifications

* HR receives notification upon onboarding completion

---

## 5. Offboarding Module

### 5.1 Required Fields

* Employee
* Tender Date
* Effective Date (≥ Tender Date)
* Clearance Version
* Optional attachment

### 5.2 Supervisor Offboarding Rules

If employee has:

* Direct reports → must reassign supervisor
* Teams → must reassign team leader

---

## 6. Clearance System

### 6.1 Clearance Setup

* Clearance Version Name
* Signatories:

  * Employee
  * Purpose (long text)
  * Requirements (long text)

### 6.2 Management Features

* Set default clearance version
* Replace signatory in-progress

### 6.3 Rejection Handling

* Signatories can reject with reason
* HR notified on rejection
* HR can reset status to pending

### 6.4 Completion Rule

Clearance is complete when:

* All signatories have signed

Result:

* Employee becomes **Inactive** at effective date

---

## 7. Organization Chart Module

### 7.1 Supervisor Structure

* Each employee has exactly one supervisor
* Exception: single root node (e.g., CEO)
* Circular reporting relationships are prohibited

### 7.2 Teams

* Create team:

  * Team Name
  * Team Leader
  * Members
* Employees can belong to multiple teams
* Team leader is automatically a member

### 7.3 Visualization

* Expandable/collapsible org chart view

---

## 8. Supervisor Features

### Reports

* View all direct and indirect reports
* View hierarchical org chart

### Notifications

* Onboarding notifications within reporting hierarchy
* Offboarding notifications within reporting hierarchy

### Status Tracking

* View onboarding/offboarding status of reports

---

## 9. Employee Features

### 9.1 Onboarding

* Receive email invitation
* Edit pre-filled data
* Complete profile
* Upload required documents

### 9.2 Profile Access

* View own profile (full access)
* View supervisor profile
* View teams and teammates

### 9.3 Data Redaction Rules

Sensitive fields hidden for others:

* Birthday
* Emergency contact
* Home address

Visible only to:

* Self
* HR
* Admin

### 9.4 Offboarding

* Receive offboarding notification
* View clearance progress

### 9.5 Clearance Signatory

* View assigned clearances
* Approve with optional note
* Reject with required note

---

## 10. System-Wide Rules

### 10.1 Authentication

* Google Sign-In only

### 10.2 Role Hierarchy

* HR and Supervisor are subclasses of Employee

### 10.3 Employee Lifecycle

* Onboarding → Active → Offboarding → Inactive
* Inactive users cannot log in

### 10.4 Root Node Rule

* Only one top-level employee (no supervisor)

### 10.5 Non-circular Rule

* Prevent cyclic reporting structure

### 10.6 Responsiveness

* Fully mobile and desktop responsive

### 10.7 Branding

* Must follow Jia Brandbook strictly

---

## 11. Bonus Feature

### AI Pulse Insights

* Summarize open-text survey responses
* Extract:

  * Key themes
  * Sentiment analysis
  * Notable quotes
* Must respect:

  * Anonymity
  * Visibility permissions

---

## 12. UX Requirements

* Strong empty states (not blank tables)
* Loading, error, success feedback for all actions
* Confirmation for destructive actions
* Minimal-click flows for repetitive tasks
* Smart defaults over empty forms
* Notification click → direct relevant page
* Clear status visibility for all entities
* End-to-end onboarding test journey required
