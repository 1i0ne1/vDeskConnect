import pg from "pg"

const pool = new pg.Pool({
    user: "postgres",
    host: "localhost",
    database: "vDesk_DB",
    password: "0000",
    port: 5432
})


const teacher = {
    
    auth:{
        async add(id, name, email, tel, pwd, dob, soo, sex, prevAddr, currAddr, ms, bg, geno, height, weight, disability, qualification){
            
            return await pool.query(`
                INSERT INTO Public."Teacher" Values($1, $2,$3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17 )
                `,[id, name, email, tel, pwd, dob, soo, sex, prevAddr, currAddr, ms, bg, geno, height, weight, disability, qualification])  
        },

        async add_teach_subject_grade(sub_code, grade_num, t_id){
            return await pool.query(`
                INSERT INTO Public."Teach_Subject_Grade" Values($1, $2, $3)`, [sub_code, grade_num, t_id])
        },

        async add_teach_subject_sgrade(sub_code, grade_num, t_id){
            return await pool.query(`
                INSERT INTO Public."Teach_Subject_Sgrade" Values($1, $2, $3)`, [sub_code, grade_num, t_id])
        },

        async add_teach_discipline_grade(disc_code, grade_num, t_id){
            return await pool.query(`
                INSERT INTO Public."Teach_Discipline_Grade" Values($1, $2, $3)`, [disc_code, grade_num, t_id])
        },

        async add_teach_discipline_sgrade(disc_code, grade_num, t_id){
            return await pool.query(`
                INSERT INTO Public."Teach_Discipline_Sgrade" Values($1, $2, $3)`, [disc_code, grade_num, t_id])
        }
    },

    admin:{
        async add(id, role){
            return await pool.query(`
                INSERT INTO Public."Teacher"("T_id", "Role") VALUES($1, $2)
                `, [id, role])
        }
    }
}

export default teacher