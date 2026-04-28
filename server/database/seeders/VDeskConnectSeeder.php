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
                'ca_weight' => 40,
                'exam_weight' => 60,
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
        //  4b. BULK TEACHERS (for infinite scroll testing)
        // ─────────────────────────────────────────────
        $output->writeln("<fg=yellow>Seeding 50 additional teachers...</>");
        $firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
        $lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
        
        for ($i = 1; $i <= 50; $i++) {
            $fName = $firstNames[array_rand($firstNames)];
            $lName = $lastNames[array_rand($lastNames)];
            $email = strtolower($fName . '.' . $lName . '.' . $i . '@greenfield.edu');
            
            $tid = DB::table('users')->insertGetId([
                'school_id' => $demoSchoolId,
                'email' => $email,
                'password' => Hash::make('Password@2026!'),
                'role' => 'teacher',
                'verified' => true,
                'created_at' => $now,
            ]);
            
            DB::table('profiles')->insert([
                'user_id' => $tid,
                'type' => 'teacher',
                'data' => json_encode([
                    'first_name' => $fName, 
                    'last_name' => $lName,
                    'employee_number' => 'TCH-2026-' . str_pad($i + 100, 3, '0', STR_PAD_LEFT),
                    'gender' => $i % 2 == 0 ? 'male' : 'female',
                    'phone' => '+23480' . rand(10000000, 99999999),
                    'address' => rand(1, 100) . " Greenfield Close, Lagos",
                    'qualification' => ['B.Ed', 'M.Sc', 'PhD', 'B.Sc'][array_rand(['B.Ed', 'M.Sc', 'PhD', 'B.Sc'])],
                    'date_joined' => '2026-01-' . str_pad(rand(1, 28), 2, '0', STR_PAD_LEFT)
                ]),
            ]);
            $teacherIds[] = $tid;
        }

        // ─────────────────────────────────────────────
        //  4c. BULK STAFF (for infinite scroll testing)
        // ─────────────────────────────────────────────
        $output->writeln("<fg=yellow>Seeding 40 administrative staff...</>");
        $staffRoles = ['admin_staff', 'receptionist', 'principal'];
        for ($i = 1; $i <= 40; $i++) {
            $fName = $firstNames[array_rand($firstNames)];
            $lName = $lastNames[array_rand($lastNames)];
            $role = $staffRoles[array_rand($staffRoles)];
            $email = strtolower($fName . '.' . $lName . '.staff' . $i . '@greenfield.edu');
            
            $sid = DB::table('users')->insertGetId([
                'school_id' => $demoSchoolId,
                'email' => $email,
                'password' => Hash::make('Password@2026!'),
                'role' => 'admin', // Staff use admin role but profile distinguishes
                'verified' => true,
                'created_at' => $now,
            ]);
            
            DB::table('profiles')->insert([
                'user_id' => $sid,
                'type' => 'admin',
                'data' => json_encode([
                    'first_name' => $fName, 
                    'last_name' => $lName,
                    'role' => $role,
                    'employee_number' => 'STF-2026-' . str_pad($i + 50, 3, '0', STR_PAD_LEFT),
                    'gender' => $i % 3 == 0 ? 'male' : 'female',
                    'phone' => '+23470' . rand(10000000, 99999999),
                    'address' => rand(1, 100) . " Admin Street, Victoria Island",
                    'designation' => $role === 'principal' ? 'School Head' : ($role === 'receptionist' ? 'Front Desk' : 'Admin Officer')
                ]),
            ]);
        }

        // ─────────────────────────────────────────────
        //  5. STUDENTS
        // ─────────────────────────────────────────────
        $studentNames = [
            ['Fatima', 'Mohamed'], ['Emmanuel', 'Adebayo'], ['David', 'Okafor'], 
            ['Chidinma', 'Eze'], ['Blessing', 'Adeyemi'], ['Samuel', 'Uche'],
            ['Grace', 'Ogbonna'], ['Michael', 'Okonkwo'], ['Sarah', 'Idris'], ['Peter', 'Chukwu']
        ];

        $studentIds = [];
        foreach ($studentNames as $i => $name) {
            $sid = DB::table('users')->insertGetId([
                'school_id' => $demoSchoolId,
                'email' => $i === 0 ? 'fatima@student.com' : strtolower($name[0]) . '.' . ($i+1) . '@student.com',
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
        //  5b. BULK STUDENTS (for infinite scroll testing)
        // ─────────────────────────────────────────────
        $output->writeln("<fg=yellow>Seeding 120 additional students...</>");
        for ($i = 1; $i <= 120; $i++) {
            $fName = $firstNames[array_rand($firstNames)];
            $lName = $lastNames[array_rand($lastNames)];
            $email = strtolower($fName . '.' . $lName . '.stu' . $i . '@student.com');
            
            $sid = DB::table('users')->insertGetId([
                'school_id' => $demoSchoolId,
                'email' => $email,
                'password' => Hash::make('Password@2026!'),
                'role' => 'student',
                'verified' => true,
                'created_at' => $now,
            ]);
            
            DB::table('profiles')->insert([
                'user_id' => $sid,
                'type' => 'student',
                'data' => json_encode([
                    'first_name' => $fName, 
                    'last_name' => $lName,
                    'admission_number' => 'GFA/2026/' . str_pad($i + 50, 4, '0', STR_PAD_LEFT),
                    'grade_level_id' => $gradeIds[array_rand($gradeIds)],
                    'gender' => $i % 2 == 0 ? 'male' : 'female',
                    'date_of_birth' => rand(2005, 2015) . '-' . str_pad(rand(1, 12), 2, '0', STR_PAD_LEFT) . '-' . str_pad(rand(1, 28), 2, '0', STR_PAD_LEFT),
                    'phone' => '+23490' . rand(10000000, 99999999),
                    'address' => rand(1, 200) . " Student Avenue, Ikeja",
                    'guardian_name' => $lastNames[array_rand($lastNames)] . " Parent",
                    'guardian_phone' => '+23480' . rand(10000000, 99999999),
                    'guardian_email' => 'parent.' . $i . '@gmail.com'
                ]),
            ]);
            $studentIds[] = $sid;
        }

        // ─────────────────────────────────────────────
        //  6. SCHEME OF WORK & LESSON NOTES (Markdown Rich)
        // ─────────────────────────────────────────────
        $topics = ['Algebra Basics', 'Equations', 'Probability', 'Geometry', 'Calculus Intro'];
        // Add more topics for infinite scroll testing
        $moreTopics = ['Fractions', 'Decimals', 'Percentages', 'Ratios', 'Proportions', 'Word Problems', 'Data Interpretation', 'Statistics', 'Measurement', 'Triangles', 'Circles', 'Area and Perimeter', 'Volume', 'Angles', 'Lines and Angles', 'Coordinates', 'Sets', 'Indices', 'Logarithms', 'Sequences', 'Matrices'];
        $allTopics = array_merge($topics, $moreTopics);
        
        foreach ($allTopics as $i => $topic) {
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
        //  7. LECTURES (Markdown Rich + Multiple for infinite scroll testing)
        // ─────────────────────────────────────────────
        $lectureTitles = [
            'Quantum Mathematics Basics',
            'Introduction to Algebra',
            'Solving Linear Equations',
            'Quadratic Equations Deep Dive',
            'Geometry: Lines and Angles',
            'Introduction to Probability',
            'Statistics and Data Analysis',
            'Trigonometry Fundamentals',
            'Calculus: Limits and Derivatives',
            'Mathematical Induction',
            'Number Theory Basics',
            'Set Theory Introduction',
            'Functions and Relations',
            'Sequences and Series',
            'Complex Numbers',
            'Vectors in Mathematics',
            'Matrices and Determinants',
            'Differential Equations',
            'Integration Techniques',
            'Coordinate Geometry',
            'Advanced Quantum Mathematics',
            'Relativity in Modern Physics',
            'Neurobiology Fundamentals',
            'Data Science and Big Data',
            'Artificial Intelligence Ethics',
            'Global Economics and Trade',
            'Modern Literature Analysis',
            'World History: The Renaissance',
            'Political Science: Governance',
            'Psychology of Learning',
            'Environmental Science Basics',
            'Chemistry: Organic Compounds',
            'Microbiology and Viruses',
            'Astronomy: Exploring the Stars',
            'Geography: Plate Tectonics',
            'Sociology: Social Structures',
            'Philosophy: Logic and Reasoning',
            'Digital Marketing Strategies',
            'Cybersecurity Fundamentals',
            'Software Engineering Patterns',
            'Blockchain Technology Intro',
            'Cloud Computing Essentials',
            'Mobile App Development',
            'User Experience Design',
            'Game Development Basics',
            'Renewable Energy Sources',
            'Marine Biology Exploration',
            'Genetic Engineering Ethics',
            'Nanotechnology in Medicine',
            'Robotics and Automation',
            'Sustainable Architecture',
            'Visual Arts and Design',
            'Music Theory Fundamentals',
            'Theatre Arts Introduction',
            'Sports Science and Health',
            'Culinary Arts and Nutrition',
            'Fashion Design and Textiles',
            'Linguistics and Semantics',
            'Journalism and Media Studies',
            'Public Speaking and Rhetoric'
        ];
        
        $lectureStatuses = ['scheduled', 'in_progress', 'completed'];
        $lectureTypes = ['sync', 'async', 'hybrid'];
        
        foreach ($lectureTitles as $li => $lectureTitle) {
            $lectureStatus = $lectureStatuses[array_rand($lectureStatuses)];
            $lectureType = $lectureTypes[array_rand($lectureTypes)];
            
            DB::table('lectures')->insert([
                'school_id' => $demoSchoolId,
                'teacher_id' => $teacherIds[0],
                'grade_level_id' => $gradeIds[array_rand($gradeIds)],
                'subject_id' => $subjectIds[array_rand($subjectIds)],
                'title' => $lectureTitle,
                'description' => "A comprehensive lecture on $lectureTitle with detailed explanations and examples.",
                'scheduled_at' => $now->copy()->addDays(rand(1, 30)),
                'duration_minutes' => rand(30, 120),
                'status' => $lectureStatus,
                'type' => $lectureType,
                'content' => "## $lectureTitle\n\nThis lecture covers the fundamental concepts of $lectureTitle.\n\n### Key Topics\n- Introduction to $lectureTitle\n- Core principles\n- Practical applications\n- Problem-solving techniques",
                'is_published' => true,
                'created_by' => $teacherIds[0],
                'created_at' => $now,
            ]);
        }

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
        $examsData = [
            [
                'title' => 'Mathematics Mid-Term Exam',
                'subject_id' => $subjectIds[0],
                'type' => 'MCQ',
                'duration_minutes' => 60,
                'published' => true,
                'total_marks' => 100,
                'is_ca_test' => false,
            ],
            [
                'title' => 'Mathematics CA Test 1',
                'subject_id' => $subjectIds[0],
                'type' => 'MCQ',
                'duration_minutes' => 20,
                'published' => true,
                'total_marks' => 20,
                'is_ca_test' => true,
            ],
            [
                'title' => 'Mathematics CA Test 2',
                'subject_id' => $subjectIds[0],
                'type' => 'MCQ',
                'duration_minutes' => 20,
                'published' => true,
                'total_marks' => 20,
                'is_ca_test' => true,
            ],
            [
                'title' => 'Biology CA Test 1',
                'subject_id' => $subjectIds[2],
                'type' => 'MCQ',
                'duration_minutes' => 30,
                'published' => true,
                'total_marks' => 20,
                'is_ca_test' => true,
            ],
            [
                'title' => 'Physics Final Assessment',
                'subject_id' => $subjectIds[3],
                'type' => 'Theory',
                'duration_minutes' => 120,
                'published' => true,
                'total_marks' => 100,
                'is_ca_test' => false,
            ],
            [
                'title' => 'English Language CA Test 1',
                'subject_id' => $subjectIds[1],
                'type' => 'MCQ',
                'duration_minutes' => 45,
                'published' => true,
                'total_marks' => 30,
                'is_ca_test' => true,
            ],
            [
                'title' => 'English Language Final Exam',
                'subject_id' => $subjectIds[1],
                'type' => 'MCQ',
                'duration_minutes' => 90,
                'published' => true,
                'total_marks' => 100,
                'is_ca_test' => false,
            ]
        ];

        $examIds = [];
        foreach ($examsData as $exam) {
            $examIds[] = DB::table('exams')->insertGetId([
                'school_id' => $demoSchoolId,
                'title' => $exam['title'],
                'subject_id' => $exam['subject_id'],
                'grade_level_id' => $gradeIds[0],
                'term_id' => $termId,
                'duration_minutes' => $exam['duration_minutes'],
                'type' => $exam['type'],
                'published' => $exam['published'],
                'total_marks' => $exam['total_marks'],
                'is_ca_test' => $exam['is_ca_test'],
                'created_at' => $now,
            ]);
        }

        foreach ($examIds as $eId) {
            for ($q = 1; $q <= 5; $q++) {
                DB::table('exam_questions')->insert([
                    'exam_id' => $eId,
                    'question_text' => "Sample Question $q for exam ID $eId?",
                    'type' => 'mcq',
                    'options' => json_encode(['A' => 'Option 1', 'B' => 'Option 2', 'C' => 'Option 3', 'D' => 'Option 4']),
                    'correct_answer' => 'B',
                    'marks' => 10,
                ]);
            }

            foreach ($studentIds as $sid) {
                // Only create submissions for published exams
                $examData = collect($examsData)->firstWhere('title', DB::table('exams')->where('id', $eId)->value('title'));
                if ($examData && $examData['published']) {
                    $totalMarks = $examData['total_marks'];
                    // Random score between 40% and 95% of total marks
                    $score = rand($totalMarks * 0.4, $totalMarks * 0.95);
                    
                    DB::table('exam_submissions')->insert([
                        'exam_id' => $eId,
                        'student_id' => $sid,
                        'auto_score' => $score,
                        'manual_score' => 0,
                        'status' => 'graded',
                        'submitted_at' => $now,
                        'created_at' => $now,
                    ]);
                }
            }
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
        $studentAverages = [];
        foreach ($studentIds as $sid) {
            $totalAvg = DB::table('student_grades')
                ->where('student_id', $sid)
                ->where('term_id', $termId)
                ->avg('total_score');
            $studentAverages[] = [
                'student_id' => $sid,
                'average' => $totalAvg
            ];
        }

        // Sort by average to get overall positions
        usort($studentAverages, function($a, $b) {
            return $b['average'] <=> $a['average'];
        });

        foreach ($studentAverages as $index => $rank) {
            DB::table('report_cards')->insert([
                'school_id' => $demoSchoolId,
                'student_id' => $rank['student_id'],
                'term_id' => $termId,
                'session_id' => $sessionId,
                'overall_average' => $rank['average'],
                'overall_position' => $index + 1,
                'total_students' => count($studentIds),
                'published' => true,
                'pdf_url' => '/storage/reports/dummy.pdf',
                'generated_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        
        // ─────────────────────────────────────────────
        //  13. MARKETPLACE (Textbooks & Orders)
        // ─────────────────────────────────────────────
        $output->writeln("<fg=yellow>Seeding 30 textbooks and 150 orders...</>");
        
        $bookTitles = [
            'Essential Mathematics', 'New General Mathematics', 'Intensive English', 
            'Oxford English', 'Modern Biology', 'Comprehensive Physics', 
            'Simplified Chemistry', 'Economics for Schools', 'Government Essentials',
            'Civic Education', 'Agricultural Science', 'Further Mathematics',
            'Technical Drawing', 'Home Economics', 'Basic Technology',
            'Computer Studies', 'Data Processing', 'Visual Arts', 'Music Theory',
            'Physical Education', 'Basic Science', 'Social Studies', 'History',
            'Geography', 'French Basics', 'Yoruba Language', 'Igbo Language',
            'Hausa Language', 'Literature in English', 'CRS/IRS Study'
        ];

        $bookIds = [];
        foreach ($bookTitles as $idx => $title) {
            $isElectronic = $idx % 3 === 0;
            $bookIds[] = DB::table('textbooks')->insertGetId([
                'school_id' => $demoSchoolId,
                'title' => $title . " for " . ($idx < 15 ? 'Junior' : 'Senior') . " Secondary",
                'grade_level_id' => $gradeIds[array_rand($gradeIds)],
                'subject_id' => $subjectIds[array_rand($subjectIds)],
                'price' => rand(2500, 15000),
                'is_electronic' => $isElectronic,
                'file_url' => $isElectronic ? 'https://vdeskconnect.edu/library/ebooks/book_' . $idx . '.pdf' : null,
                'physical_form_url' => !$isElectronic ? 'https://vdeskconnect.edu/forms/collect_' . $idx . '.pdf' : null,
                'description' => "Official textbook for students. Covers the complete syllabus with exercises and solutions.",
                'stock_count' => !$isElectronic ? rand(20, 100) : null,
                'available' => true,
                'created_at' => $now->copy()->subMonths(3),
                'updated_at' => $now,
            ]);
        }

        $orderStatuses = ['pending', 'paid', 'delivered'];
        foreach ($studentIds as $sid) {
            // Each student makes 1-3 orders across the last 3 months
            $numOrders = rand(1, 3);
            for ($o = 0; $o < $numOrders; $o++) {
                $bookId = $bookIds[array_rand($bookIds)];
                $book = DB::table('textbooks')->where('id', $bookId)->first();
                $status = $orderStatuses[array_rand($orderStatuses)];
                $orderDate = $now->copy()->subDays(rand(0, 90));

                DB::table('marketplace_orders')->insert([
                    'school_id' => $demoSchoolId,
                    'student_id' => $sid,
                    'textbook_id' => $bookId,
                    'amount' => $book->price,
                    'status' => $status,
                    'payment_ref' => 'PAY-' . strtoupper(Str::random(10)),
                    'order_date' => $orderDate,
                    'created_at' => $orderDate,
                    'updated_at' => $orderDate,
                ]);
            }
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
        $output->writeln("<fg=white;options=bold>│                                                                    │</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=cyan;options=bold>STUDENT ACCOUNT (Fatima Mohamed)</>                             <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=yellow>Email    :</> fatima@student.com                                   <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>│  </><fg=yellow>Password :</> Password@2026!                                     <fg=white;options=bold>│</>");
        $output->writeln("<fg=white;options=bold>└────────────────────────────────────────────────────────────────────┘</>");
        $output->writeln("");
    }
}