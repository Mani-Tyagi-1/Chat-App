import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, groupPic } = req.body;
    const adminId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Ensure admin is in members list without duplicates
    const members = Array.from(
      new Set([adminId.toString(), ...(memberIds || [])])
    );

    let groupPicUrl = "";
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      groupPicUrl = uploadResponse.secure_url;
    }

    const newGroup = new Group({
      name: name.trim(),
      description: description || "",
      groupPic: groupPicUrl,
      admin: adminId,
      members,
    });

    await newGroup.save();
    await newGroup.populate("members", "_id fullName email profilePic");
    await newGroup.populate("admin", "_id fullName email profilePic");

    // Notify all members via socket
    members.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId.toString());
      if (socketId) {
        io.to(socketId).emit("newGroupCreated", newGroup);
      }
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error in createGroup controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("members", "_id fullName email profilePic")
      .populate("admin", "_id fullName email profilePic");

    // Attach lastMessage for each group
    const groupsWithMeta = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne({ groupId: group._id })
          .sort({ createdAt: -1 })
          .populate("senderId", "_id fullName profilePic");

        return {
          ...group.toObject(),
          isGroup: true,
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                text: lastMessage.text,
                image: lastMessage.image,
                audio: lastMessage.audio,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      })
    );

    // Sort by latest message
    groupsWithMeta.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    res.status(200).json(groupsWithMeta);
  } catch (error) {
    console.error("Error in getUserGroups controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.find({ groupId })
      .populate("senderId", "_id fullName profilePic")
      .populate("replyTo", "_id text image audio senderId createdAt");

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, audio, replyToId } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m.toString() === senderId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(audio, {
          resource_type: "video",
        });
        audioUrl = uploadResponse.secure_url;
      } catch (err) {
        audioUrl = audio;
      }
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
      audio: audioUrl,
      replyTo: replyToId || null,
    });

    await newMessage.save();
    await newMessage.populate("senderId", "_id fullName profilePic");
    if (replyToId) {
      await newMessage.populate("replyTo", "_id text image audio senderId createdAt");
    }

    // Broadcast to all group members via socket (except sender)
    group.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        const socketId = getReceiverSocketId(memberId.toString());
        if (socketId) {
          io.to(socketId).emit("newGroupMessage", {
            groupId,
            message: newMessage,
          });
        }
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
