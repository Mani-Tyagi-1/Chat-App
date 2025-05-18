import jwt from "jsonwebtoken";


export const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET_KEY, {
        expiresIn: "7d",

    })

    res.cookie("jwt", token, {
        httpOnly: true, //accessible only by web server
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        
    })
} 