import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    // Attach last message and unread count for each user
    const usersWithMeta = await Promise.all(
      filteredUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        }).sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          seen: false,
        });

        return {
          ...user.toObject(),
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
          unreadCount: unreadCount || 0,
        };
      })
    );

    // Sort by latest message first
    usersWithMeta.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json(usersWithMeta);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Mark messages as seen when opening conversation
    const updateResult = await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, seen: false },
      { $set: { seen: true } }
    );

    // Notify sender in real-time that their messages were seen
    if (updateResult.modifiedCount > 0) {
      const senderSocketId = getReceiverSocketId(userToChatId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesSeen", {
          seenBy: myId.toString(),
        });
      }
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).populate("replyTo", "_id text image audio senderId createdAt");

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsSeen = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const myId = req.user._id;

    const updateResult = await Message.updateMany(
      { senderId, receiverId: myId, seen: false },
      { $set: { seen: true } }
    );

    if (updateResult.modifiedCount > 0) {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesSeen", {
          seenBy: myId.toString(),
        });
      }
    }

    res.status(200).json({ success: true, count: updateResult.modifiedCount });
  } catch (error) {
    console.error("Error in markMessagesAsSeen controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, audio, replyToId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(audio, {
          resource_type: "video", // Cloudinary handles audio files under video resource type
        });
        audioUrl = uploadResponse.secure_url;
      } catch (err) {
        console.log("Cloudinary audio upload fallback to direct string", err.message);
        audioUrl = audio;
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      audio: audioUrl,
      replyTo: replyToId || null,
    });

    await newMessage.save();

    if (replyToId) {
      await newMessage.populate("replyTo", "_id text image audio senderId createdAt");
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }

    await Message.findByIdAndDelete(id);

    // Notify receiver or all group members via socket
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (group) {
        group.members.forEach((mId) => {
          const socketId = getReceiverSocketId(mId.toString());
          if (socketId) {
            io.to(socketId).emit("messageDeleted", { messageId: id, groupId: message.groupId });
          }
        });
      }
    } else if (message.receiverId) {
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId: id });
      }
    }

    res.status(200).json({ success: true, messageId: id });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Toggle reaction: if already reacted with this emoji, remove it; else set/replace user reaction
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Broadcast reaction to group or direct message participants
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (group) {
        group.members.forEach((mId) => {
          const socketId = getReceiverSocketId(mId.toString());
          if (socketId) {
            io.to(socketId).emit("messageReaction", {
              messageId: id,
              reactions: message.reactions,
              groupId: message.groupId,
            });
          }
        });
      }
    } else if (message.receiverId) {
      const otherUserId =
        message.senderId.toString() === userId.toString()
          ? message.receiverId.toString()
          : message.senderId.toString();

      const otherSocketId = getReceiverSocketId(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit("messageReaction", {
          messageId: id,
          reactions: message.reactions,
        });
      }
    }

    res.status(200).json({ messageId: id, reactions: message.reactions });
  } catch (error) {
    console.error("Error in reactToMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
