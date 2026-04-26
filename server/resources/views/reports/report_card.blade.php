<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Report Card - {{ $student->profile->data['first_name'] }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            padding: 40px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .school-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin: 0;
        }
        .report-title {
            font-size: 18px;
            color: #6b7280;
            margin: 5px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .student-info {
            width: 100%;
            margin-bottom: 30px;
        }
        .info-box {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
        }
        .info-table {
            width: 100%;
        }
        .info-label {
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
        }
        .info-value {
            font-weight: bold;
            font-size: 14px;
        }
        .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .grades-table th {
            background: #2563eb;
            color: white;
            text-align: left;
            padding: 10px;
            font-size: 12px;
        }
        .grades-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px;
            font-size: 13px;
        }
        .summary-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .overall-box {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 20px;
            border-radius: 12px;
            width: 300px;
            float: right;
        }
        .overall-label {
            font-size: 14px;
            color: #1e40af;
        }
        .overall-value {
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
        }
        .footer {
            margin-top: 100px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
        }
        .signature-space {
            margin-top: 60px;
            border-top: 1px solid #333;
            width: 200px;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="school-name">{{ $school->name }}</h1>
            <p class="report-title">Student Academic Progress Report</p>
            <p style="font-size: 14px; margin-top: 10px;">{{ $term->name }} | {{ $session->name }}</p>
        </div>

        <div class="student-info">
            <div class="info-box">
                <table class="info-table">
                    <tr>
                        <td width="33%">
                            <span class="info-label">Student Name</span><br>
                            <span class="info-value">{{ $student->profile->data['first_name'] }} {{ $student->profile->data['last_name'] }}</span>
                        </td>
                        <td width="33%">
                            <span class="info-label">Admission Number</span><br>
                            <span class="info-value">{{ $student->profile->data['admission_number'] }}</span>
                        </td>
                        <td width="33%">
                            <span class="info-label">Class</span><br>
                            <span class="info-value">{{ $gradeLevel->name }}</span>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <table class="grades-table">
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>CA Score (40)</th>
                    <th>Exam Score (60)</th>
                    <th>Total (100)</th>
                    <th>Grade</th>
                    <th>Position</th>
                    <th>Remark</th>
                </tr>
            </thead>
            <tbody>
                @foreach($grades as $grade)
                <tr>
                    <td>{{ $grade->subject->name }}</td>
                    <td>{{ $grade->ca_score }}</td>
                    <td>{{ $grade->exam_score }}</td>
                    <td><strong>{{ $grade->total_score }}</strong></td>
                    <td>{{ $grade->grade }}</td>
                    <td>{{ $grade->position }}</td>
                    <td>{{ $grade->remark }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="summary-section">
            <div class="overall-box">
                <table width="100%">
                    <tr>
                        <td class="overall-label">Average Score</td>
                        <td class="overall-value text-right">{{ number_format($reportCard->overall_average, 2) }}%</td>
                    </tr>
                    <tr>
                        <td class="overall-label">Class Position</td>
                        <td class="overall-value text-right">{{ $reportCard->overall_position }} / {{ $reportCard->total_students }}</td>
                    </tr>
                </table>
            </div>

            <div style="clear: both;"></div>
        </div>

        <div class="footer">
            <table width="100%">
                <tr>
                    <td width="50%" style="text-align: left;">
                        <div class="signature-space"></div><br>
                        <span>Class Teacher's Signature</span>
                    </td>
                    <td width="50%" style="text-align: right;">
                        <div class="signature-space"></div><br>
                        <span>Principal's Signature</span>
                    </td>
                </tr>
            </table>
            <p style="margin-top: 40px;">This is an officially generated report from vDeskConnect Academic System.</p>
            <p>Date Generated: {{ date('F j, Y') }}</p>
        </div>
    </div>
</body>
</html>
