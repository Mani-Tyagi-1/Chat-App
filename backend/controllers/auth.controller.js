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

        if(password.length < 6) {
            return res.status(400).json({ message: "Password must have at least 6 characters " });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ fullName, email, password: hashedPassword });

        if(newUser) {
            // Jwt token
            generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({ message: "User created successfully", user: { _id: newUser._id, fullName: newUser.fullName, email: newUser.email } });
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
        res.status(200).json({ message: "Login successful", user: { _id: user._id, fullName: user.fullName, email: user.email, profilePic: user.profilePic } });

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
        const {profilePic} = req.body;
        const userId = req.user._id;
    
        console.log("Reached updateProfile controller");

        if(!profilePic) {
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