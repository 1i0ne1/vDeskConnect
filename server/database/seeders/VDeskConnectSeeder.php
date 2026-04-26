<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class VDeskConnectSeeder extends Seeder
{
    public function run(): void
    {
        $output = $this->command->getOutput();
        $now = Carbon::now();

        // Clean tables to avoid duplicates (optional but helpful for re-seeding)
        // Note: In a real app, use truncate with caution due to FKs
        
        // ─────────────────────────────────────────────
        //  1. SUPER ADMIN & SCHOOL
        // ─────────────────────────────────────────────
        $demoSchoolId = DB::table('schools')->insertGetId([
            'name'       => 'Greenfield Academy',
            'country'    => 'NG',
            'timezone'   => 'Africa/Lagos',
            'currency'   => 'NGN',
            'active'     => true,
            'config'     => json_encode([
                'academic_labels' => ['grade_label' => 'Class', 'term_label' => 'Term'],
            ]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $directorId = DB::table('users')->insertGetId([
            'school_id'  => $demoSchoolId,
            'email'      => 'director@greenfield.edu',
            'password'   => Hash::make('Password@2026!'),
            'role'       => 'admin',
            'verified'   => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('profiles')->insert([
            'user_id' => $directorId,
            'type' => 'admin',
            'data' => json_encode(['first_name' => 'John', 'last_name' => 'Director']),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // ─────────────────────────────────────────────
        //  2. ACADEMIC STRUCTURE
        // ─────────────────────────────────────────────
        $sessionId = DB::table('academic_sessions')->insertGetId([
            'school_id' => $demoSchoolId,
            'name' => '2025/2026 Academic Year',
            'start_date' => '2025-09-01',
            'end_date' => '2026-08-31',
            'active' => true,
            'created_at' => $now,
        ]);

        $termId = DB::table('academic_terms')->insertGetId([
            'school_id' => $demoSchoolId,
            'session_id' => $sessionId,
            'name' => 'First Term',
            'start_date' => '2025-09-01',
            'end_date' => '2025-12-20',
            'created_at' => $now,
        ]);

        $gradeLevels = [
            ['name' => 'JSS 1', 'short_name' => 'JSS1'],
            ['name' => 'JSS 2', 'short_name' => 'JSS2'],
            ['name' => 'JSS 3', 'short_name' => 'JSS3'],
            ['name' => 'SS 1', 'short_name' => 'SS1'],
        ];

        $gradeIds = [];
        foreach ($gradeLevels as $gl) {
            $gradeIds[] = DB::table('grade_levels')->insertGetId(array_merge($gl, [
                'school_id' => $demoSchoolId,
                'created_at' => $now,
            ]));
        }

        $subjects = [
            ['name' => 'Mathematics', 'code' => 'MTH'],
            ['name' => 'English Language', 'code' => 'ENG'],
            ['name' => 'Biology', 'code' => 'BIO'],
            ['name' => 'Physics', 'code' => 'PHY'],
            ['name' => 'Chemistry', 'code' => 'CHM'],
        ];

        $subjectIds = [];
        foreach ($subjects as $s) {
            $subjectIds[] = DB::table('subjects')->insertGetId(array_merge($s, [
                'school_id' => $demoSchoolId,
                'created_at' => $now,
            ]));
        }

        // Map subjects to grades
        foreach ($gradeIds as $gid) {
            foreach ($subjectIds as $sid) {
                DB::table('grade_level_subjects')->insert([
                    'school_id' => $demoSchoolId,
                    'grade_level_id' => $gid,
                    'subject_id' => $sid,
                    'is_compulsory' => true,
                ]);
            }
        }

        // ─────────────────────────────────────────────
        //  3. TEACHERS & ASSIGNMENTS
        // ─────────────────────────────────────────────
        $teachers = [
            ['first' => 'Adeyemi', 'last' => 'Olabisi', 'email' => 'teacher@greenfield.edu'],
            ['first' => 'Chioma', 'last' => 'Okonkwo', 'email' => 'mrs.okonkwo@greenfield.edu'],
        ];

        $teacherIds = [];
        foreach ($teachers as $t) {
            $tid = DB::table('users')->insertGetId([
                'school_id' => $demoSchoolId,
                'email' => $t['email'],
                'password' => Hash::make('Password@2026!'),
                'role' => 'teacher',
                'verified' => true,
                'created_at' => $now,
            ]);
            DB::table('profiles')->insert([
                'user_id' => $tid,
                'type' => 'teacher',
                'data' => json_encode(['first_name' => $t['first'], 'last_name' => $t['last']]),
            ]);
            $teacherIds[] = $tid;
        }

        // Assign teacher 1 to Math/Physics, teacher 2 to English/Biology
        DB::table('teacher_subjects')->insert([
            ['school_id' => $demoSchoolId, 'teacher_id' => $teacherIds[0], 'subject_id' => $subjectIds[0], 'grade_level_id' => $gradeIds[0]],
            ['school_id' => $demoSchoolId, 'teacher_id' => $teacherIds[0], 'subject_id' => $subjectIds[3], 'grade_level_id' => $gradeIds[0]],
            ['school_id' => $demoSchoolId, 'teacher_id' => $teacherIds[1], 'subject_id' => $subjectIds[1], 'grade_level_id' => $gradeIds[0]],
        ]);

        // ─────────────────────────────────────────────
        //  4. STUDENTS
        // ─────────────────────────────────────────────
        $studentNames = [
            ['Emmanuel', 'Adebayo'], ['Fatima', 'Mohammed'], ['David', 'Okafor'], 
            ['Chidinma', 'Eze'], ['Blessing', 'Adeyemi'], ['Samuel', 'Uche'],
            ['Grace', 'Ogbonna'], ['Michael', 'Okonkwo'], ['Sarah', 'Idris'], ['Peter', 'Chukwu']
        ];

        $studentIds = [];
        foreach ($studentNames as $i => $name) {
            $sid = DB::table('users')->insertGetId([
                'school_id' => $demoSchoolId,
                'email' => strtolower($name[0]) . '.' . ($i+1) . '@student.com',
                'password' => Hash::make('Password@2026!'),
                'role' => 'student',
                'verified' => true,
                'created_at' => $now,
            ]);
            DB::table('profiles')->insert([
                'user_id' => $sid,
                'type' => 'student',
                'data' => json_encode([
                    'first_name' => $name[0], 
                    'last_name' => $name[1],
                    'admission_number' => 'GFA/' . date('Y') . '/' . str_pad($i+1, 3, '0', STR_PAD_LEFT),
                    'grade_level_id' => $gradeIds[0]
                ]),
            ]);
            $studentIds[] = $sid;
        }

        // ─────────────────────────────────────────────
        //  5. SCHEME OF WORK & LESSON NOTES
        // ─────────────────────────────────────────────
        $topics = ['Algebra Basics', 'Equations', 'Probability', 'Geometry', 'Calculus Intro'];
        foreach ($topics as $i => $topic) {
            $schemeId = DB::table('schemes_of_work')->insertGetId([
                'school_id' => $demoSchoolId,
                'created_by' => $teacherIds[0],
                'subject_id' => $subjectIds[0],
                'grade_level_id' => $gradeIds[0],
                'term_id' => $termId,
                'week_number' => $i + 1,
                'topic' => $topic,
                'aspects' => json_encode([
                    'objectives' => 'Learn ' . $topic . ' fundamentals.',
                    'activities' => 'Class discussion and practice.',
                    'resources' => 'Textbook and Whiteboard.',
                    'evaluation' => 'Short quiz at the end.'
                ]),
                'status' => 'published',
                'created_at' => $now,
            ]);

            DB::table('lesson_notes')->insert([
                'school_id' => $demoSchoolId,
                'scheme_id' => $schemeId,
                'teacher_id' => $teacherIds[0],
                'grade_level_id' => $gradeIds[0],
                'subject_id' => $subjectIds[0],
                'term_id' => $termId,
                'week_number' => $i + 1,
                'topic' => $topic,
                'aspects' => json_encode([
                    'objective' => 'Learn ' . $topic . ' fundamentals.',
                    'content' => "Full explanation of $topic with examples.",
                    'methodology' => 'Demonstration and Practice.',
                    'evaluation' => 'Short quiz at the end.',
                    'materials' => 'Textbook, Whiteboard'
                ]),
                'status' => 'published',
                'created_at' => $now,
            ]);
        }

        // ─────────────────────────────────────────────
        //  6. CA WEEKS & STUDENT GRADES
        // ─────────────────────────────────────────────
        // Define weeks 3 and 6 as test weeks
        for ($w = 1; $w <= 12; $w++) {
            DB::table('ca_weeks')->insert([
                'school_id' => $demoSchoolId,
                'term_id' => $termId,
                'grade_level_id' => $gradeIds[0],
                'subject_id' => $subjectIds[0],
                'week_number' => $w,
                'is_test_week' => in_array($w, [3, 6]),
                'is_exam_week' => ($w == 12),
                'created_at' => $now,
            ]);
        }

        foreach ($studentIds as $sid) {
            DB::table('student_grades')->insert([
                'school_id' => $demoSchoolId,
                'student_id' => $sid,
                'subject_id' => $subjectIds[0],
                'term_id' => $termId,
                'session_id' => $sessionId,
                'ca_score' => rand(15, 35),
                'exam_score' => rand(30, 60),
                'total_score' => 0, // Will be computed in Phase 9 logic if needed, but let's set it
                'created_at' => $now,
            ]);
        }

        // ─────────────────────────────────────────────
        //  7. EXAMS & SUBMISSIONS
        // ─────────────────────────────────────────────
        $examId = DB::table('exams')->insertGetId([
            'school_id' => $demoSchoolId,
            'title' => 'Mid-Term Mathematics Exam',
            'subject_id' => $subjectIds[0],
            'grade_level_id' => $gradeIds[0],
            'term_id' => $termId,
            'duration_minutes' => 60,
            'type' => 'MCQ',
            'published' => true,
            'total_marks' => 60,
            'created_at' => $now,
        ]);

        for ($q = 1; $q <= 5; $q++) {
            DB::table('exam_questions')->insert([
                'exam_id' => $examId,
                'question_text' => "What is 2 + $q?",
                'type' => 'MCQ',
                'options' => json_encode(['A' => $q+1, 'B' => $q+2, 'C' => $q+3, 'D' => $q+4]),
                'correct_answer' => 'B',
                'marks' => 12,
                'order' => $q,
            ]);
        }

        foreach ($studentIds as $sid) {
            $subId = DB::table('exam_submissions')->insertGetId([
                'exam_id' => $examId,
                'student_id' => $sid,
                'score' => rand(30, 60),
                'status' => 'graded',
                'graded_at' => $now,
                'created_at' => $now,
            ]);
        }

        // ─────────────────────────────────────────────
        //  8. GRADE SCALES
        // ─────────────────────────────────────────────
        DB::table('grade_scales')->insert([
            'school_id' => $demoSchoolId,
            'name' => 'Standard Grade Scale',
            'is_default' => true,
            'scale' => json_encode([
                'A' => ['min' => 70, 'max' => 100, 'remark' => 'Excellent'],
                'B' => ['min' => 60, 'max' => 69, 'remark' => 'Very Good'],
                'C' => ['min' => 50, 'max' => 59, 'remark' => 'Credit'],
                'P' => ['min' => 40, 'max' => 49, 'remark' => 'Pass'],
                'F' => ['min' => 0, 'max' => 39, 'remark' => 'Fail'],
            ]),
            'created_at' => $now,
        ]);

        $output->writeln('<fg=green>✓ Database seeded with COMPREHENSIVE bulk data!</>');
        $output->writeln('<fg=yellow>→ Login: director@greenfield.edu / Password@2026!</>');
    }
}