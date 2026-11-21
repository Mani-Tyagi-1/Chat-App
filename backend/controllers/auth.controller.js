import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";



export const signup = async (req, res) => {

    const { fullName, email, password } = req.body;
    try {

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must have at least 6 characters " });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ fullName, email, password: hashedPassword });

        if (newUser) {
            // Jwt token
            generateToken(newUser._id, res);
            await newUser.save();
            const userData = { _id: newUser._id, fullName: newUser.fullName, email: newUser.email, profilePic: newUser.profilePic || "" };
            res.status(201).json({ ...userData, message: "User created successfully", user: userData });
        }
        else {
            res.status(500).json({ message: "Invalid User Data" });
        }


    }
    catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        generateToken(user._id, res);
        const userData = { _id: user._id, fullName: user.fullName, email: user.email, profilePic: user.profilePic || "" };
        res.status(200).json({ ...userData, message: "Login successful", user: userData });

    }
    catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logout successfully" });
    }
    catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { profilePic } = req.body;
        const userId = req.user._id;

        console.log("Reached updateProfile controller");

        if (!profilePic) {
            return res.status(400).json({ message: "Profile picture is required" });
        }

        const uploadResponse = await cloudinary.uploader.upload(profilePic,);
        const updatedUser = await User.findByIdAndUpdate(userId, { profilePic: uploadResponse.secure_url }, { new: true });

        res.status(200).json({ message: "Profile updated successfully", user: { _id: updatedUser._id, fullName: updatedUser.fullName, email: updatedUser.email, profilePic: updatedUser.profilePic } });

    }
    catch (error) {
        console.log("Error in updateProfile controller", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


// export const updateProfile = async (req, res) => {
//   try {
//     const { profilePic } = req.body;
//     const userId = req.user._id;

//     if (!profilePic) {
//       return res.status(400).json({ message: "Profile picture is required" });
//     }

//     let uploadResponse;
//     try {
//       uploadResponse = await cloudinary.uploader.upload(profilePic);
//     } catch (uploadErr) {
//       console.log(
//         "First upload attempt failed, retrying...",
//         uploadErr
//       );
//       // Retry once after a short delay
//       await new Promise((r) => setTimeout(r, 1000));
//       uploadResponse = await cloudinary.uploader.upload(profilePic);
//     }

//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { profilePic: uploadResponse.secure_url },
//       { new: true }
//     );

//     res.status(200).json({
//       message: "Profile updated successfully",
//       user: {
//         _id: updatedUser._id,
//         fullName: updatedUser.fullName,
//         email: updatedUser.email,
//         profilePic: updatedUser.profilePic,
//       },
//     });
//   } catch (error) {
//     console.error("Error in updateProfile controller", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };


export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    }
    catch (error) {
        console.log("Error in checkAuth controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Change Password from Profile (User is authenticated)
export const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Incorrect current password" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.log("Error in changePassword controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Forgot Password - Send / Generate OTP
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No account found with this email" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        console.log(`🔐 Password reset code for ${email}: ${otp}`);

        res.status(200).json({
            message: "Verification code generated successfully",
            code: otp,
        });
    } catch (error) {
        console.log("Error in forgotPassword controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Reset Password - Verify OTP and update password
export const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No account found with this email" });
        }

        if (!user.resetOtp || user.resetOtp !== code.trim()) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        if (user.resetOtpExpires < Date.now()) {
            return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
        }

        // Hash new password and clear reset fields
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetOtp = null;
        user.resetOtpExpires = null;
        await user.save();

        // Generate fresh JWT token
        generateToken(user._id, res);

        const userData = { _id: user._id, fullName: user.fullName, email: user.email, profilePic: user.profilePic || "" };
        res.status(200).json({ ...userData, message: "Password reset successful", user: userData });
    } catch (error) {
        console.log("Error in resetPassword controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};