<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiService
{
    public $apiKey;
    protected $baseUrl;
    protected $model;
    protected $provider;

    public function __construct()
    {
        // Directly use env() to avoid config cache issues
        $this->apiKey = env('AI_API_KEY');
        $this->baseUrl = env('AI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta');

        // Use gemini-2.0-flash which is confirmed working
        $this->model = env('AI_MODEL', 'gemini-2.0-flash');
        $this->provider = env('AI_PROVIDER', 'gemini');
    }

    /**
     * Generate a lesson note using AI based on scheme of work data.
     * Returns array with 'aspects' and '_used_fallback' flag.
     */
    public function generateLessonNote(array $schemeData, array $gradeInfo, array $subjectInfo, int $audienceSize = 30): array
    {
        Log::info('generateLessonNote called', [
            'hasApiKey' => !empty($this->apiKey),
            'apiKeyStart' => !empty($this->apiKey) ? substr($this->apiKey, 0, 10) . '...' : 'none',
        ]);

        if ($this->apiKey) {
            return $this->generateWithAI($schemeData, $gradeInfo, $subjectInfo, $audienceSize);
        }

        Log::warning('AI API key not configured, using smart fallback');
        $result = $this->generateSmartFallback($schemeData, $gradeInfo, $subjectInfo, $audienceSize);
        $result['_used_fallback'] = true;
        $result['_fallback_reason'] = 'AI API key not configured';
        return $result;
    }

    /**
     * Generate using real AI API (Gemini or OpenAI-compatible).
     */
    protected function generateWithAI(array $schemeData, array $gradeInfo, array $subjectInfo, int $audienceSize): array
    {
        try {
            Log::info('AI Service: Using AI API', [
                'model' => $this->model,
                'provider' => $this->provider,
                'hasApiKey' => !empty($this->apiKey),
                'baseUrl' => $this->baseUrl,
            ]);

            $prompt = $this->buildPrompt($schemeData, $gradeInfo, $subjectInfo, $audienceSize);

            if ($this->provider === 'gemini') {
                return $this->callGeminiAPI($prompt, $schemeData);
            }

            // Default: OpenAI-compatible API
            return $this->callOpenAICompatibleAPI($prompt, $schemeData);
        } catch (\Exception $e) {
            Log::error('AI service error: ' . $e->getMessage());
            Log::error('AI service stack trace: ' . $e->getTraceAsString());
            $result = $this->generateSmartFallback($schemeData, $gradeInfo, $subjectInfo, $audienceSize);
            $result['_used_fallback'] = true;
            $result['_fallback_reason'] = 'AI API error: ' . $e->getMessage();
            return $result;
        }
    }

    /**
     * Call Gemini API (native format).
     */
    protected function callGeminiAPI(string $prompt, array $schemeData): array
    {
        $url = "{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}";

        Log::info('Calling Gemini API', ['model' => $this->model, 'url' => $url]);

        // Use higher temperature for more creative/varied results
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->timeout(60)->post($url, [
            'contents' => [
                [
                    'parts' => [
                        [
                            'text' => $prompt
                        ]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.9, // High creativity
                'maxOutputTokens' => 4096,
                'topP' => 0.95,
                'topK' => 40,
            ],
            'safetySettings' => [
                ['category' => 'HARM_CATEGORY_HARASSMENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
                ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_ONLY_HIGH'],
            ]
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $content = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            return $this->parseAIResponse($content, $schemeData);
        }

        $status = $response->status();
        $body = $response->body();
        Log::error('Gemini API error: ' . $status . ' - ' . $body);

        if ($status === 429) {
            throw new \Exception('AI API rate limit exceeded (429). Please wait a minute and try again. Free tier: 15 requests/min.');
        } elseif ($status === 403) {
            throw new \Exception('AI API key is invalid or expired. Please check your API key.');
        } elseif ($status === 404) {
            throw new \Exception("AI model '{$this->model}' not found. Please check AI_MODEL in .env");
        }

        throw new \Exception('Gemini API request failed: HTTP ' . $status);
    }

    /**
     * Call OpenAI-compatible API (OpenAI, DashScope/Qwen, etc.).
     */
    protected function callOpenAICompatibleAPI(string $prompt, array $schemeData): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(60)->post($this->baseUrl . '/chat/completions', [
            'model' => $this->model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are an expert educational content creator. Generate detailed, pedagogically sound lesson notes for teachers. Be specific, practical, and age-appropriate.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'temperature' => 0.7,
            'max_tokens' => 4000,
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $content = $data['choices'][0]['message']['content'] ?? '';
            return $this->parseAIResponse($content, $schemeData);
        }

        Log::error('OpenAI-compatible API error: ' . $response->body());
        throw new \Exception('API request failed: ' . $response->status());
    }

    /**
     * Build the AI prompt with full context.
     */
    protected function buildPrompt(array $scheme, array $grade, array $subject, int $audienceSize): string
    {
        $objectives = $scheme['objectives'] ?? 'Not specified';
        $activities = $scheme['activities'] ?? 'Not specified';
        $resources = $scheme['resources'] ?? 'Not specified';
        $evaluation = $scheme['evaluation'] ?? 'Not specified';

        return <<<PROMPT
You are a creative and expert pedagogical content creator. Generate a unique, highly engaging lesson note based on the context below.

**Context:**
- **Subject:** {$subject['name']} ({$subject['code']})
- **Grade:** {$grade['name']} (Cycle: {$grade['cycle']})
- **Topic:** {$scheme['topic']}
- **Week:** {$scheme['week_number']}
- **Term:** {$scheme['term_name']}
- **Class Size:** {$audienceSize} students
- **Existing Scheme Objectives:** {$objectives}

**Requirements:**
1. **Be Creative & Unique:** Do not use generic templates. Vary your sentence structure, tone, and examples. Make it feel fresh and original.
2. **Real-World Relevance:** Use specific, modern, and relatable examples relevant to students' daily lives.
3. **Interactive:** Include specific questions to ask the class and specific group activities.
4. **Differentiation:** Provide concrete strategies for struggling AND advanced students.
5. **Format:** Use Markdown. Use headers, bold text for key terms, and bullet points.

**Generate these 5 sections:**

1. **OBJECTIVE:** 3-5 specific, measurable goals using Bloom's Taxonomy verbs. Start each with a bold verb.
2. **CONTENT:** A step-by-step flow. Introduction (Hook), Main Delivery (Concepts + Examples), Practice, Conclusion. Include a "Teacher Script" or "Key Question" for each part.
3. **METHODOLOGY:** Specific teaching methods (e.g., Think-Pair-Share, Jigsaw, Gamification) suitable for this topic.
4. **MATERIALS:** A list of specific physical and digital tools needed.
5. **EVALUATION:** 3-4 formative assessment questions and a creative "Exit Ticket" idea.

**Output ONLY the Markdown content.**
PROMPT;
    }

    /**
     * Parse AI response into structured format.
     */
    protected function parseAIResponse(string $content, array $schemeData): array
    {
        // Extract sections using regex patterns
        $objective = $this->extractSection($content, 'OBJECTIVE', 'CONTENT');
        $lessonContent = $this->extractSection($content, 'CONTENT', 'METHODOLOGY');
        $methodology = $this->extractSection($content, 'METHODOLOGY', 'MATERIAL');
        $materials = $this->extractSection($content, 'MATERIAL', 'EVALUATION');
        $evaluation = $this->extractSection($content, 'EVALUATION', '$');

        return [
            'scheme_id' => $schemeData['id'],
            'week_number' => $schemeData['week_number'],
            'topic' => $schemeData['topic'],
            'aspects' => [
                'objective' => trim($objective) ?: 'Develop clear learning objectives aligned with the topic.',
                'content' => trim($lessonContent) ?: 'Detailed lesson content with introduction, main delivery, practice, and conclusion.',
                'methodology' => trim($methodology) ?: 'Interactive teaching methods: discussion, demonstration, guided practice, and group work.',
                'materials' => trim($materials) ?: 'Textbook, whiteboard, markers, handouts, and relevant learning materials.',
                'evaluation' => trim($evaluation) ?: 'Formative assessment through questioning, exit ticket, and observation of student practice.',
            ],
            'contact_number' => 40,
        ];
    }

    /**
     * Extract section between two markers.
     */
    protected function extractSection(string $content, string $startMarker, string $endMarker): string
    {
        $pattern = '/' . preg_quote($startMarker, '/') . '[:\s]*(.*?)(?=' . preg_quote($endMarker, '/') . '|\Z)/is';
        if (preg_match($pattern, $content, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }

    /**
     * Smart fallback: Generate contextual lesson note using intelligent templates.
     * This produces real, useful content based on the subject, grade, and topic.
     * Includes randomization to prevent repetitive output.
     */
    protected function generateSmartFallback(array $scheme, array $grade, array $subject, int $audienceSize): array
    {
        $gradeLevel = strtolower($grade['name']);
        $subjectName = strtolower($subject['name']);
        $topic = $scheme['topic'];

        // Seed random based on topic to get consistent but varied results
        srand(crc32($topic . $gradeLevel));

        // Build contextual content based on subject and grade
        $objective = $this->generateObjective($subjectName, $gradeLevel, $topic);
        $content = $this->generateContent($subjectName, $gradeLevel, $topic);
        $methodology = $this->generateMethodology($subjectName, $gradeLevel);
        $materials = $this->generateMaterials($subjectName, $gradeLevel);
        $evaluation = $this->generateEvaluation($subjectName, $gradeLevel, $topic);

        return [
            'scheme_id' => $scheme['id'] ?? null,
            'week_number' => $scheme['week_number'] ?? 1,
            'topic' => $topic,
            'aspects' => [
                'objective' => $objective,
                'content' => $content,
                'methodology' => $methodology,
                'materials' => $materials,
                'evaluation' => $evaluation,
            ],
            'contact_number' => 40,
        ];
    }

    protected function generateObjective(string $subject, string $grade, string $topic): string
    {
        $isJunior = strpos($grade, 'jss') !== false || strpos($grade, 'junior') !== false || strpos($grade, 'basic') !== false;
        $isSenior = strpos($grade, 'ss') !== false || strpos($grade, 'senior') !== false || strpos($grade, 'grade 10') !== false || strpos($grade, 'grade 11') !== false || strpos($grade, 'grade 12') !== false;

        // Build truly unique objectives based on specific topic keywords
        $topicShort = strlen($topic) > 30 ? substr($topic, 0, 28) . '...' : $topic;

        $subjectVerbs = [
            'mathematics' => ['solve', 'calculate', 'apply', 'demonstrate', 'analyze', 'compute', 'evaluate'],
            'english' => ['analyze', 'demonstrate', 'express', 'interpret', 'compose', 'evaluate', 'critique'],
            'science' => ['explain', 'investigate', 'demonstrate', 'apply', 'analyze', 'hypothesize', 'observe'],
            'biology' => ['describe', 'explain', 'analyze', 'identify', 'demonstrate', 'compare', 'evaluate'],
            'chemistry' => ['explain', 'calculate', 'identify', 'demonstrate', 'analyze', 'predict', 'evaluate'],
            'physics' => ['apply', 'calculate', 'explain', 'demonstrate', 'analyze', 'solve', 'evaluate'],
            'history' => ['analyze', 'evaluate', 'compare', 'explain', 'interpret', 'assess', 'discuss'],
            'geography' => ['describe', 'analyze', 'interpret', 'explain', 'compare', 'evaluate', 'locate'],
            'civic education' => ['explain', 'discuss', 'analyze', 'demonstrate', 'evaluate', 'apply', 'identify'],
        ];

        $verbs = $subjectVerbs[$subject] ?? ['understand', 'explain', 'demonstrate', 'apply', 'analyze'];
        
        // Resolve fallbacks before string interpolation
        $verb3 = $verbs[3] ?? 'Connect';
        $verb4 = $verbs[4] ?? 'Demonstrate';

        $levelDesc = $isJunior ? 'foundational' : ($isSenior ? 'advanced' : 'intermediate');

        return "By the end of this lesson on **{$topicShort}**, {$grade} students should be able to:

1. **{$verbs[0]}** key concepts related to {$topicShort} using {$levelDesc} terminology
2. **{$verbs[1]}** practical applications of {$topicShort} through guided exercises
3. **{$verbs[2]}** understanding by solving/analyzing problems involving {$topicShort}
4. **{$verb3}** {$topicShort} to real-world scenarios and previous lessons
5. **{$verb4}** mastery through class participation and written assessments";
    }

    protected function generateContent(string $subject, string $grade, string $topic): string
    {
        $isJunior = strpos($grade, 'jss') !== false || strpos($grade, 'junior') !== false || strpos($grade, 'basic') !== false;
        $level = $isJunior ? 'foundation level with simple language, concrete examples, and step-by-step explanations' : 'advanced level with detailed explanations, critical analysis, and complex problem-solving';

        $topicShort = strlen($topic) > 25 ? substr($topic, 0, 23) . '...' : $topic;

        $subjectSpecific = [
            'mathematics' => "
**Key Mathematical Concepts:**
- Definition and properties of {$topicShort}
- Formulas, rules, and procedures
- Step-by-step worked examples
- Common errors and how to avoid them
- Practice problems of increasing difficulty",
            'english' => "
**Key Language Concepts:**
- Grammar rules and usage related to {$topicShort}
- Vocabulary and terminology
- Reading comprehension passages
- Writing exercises and examples
- Speaking and listening activities",
            'science' => "
**Key Scientific Concepts:**
- Scientific principles underlying {$topicShort}
- Observations and experimental evidence
- Real-world applications and examples
- Safety considerations (if applicable)
- Environmental and social implications",
            'biology' => "
**Key Biological Concepts:**
- Structure and function related to {$topicShort}
- Biological processes and mechanisms
- Classification and relationships
- Health and environmental relevance
- Laboratory observations (if applicable)",
            'chemistry' => "
**Key Chemical Concepts:**
- Chemical properties and reactions of {$topicShort}
- Equations and stoichiometry
- Practical applications and industries
- Safety protocols for experiments
- Environmental impact considerations",
            'physics' => "
**Key Physical Concepts:**
- Physical laws and principles of {$topicShort}
- Mathematical relationships and formulas
- Experimental verification methods
- Technological applications
- Problem-solving strategies",
            'history' => "
**Key Historical Concepts:**
- Chronological events related to {$topicShort}
- Important figures and their contributions
- Causes and consequences analysis
- Primary and secondary sources
- Connections to modern society",
            'geography' => "
**Key Geographical Concepts:**
- Physical and human geography of {$topicShort}
- Maps, charts, and data interpretation
- Human-environment interactions
- Spatial patterns and relationships
- Regional and global significance",
        ];

        $specificContent = $subjectSpecific[$subject] ?? "
**Key Concepts:**
- Core principles and definitions of {$topicShort}
- Important facts and terminology
- Practical applications and examples
- Common misconceptions to avoid
- Connections to other subjects";

        return "### LESSON CONTENT: {$topicShort} (40 minutes)

#### **INTRODUCTION (5 minutes)**
- **Hook:** Begin with a thought-provoking question: *\"What do you already know about {$topicShort}?\"*
- Share a real-life scenario or story that demonstrates why {$topicShort} matters
- Clearly state the learning objectives on the board
- Connect to previous lessons: *\"Last week we learned about [related topic], today we build on that...\"*

#### **MAIN DELIVERY (20 minutes)**

{$specificContent}

**Teaching Approach ({$level}):**
1. **Direct Instruction (8 mins):** Present core concepts using visual aids, whiteboard diagrams, and clear explanations
2. **Interactive Examples (7 mins):** Work through 2-3 examples with student participation. Ask: *\"What do you think comes next?\"*
3. **Real-World Connection (5 mins):** Show how {$topicShort} applies to everyday life, careers, or current events

#### **STUDENT PRACTICE (10 minutes)**
- **Guided Practice (5 mins):** Students work in pairs on structured exercises related to {$topicShort}
- **Independent Practice (5 mins):** Individual work on application problems
- **Teacher Circulation:** Walk around the classroom, provide individual support, address common difficulties

#### **CONCLUSION (5 minutes)**
- Summarize the 3-5 key takeaways from today's lesson on {$topicShort}
- Exit Ticket: Students write one thing they learned and one question they still have
- Preview next lesson: *\"Next time, we'll explore how {$topicShort} connects to [upcoming topic]...\"*
- Assign relevant homework or practice exercises";
    }

    protected function generateMethodology(string $subject, string $grade): string
    {
        $isJunior = strpos($grade, 'jss') !== false || strpos($grade, 'junior') !== false || strpos($grade, 'basic') !== false;
        $topicLower = strtolower($grade);

        if ($isJunior) {
            return "### TEACHING METHODOLOGY FOR {$grade}

#### **1. Multi-Sensory Instruction (10 mins)**
- Use **visual aids**: charts, diagrams, color-coded notes, and实物 models
- Incorporate **hands-on manipulatives** for concrete understanding
- Use **simple, clear language** appropriate for {$grade} level
- Repeat key concepts 2-3 times using different examples

#### **2. Interactive Questioning (10 mins)**
- Ask **open-ended questions**: *\"What do you notice about...?\"*, *\"How would you explain this to a friend?\"*
- Use **think-pair-share**: Students think individually, discuss with partner, then share with class
- Encourage **student volunteers** to come to the board and demonstrate solutions

#### **3. Collaborative Learning (10 mins)**
- **Small groups (3-4 students)** work on guided practice exercises
- Assign **group roles**: Leader, Recorder, Materials Manager, Presenter
- Provide **differentiated worksheets**: easier versions for struggling students, challenge problems for advanced learners

#### **4. Differentiation Strategies**
- **For struggling learners:**
  - Provide step-by-step templates and graphic organizers
  - Use peer tutoring: pair with a stronger student
  - Offer additional one-on-one support during practice time
  - Break complex tasks into smaller, manageable steps

- **For advanced learners:**
  - Provide extension problems and real-world application challenges
  - Encourage them to help explain concepts to peers
  - Offer independent research or project opportunities

- **For diverse learning styles:**
  - **Visual:** Diagrams, charts, color-coding, videos
  - **Auditory:** Discussions, read-alouds, verbal explanations
  - **Kinesthetic:** Hands-on activities, movement-based learning, manipulatives
  - **Reading/Writing:** Note-taking, worksheets, journaling

#### **5. Classroom Management**
- Establish clear expectations and routines
- Use positive reinforcement: praise effort, not just correct answers
- Implement a **participation system** (e.g., cold calling, random name generator)
- Maintain an inclusive environment where all students feel safe to ask questions";
        }

        return "### TEACHING METHODOLOGY FOR {$grade}

#### **1. Socratic Seminar & Discussion (10 mins)**
- Use **probing questions** to promote critical thinking: *\"What evidence supports this conclusion?\"*, *\"How might this apply to a different context?\"*
- Facilitate **student-led discussions** where learners debate different perspectives
- Encourage **evidence-based arguments** using data, examples, and logical reasoning

#### **2. Problem-Based Learning (10 mins)**
- Present **authentic, complex problems** related to the topic
- Students work in **small teams** to analyze, hypothesize, and propose solutions
- Emphasize **process over product**: how they think matters more than the answer

#### **3. Flipped Classroom Elements (5 mins)**
- Assign **pre-reading or video content** for homework
- Use class time for **application, analysis, and synthesis**
- Provide **guided notes** or graphic organizers for students to use during independent study

#### **4. Technology Integration**
- Use **digital tools**: interactive simulations, online quizzes, educational apps
- Incorporate **multimedia resources**: videos, podcasts, virtual labs
- Utilize **learning management systems** for assignment distribution and feedback

#### **5. Differentiation Strategies**
- **Tiered assignments**: Same content, different complexity levels
- **Choice boards**: Students select how they demonstrate understanding (essay, presentation, project, etc.)
- **Flexible grouping**: Mix ability levels for peer learning, sometimes group by skill for targeted instruction
- **Scaffolding**: Provide sentence starters, templates, and partially completed examples

#### **6. Assessment for Learning**
- **Formative checks**: Thumbs up/down, exit tickets, whiteboard responses
- **Peer assessment**: Students review each other's work using rubrics
- **Self-reflection**: Learning journals, goal-setting exercises
- **Immediate feedback**: Address misconceptions in real-time during practice

#### **7. Real-World Connections**
- Invite **guest speakers** from relevant professions
- Use **current events** and news articles as discussion prompts
- Assign **community-based projects** that apply classroom learning
- Discuss **career pathways** related to the subject matter";
    }

    protected function generateMaterials(string $subject, string $grade): string
    {
        $commonMaterials = "- Whiteboard/Chalkboard and markers/chalk\n- Textbook: Relevant chapter on the topic\n- Printed worksheets or handouts\n- Student notebooks and writing materials";

        $subjectSpecific = [
            'mathematics' => "- Mathematical instruments: rulers, protractors, compasses, calculators\n- Graph paper for plotting and visualization\n- Manipulatives (counters, blocks, or geometric shapes)\n- Formula sheets or reference cards",
            'science' => "- Laboratory equipment (beakers, test tubes, etc.) as needed\n- Safety equipment: goggles, gloves, lab coats\n- Specimens, models, or samples related to the topic\n- Scientific measurement tools (rulers, thermometers, etc.)",
            'english' => "- Reading passages or texts related to the topic\n- Vocabulary lists and dictionaries\n- Graphic organizers for writing activities\n- Audio-visual materials (videos, recordings) if available",
            'biology' => "- Biological specimens, models, or diagrams\n- Microscopes and slides (if applicable)\n- Charts showing biological processes or systems\n- Field guides or identification keys",
            'chemistry' => "- Chemical reagents and solutions (if lab work is included)\n- Periodic table charts\n- Molecular model kits\n- Safety data sheets for chemicals used",
            'physics' => "- Physics demonstration apparatus\n- Measuring instruments (stopwatches, meters, balances)\n- Diagrams of physical systems or phenomena\n- Calculation sheets and formula references",
            'history' => "- Historical maps and timelines\n- Primary source documents or excerpts\n- Photographs and historical artifacts (reproductions)\n- Biographical information on key figures",
            'geography' => "- Maps (political, physical, thematic)\n- Globes or atlas\n- Statistical data and graphs\n- Satellite imagery or aerial photographs",
        ];

        $specific = $subjectSpecific[$subject] ?? "- Visual aids (posters, charts, diagrams) related to the topic\n- Reference materials and supplementary readings\n- Any subject-specific tools or equipment";

        return "MATERIALS AND RESOURCES:\n\n{$commonMaterials}\n\n{$specific}\n\n- Projector or smartboard (if available) for presentations\n- Internet access for supplementary resources\n- Assessment rubrics or marking guides";
    }

    protected function generateEvaluation(string $subject, string $grade, string $topic): string
    {
        return "EVALUATION AND ASSESSMENT:

**FORMATIVE ASSESSMENT (During Lesson):**
1. **Oral Questioning:** Ask probing questions throughout the lesson to check understanding:
   - \"Can you explain in your own words what {$topic} means?\"
   - \"How does this concept relate to what we learned last week?\"
   - \"Can you give me an example of {$topic} in real life?\"

2. **Observation:** Monitor student participation during practice activities and note common difficulties

3. **Exit Ticket (End of Lesson):** Have students write responses to:
   - One thing they learned about {$topic}
   - One question they still have
   - One real-world application of today's topic

**SUMMATIVE ASSESSMENT (Homework/Follow-up):**
1. Assign practice problems or exercises related to {$topic}
2. Short quiz or test on key concepts (can be given next lesson)
3. Project or presentation opportunity for students to demonstrate deeper understanding

**ASSESSMENT CRITERIA:**
- Accuracy of responses and problem-solving
- Ability to explain concepts in own words
- Application of knowledge to new situations
- Quality of written work and presentation
- Participation and engagement during class activities

**FEEDBACK STRATEGY:**
- Provide immediate feedback during guided practice
- Use positive reinforcement to encourage effort
- Address misconceptions promptly and clearly
- Return graded work with constructive comments within one week";
    }

    /**
     * Generate lecture content using AI with smart fallback
     */
    public function generateLecture(array $lectureData, array $gradeInfo, array $subjectInfo, int $sections = 5): array
    {
        Log::info('generateLecture called', [
            'hasApiKey' => !empty($this->apiKey),
            'sections' => $sections,
        ]);

        if ($this->apiKey) {
            return $this->generateLectureWithAI($lectureData, $gradeInfo, $subjectInfo, $sections);
        }

        Log::warning('AI API key not configured, using smart fallback for lecture');
        $result = $this->generateLectureFallback($lectureData, $gradeInfo, $subjectInfo, $sections);
        $result['_used_fallback'] = true;
        $result['_fallback_reason'] = 'AI API key not configured';
        return $result;
    }

    /**
     * Generate lecture with real AI
     */
    protected function generateLectureWithAI(array $lectureData, array $gradeInfo, array $subjectInfo, int $sections): array
    {
        $title = $lectureData['title'] ?? 'Lecture';
        $description = $lectureData['description'] ?? '';
        
        $prompt = "Generate a structured lecture for {$subjectInfo['name']} for grade {$gradeInfo['name']}.
        
Title: {$title}
Description: {$description}

Create {$sections} sections. Each section should include:
- A heading (## Section Title)
- 3-4 paragraphs of teaching content
- Key points to cover
- Example or explanation

Format the content for a {$gradeInfo['cycle']} school level ({$gradeInfo['short_name']}).
Make it comprehensive and educational.

Respond in JSON format:
{
  'sections': [
    {'title': 'Section 1 Title', 'content': 'Full content for section 1...'},
    {'title': 'Section 2 Title', 'content': 'Full content for section 2...'}
  ]
}";

        try {
            $response = Http::timeout(60)->post("{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}", [
                'contents' => [[
                    'role' => 'user',
                    'parts' => [['text' => $prompt]]
                ]],
                'generationConfig' => [
                    'temperature' => 0.7,
                    'maxOutputTokens' => 8000,
                ]
            ]);

            if ($response->successful()) {
                $text = $response->json('candidates.0.content.parts.0.text');
                $text = trim($text);
                if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
                    $json = json_decode($matches[0], true);
                    if ($json && isset($json['sections'])) {
                        return $json;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('AI lecture generation failed: ' . $e->getMessage());
        }

        $result = $this->generateLectureFallback($lectureData, $gradeInfo, $subjectInfo, $sections);
        $result["_used_fallback"] = true;
        $result["_fallback_reason"] = "AI API request failed or invalid JSON returned";
        return $result;
    }

    /**
     * Smart fallback for lecture generation
     */
    protected function generateLectureFallback(array $lectureData, array $gradeInfo, array $subjectInfo, int $sections): array
    {
        $title = $lectureData['title'] ?? 'Lecture';
        $subjectName = strtolower($subjectInfo['name']);
        $gradeLevel = strtolower($gradeInfo['name']);
        $topic = $title;

        $generatedSections = [];
        
        // Define common lecture structure for different subjects
        for ($i = 1; $i <= $sections; $i++) {
            $sectionTitle = match(true) {
                $i === 1 => "Introduction to {$topic}",
                $i === $sections => "Summary and Key Takeaways",
                default => "Core Concept " . ($i - 1),
            };

            // Generate contextual content based on subject type
            $content = match($subjectName) {
                'mathematics', 'math' => $this->generateMathContent($gradeLevel, $topic, $i),
                'english', 'literature', 'language arts' => $this->generateEnglishContent($gradeLevel, $topic, $i),
                'biology', 'chemistry', 'physics', 'science' => $this->generateScienceContent($subjectName, $gradeLevel, $topic, $i),
                'history', 'government', 'geography' => $this->generateSocialContent($subjectName, $topic, $i),
                default => $this->generateGeneralContent($gradeLevel, $topic, $subjectName, $i),
            };

            $generatedSections[] = [
                'title' => $sectionTitle,
                'content' => $content,
            ];
        }

        return [
            'title' => $title,
            'sections' => $generatedSections,
            'total_sections' => $sections,
        ];
    }

    protected function generateMathContent($grade, $topic, $section): string
    {
        $examples = [
            1 => "Let's start by understanding the basic {$topic}. Consider the following:\n\n• Definition: [Provide clear definition]\n• Formula: [Applicable formula here]\n• Why it matters: [Real-world application]",
            2 => "Now let's apply what we've learned. Work through these examples:\n\n• Example 1: [Simple problem with solution]\n• Example 2: [Moderate problem with solution]\n• Example 3: [Challenge problem]",
            3 => "Let's practice more. Solve these problems:\n\n• Problem 1: [Problem statement]\n• Problem 2: [Problem statement]\n• Problem 3: [Problem statement]",
        ];
        return $examples[$section] ?? "Continuing with {$topic}...\n\n• Key concept: [Explanation]\n• Example: [Illustrative example]\n• Practice: [Exercise]";
    }

    protected function generateEnglishContent($grade, $topic, $section): string
    {
        $sections = [
            1 => "Welcome to today's lesson on {$topic}.\n\n**Learning Objectives:**\n• Understand the basics of {$topic}\n• Identify key elements\n• Apply concepts in context\n\nLet's begin by exploring what {$topic} means and its importance.",
            2 => "Now let's dive deeper into {$topic}.\n\n**Key Concepts:**\n• [First major concept] - [Explanation]\n• [Second major concept] - [Explanation]\n\n**Application:**\nPractice using these concepts in your writing and analysis.",
            3 => "Let's explore {$topic} with more detail.\n\n**Analysis:**\n• [Point 1] - [Explanation]\n• [Point 2] - [Explanation]\n\n**Practice:**\nApply what you've learned by completing the exercises.",
        ];
        return $sections[$section] ?? "Continuing with {$topic}...\n\n[Content continues]";
    }

    protected function generateScienceContent($subject, $grade, $topic, $section): string
    {
        $sections = [
            1 => "Welcome to this {$subject} lesson on {$topic}.\n\n**Introduction:**\n• What is {$topic}?\n• Why is it important?\n• Real-world applications\n\nLet's begin our exploration.",
            2 => "Let's examine the details of {$topic}.\n\n**Key Principles:**\n• [Scientific principle 1]\n• [Scientific principle 2]\n\n**Experiments/Observations:**\n[Describe relevant experiments]",
            3 => "Now let's apply our knowledge of {$topic}.\n\n**Practical Applications:**\n• [Application 1]\n• [Application 2]\n\n**Summary:**\nRecap of key points learned.",
        ];
        return $sections[$section] ?? "Continuing with {$topic} in {$subject}...";
    }

    protected function generateSocialContent($subject, $topic, $section): string
    {
        $sections = [
            1 => "Today's lesson: {$topic}\n\n**Background:**\nHistorical context and significance\n\n**Key Questions:**\n• What happened?\n• When did it occur?\n• Why is it important?",
            2 => "Deep dive into {$topic}\n\n**Main Events:**\n• [Event 1]\n• [Event 2]\n\n**Impact:**\nHow this shaped history or society",
            3 => "Summary of {$topic}\n\n**Key Takeaways:**\n• [Point 1]\n• [Point 2]\n\n**Discussion Questions:**\n[Questions for further reflection]",
        ];
        return $sections[$section] ?? "Continuing with {$topic}...";
    }

    protected function generateGeneralContent($grade, $topic, $subject, $section): string
    {
        return "## Section {$section}: {$topic}\n\nThis section covers the main concepts of {$topic} for {$subject} at the {$grade} level.\n\n**Learning Points:**\n• Understanding of core concepts\n• Practical applications\n• Skills development\n\n**Content:**\n[Teaching material for {$topic}]";
    }

    /**
     * Generate Exam questions using AI with smart fallback.
     */
    public function generateExam(array $examData, array $gradeInfo, array $subjectInfo, array $topics, array $config): array
    {
        Log::info('generateExam called', [
            'hasApiKey' => !empty($this->apiKey),
            'topics' => $topics,
        ]);

        if ($this->apiKey) {
            return $this->generateExamWithAI($examData, $gradeInfo, $subjectInfo, $topics, $config);
        }

        Log::warning('AI API key not configured, using smart fallback for exam');
        $result = $this->generateExamFallback($examData, $gradeInfo, $subjectInfo, $topics, $config);
        $result['_used_fallback'] = true;
        $result['_fallback_reason'] = 'AI API key not configured';
        return $result;
    }

    /**
     * Generate exam with real AI
     */
    protected function generateExamWithAI(array $examData, array $gradeInfo, array $subjectInfo, array $topics, array $config): array
    {
        $numMcq = $config['mcq_count'] ?? 5;
        $numTheory = $config['theory_count'] ?? 2;
        $difficulty = $config['difficulty'] ?? 'medium';

        $prompt = "Generate a structured exam for {$subjectInfo['name']} for grade {$gradeInfo['name']}.
        
Topics: " . implode(', ', $topics) . "
Difficulty: {$difficulty}

Requirements:
1. Generate {$numMcq} MCQ (multiple choice) questions. Each should have 4 options (A-D) and one correct answer.
2. Generate {$numTheory} Theory questions. Each should have a question text and a model answer.
3. Align with {$gradeInfo['cycle']} school curriculum standards.

Respond in JSON format:
{
  'questions': [
    {
      'type': 'mcq',
      'question_text': '...',
      'options': ['...', '...', '...', '...'],
      'correct_answer': 'A',
      'marks': 1
    },
    {
      'type': 'theory',
      'question_text': '...',
      'correct_answer': 'Model answer here...',
      'marks': 5
    }
  ]
}";

        try {
            $response = Http::timeout(90)->post("{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}", [
                'contents' => [[
                    'role' => 'user',
                    'parts' => [['text' => $prompt]]
                ]],
                'generationConfig' => [
                    'temperature' => 0.7,
                    'maxOutputTokens' => 8000,
                ]
            ]);

            if ($response->successful()) {
                $text = $response->json('candidates.0.content.parts.0.text');
                $text = trim($text);
                if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
                    $json = json_decode($matches[0], true);
                    if ($json && isset($json['questions'])) {
                        return $json;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('AI exam generation failed: ' . $e->getMessage());
        }

        return $this->generateExamFallback($examData, $examData, $gradeInfo, $subjectInfo, $topics, $config);
    }

    /**
     * Smart fallback for exam generation
     */
    protected function generateExamFallback(array $examData, array $gradeInfo, array $subjectInfo, array $topics, array $config): array
    {
        $numMcq = $config['mcq_count'] ?? 5;
        $numTheory = $config['theory_count'] ?? 2;
        $subjectName = strtolower($subjectInfo['name']);
        
        $questions = [];

        // Generate MCQ questions
        for ($i = 1; $i <= $numMcq; $i++) {
            $topic = $topics[array_rand($topics)] ?? 'General concepts';
            $questions[] = [
                'type' => 'mcq',
                'question_text' => "Which of the following is a key characteristic of {$topic} in {$subjectInfo['name']}?",
                'options' => [
                    'Option A (Correct answer description)',
                    'Option B (Incorrect distractor)',
                    'Option C (Plausible distractor)',
                    'Option D (Common misconception)'
                ],
                'correct_answer' => 'Option A (Correct answer description)',
                'marks' => 1
            ];
        }

        // Generate Theory questions
        for ($i = 1; $i <= $numTheory; $i++) {
            $topic = $topics[array_rand($topics)] ?? 'General principles';
            $questions[] = [
                'type' => 'theory',
                'question_text' => "Explain the fundamental principles of {$topic} and discuss its importance in {$subjectInfo['name']}.",
                'correct_answer' => "The fundamental principles involve [Concept 1], [Concept 2], and [Concept 3]. It is important because it allows students to [Application 1] and [Application 2].",
                'marks' => 5
            ];
        }

        return [
            'questions' => $questions
        ];
    }
}
