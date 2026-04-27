import { Router } from "express"
import student from "../../models/Student.js"

const login_router = Router()

login_router.post("/login/", async (req,res)=> {
    console.log(req.body)
    //let response = await student.auth.add_new(generator(), req.body.name)
    res.json(
        {
            "status" : "success",
        })
})

export default login_router