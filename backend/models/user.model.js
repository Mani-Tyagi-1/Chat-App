import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilePic: {
        type: String,
        default: "",
    },
    resetOtp: {
        type: String,
        default: null,
    },
    resetOtpExpires: {
        type: Date,
        default: null,
    }
}, { timestamps: true });


const User = mongoose.model("User", userSchema);

export default User;