import pg from "pg"

const pool = new pg.Pool({
    user: "postgres",
    host: "localhost",
    database: "vDesk_DB",
    password: "0000",
    port: 5432
})

const general = {
    auth : {
        
        async verify_invite(code){
            return pool.query(`SELECT * FROM Public."Inviter" WHERE code = $1 AND NOT used  AND expires_at > NOW();`,[code])
        },

        async use_invite_code(code){
            return pool.query(`UPDATE Public."Inviter" SET used = TRUE WHERE code = $1`, [code])
        }
    }
}

export default general