# vDeskConnect — Comprehensive Implementation Plan

## Overview
This document outlines the complete implementation roadmap for building the **Academic Management System**, **Classes & Grades**, **Lectures**, **Exams**, **Marketplace**, and all related modules as specified in the `model/architecture.md` file.

---

## 🌟 NEXT IMMEDIATE PHASE: UI Search & Filter Standardization

**Status:** ⏳ **PENDING / IN PROGRESS**

**Goal:** Replicate the highly successful, animated, and independent search/filter mechanism from the Exams section across all other modules in the application. This includes the shiny beautiful buttons, internal search bar, animated filter search button mechanism, and clearing logic `onExitComplete`. 

> **Important Architecture Note:** The global/external search bar in the top navigation will be fully disconnected from the local page search mechanics in all these modules. Each page will rely exclusively on its own internal search. The global search bar will be reserved for a completely different global feature later.

**Implementation Order (Search/Filter):**
1. [x] **Reports Tab** (✅ *Completed — Internal search bar + animated filter panel + infinite scroll*)
2. [x] **Lesson Notes Tab** (✅ *Completed — Search bar + animated filter panel + infinite scroll*)
3. [x] **Exams Tab** (✅ *Completed — Fixed: search sent to API for correct infinite scroll*)
4. [x] **Lectures Tab** (✅ *Completed — Search bar + animated filter panel + infinite scroll*)
5. [x] **Classes Tab** (✅ *Completed — Internal search bar + animated filter panel + infinite scroll*)
6. [x] **Academic Tab** (✅ *Completed — Internal search bar + infinite scroll*)
7. [x] **Staff Tab** (✅ *Completed — Internal search bar + infinite scroll*)
8. [x] **Teachers Tab** (✅ *Completed — Internal search bar + infinite scroll*)
9. [x] **Students Tab** (✅ *Completed — Internal search bar + infinite scroll*)
10. [x] **Marketplace Tab** (✅ *Completed — Internal search bar + animated filter panel + infinite scroll*)

---

## 📜 MANDATORY FEATURE: Infinite Scroll — All List Tabs

**Status:** ⏳ **PENDING** — Must be implemented alongside or immediately after Search/Filter standardization.

**Goal:** Every tab or section that displays a list of data (exams, lesson notes, reports, lectures, students, staff, teachers, classes, etc.) **must** support infinite scroll. Loading all records at once is not acceptable at scale.

**Architecture:**
- Backend: All list endpoints must support `?page=N&per_page=20` (Laravel `paginate()`)
- Frontend: Use an `IntersectionObserver` (or equivalent) to detect when the user scrolls near the bottom of the list, then fetch the next page and **append** results (do not replace)
- Show a subtle loading spinner at the bottom while fetching the next page
- Show a "You've reached the end" message when no more pages are available

**Implementation Order (Infinite Scroll):**
1. [x] **Reports Tab** — Gradebook, Report Cards (✅ *Completed — search/filter sent to API*)
2. [x] **Exams Tab** — Exams list (✅ *Completed — search/filter sent to API*)
3. [x] **Lesson Notes Tab** — Notes list (✅ *Completed — search/filter sent to API*)
4. [x] **Lectures Tab** — Lectures list (✅ *Completed — search/filter sent to API*)
5. [x] **Classes Tab** — Grade Level lists (✅ *Completed — search/filter sent to API*)
6. [x] **Staff Tab** (✅ *Completed — search sent to API*)
7. [x] **Teachers Tab** (✅ *Completed — search sent to API*)
8. [x] **Students Tab** (✅ *Completed — search sent to API*)
9. [x] **Marketplace Tab** (✅ *Completed — search/filter sent to API*)
9. [x] **Marketplace Tab** (✅ *Completed — search/filter sent to API*)

---

## ✅ Phase 1: COMPLETE — Academic Session Configuration

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 10, 2026)

### What Was Built:

#### Backend (Laravel):
1. ✅ **Database Migrations:**
   - `academic_sessions` (updated existing)
   - `academic_terms` (updated with `weeks_count` column)
   - `ca_weeks` (NEW - created 2026_04_10_000001_create_ca_weeks_table.php)
   - `grade_scales` (updated with `is_default` column)

2. ✅ **Models Created:**
   - `AcademicSession.php` - with relationships and scopes
   - `AcademicTerm.php` - with relationships and scopes
   - `CaWeek.php` - with relationships and scopes
   - `GradeScale.php` - with helper method `getGradeForScore()`
   - `GradeLevel.php` - stub model for future use
   - `Subject.php` - stub model for future use
   - Updated `School.php` with all academic relationships

3. ✅ **API Controller:**
   - `AcademicController.php` - comprehensive controller with methods for:
     - Academic Sessions (CRUD + set active)
     - Academic Terms (CRUD + bulk create)
     - CA Weeks (set configuration + summary)
     - Grade Scales (CRUD + set default + preset templates)

4. ✅ **API Routes (19 routes registered):**
   - `/api/academic/sessions` (GET, POST, PUT, PUT set-active)
   - `/api/academic/terms` (GET, POST, POST bulk, PUT, DELETE)
   - `/api/academic/ca-weeks` (GET, GET summary, POST set)
   - `/api/academic/grade-scales` (GET, POST, PUT, DELETE, PUT set-default, GET templates)

#### Frontend (Next.js):
1. ✅ **API Service Layer:**
   - `client/src/lib/academic-api.js` - complete API client with all methods

2. ✅ **Academic Page:**
   - `client/src/app/dashboard/academic/page.jsx` - full-featured page with:
     - **Sessions Tab:** Create session, list sessions, set active session
     - **Terms Tab:** Select session, bulk create terms, single term creation, delete terms
     - **CA Configuration Tab:** Week grid with test/exam toggles, visual summary
     - **Grade Scales Tab:** Create/edit/delete scales, set default, visual grade display

3. ✅ **Navigation Update:**
   - Added "Academic" tab to sidebar with `SlidersHorizontal` icon
   - Positioned after Staff, before Classes

### How to Use:
1. Navigate to `/dashboard/academic`
2. **Sessions Tab:** Create an academic session (e.g., "2025-2026")
3. **Terms Tab:** Select the session, bulk create 3 terms (or add individually)
4. **CA Configuration Tab:** Select term + grade + subject, configure which weeks have tests vs. exam
5. **Grade Scales Tab:** Create grading scales or use the Standard Percentage template

---

## Phase 2: Grade Levels & Class Structure

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 11, 2026)

**Why First:** Grades/classes are the backbone. Students are assigned to grades, teachers teach grades, exams are per grade.

### 2.1 Grade Levels (aka Classes/Grade Levels)
> **Clarification:** In the architecture, "grade levels" = academic year (JSS1, SS1, Grade 6, 6ème). "Classes" in the sidebar = managing these grade levels + their sections. "Lectures" = actual teaching sessions. They are DIFFERENT.

- [x] **Backend**: Create `grade_levels` table migration
  - Columns: `id`, `school_id`, `name` (e.g., "JSS 1"), `short_name` (e.g., "JSS1"), `order`, `cycle` (e.g., "Junior", "Senior", nullable), timestamps
- [x] **Backend**: API endpoints for grade levels
  - `GET /api/academic/grade-levels` — List all grade levels
  - `POST /api/academic/grade-levels` — Create grade level
  - `PUT /api/academic/grade-levels/{id}` — Update grade level
  - `DELETE /api/academic/grade-levels/{id}` — Delete grade level
  - `POST /api/academic/grade-levels/bulk` — Bulk create grade levels
- [x] **Frontend**: Grade Level Management UI (under Academic tab)
  - "Create Grade Level" card:
    - Input: Name (e.g., "JSS 1")
    - Input: Short Name (e.g., "JSS1")
    - Input: Order (number)
    - Dropdown: Cycle (Junior, Senior, Primary, etc.)
    - Create button
  - Table: Existing grade levels with edit/delete actions
  - Bulk create option: "Create JSS1–JSS3" quick action

### 2.2 Sections (Class Subdivisions)
- [x] **Backend**: Create `sections` table migration
  - Columns: `id`, `school_id`, `grade_level_id` (FK), `name` (e.g., "A", "B", "Yellow"), `room_number`, `capacity`, timestamps
- [x] **Backend**: API endpoints for sections
  - `GET /api/academic/grade-levels/{id}/sections` — List sections
  - `POST /api/academic/sections` — Create section
  - `PUT /api/academic/sections/{id}` — Update section
  - `DELETE /api/academic/sections/{id}` — Delete section
- [x] **Frontend**: Section Management UI (under `/dashboard/classes`)
  - Per grade level: "Add Section" card
    - Input: Section Name (e.g., "A")
    - Input: Room Number
    - Input: Capacity (optional)
    - Dropdown: Assign to Grade Level
    - Save button
  - Sections displayed as cards under their parent grade level

### 2.3 Departments (Optional Streams)
- [x] **Backend**: Create `departments` table migration
  - Columns: `id`, `school_id`, `name` (e.g., "Science", "Arts", "Série C"), `code`, timestamps
- [x] **Backend**: API endpoints for departments
  - `GET /api/academic/departments` — List departments
  - `POST /api/academic/departments` — Create department
  - `PUT /api/academic/departments/{id}` — Update department
  - `DELETE /api/academic/departments/{id}` — Delete department
- [x] **Frontend**: Department Management UI (under Academic tab)
  - "Create Department" card
  - Table of existing departments
  - Note: Departments are optional, used for senior secondary streams

---

## Phase 3: Subjects & Subject-to-Grade Mapping

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 11, 2026)

**Why Third:** Subjects are needed before schemes of work, lesson notes, exams, and lectures can exist.

### 3.1 Subject Catalog
- [x] **Backend**: Create `subjects` table migration
  - Columns: `id`, `school_id`, `name` (e.g., "Mathematics"), `code` (e.g., "MTH"), `department_id` (FK, nullable), `type` (core, elective, departmental), timestamps
- [x] **Backend**: API endpoints for subjects
  - `GET /api/academic/subjects` — List all subjects
  - `POST /api/academic/subjects` — Create subject
  - `PUT /api/academic/subjects/{id}` — Update subject
  - `DELETE /api/academic/subjects/{id}` — Delete subject
- [x] **Frontend**: Subject Management UI (under Academic tab)
  - "Create Subject" card:
    - Input: Name
    - Input: Code
    - Dropdown: Type (Core, Elective, Departmental)
    - Dropdown: Department (optional, for departmental subjects)
    - Create button
  - Table: All subjects with filters (Core, Elective, Departmental)

### 3.2 Subject-to-Grade-Level Mapping
- [x] **Backend**: Create `grade_level_subjects` table migration
  - Columns: `id`, `school_id`, `grade_level_id` (FK), `subject_id` (FK), `is_compulsory`, `department_id` (FK, nullable), timestamps
  - Unique constraint: `(grade_level_id, subject_id)`
- [x] **Backend**: API endpoints for subject mapping
  - `GET /api/academic/grade-levels/{id}/subjects` — Get subjects for a grade
  - `POST /api/academic/subject-mappings` — Assign subject to grade
  - `DELETE /api/academic/subject-mappings/{id}` — Remove subject from grade
  - `POST /api/academic/subject-mappings/bulk-assign` — Bulk assign subjects to multiple grades
- [x] **Frontend**: Subject-to-Grade Mapping UI (under Academic tab)
  - Multi-step wizard:
    1. Select Grade Level(s) — multi-select (e.g., JSS1, JSS2, JSS3)
    2. Select Subject(s) — multi-select with checkboxes
    3. Toggle: Is Compulsory?
    4. Assign (optional): Department filter
    5. Review & Save
  - Visual matrix: Grades × Subjects grid showing assignments
  - Quick presets: "Junior Subjects (JSS1–3)", "Senior Core (SS1–3)", "Science Dept (SS1–3)", "Arts Dept (SS1–3)"
  - Bulk operations: "Apply to all junior grades", "Apply to all senior grades"

---

## Phase 4: Classes Page (Full Implementation)

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 11, 2026)

**Why Fourth:** Now that grades, sections, departments, and subjects exist, we build the full Classes management page.

### 4.1 Classes Page Redesign (`/dashboard/classes`)
- [x] **Frontend**: Replace placeholder with full Classes page
  - View: Grid of all grade levels as cards
  - Each card shows:
    - Grade name, short name, cycle
    - Number of sections
    - Number of students enrolled
    - Assigned teacher(s)
    - Subjects offered
  - Actions: View Details, Edit, Delete
  - "Add Grade Level" button
- [x] **Frontend**: Grade Level Detail View
  - Tabs: Overview, Sections, Subjects, Students, Teachers, Scheme of Work, Timetable
  - Overview: Stats (students count, sections count, subjects count)
  - Sections: List of sections with room numbers, capacities
  - Subjects: List of subjects assigned to this grade
  - Students: Table of students in this grade (with search, filter)
  - Teachers: List of teachers assigned to this grade + their subjects

### 4.2 Teacher-to-Class-Subject Assignment
- [x] **Backend**: Update `teacher_subjects` table (already in architecture)
  - Columns: `id`, `school_id`, `teacher_id`, `subject_id`, `grade_level_id`, `section_id` (nullable), timestamps
  - This defines: "Teacher X teaches Subject Y in Grade Z (and optionally Section A)"
- [x] **Backend**: API endpoints
  - `GET /api/academic/teachers` — Get all teachers for assignment
  - `POST /api/academic/teacher-assignments` — Assign teacher to subject+grade
  - `DELETE /api/academic/teacher-assignments/{id}` — Remove assignment
  - `GET /api/academic/grade-levels/{id}/teachers` — Get teachers for a grade
- [x] **Frontend**: Teacher Assignment UI (in Grade Detail view → Teachers tab)
  - "Assign Teacher" form:
    - Dropdown: Select Teacher
    - Dropdown: Select Subject (filtered to this grade's subjects)
    - Dropdown: Select Section (optional, or "All Sections")
    - Assign button
  - Table: Assigned teachers with their subjects and sections
  - Actions: Reassign, Remove

---

## Phase 5: Scheme of Work Builder

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 11, 2026)

**Why Fifth:** Schemes of work are the curriculum backbone. Teachers need them before creating lesson notes or exams.

### 5.1 Scheme of Work Database & API
- [x] **Backend**: Create `schemes_of_work` table migration
  - Columns: `id`, `school_id`, `subject_id` (FK), `grade_level_id` (FK), `term_id` (FK), `week_number`, `topic`, `aspects` (JSONB: `{ objectives, activities, resources, evaluation }`), `status` (draft, published), `created_by`, timestamps
- [x] **Backend**: API endpoints
  - `GET /api/academic/schemes` — List schemes (filterable by grade, subject, term)
  - `POST /api/academic/schemes` — Create scheme entry
  - `PUT /api/academic/schemes/{id}` — Update scheme entry
  - `DELETE /api/academic/schemes/{id}` — Delete scheme entry
  - `POST /api/academic/schemes/bulk-create` — Bulk create all weeks for a subject+grade+term
  - `PUT /api/academic/schemes/{id}/publish` — Publish scheme
- [x] **Backend**: AI Scheme Generator endpoint
  - `POST /api/ai/scheme-of-work` — Generate scheme using AI (stubbed)
  - Request body: `{ subject_id, grade_level_id, term_id, weeks: [1-12], topics: [], aspects: [] }`
  - Returns: Array of week entries with topics and aspects

### 5.2 Scheme of Work UI — Manual Entry
- [x] **Frontend**: Create Scheme of Work tab in Grade Detail view
  - Accessed from Grade Detail view → Scheme of Work tab
  - Filters: Select Subject, Select Term
  - Week-by-week list:
    - Cards showing: Week #, Topic, Status, Subject, Term, Aspects preview
    - Actions: Edit, Publish, Delete
    - "Add Week" button at top
  - Save Draft / Publish functionality
- [x] **Frontend**: Week Entry Form (modal)
  - Week Number (input)
  - Topic (text input)
  - Subject & Term dropdowns
  - Aspects (collapsible sections):
    - Objectives (textarea)
    - Activities (textarea)
    - Resources (textarea)
    - Evaluation (textarea)
  - Save / Cancel

### 5.3 Scheme of Work UI — AI Builder
- [x] **Frontend**: AI Scheme Builder endpoint (stubbed)
  - Step 1: Select Subject (dropdown, pre-filtered to grade's subjects)
  - Step 2: Select Term (dropdown)
  - Step 3: Select Weeks (range selector: Week 1–12)
  - Step 4: Select Topics (multi-select from curriculum database or free-text)
  - Step 5: Select Aspects (checkboxes: Objectives, Activities, Resources, Evaluation)
  - Step 6: Generate button
  - Loading state: "AI is generating your Scheme of Work..."
  - Result: Pre-filled week table — teacher reviews, edits, validates
  - Actions: Edit individual weeks, Regenerate week, Approve All & Publish

---

## Phase 6: Lesson Notes Builder

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 11, 2026)

**Why Sixth:** Lesson notes are created by teachers based on the scheme of work.

### 6.1 Lesson Notes Database & API
- [x] **Backend**: Create `lesson_notes` table migration
  - Columns: `id`, `school_id`, `scheme_id` (FK to schemes_of_work), `teacher_id`, `grade_level_id`, `subject_id`, `term_id`, `week_number`, `topic`, `aspects` (JSONB: `{ objective, content, methodology, evaluation, materials }`), `contact_number` (duration in minutes), `status` (draft, published), timestamps
- [x] **Backend**: API endpoints
  - `GET /api/academic/lesson-notes` — List notes (filterable by teacher, grade, subject, term)
  - `POST /api/academic/lesson-notes` — Create note
  - `PUT /api/academic/lesson-notes/{id}` — Update note
  - `DELETE /api/academic/lesson-notes/{id}` — Delete note
  - `PUT /api/academic/lesson-notes/{id}/publish` — Publish note
- [x] **Backend**: AI Lesson Note Generator endpoint
  - `POST /api/ai/lesson-note` — Generate lesson note (stubbed)
  - Request body: `{ scheme_id, aspects: ['objective', 'content', 'methodology'], target_audience_size }`
  - Returns: Complete lesson note with all selected aspects

### 6.2 Lesson Notes UI — Manual Entry
- [x] **Frontend**: Create `/dashboard/lesson-notes` page (Teacher-focused)
  - List view: All lesson notes (filterable by term, subject, grade, status)
  - Each note card shows: Week #, Topic, Subject, Grade, Status (Draft/Published), Duration
  - "Create New Note" button
  - "AI Builder" button with gradient styling
- [x] **Frontend**: Lesson Note Editor (Modal)
  - Link to Scheme of Work: Dropdown to select scheme entry (auto-populates week, topic, subject, grade)
  - Sections (collapsible):
    - Learning Objective (textarea)
    - Content (textarea)
    - Methodology (textarea)
    - Materials/Resources (textarea)
    - Evaluation (textarea)
    - Duration (number input, minutes)
  - Save Draft / Publish functionality

### 6.3 Lesson Notes UI — AI Builder
- [x] **Frontend**: AI Lesson Note Builder Modal
  - Step 1: Select Scheme of Work entry (dropdown: "Week 3 — Algebra — JSS1 — Term 1")
  - Step 2: Auto-populated: Week, Topic, Subject, Grade
  - Step 3: Target Audience Size (number input)
  - Step 4: Generate button with gradient styling
  - Result: Pre-filled lesson note — teacher reviews, edits, publishes
  - Actions: Edit sections, Approve & Publish

---

## ✅ Phase 7: COMPLETE — Lectures (Live & Async Teaching Sessions)

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 26, 2026)

**Why Seventh:** Lectures are the actual teaching sessions, linked to teachers, grades, subjects, and optionally video conferences. This phase covers both **synchronous** (live video conference) and **asynchronous** (recorded/async) lecture modes, plus hybrid combinations.

### 7.1 Lecture Types (Clarified)
1. **Synchronous (Live Online)** - Live video conference via Zoom/Meet link
2. **Asynchronous (Async)** - Pre-recorded content with timeline/PDFs/videos
3. **Hybrid** - Both live + async content available (student can attend live then review async, or vice versa)

### 7.2 Lectures Database & API
- [x] **Backend**: `lectures` table migration (UPDATED)
  - Columns: `id`, `school_id`, `teacher_id`, `grade_level_id`, `subject_id`, `section_id` (nullable), `title`, `description` (text), `scheduled_at` (datetime), `duration_minutes`, `status` (scheduled, in_progress, completed, cancelled), `is_online`, `meeting_link`, `created_by`, `type` (sync, async, hybrid), `async_available_after` (datetime), `is_published`, timestamps

- [x] **Backend**: `lecture_resources` table migration (UPDATED)
  - Columns: `id`, `lecture_id` (FK), `type` (pdf, video, link, image), `url`, `title`, `description`, `uploaded_by`, `is_downloadable`, `is_savable`, `available_from` (datetime), `order_index` (int), timestamps

- [x] **Backend**: Updated `attendances` table
  - Columns: `id`, `school_id`, `lecture_id`, `student_id`, `status` (present, absent, late, completed), `checked_at`, `completed_at` (for async progress tracking)

- [x] **Backend**: API endpoints for enhanced lectures
  - `GET /api/lectures` — List lectures (filterable by teacher, grade, subject, date, type)
  - `POST /api/lectures` — Create lecture
  - `PUT /api/lectures/{id}` — Update lecture
  - `DELETE /api/lectures/{id}` — Delete lecture
  - `PUT /api/lectures/{id}/start` — Start live lecture
  - `PUT /api/lectures/{id}/complete` — Mark as completed
  - `PUT /api/lectures/{id}/publish` — Publish async lecture
  - `GET /api/lectures/{id}/resources` — Get lecture resources
  - `POST /api/lectures/{id}/resources` — Add resource
  - `DELETE /api/lectures/resources/{id}` — Delete resource
  - `POST /api/lectures/{id}/attendance` — Mark attendance (sync) / Mark completion (async)
  - `GET /api/lectures/{id}/progress` — Get student progress for async lecture

- [x] **Backend**: Async lecture content builder
  - Content sections with `order_index` for sequential viewing
  - Progress tracking (student must complete section before moving to next)
  - Completion timestamps

### 7.3 Online (Sync) Lectures
- [x] **Frontend**: Create/Edit lecture with online toggle
- [x] **Frontend**: Meeting link integration (opens external video conference)
- [x] **Frontend**: In-app status display (Scheduled → In Progress → Completed)

### 7.4 Async Lectures (Enhanced)
- [x] **Frontend**: Async lecture builder with sections/timeline
  - Opening Video: YouTube URL or file upload (first thing students see)
  - Content Sections: Ordered list of text content (can include markdown)
  - Resources: PDFs, Videos, Links, Images attached to sections
  - Sequential viewing: Lock next section until current is completed
- [x] **Frontend**: Async lecture player UI
  - Video player (YouTube embed or custom player)
  - Scrollable content timeline with progress
  - Downloadable/saveable resource controls
  - Completion tracking
- [x] **Frontend**: Resource availability settings
  - "Downloadable" toggle per resource
  - "Savable" toggle per resource  
  - "Available from" datetime picker (resource visibility)

### 7.5 Hybrid Lectures
- [x] **Frontend**: Hybrid mode toggle
  - Live meeting link + async content
  - Async availability setting: "Available after live session ends"
  - Student can attend live (sync) OR review recording (async)
  - Completion counts for either mode

### 7.6 Lecture List UI
- [x] **Frontend**: `/dashboard/lectures` page (Teacher-focused)
  - List view with filters (subject, grade, status, type)
  - Lecture cards show: Title, Type badge, Subject, Grade, Schedule, Status
  - "Create Lecture" button
- [x] **Frontend**: Filter by type (sync/async/hybrid)

### 7.7 Lecture Detail View & Player
- [x] **Frontend**: `/dashboard/lectures/{id}` page
  - Tabs: Overview, Content, Resources, Attendance
  - **Overview**: Title, description, subject, grade, schedule, meeting link
  - **Content** (for async): Ordered sections with video/text/PDFs
  - **Resources**: List with download/save toggles and availability times
  - **Attendance**: Students with status + async completion %
  - Actions: Start, Complete, Cancel, Edit, Delete

- [x] **Frontend**: Student-facing lecture page (`/student/lectures/{id}`)
  - Video player for opening video
  - Scrollable content timeline
  - Resource download/save buttons
  - Progress bar (async completion tracking)
  - "Mark as Complete" action

### 7.8 AI Lecture Builder (Future)
- [x] **Frontend**: AI generates async lecture outline
- [x] **Frontend**: Auto-generate sections from topic
- [x] Integration with video upload processing

---

## ✅ Phase 8: COMPLETE — Exams & Assessments

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 26, 2026)

**Why Eighth:** Exams depend on grades, subjects, terms, and CA week configuration.

### 8.1 Exams Database & API
- [x] **Backend**: Created `exams`, `exam_questions`, `exam_submissions`, `exam_answers` tables
- [x] **Backend**: API endpoints for exams (CRUD, Publish, Questions, Submissions, Grading)
- [x] **Backend**: AI Exam Generation endpoint with smart fallbacks
- [x] **Backend**: CA Aggregation logic (MCQ auto-grading + manual theory grading)

### 8.2 Exam Creation UI — Manual & AI
- [x] **Frontend**: Rich Exams Dashboard with stats and filters
- [x] **Frontend**: Multi-step Exam Builder Wizard
- [x] **Frontend**: AI-Assisted question generation (Gemini + Fallback)
- [x] **Frontend**: Manual MCQ & Theory question management

### 8.3 Exam Taking UI (Student)
- [x] **Frontend**: Secure Exam Player with timer and auto-save
- [x] **Frontend**: Question navigation and progress tracking
- [x] **Frontend**: MCQ & Theory answer inputs

### 8.4 Exam Grading UI (Teacher)
- [x] **Frontend**: Grading Dashboard for review and manual mark entry
- [x] **Frontend**: Feedback system for students
- [x] **Frontend**: Real-time score calculation

---

## ✅ Phase 9: COMPLETE — Reports & Grades Section

**Status:** ✅ **FULLY IMPLEMENTED** (Completed April 27, 2026)

**Why Ninth:** Reports aggregate everything — scores, grades, positions.

### 9.1 Student Grades & Report Cards
- [x] **Backend**: Confirm `student_grades`, `report_cards`, `result_checks` tables
- [x] **Backend**: Grade computation logic
  - `POST /api/academic/grades/compute` — Compute grades based on CA + Exam
  - Formula: `Total = CA_Aggregate + Exam_Score`
  - Position: Rank students within grade
  - Grade: Apply grade scale
  - Remark: From grade scale
- [x] **Backend**: Report card generation
  - `POST /api/results/report-cards/generate` — Generate PDF report card
  - `GET /api/results/report-cards/{id}` — Download report card
- [x] **Backend**: Result check pins
  - `POST /api/results/pins/generate` — Generate bulk pins
  - `POST /api/results/check` — Public result check (PIN + Student ID)
- [x] **Frontend**: `/dashboard/reports` page (Admin/Staff view)
  - Filters: Term, Grade Level, Student
  - Grade Book view: Table of students × subjects, CA scores, Exam scores, Total, Grade, Position
  - "Generate Report Cards" button
  - "Generate Result Pins" button
  - Download individual report card (PDF)
- [x] **Frontend**: `/dashboard/results` page (Student view)
  - View own grades, enter PIN to unlock, download PDF

---

## Phase 10: Marketplace (Textbook Store)

**Status:** ✅ **FULLY IMPLEMENTED**

**Why Tenth:** Independent module, depends on grade levels and students.

### 10.1 Marketplace Database & API
- [x] **Backend**: Create `textbooks` table migration (Updated with marketplace columns)
- [x] **Backend**: Create `marketplace_orders` table migration (Updated with school_id/order_date)
- [x] **Backend**: API endpoints (Index, Store, Update, Destroy, Orders, PlaceOrder, UpdateStatus)

### 10.2 Marketplace UI — Receptionist/Admin
- [x] **Frontend**: Create `/dashboard/marketplace` page
- [x] **Frontend**: Books management (Add/Edit/Delete with BookModal)
- [x] **Frontend**: Orders management (Table with status filters and OrderDetails modal)
- [x] **Frontend**: Infinite Scroll & Standardized Search/Filter implementation

### 10.3 Marketplace UI — Student
- [x] **Frontend**: Added Marketplace to Student Sidebar
- [x] **Frontend**: Marketplace UI is responsive and accessible to all roles

### 10.4 Dashboard Role-Based Access Control (RBAC) & Student View
- [x] **Frontend**: Fix hardcoded `role="admin"` props in `DashboardLayout` across all pages.
- [x] **Frontend**: Implement dynamic Sidebar role detection from authenticated user state.
- [x] **Frontend**: Create a dedicated **Student Dashboard** view in `dashboard/page.jsx` showing:
  - Personal stats (Attendance, next lecture, upcoming exams).
  - Quick access to "My Results" and "Marketplace".
  - Calendar of upcoming assignments/events.

### 10.5 Search Bug Fixes & UI Polish
- [x] **Backend/Frontend**: Normalize search queries (lowercase + trim whitespace) to fix "fatima mo..." search failures.
- [x] **Frontend**: Implement the "Quick View" (Eye Icon) modal content to display simplified student profiles.

### 10.6 Database Data & Seeding (Testing Readiness)
- [x] **Backend**: Update `VDeskConnectSeeder` with specific test account (**Fatima Mohamed**; `fatima@student.com`).
- [x] **Backend**: Automate `student_enrollments` records for all seeded students.
- [x] **Backend**: Pre-populate Marketplace with bulk books and orders for analytics testing.

---

## Phase 11: Student Management Updates

**Why Eleventh:** Students must be assigned to grade levels and sections.

- [x] **Backend**: Create `student_enrollments` table
- [x] **Backend**: API endpoints
  - `GET /api/students/{id}/enrollments` — Get student's enrollment history
  - `POST /api/students/enroll` — Enroll student in grade+section
  - `PUT /api/students/enrollments/{id}` — Update enrollment
- [x] **Frontend**: Update `/dashboard/students` page
  - Add fields to Add/Edit student modals (Grade, Section)
  - Student detail view: Show enrollment info
  - Enrollment History timeline

---

## Phase 12: Teacher Management Updates

**Why Twelfth:** Teachers must be assigned subjects and grades.

### 12.1 Teacher-Subject-Grade Linking
- [ ] **Backend**: Confirm `teacher_subjects` table is migrated
- [ ] **Backend**: API endpoints (already in Phase 4)
- [ ] **Frontend**: Update `/dashboard/teachers` page
  - Add fields to Add/Edit teacher modals:
    - Subjects taught (multi-select dropdown)
    - Grade levels assigned (multi-select dropdown)
  - Teacher detail view: Show assigned subjects, grades, and sections
  - Bulk assignment tool

---

## Phase 13: Events Calendar

**Why Thirteenth:** Events are needed but less critical than academics.

### 13.1 Events Database & API
- [ ] **Backend**: Confirm `events`, `event_attendees` tables
- [ ] **Backend**: API endpoints
  - `GET /api/events` — List events (filtered by visibility)
  - `POST /api/events` — Create event
  - `PUT /api/events/{id}` — Update event
  - `DELETE /api/events/{id}` — Delete event
  - `POST /api/events/{id}/rsvp` — RSVP (student/teacher)
- [ ] **Frontend**: `/dashboard/events` page (replace placeholder)
  - Calendar view (monthly, weekly)
  - "Add Event" form:
    - Title, Description
    - Start Date & Time, End Date & Time
    - Location (optional)
    - Visibility (All, Students Only, Teachers Only, Admins Only, Specific Grades)
    - Event Type (Academic, Social, Administrative, Deadline)
    - Create button
  - Event cards on calendar with color coding by type
  - List view alternative

---

## Phase 14: Fees Management

**Why Fourteenth:** Fees are important but can wait until academics are functional.

### 14.1 Fees Database & API
- [ ] **Backend**: Confirm `fee_structures`, `payments` tables
- [ ] **Backend**: API endpoints
  - `GET /api/fees/structures` — List fee structures
  - `POST /api/fees/structures` — Create fee structure
  - `GET /api/fees/payments` — List payments
  - `POST /api/fees/payments` — Record payment
  - `GET /api/fees/outstanding` — Get outstanding balances
- [ ] **Frontend**: `/dashboard/fees` page (replace placeholder)
  - Tabs: Fee Structures, Payments, Outstanding Balances, Announcements
  - Fee Structures: Define fees per grade level
  - Payments: Record payments (student, amount, method, date)
  - Outstanding: Table of students with unpaid fees
  - Announcements: Publish fee reminders to students/parents

---

## Phase 15: Settings Page

**Why Fifteenth:** Settings configure the school's overall behavior.

### 15.1 School Settings UI
- [ ] **Frontend**: `/dashboard/settings` page (replace placeholder)
  - Tabs: School Profile, Academic Configuration, Grading, Localization, Branding
  - School Profile: Name, logo, address, contact info
  - Academic Configuration: Link to `/dashboard/academic`
  - Grading: Default grade scale, CA/Exam weight (e.g., CA 30%, Exam 70%)
  - Localization: Currency, timezone, date format
  - Branding: School colors, custom theme (optional)

---

## Phase 16: Sidebar & Navigation Updates

**Why Sixteenth:** Update navigation to reflect all new pages.

### 16.1 Updated Sidebar Navigation (School Admin)
- [ ] **Frontend**: Update `Sidebar.jsx` with new tab order:
  1. Dashboard → `/dashboard`
  2. Students → `/dashboard/students`
  3. Teachers → `/dashboard/teachers`
  4. Staff → `/dashboard/staff`
  5. Academic → `/dashboard/academic` (NEW — sessions, terms, grades, subjects, CA config)
  6. Classes → `/dashboard/classes` (FULLY BUILT — grade levels, sections, teachers, schemes)
  7. Lectures → `/dashboard/lectures` (NEW — teaching sessions)
  8. Exams → `/dashboard/exams` (FULLY BUILT — CA tests, exams, grading)
  9. Reports → `/dashboard/reports` (FULLY BUILT — grade book, report cards, pins)
  10. Events → `/dashboard/events` (FULLY BUILT — calendar)
  11. Fees → `/dashboard/fees` (FULLY BUILT — fee management)
  12. Marketplace → `/dashboard/marketplace` (NEW — textbook store)
  13. Settings → `/dashboard/settings` (FULLY BUILT — school config)

### 16.2 Teacher-Specific Navigation
- [ ] **Frontend**: Teacher sidebar:
  1. Dashboard
  2. My Classes (view assigned grades/sections)
  3. My Subjects
  4. Scheme of Work (create/edit for assigned subjects)
  5. Lesson Notes
  6. Lectures
  7. Exams (create, grade)
  8. My Students (view students in assigned grades)
  9. Profile
  10. Settings

### 16.3 Student-Specific Navigation
- [ ] **Frontend**: Student sidebar:
  1. Dashboard
  2. My Classes (view own grade/section)
  3. My Subjects
  4. Lectures (view scheduled lectures, join links)
  5. Exams (take exams, view results)
  6. My Results (view grades, download report card)
  7. Events
  8. Marketplace (buy books)
  9. Profile
  10. Settings

---

## Phase 17: Backend — Database Migrations & Seeders

**Why Throughout:** All migrations should be done alongside frontend work.

### 17.1 Migration Order
1. `academic_sessions`
2. `academic_terms`
3. `grade_levels`
4. `sections`
5. `departments`
6. `subjects`
7. `grade_level_subjects`
8. `teacher_subjects`
9. `schemes_of_work`
10. `lesson_notes`
11. `lectures`
12. `lecture_resources`
13. `attendances`
14. `ca_weeks`
15. `exams`
16. `exam_questions`
17. `exam_submissions`
18. `exam_answers`
19. `grade_scales`
20. `student_grades`
21. `report_cards`
22. `result_checks`
23. `student_enrollments`
24. `textbooks`
25. `marketplace_orders`
26. `events`
27. `event_attendees`
28. `fee_structures`
29. `payments`
30. `notices`
31. `syllabuses`
32. `routines`
33. `promotions`

### 17.2 Seeders
- [ ] Default grade scales (Nigerian WAEC, American GPA, French Baccalaureat)
- [ ] Sample academic session + terms
- [ ] Sample grade levels (JSS1–SS3 for Nigerian schools preset)
- [ ] Sample subjects (Mathematics, English, Biology, Chemistry, Physics, etc.)
- [ ] Sample subjects-to-grade mappings (Junior Core, Senior Core, Science Dept, Arts Dept)

---

## Phase 18: AI Integration (Static Tools Interface)

**Why Last (or parallel):** AI is an enhancement, not a blocker. Can be stubbed initially.

### 18.1 AI Service Architecture
- [ ] Backend AI endpoints (stubbed for now, return static data):
  - `POST /api/ai/scheme-of-work`
  - `POST /api/ai/lesson-note`
  - `POST /api/ai/exam`
  - `POST /api/ai/lecture`
- [ ] Integration with AI provider (OpenAI, Claude, or school-assigned model)
- [ ] Rate limiting & cost tracking per school
- [ ] Prompt templates for each builder type
- [ ] Response parsing & validation

---

## Notes & Clarifications

### Grade vs Class vs Lecture
- **Grade Level** = Academic year (JSS1, SS1, Grade 6, 6ème). Stored in `grade_levels` table.
- **Class** = In the sidebar, "Classes" is the management page for grade levels + sections + teachers + subjects.
- **Section** = Subdivision of a grade (JSS1-A, JSS1-B). Stored in `sections` table.
- **Lecture** = A teaching session (scheduled class period). Stored in `lectures` table.
- **Scheme of Work** = Curriculum plan for a subject in a grade, broken into weeks with topics and aspects.
- **Lesson Note** = Teacher's detailed guide for a specific week/topic, based on the scheme of work.

### Nigerian School Context
- **Junior Secondary (JSS1–JSS3):** All students take the same core subjects.
- **Senior Secondary (SS1–SS3):** Students take common subjects + departmental subjects (Science, Arts, Commercial).
- **CA (Continuous Assessment):** Aggregate of tests set throughout the term (e.g., 30% of total score).
- **Exam:** Final term exam (e.g., 70% of total score).
- **Total Score = CA + Exam**, then graded using the school's grade scale.

### Academic Session Configuration Flow
1. Admin creates Academic Session (e.g., "2025/2026").
2. Admin configures number of terms (1, 2, or 3).
3. Admin creates Grade Levels (JSS1, JSS2, etc.).
4. Admin creates Subjects.
5. Admin maps Subjects to Grade Levels.
6. Admin configures CA weeks per grade + subject (which weeks have tests, which has exam).
7. Admin assigns Teachers to Subject + Grade.
8. Teachers create Scheme of Work (manual or AI).
9. Teachers create Lesson Notes (manual or AI) based on scheme.
10. Teachers create Lectures (manual or AI).
11. Teachers create Exams/CA Tests (manual or AI).
12. Students take exams, teachers grade.
13. System computes CA aggregate + Exam = Total → Grade → Report Card.

### Marketplace Flow
1. Receptionist/Admin lists textbooks (electronic or physical).
2. Student brows marketplace (filtered by their grade level).
3. Student purchases book → Payment.
4. If electronic: Student downloads book.
5. If physical: Student downloads reference form → Takes form to school office → Collects book.
6. Receptionist tracks orders, inventory, sales analytics.

---

## Priority Order for Implementation (Summary)

| Priority | Phase | Description | Status |
|----------|-------|-------------|--------|
| 🔴 **P0** | 1 | Academic Session Configuration (Sessions, Terms, CA Weeks, Grade Scales) | ✅ Complete |
| 🔴 **P0** | 2 | Grade Levels & Class Structure (Grades, Sections, Departments) | ✅ Complete |
| 🔴 **P0** | 3 | Subjects & Subject-to-Grade Mapping | ✅ Complete |
| 🟠 **P1** | 4 | Classes Page (Full Implementation) | ✅ Complete |
| 🟠 **P1** | 5 | Scheme of Work Builder (Manual + AI) | ✅ Complete |
| 🟠 **P1** | 6 | Lesson Notes Builder (Manual + AI) | ✅ Complete |
| 🟡 **P2** | 7 | Lectures (Manual + AI, Attendance) | ✅ Complete |
| 🟡 **P2** | 8 | Exams & Assessments (CA Tests, Exams, Grading) | ✅ Complete |
| 🟢 **P3** | 9 | Reports & Grades (Report Cards, Result Pins) | ✅ Complete |
| 🟢 **P3** | 10 | Marketplace (Textbook Store) | Pending |
| 🟢 **P3** | 11 | Student Management Updates (Grade/Section Enrollment) | Pending |
| 🟢 **P3** | 12 | Teacher Management Updates (Subject/Grade Assignment) | Pending |
| 🔵 **P4** | 13 | Events Calendar | Pending |
| 🔵 **P4** | 14 | Fees Management | Pending |
| 🔵 **P4** | 15 | Settings Page | Pending |
| 🔵 **P4** | 16 | Sidebar & Navigation Updates | Pending |
| 🟣 **P5** | 17 | Backend Migrations & Seeders (ongoing) | Ongoing |
| 🟣 **P5** | 18 | AI Integration (Stubbed, then Real) | Pending |

---

## Next Steps

1. **Confirm this plan with the user.**
2. **Start with Phase 1 (Academic Session Configuration).**
3. **Each phase should be implemented fully (backend + frontend) before moving to the next.**
4. **Test each phase independently before integrating with other modules.**
5. **Use stubs/mock data for AI endpoints initially; integrate real AI later.**

---

*This document will be updated as implementation progresses. Each checkbox should be marked as completed when the corresponding task is done.*
