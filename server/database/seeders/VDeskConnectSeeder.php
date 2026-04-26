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

        // ─────────────────────────────────────────────
        //  1. PLATFORM SUPER ADMIN (Owner)
        // ─────────────────────────────────────────────
        $superAdminId = DB::table('users')->insertGetId([
            'school_id'  => null, // Platform owner doesn't belong to a school
            'email'      => 'admin@vdeskconnect.com',
            'password'   => Hash::make('SuperAdmin@2026!'),
            'role'       => 'admin', // System treats this as superadmin if school_id is null
            'verified'   => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('profiles')->insert([
            'user_id' => $superAdminId,
            'type' => 'admin',
            'data' => json_encode(['first_name' => 'VDesk', 'last_name' => 'Owner']),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // ─────────────────────────────────────────────
        //  2. SCHOOL & SCHOOL ADMIN
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
            'password'   => Hash::make('SchoolAdmin@2026!'),
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
        //  3. ACADEMIC STRUCTURE
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
        //  4. TEACHERS & ASSIGNMENTS
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
        //  5. STUDENTS
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
        //  6. SCHEME OF WORK & LESSON NOTES (Markdown Rich)
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
                    'objectives' => "By the end of this week, students should be able to:\n- **Understand** $topic concepts.\n- **Apply** $topic formulas in exercises.\n- **Analyze** real-world problems using $topic.",
                    'activities' => "1. **Discussion:** Introduction to $topic.\n2. **Group Task:** Solve 10 problems on $topic.\n3. **Quiz:** Test on $topic fundamentals.",
                    'resources' => "- Textbook Chapter " . ($i+1) . "\n- [Online Resource](https://vdeskconnect.edu/resources/$i)\n- Interactive Board",
                    'evaluation' => "### Assessment for $topic:\n- Homework assignment due Friday.\n- Class participation score."
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
                    'objective' => "Comprehensive understanding of **$topic**.",
                    'content' => "## $topic Overview\n\n| Level | Concept | Complexity |\n|-------|---------|------------|\n| 1 | Basic | Low |\n| 2 | Advanced | High |\n\n> \"$topic is the foundation of modern mathematics.\"",
                    'methodology' => "- **Visual Aids:** 3D graphs for $topic.\n- **Direct Instruction:** Lecture on core $topic rules.",
                    'evaluation' => "#### Evaluation for $topic\n- Quiz on Friday.\n- Peer review session.",
                    'materials' => "Graph paper, Calculators"
                ]),
                'status' => 'published',
                'created_at' => $now,
            ]);
        }

        // ─────────────────────────────────────────────
        //  7. LECTURES (Markdown Rich)
        // ─────────────────────────────────────────────
        DB::table('lectures')->insert([
            'school_id' => $demoSchoolId,
            'teacher_id' => $teacherIds[0],
            'grade_level_id' => $gradeIds[0],
            'subject_id' => $subjectIds[0],
            'title' => 'Quantum Mathematics Basics',
            'description' => 'Introduction to quantum math concepts using Markdown formatting.',
            'scheduled_at' => $now->addDays(2),
            'duration_minutes' => 60,
            'status' => 'scheduled',
            'type' => 'async',
            'content' => "## Quantum Math Introduction\n\nQuantum math is fascinating. Here's a brief breakdown:\n\n### Core Formulas\n$ E = mc^2 $\n\n```javascript\nconsole.log('Welcome to Quantum Math');\n```\n\n---\nCheck the resources tab for more.",
            'is_published' => true,
            'created_by' => $teacherIds[0],
            'created_at' => $now,
        ]);

        // ─────────────────────────────────────────────
        //  8. CA WEEKS & STUDENT GRADES
        // ─────────────────────────────────────────────
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

        // Pre-calculate positions per subject
        foreach ($subjectIds as $subjId) {
            $subjectScores = [];
            foreach ($studentIds as $sid) {
                $ca = rand(15, 35);
                $exam = rand(30, 60);
                $total = $ca + $exam;
                
                $grade = 'F';
                $remark = 'Fail';
                if ($total >= 70) { $grade = 'A'; $remark = 'Excellent'; }
                elseif ($total >= 60) { $grade = 'B'; $remark = 'Very Good'; }
                elseif ($total >= 50) { $grade = 'C'; $remark = 'Credit'; }
                elseif ($total >= 40) { $grade = 'P'; $remark = 'Pass'; }

                $subjectScores[] = [
                    'student_id' => $sid,
                    'ca_score' => $ca,
                    'exam_score' => $exam,
                    'total_score' => $total,
                    'grade' => $grade,
                    'remark' => $remark
                ];
            }
            
            // Sort by total score to get positions
            usort($subjectScores, function($a, $b) {
                return $b['total_score'] <=> $a['total_score'];
            });

            foreach ($subjectScores as $index => $score) {
                DB::table('student_grades')->insert([
                    'school_id' => $demoSchoolId,
                    'student_id' => $score['student_id'],
                    'subject_id' => $subjId,
                    'grade_level_id' => $gradeIds[0],
                    'term_id' => $termId,
                    'ca_score' => $score['ca_score'],
                    'exam_score' => $score['exam_score'],
                    'total_score' => $score['total_score'],
                    'grade' => $score['grade'],
                    'remark' => $score['remark'],
                    'position' => $index + 1,
                    'created_at' => $now,
                ]);
            }
        }

        // ─────────────────────────────────────────────
        //  9. EXAMS & SUBMISSIONS
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
                'type' => 'mcq',
                'options' => json_encode(['A' => $q+1, 'B' => $q+2, 'C' => $q+3, 'D' => $q+4]),
                'correct_answer' => 'B',
                'marks' => 12,
            ]);
        }

        foreach ($studentIds as $sid) {
            $subId = DB::table('exam_submissions')->insertGetId([
                'exam_id' => $examId,
                'student_id' => $sid,
                'auto_score' => rand(30, 60),
                'manual_score' => 0,
                'status' => 'graded',
                'submitted_at' => $now,
                'created_at' => $now,
            ]);
        }

        // ─────────────────────────────────────────────
        //  10. GRADE SCALES
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

        // ─────────────────────────────────────────────
        //  11. RESULT PINS
        // ─────────────────────────────────────────────
        for ($p = 1; $p <= 20; $p++) {
            DB::table('result_pins')->insert([
                'school_id' => $demoSchoolId,
                'pin' => strtoupper(Str::random(10)),
                'used' => ($p <= 5), // Mark first 5 as used
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // ─────────────────────────────────────────────
        //  12. REPORT CARDS
        // ─────────────────────────────────────────────
        $positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        shuffle($positions);
        
        foreach ($studentIds as $index => $sid) {
            DB::table('report_cards')->insert([
                'school_id' => $demoSchoolId,
                'student_id' => $sid,
                'term_id' => $termId,
                'session_id' => $sessionId,
                'overall_average' => rand(65, 92) + (rand(0, 99) / 100),
                'overall_position' => $positions[$index],
                'total_students' => count($studentIds),
                'published' => true,
                'generated_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $output->writeln("");
        $output->writeln("<fg=white;bg=green;options=bold>  SUCCESS  </> <fg=green>Database seeded with COMPREHENSIVE bulk data!</>");
        $output->writeln("");
        $output->writeln("<fg=white;options=bold>┌────────────────────────────────────────────────────────────────────┐</>");
        $output->writeln("<fg=white;options=bold>│                      vDeskConnect - SEEDED ACCOUNTS                │</>");
        $output->writeln("<fg=white;options=bold>├────────────────────────────────────────────────────────────────────┤</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=cyan;options=bold>SUPER ADMIN (Platform Owner)</>                                   <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=yellow>Email    :</> admin@vdeskconnect.com                               <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=yellow>Password :</> SuperAdmin@2026!                                    <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>│                                                                    │</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=cyan;options=bold>SCHOOL ADMIN (Greenfield Academy)</>                            <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=yellow>Email    :</> director@greenfield.edu                               <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=yellow>Password :</> SchoolAdmin@2026!                                  <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>└────────────────────────────────────────────────────────────────────┘</>");
        $output->writeln("");
    }
}