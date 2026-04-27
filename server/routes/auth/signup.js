import { Router } from "express"
import student from "../../models/Student.js"
import teacher from "../../models/Teacher.js"
import generator from "../../utils/id_generator.js"
import send_mail from "../../utils/mailer.js"
import general from "../../models/General.js"
import bcrypt from "bcryptjs"


const signup_router = Router()

signup_router.post("/signup/student/", async (req, res) => {

    const id = generator.id()
    const verification_code = generator.auth_code()
    const hashed_password = await bcrypt.hash(req.body.password, 10)
    const invitationCode = req.body.invitationCode

    // In your student signup route, replace the invitation code verification section:
    try {
        const inviteResult = await general.auth.verify_invite(invitationCode);

        if (inviteResult.rows.length === 0 || inviteResult.rows[0].code !== invitationCode) {
            return res.status(400).json({
                status: "error",
                message: "Wrong invite code"
            });
        }

        // Mark the invite code as used
        //await general.auth.use_invite_code(invitationCode);
    } catch (err) {
        console.log("Verification error:", err);
        return res.status(400).json({
            status: "error",
            message: "Invalid invitation code"
        });
    }


    const grade_num = req.body.grade === "jss1" ? 1 :
        req.body.grade === "jss2" ? 2 :
            req.body.grade === "jss3" ? 3 :
                req.body.grade === "sss1" ? 1 :
                    req.body.grade === "sss2" ? 2 :
                        req.body.grade === "sss3" ? 3 : null


    const dep_code = req.body.department === "Science" ?
        "SCI" : req.body.department === "Commercial" ?
            "COM" : req.body.department === "ART" ?
                "ART" : null

    await student.auth.add(
        id,
        req.body.name,
        req.body.email,
        hashed_password,
        req.body.dateOfBirth,
        req.body.stateOfOrigin,
        req.body.sex,
        req.body.previousAddress,
        req.body.currentAddress,
        req.body.bloodGroup,
        req.body.genotype,
        req.body.height,
        req.body.weight,
        req.body.disability,
        req.body.parentGuardianType,
        req.body.parentGuardianPhone,
        req.body.parentGuardianEmail,
        req.body.parentGuardianAddress
    )

    //console.log(req.body)

    await (req.body.studentType === "junior" ?
        student.auth.junior.add(id, grade_num) :
        student.auth.senior.add(id, req.body.role, dep_code, grade_num)
    )


    await send_mail.verification_code(verification_code, req.body.email)

    // Later in the success response:
    res.status(201).json({
        status: "success",
        message: "Student registered successfully",
        studentId: id,
        verificationCode: verification_code // Changed from verification_code to verificationCode for consistency
    });
})

signup_router.post("/signup/teacher/", async (req, res) => {
    try {
        const id = generator.id()
        const hashed_password = await bcrypt.hash(req.body.password, 10)

        console.log(req.body)

        await teacher.auth.add(
            id,
            req.body.name,
            req.body.email,
            req.body.telephone,
            hashed_password,
            req.body.dateOfBirth,
            req.body.stateOfOrigin,
            req.body.sex,
            req.body.previousAddress,
            req.body.currentAddress,
            req.body.maritalStatus,
            req.body.bloodGroup,
            req.body.genotype,
            req.body.height,
            req.body.weight,
            req.body.disability,
            req.body.qualification
        )

        // Helper function to store a teacher's subject
        const add_teach_subject_grade = async (subject, grade) => {
            try {
                if (grade === "j") {
                    await teacher.auth.add_teach_subject_grade(subject, 1, id)
                    await teacher.auth.add_teach_subject_grade(subject, 2, id)
                    await teacher.auth.add_teach_subject_grade(subject, 3, id)
                } else if (grade === "s") {
                    await teacher.auth.add_teach_subject_sgrade(subject, 1, id)
                    await teacher.auth.add_teach_subject_sgrade(subject, 2, id)
                    await teacher.auth.add_teach_subject_sgrade(subject, 3, id)
                }
            } catch (error) {
                // Handle duplicate key errors gracefully
                if (error.code !== '23505') { // 23505 is the duplicate key error code
                    throw error;
                }
                console.log(`Subject ${subject} for grade ${grade} already exists for teacher ${id}`);
            }
        }

        const add_teach_discipline_grade = async (discipline, grade) => {
            try {
                if (grade === "j") {
                    await teacher.auth.add_teach_discipline_grade(discipline, 1, id)
                    await teacher.auth.add_teach_discipline_grade(discipline, 2, id)
                    await teacher.auth.add_teach_discipline_grade(discipline, 3, id)
                } else if (grade === "s") {
                    await teacher.auth.add_teach_discipline_sgrade(discipline, 1, id)
                    await teacher.auth.add_teach_discipline_sgrade(discipline, 2, id)
                    await teacher.auth.add_teach_discipline_sgrade(discipline, 3, id)
                }
            } catch (error) {
                // Handle duplicate key errors gracefully
                if (error.code !== '23505') {
                    throw error;
                }
                console.log(`Discipline ${discipline} for grade ${grade} already exists for teacher ${id}`);
            }
        }

        // Process subjects
        const processSubjects = async () => {
            const promises = [];

            // Junior subjects
            if (req.body.juniorSubjects && req.body.juniorSubjects.length > 0) {
                if (req.body.juniorSubjects.includes("Mathematics")) promises.push(add_teach_subject_grade("jun_math", "j"));
                if (req.body.juniorSubjects.includes("French")) promises.push(add_teach_subject_grade("jun_fr", "j"));
                if (req.body.juniorSubjects.includes("Yoruba")) promises.push(add_teach_subject_grade("jun_yor", "j"));
                if (req.body.juniorSubjects.includes("Basic Technology")) promises.push(add_teach_subject_grade("jun_btech", "j"));
                if (req.body.juniorSubjects.includes("Basic Science")) promises.push(add_teach_subject_grade("jun_bsci", "j"));
                if (req.body.juniorSubjects.includes("Agricultural Science")) promises.push(add_teach_subject_grade("jun_agric", "j"));
                if (req.body.juniorSubjects.includes("Social Studies")) promises.push(add_teach_subject_grade("jun_sstud", "j"));
                if (req.body.juniorSubjects.includes("Literature")) promises.push(add_teach_subject_grade("jun_lit", "j"));
                if (req.body.juniorSubjects.includes("Security Education")) promises.push(add_teach_subject_grade("jun_sedu", "j"));
                if (req.body.juniorSubjects.includes("Civic Education")) promises.push(add_teach_subject_grade("jun_cedu", "j"));
                if (req.body.juniorSubjects.includes("Business Studies")) promises.push(add_teach_subject_grade("jun_bstud", "j"));
                if (req.body.juniorSubjects.includes("Cultural and Creative Arts")) promises.push(add_teach_subject_grade("jun_cca", "j"));
                if (req.body.juniorSubjects.includes("Physical and Health Education")) promises.push(add_teach_subject_grade("jun_phe", "j"));
                if (req.body.juniorSubjects.includes("Home Economics")) promises.push(add_teach_subject_grade("jun_heco", "j"));
                if (req.body.juniorSubjects.includes("Christian Religious Studies")) promises.push(add_teach_subject_grade("jun_crs", "j"));
            }

            // Senior subjects
            if (req.body.seniorSubjects && req.body.seniorSubjects.length > 0) {
                if (req.body.seniorSubjects.includes("Mathematics")) promises.push(add_teach_subject_grade("sen_math", "s"));
                if (req.body.seniorSubjects.includes("French")) promises.push(add_teach_subject_grade("sen_fr", "s"));
                if (req.body.seniorSubjects.includes("Yoruba")) promises.push(add_teach_subject_grade("sen_yor", "s"));
                if (req.body.seniorSubjects.includes("Civic Education")) promises.push(add_teach_subject_grade("sen_cedu", "s"));
                if (req.body.seniorSubjects.includes("Data Processing")) promises.push(add_teach_subject_grade("sen_dpro", "s"));
                if (req.body.seniorSubjects.includes("Agricultural Science")) promises.push(add_teach_subject_grade("sen_agric", "s"));
                if (req.body.seniorSubjects.includes("Physics")) promises.push(add_teach_subject_grade("sen_phy", "s"));
                if (req.body.seniorSubjects.includes("Literature")) promises.push(add_teach_subject_grade("sen_lit", "s"));
                if (req.body.seniorSubjects.includes("Chemistry")) promises.push(add_teach_subject_grade("sen_chem", "s"));
                if (req.body.seniorSubjects.includes("Biology")) promises.push(add_teach_subject_grade("sen_bio", "s"));
                if (req.body.seniorSubjects.includes("Further Mathematics")) promises.push(add_teach_subject_grade("sen_fmath", "s"));
                if (req.body.seniorSubjects.includes("Technical Drawing")) promises.push(add_teach_subject_grade("sen_td", "s"));
                if (req.body.seniorSubjects.includes("Account")) promises.push(add_teach_subject_grade("sen_acc", "s"));
                if (req.body.seniorSubjects.includes("Commerce")) promises.push(add_teach_subject_grade("sen_comm", "s"));
                if (req.body.seniorSubjects.includes("Christian Religious Knowledge")) promises.push(add_teach_subject_grade("sen_crk", "s"));
                if (req.body.seniorSubjects.includes("Economics")) promises.push(add_teach_subject_grade("sen_eco", "s"));
                if (req.body.seniorSubjects.includes("Government")) promises.push(add_teach_subject_grade("sen_gov", "s"));
                if (req.body.seniorSubjects.includes("Creative Arts")) promises.push(add_teach_subject_grade("sen_ca", "s"));
                if (req.body.seniorSubjects.includes("Islamic Religious Knowledge")) promises.push(add_teach_subject_grade("sen_irk", "s"));
            }

            // English disciplines
            if (req.body.englishDisciplines) {
                const { junior = [], senior = [] } = req.body.englishDisciplines;

                if (junior.includes("Structure")) promises.push(add_teach_discipline_grade("jun_struct", "j"));
                if (junior.includes("Composition")) promises.push(add_teach_discipline_grade("jun_compo", "j"));
                if (junior.includes("Comprehension")) promises.push(add_teach_discipline_grade("jun_compre", "j"));
                if (junior.includes("Phonetics")) promises.push(add_teach_discipline_grade("jun_phon", "j"));
                if (junior.includes("Register")) promises.push(add_teach_discipline_grade("jun_reg", "j"));

                if (senior.includes("Structure")) promises.push(add_teach_discipline_grade("sen_struct", "s"));
                if (senior.includes("Composition")) promises.push(add_teach_discipline_grade("sen_compo", "s"));
                if (senior.includes("Comprehension")) promises.push(add_teach_discipline_grade("sen_compre", "s"));
                if (senior.includes("Phonetics")) promises.push(add_teach_discipline_grade("sen_phon", "s"));
                if (senior.includes("Register")) promises.push(add_teach_discipline_grade("sen_reg", "s"));
            }

            await Promise.all(promises);
        };

        await processSubjects();

        res.status(201).json({
            message: "Teacher registered successfully",
            teacherId: id
        });
    } catch (error) {
        console.error("Error signing up teacher:", error);
        res.status(500).json({
            message: "Error registering teacher",
            error: error.message
        });
    }
});

export default signup_router