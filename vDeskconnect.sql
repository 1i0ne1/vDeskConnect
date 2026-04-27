--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Admin" (
    "T_id" text NOT NULL,
    "Role" text NOT NULL
);


ALTER TABLE public."Admin" OWNER TO postgres;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Attendance" (
    "Att_id" text NOT NULL,
    "Lec_num" integer NOT NULL,
    "Lec_date" date NOT NULL
);


ALTER TABLE public."Attendance" OWNER TO postgres;

--
-- Name: Audio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Audio" (
    "Aud_num" integer NOT NULL,
    "Aud_name" text,
    "Lec_num" integer NOT NULL,
    "Lec_date" date NOT NULL
);


ALTER TABLE public."Audio" OWNER TO postgres;

--
-- Name: Department; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Department" (
    "Dep_code" text NOT NULL,
    "Dep_name" text NOT NULL
);


ALTER TABLE public."Department" OWNER TO postgres;

--
-- Name: Discipline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Discipline" (
    "Disc_code" text NOT NULL,
    "Disc_name" text NOT NULL,
    "Sub_code" text NOT NULL
);


ALTER TABLE public."Discipline" OWNER TO postgres;

--
-- Name: Grade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Grade" (
    "Grade_num" integer NOT NULL,
    "Grade_name" text NOT NULL
);


ALTER TABLE public."Grade" OWNER TO postgres;

--
-- Name: Inviter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Inviter" (
    id text NOT NULL,
    code text NOT NULL,
    user_type text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    used_by text,
    used_at timestamp without time zone,
    admin_id text NOT NULL,
    CONSTRAINT "Inviter_user_type_check" CHECK (((user_type = 'teacher'::text) OR (user_type = 'student'::text)))
);


ALTER TABLE public."Inviter" OWNER TO postgres;

--
-- Name: JD_Note_Of_Lesson; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JD_Note_Of_Lesson" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    contact integer NOT NULL,
    objective text NOT NULL
);


ALTER TABLE public."JD_Note_Of_Lesson" OWNER TO postgres;

--
-- Name: JD_Scheme_Of_Work; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JD_Scheme_Of_Work" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    week integer NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."JD_Scheme_Of_Work" OWNER TO postgres;

--
-- Name: JD_Topic_Scheme; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JD_Topic_Scheme" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."JD_Topic_Scheme" OWNER TO postgres;

--
-- Name: JS_Note_Of_Lesson; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JS_Note_Of_Lesson" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    contact integer NOT NULL,
    objective text NOT NULL
);


ALTER TABLE public."JS_Note_Of_Lesson" OWNER TO postgres;

--
-- Name: JS_Scheme_Of_Work; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JS_Scheme_Of_Work" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    week integer NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."JS_Scheme_Of_Work" OWNER TO postgres;

--
-- Name: JS_Topic_Scheme; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JS_Topic_Scheme" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."JS_Topic_Scheme" OWNER TO postgres;

--
-- Name: Junior; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Junior" (
    "Stu_id" text NOT NULL,
    "Grade_num" integer NOT NULL
);


ALTER TABLE public."Junior" OWNER TO postgres;

--
-- Name: Lecture; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Lecture" (
    "Lec_num" integer NOT NULL,
    "Lec_date" date NOT NULL,
    "Hours" integer,
    "T_id" text NOT NULL,
    "Grade_num" integer,
    "Sgrade_num" integer,
    "Sub_code" text NOT NULL,
    "Disc_code" text
);


ALTER TABLE public."Lecture" OWNER TO postgres;

--
-- Name: Pdf; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pdf" (
    "Pdf_num" integer NOT NULL,
    "Pdf_name" text,
    "Lec_num" integer NOT NULL,
    "Lec_date" date NOT NULL
);


ALTER TABLE public."Pdf" OWNER TO postgres;

--
-- Name: Remark; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Remark" (
    "T_id" text NOT NULL,
    "Stu_id" text NOT NULL,
    "Remark" text
);


ALTER TABLE public."Remark" OWNER TO postgres;

--
-- Name: SD_Note_Of_Lesson; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SD_Note_Of_Lesson" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    contact integer NOT NULL,
    objective text NOT NULL
);


ALTER TABLE public."SD_Note_Of_Lesson" OWNER TO postgres;

--
-- Name: SD_Scheme_Of_Work; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SD_Scheme_Of_Work" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    week integer NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."SD_Scheme_Of_Work" OWNER TO postgres;

--
-- Name: SD_Topic_Scheme; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SD_Topic_Scheme" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."SD_Topic_Scheme" OWNER TO postgres;

--
-- Name: SS_Note_Of_Lesson; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SS_Note_Of_Lesson" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    contact integer NOT NULL,
    objective text NOT NULL
);


ALTER TABLE public."SS_Note_Of_Lesson" OWNER TO postgres;

--
-- Name: SS_Scheme_Of_Work; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SS_Scheme_Of_Work" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    week integer NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."SS_Scheme_Of_Work" OWNER TO postgres;

--
-- Name: SS_Topic_Scheme; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SS_Topic_Scheme" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    aspect text NOT NULL,
    topic text NOT NULL
);


ALTER TABLE public."SS_Topic_Scheme" OWNER TO postgres;

--
-- Name: Senior; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Senior" (
    "Stu_id" text NOT NULL,
    "Role" text,
    "Dep_code" text NOT NULL,
    "Grade_num" integer NOT NULL
);


ALTER TABLE public."Senior" OWNER TO postgres;

--
-- Name: Sgrade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sgrade" (
    "Grade_num" integer NOT NULL,
    "Grade_name" text NOT NULL,
    "PR" text NOT NULL,
    "MES" integer NOT NULL
);


ALTER TABLE public."Sgrade" OWNER TO postgres;

--
-- Name: Student; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Student" (
    "Stu_id" text NOT NULL,
    "Stu_name" text,
    email text NOT NULL,
    password text NOT NULL,
    dateofbirth date NOT NULL,
    stateoforigin text NOT NULL,
    sex text NOT NULL,
    previous_address text NOT NULL,
    current_address text NOT NULL,
    blood_group text NOT NULL,
    genotype text NOT NULL,
    height text NOT NULL,
    weight text NOT NULL,
    disability text,
    parent_guardian_type text NOT NULL,
    parent_guardian_phone character varying(20) NOT NULL,
    parent_guardian_email text,
    parent_guardian_address text NOT NULL,
    CONSTRAINT "Student_parent_guardian_type_check" CHECK (((parent_guardian_type = 'parent'::text) OR (parent_guardian_type = 'guardian'::text))),
    CONSTRAINT "Student_sex_check" CHECK (((sex = 'male'::text) OR (sex = 'female'::text)))
);


ALTER TABLE public."Student" OWNER TO postgres;

--
-- Name: Student_In_Attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Student_In_Attendance" (
    "Att_id" text NOT NULL,
    "Stu_id" text NOT NULL,
    "Status" text NOT NULL
);


ALTER TABLE public."Student_In_Attendance" OWNER TO postgres;

--
-- Name: Subject; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Subject" (
    "Sub_code" text NOT NULL,
    "Sub_name" text NOT NULL
);


ALTER TABLE public."Subject" OWNER TO postgres;

--
-- Name: Teach_Discipline_Dep_Sgrade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Discipline_Dep_Sgrade" (
    "Disc_code" text NOT NULL,
    "Dep_code" text NOT NULL,
    "T_id" text NOT NULL,
    "Grade_num" integer NOT NULL
);


ALTER TABLE public."Teach_Discipline_Dep_Sgrade" OWNER TO postgres;

--
-- Name: Teach_Discipline_Grade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Discipline_Grade" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    "T_id" text NOT NULL
);


ALTER TABLE public."Teach_Discipline_Grade" OWNER TO postgres;

--
-- Name: Teach_Discipline_Sgrade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Discipline_Sgrade" (
    "Disc_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    "T_id" text NOT NULL
);


ALTER TABLE public."Teach_Discipline_Sgrade" OWNER TO postgres;

--
-- Name: Teach_Student_Discipline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Student_Discipline" (
    "Stu_id" text NOT NULL,
    "Disc_code" text NOT NULL,
    "T_id" text NOT NULL
);


ALTER TABLE public."Teach_Student_Discipline" OWNER TO postgres;

--
-- Name: Teach_Student_Subject; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Student_Subject" (
    "Stu_id" text NOT NULL,
    "Sub_code" text NOT NULL,
    "T_id" text NOT NULL
);


ALTER TABLE public."Teach_Student_Subject" OWNER TO postgres;

--
-- Name: Teach_Subject_Dep_Sgrade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Subject_Dep_Sgrade" (
    "Sub_code" text NOT NULL,
    "Dep_code" text NOT NULL,
    "T_id" text NOT NULL,
    "Grade_num" integer NOT NULL
);


ALTER TABLE public."Teach_Subject_Dep_Sgrade" OWNER TO postgres;

--
-- Name: Teach_Subject_Grade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Subject_Grade" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    "T_id" text NOT NULL
);


ALTER TABLE public."Teach_Subject_Grade" OWNER TO postgres;

--
-- Name: Teach_Subject_Sgrade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teach_Subject_Sgrade" (
    "Sub_code" text NOT NULL,
    "Grade_num" integer NOT NULL,
    "T_id" text NOT NULL
);


ALTER TABLE public."Teach_Subject_Sgrade" OWNER TO postgres;

--
-- Name: Teacher; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teacher" (
    "T_id" text NOT NULL,
    "T_name" text,
    email text,
    tel text,
    password text NOT NULL,
    date_of_birth date NOT NULL,
    state_of_origin text NOT NULL,
    sex text NOT NULL,
    previous_address text NOT NULL,
    current_address text NOT NULL,
    marital_status text NOT NULL,
    bloodgroup text NOT NULL,
    genotype text NOT NULL,
    height integer NOT NULL,
    weight integer NOT NULL,
    disability text NOT NULL,
    qualification text NOT NULL
);


ALTER TABLE public."Teacher" OWNER TO postgres;

--
-- Name: Video; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Video" (
    "Vid_num" integer NOT NULL,
    "Vid_name" text,
    "Lec_num" integer NOT NULL,
    "Lec_date" date NOT NULL
);


ALTER TABLE public."Video" OWNER TO postgres;

--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY ("T_id");


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY ("Att_id");


--
-- Name: Audio Audio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Audio"
    ADD CONSTRAINT "Audio_pkey" PRIMARY KEY ("Aud_num");


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY ("Dep_code");


--
-- Name: Discipline Discipline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Discipline"
    ADD CONSTRAINT "Discipline_pkey" PRIMARY KEY ("Disc_code");


--
-- Name: Grade Grade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Grade"
    ADD CONSTRAINT "Grade_pkey" PRIMARY KEY ("Grade_num");


--
-- Name: Inviter Inviter_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inviter"
    ADD CONSTRAINT "Inviter_code_key" UNIQUE (code);


--
-- Name: Inviter Inviter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inviter"
    ADD CONSTRAINT "Inviter_pkey" PRIMARY KEY (id);


--
-- Name: Inviter Inviter_used_by_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inviter"
    ADD CONSTRAINT "Inviter_used_by_key" UNIQUE (used_by);


--
-- Name: JD_Scheme_Of_Work JDScheme_Of_Work_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Scheme_Of_Work"
    ADD CONSTRAINT "JDScheme_Of_Work_pkey" PRIMARY KEY ("Disc_code", "Grade_num", week);


--
-- Name: JD_Topic_Scheme JDTopic_Scheme_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Topic_Scheme"
    ADD CONSTRAINT "JDTopic_Scheme_pkey" PRIMARY KEY ("Disc_code", "Grade_num", aspect);


--
-- Name: JD_Note_Of_Lesson JD_Note_Of_Lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Note_Of_Lesson"
    ADD CONSTRAINT "JD_Note_Of_Lesson_pkey" PRIMARY KEY ("Disc_code", "Grade_num", aspect, contact);


--
-- Name: JS_Scheme_Of_Work JSScheme_Of_Work_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Scheme_Of_Work"
    ADD CONSTRAINT "JSScheme_Of_Work_pkey" PRIMARY KEY ("Sub_code", "Grade_num", week);


--
-- Name: JS_Topic_Scheme JSTopic_Scheme_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Topic_Scheme"
    ADD CONSTRAINT "JSTopic_Scheme_pkey" PRIMARY KEY ("Sub_code", "Grade_num", aspect);


--
-- Name: JS_Note_Of_Lesson JS_Note_Of_Lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Note_Of_Lesson"
    ADD CONSTRAINT "JS_Note_Of_Lesson_pkey" PRIMARY KEY ("Sub_code", "Grade_num", aspect, contact);


--
-- Name: Junior Junior_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Junior"
    ADD CONSTRAINT "Junior_pkey" PRIMARY KEY ("Stu_id");


--
-- Name: Lecture Lecture_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lecture"
    ADD CONSTRAINT "Lecture_pkey" PRIMARY KEY ("Lec_num", "Lec_date");


--
-- Name: Pdf Pdf_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pdf"
    ADD CONSTRAINT "Pdf_pkey" PRIMARY KEY ("Pdf_num");


--
-- Name: Remark Remark_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Remark"
    ADD CONSTRAINT "Remark_pkey" PRIMARY KEY ("T_id", "Stu_id");


--
-- Name: SD_Scheme_Of_Work SDScheme_Of_Work_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Scheme_Of_Work"
    ADD CONSTRAINT "SDScheme_Of_Work_pkey" PRIMARY KEY ("Disc_code", "Grade_num", week);


--
-- Name: SD_Topic_Scheme SDTopic_Scheme_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Topic_Scheme"
    ADD CONSTRAINT "SDTopic_Scheme_pkey" PRIMARY KEY ("Disc_code", "Grade_num", aspect);


--
-- Name: SD_Note_Of_Lesson SD_Note_Of_Lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Note_Of_Lesson"
    ADD CONSTRAINT "SD_Note_Of_Lesson_pkey" PRIMARY KEY ("Disc_code", "Grade_num", aspect, contact);


--
-- Name: SS_Scheme_Of_Work SSScheme_Of_Work_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Scheme_Of_Work"
    ADD CONSTRAINT "SSScheme_Of_Work_pkey" PRIMARY KEY ("Sub_code", "Grade_num", week);


--
-- Name: SS_Note_Of_Lesson SS_Note_Of_Lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Note_Of_Lesson"
    ADD CONSTRAINT "SS_Note_Of_Lesson_pkey" PRIMARY KEY ("Sub_code", "Grade_num", aspect, contact);


--
-- Name: SS_Topic_Scheme SS_Topic_Scheme_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Topic_Scheme"
    ADD CONSTRAINT "SS_Topic_Scheme_pkey" PRIMARY KEY ("Sub_code", "Grade_num", aspect);


--
-- Name: Senior Senior_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Senior"
    ADD CONSTRAINT "Senior_pkey" PRIMARY KEY ("Stu_id");


--
-- Name: Sgrade Sgrade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sgrade"
    ADD CONSTRAINT "Sgrade_pkey" PRIMARY KEY ("Grade_num");


--
-- Name: Student_In_Attendance Student_In_Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student_In_Attendance"
    ADD CONSTRAINT "Student_In_Attendance_pkey" PRIMARY KEY ("Att_id", "Stu_id");


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY ("Stu_id");


--
-- Name: Subject Subject_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_pkey" PRIMARY KEY ("Sub_code");


--
-- Name: Teach_Discipline_Dep_Sgrade Teach_Discipline_Dep_Sgrade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Dep_Sgrade_pkey" PRIMARY KEY ("Disc_code", "Dep_code");


--
-- Name: Teach_Discipline_Grade Teach_Discipline_Grade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Grade"
    ADD CONSTRAINT "Teach_Discipline_Grade_pkey" PRIMARY KEY ("Disc_code", "Grade_num");


--
-- Name: Teach_Discipline_Sgrade Teach_Discipline_Sgrade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Sgrade_pkey" PRIMARY KEY ("Disc_code", "Grade_num");


--
-- Name: Teach_Student_Discipline Teach_Student_Discipline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Discipline"
    ADD CONSTRAINT "Teach_Student_Discipline_pkey" PRIMARY KEY ("Stu_id", "Disc_code");


--
-- Name: Teach_Student_Subject Teach_Student_Subject_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Subject"
    ADD CONSTRAINT "Teach_Student_Subject_pkey" PRIMARY KEY ("Stu_id", "Sub_code");


--
-- Name: Teach_Subject_Dep_Sgrade Teach_Subject_Dep_Sgrade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Dep_Sgrade_pkey" PRIMARY KEY ("Sub_code", "Dep_code");


--
-- Name: Teach_Subject_Grade Teach_Subject_Grade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Grade"
    ADD CONSTRAINT "Teach_Subject_Grade_pkey" PRIMARY KEY ("Sub_code", "Grade_num");


--
-- Name: Teach_Subject_Sgrade Teach_Subject_Sgrade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Sgrade_pkey" PRIMARY KEY ("Sub_code", "Grade_num");


--
-- Name: Teacher Teacher_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_pkey" PRIMARY KEY ("T_id");


--
-- Name: Video Video_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Video"
    ADD CONSTRAINT "Video_pkey" PRIMARY KEY ("Vid_num");


--
-- Name: Admin Admin_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Attendance Attendance_Lec_num_Lec_date_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_Lec_num_Lec_date_fkey" FOREIGN KEY ("Lec_num", "Lec_date") REFERENCES public."Lecture"("Lec_num", "Lec_date") NOT VALID;


--
-- Name: Audio Audio_Lec_num_Lec_date_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Audio"
    ADD CONSTRAINT "Audio_Lec_num_Lec_date_fkey" FOREIGN KEY ("Lec_num", "Lec_date") REFERENCES public."Lecture"("Lec_num", "Lec_date");


--
-- Name: Discipline Discipline_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Discipline"
    ADD CONSTRAINT "Discipline_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: Inviter Inviter_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inviter"
    ADD CONSTRAINT "Inviter_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES public."Admin"("T_id");


--
-- Name: JD_Scheme_Of_Work JDScheme_Of_Work_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Scheme_Of_Work"
    ADD CONSTRAINT "JDScheme_Of_Work_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: JD_Scheme_Of_Work JDScheme_Of_Work_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Scheme_Of_Work"
    ADD CONSTRAINT "JDScheme_Of_Work_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: JD_Topic_Scheme JDTopic_Scheme_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Topic_Scheme"
    ADD CONSTRAINT "JDTopic_Scheme_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: JD_Topic_Scheme JDTopic_Scheme_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Topic_Scheme"
    ADD CONSTRAINT "JDTopic_Scheme_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: JD_Note_Of_Lesson JD_Note_Of_Lesson_Disc_code_Grade_num_aspect_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JD_Note_Of_Lesson"
    ADD CONSTRAINT "JD_Note_Of_Lesson_Disc_code_Grade_num_aspect_fkey" FOREIGN KEY ("Disc_code", "Grade_num", aspect) REFERENCES public."JD_Topic_Scheme"("Disc_code", "Grade_num", aspect);


--
-- Name: JS_Scheme_Of_Work JSScheme_Of_Work_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Scheme_Of_Work"
    ADD CONSTRAINT "JSScheme_Of_Work_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: JS_Scheme_Of_Work JSScheme_Of_Work_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Scheme_Of_Work"
    ADD CONSTRAINT "JSScheme_Of_Work_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: JS_Topic_Scheme JSTopic_Scheme_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Topic_Scheme"
    ADD CONSTRAINT "JSTopic_Scheme_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: JS_Topic_Scheme JSTopic_Scheme_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Topic_Scheme"
    ADD CONSTRAINT "JSTopic_Scheme_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: JS_Note_Of_Lesson JS_Note_Of_Lesson_Sub_code_Grade_num_aspect_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JS_Note_Of_Lesson"
    ADD CONSTRAINT "JS_Note_Of_Lesson_Sub_code_Grade_num_aspect_fkey" FOREIGN KEY ("Sub_code", "Grade_num", aspect) REFERENCES public."JS_Topic_Scheme"("Sub_code", "Grade_num", aspect);


--
-- Name: Junior Junior_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Junior"
    ADD CONSTRAINT "Junior_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num") NOT VALID;


--
-- Name: Junior Junior_Stu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Junior"
    ADD CONSTRAINT "Junior_Stu_id_fkey" FOREIGN KEY ("Stu_id") REFERENCES public."Student"("Stu_id");


--
-- Name: Lecture Lecture_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lecture"
    ADD CONSTRAINT "Lecture_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: Lecture Lecture_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lecture"
    ADD CONSTRAINT "Lecture_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: Lecture Lecture_Sgrade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lecture"
    ADD CONSTRAINT "Lecture_Sgrade_num_fkey" FOREIGN KEY ("Sgrade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: Lecture Lecture_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lecture"
    ADD CONSTRAINT "Lecture_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: Lecture Lecture_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lecture"
    ADD CONSTRAINT "Lecture_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Pdf Pdf_Lec_num_Lec_date_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pdf"
    ADD CONSTRAINT "Pdf_Lec_num_Lec_date_fkey" FOREIGN KEY ("Lec_num", "Lec_date") REFERENCES public."Lecture"("Lec_num", "Lec_date");


--
-- Name: Remark Remark_Stu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Remark"
    ADD CONSTRAINT "Remark_Stu_id_fkey" FOREIGN KEY ("Stu_id") REFERENCES public."Student"("Stu_id");


--
-- Name: Remark Remark_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Remark"
    ADD CONSTRAINT "Remark_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: SD_Topic_Scheme SDTopic_Scheme_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Topic_Scheme"
    ADD CONSTRAINT "SDTopic_Scheme_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: SD_Topic_Scheme SDTopic_Scheme_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Topic_Scheme"
    ADD CONSTRAINT "SDTopic_Scheme_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: SD_Note_Of_Lesson SD_Note_Of_Lesson_Disc_code_Grade_num_aspect_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Note_Of_Lesson"
    ADD CONSTRAINT "SD_Note_Of_Lesson_Disc_code_Grade_num_aspect_fkey" FOREIGN KEY ("Disc_code", "Grade_num", aspect) REFERENCES public."SD_Topic_Scheme"("Disc_code", "Grade_num", aspect);


--
-- Name: SD_Scheme_Of_Work SD_Scheme_Of_Work_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Scheme_Of_Work"
    ADD CONSTRAINT "SD_Scheme_Of_Work_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: SD_Scheme_Of_Work SD_Scheme_Of_Work_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SD_Scheme_Of_Work"
    ADD CONSTRAINT "SD_Scheme_Of_Work_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: SS_Scheme_Of_Work SSScheme_Of_Work_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Scheme_Of_Work"
    ADD CONSTRAINT "SSScheme_Of_Work_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: SS_Scheme_Of_Work SSScheme_Of_Work_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Scheme_Of_Work"
    ADD CONSTRAINT "SSScheme_Of_Work_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: SS_Note_Of_Lesson SS_Note_Of_Lesson_Sub_code_Grade_num_aspect_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Note_Of_Lesson"
    ADD CONSTRAINT "SS_Note_Of_Lesson_Sub_code_Grade_num_aspect_fkey" FOREIGN KEY ("Sub_code", "Grade_num", aspect) REFERENCES public."SS_Topic_Scheme"("Sub_code", "Grade_num", aspect);


--
-- Name: SS_Topic_Scheme SS_Topic_Scheme_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Topic_Scheme"
    ADD CONSTRAINT "SS_Topic_Scheme_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: SS_Topic_Scheme SS_Topic_Scheme_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SS_Topic_Scheme"
    ADD CONSTRAINT "SS_Topic_Scheme_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: Senior Senior_Dep_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Senior"
    ADD CONSTRAINT "Senior_Dep_code_fkey" FOREIGN KEY ("Dep_code") REFERENCES public."Department"("Dep_code") NOT VALID;


--
-- Name: Senior Senior_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Senior"
    ADD CONSTRAINT "Senior_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num") NOT VALID;


--
-- Name: Senior Senior_Stu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Senior"
    ADD CONSTRAINT "Senior_Stu_id_fkey" FOREIGN KEY ("Stu_id") REFERENCES public."Student"("Stu_id");


--
-- Name: Student_In_Attendance Student_In_Attendance_Att_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student_In_Attendance"
    ADD CONSTRAINT "Student_In_Attendance_Att_id_fkey" FOREIGN KEY ("Att_id") REFERENCES public."Attendance"("Att_id");


--
-- Name: Student_In_Attendance Student_In_Attendance_Stu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student_In_Attendance"
    ADD CONSTRAINT "Student_In_Attendance_Stu_id_fkey" FOREIGN KEY ("Stu_id") REFERENCES public."Student"("Stu_id");


--
-- Name: Teach_Discipline_Dep_Sgrade Teach_Discipline_Dep_Sgrade_Dep_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Dep_Sgrade_Dep_code_fkey" FOREIGN KEY ("Dep_code") REFERENCES public."Department"("Dep_code");


--
-- Name: Teach_Discipline_Dep_Sgrade Teach_Discipline_Dep_Sgrade_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Dep_Sgrade_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: Teach_Discipline_Dep_Sgrade Teach_Discipline_Dep_Sgrade_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Dep_Sgrade_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: Teach_Discipline_Dep_Sgrade Teach_Discipline_Dep_Sgrade_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Dep_Sgrade_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Teach_Discipline_Grade Teach_Discipline_Grade_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Grade"
    ADD CONSTRAINT "Teach_Discipline_Grade_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: Teach_Discipline_Grade Teach_Discipline_Grade_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Grade"
    ADD CONSTRAINT "Teach_Discipline_Grade_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: Teach_Discipline_Grade Teach_Discipline_Grade_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Grade"
    ADD CONSTRAINT "Teach_Discipline_Grade_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Teach_Discipline_Sgrade Teach_Discipline_Sgrade_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Sgrade_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: Teach_Discipline_Sgrade Teach_Discipline_Sgrade_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Sgrade_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: Teach_Discipline_Sgrade Teach_Discipline_Sgrade_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Discipline_Sgrade"
    ADD CONSTRAINT "Teach_Discipline_Sgrade_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Teach_Student_Discipline Teach_Student_Discipline_Disc_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Discipline"
    ADD CONSTRAINT "Teach_Student_Discipline_Disc_code_fkey" FOREIGN KEY ("Disc_code") REFERENCES public."Discipline"("Disc_code");


--
-- Name: Teach_Student_Discipline Teach_Student_Discipline_Stu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Discipline"
    ADD CONSTRAINT "Teach_Student_Discipline_Stu_id_fkey" FOREIGN KEY ("Stu_id") REFERENCES public."Student"("Stu_id");


--
-- Name: Teach_Student_Discipline Teach_Student_Discipline_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Discipline"
    ADD CONSTRAINT "Teach_Student_Discipline_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Teach_Student_Subject Teach_Student_Subject_Stu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Subject"
    ADD CONSTRAINT "Teach_Student_Subject_Stu_id_fkey" FOREIGN KEY ("Stu_id") REFERENCES public."Student"("Stu_id");


--
-- Name: Teach_Student_Subject Teach_Student_Subject_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Subject"
    ADD CONSTRAINT "Teach_Student_Subject_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: Teach_Student_Subject Teach_Student_Subject_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Student_Subject"
    ADD CONSTRAINT "Teach_Student_Subject_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Teach_Subject_Dep_Sgrade Teach_Subject_Dep_Sgrade_Dep_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Dep_Sgrade_Dep_code_fkey" FOREIGN KEY ("Dep_code") REFERENCES public."Department"("Dep_code");


--
-- Name: Teach_Subject_Dep_Sgrade Teach_Subject_Dep_Sgrade_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Dep_Sgrade_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: Teach_Subject_Dep_Sgrade Teach_Subject_Dep_Sgrade_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Dep_Sgrade_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: Teach_Subject_Dep_Sgrade Teach_Subject_Dep_Sgrade_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Dep_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Dep_Sgrade_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Teach_Subject_Grade Teach_Subject_Grade_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Grade"
    ADD CONSTRAINT "Teach_Subject_Grade_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Grade"("Grade_num");


--
-- Name: Teach_Subject_Grade Teach_Subject_Grade_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Grade"
    ADD CONSTRAINT "Teach_Subject_Grade_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: Teach_Subject_Grade Teach_Subject_Grade_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Grade"
    ADD CONSTRAINT "Teach_Subject_Grade_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Teach_Subject_Sgrade Teach_Subject_Sgrade_Grade_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Sgrade_Grade_num_fkey" FOREIGN KEY ("Grade_num") REFERENCES public."Sgrade"("Grade_num");


--
-- Name: Teach_Subject_Sgrade Teach_Subject_Sgrade_Sub_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Sgrade_Sub_code_fkey" FOREIGN KEY ("Sub_code") REFERENCES public."Subject"("Sub_code");


--
-- Name: Teach_Subject_Sgrade Teach_Subject_Sgrade_T_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teach_Subject_Sgrade"
    ADD CONSTRAINT "Teach_Subject_Sgrade_T_id_fkey" FOREIGN KEY ("T_id") REFERENCES public."Teacher"("T_id");


--
-- Name: Video Video_Lec_num_Lec_date_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Video"
    ADD CONSTRAINT "Video_Lec_num_Lec_date_fkey" FOREIGN KEY ("Lec_num", "Lec_date") REFERENCES public."Lecture"("Lec_num", "Lec_date");


--
-- PostgreSQL database dump complete
--

