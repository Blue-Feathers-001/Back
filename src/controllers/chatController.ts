import { Response } from 'express';
import Chat from '../models/Chat';
import Message from '../models/Message';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Get or create a chat between two users
export const getOrCreateChat = async (req: AuthRequest, res: Response) => {
  try {
    const { participantId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required',
      });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if chat already exists between these two users
    let chat = await Chat.findOne({
      participants: { $all: [userId, participantId] },
    }).populate('participants', 'name email avatar profileImage role');

    // If chat doesn't exist, create it
    if (!chat) {
      chat = await Chat.create({
        participants: [userId, participantId],
        unreadCount: {
          [userId.toString()]: 0,
          [participantId.toString()]: 0,
        },
      });

      await chat.populate('participants', 'name email avatar profileImage role');
    }

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error: any) {
    console.error('[Chat] Get or create chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get or create chat',
      error: error.message,
    });
  }
};

// Get all chats for the current user
export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const chats = await Chat.find({
      participants: userId,
    })
      .populate('participants', 'name email avatar profileImage role')
      .sort({ lastMessageAt: -1 });

    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error: any) {
    console.error('[Chat] Get user chats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get chats',
      error: error.message,
    });
  }
};

// Send a message
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, content, attachments } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!chatId || (!content && (!attachments || attachments.length === 0))) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and either content or attachments are required',
      });
    }

    // Check if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat',
      });
    }

    // Create message
    const message = await Message.create({
      chat: chatId,
      sender: userId,
      content: content ? content.trim() : '',
      attachments: attachments || [],
      readBy: [userId],
    });

    await message.populate('sender', 'name email avatar profileImage role');

    // Update chat's last message info
    const displayMessage = content ? content.trim() : (attachments && attachments.length > 0 ? `📎 ${attachments.length} file(s)` : '');
    chat.lastMessage = displayMessage;
    chat.lastMessageAt = new Date();

    // Increment unread count for other participants
    chat.participants.forEach((participantId) => {
      const participantIdStr = participantId.toString();
      if (participantIdStr !== userId.toString()) {
        const currentCount = chat.unreadCount.get(participantIdStr) || 0;
        chat.unreadCount.set(participantIdStr, currentCount + 1);
      }
    });

    await chat.save();

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error('[Chat] Send message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

// Get messages for a chat
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?._id;
    const { page = 1, limit = 50 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat',
      });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email avatar profileImage role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Message.countDocuments({ chat: chatId });

    // Mark messages as read by current user
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $push: { readBy: userId },
      }
    );

    // Reset unread count for current user
    chat.unreadCount.set(userId.toString(), 0);
    await chat.save();

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('[Chat] Get messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message,
    });
  }
};

// Mark messages as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat',
      });
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $push: { readBy: userId },
      }
    );

    // Reset unread count
    chat.unreadCount.set(userId.toString(), 0);
    await chat.save();

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    console.error('[Chat] Mark as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message,
    });
  }
};

// Get available trainers/users to chat with
export const getAvailableContacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    let contacts;

    // If user is a trainer, show active members
    // If user is a regular user, show active trainers
    if (userRole === 'trainer') {
      contacts = await User.find({
        role: 'user',
        membershipStatus: { $in: ['active', 'grace_period'] },
        _id: { $ne: userId },
      }).select('name email avatar profileImage role membershipStatus');

      console.log(`[Chat] Trainer ${userId} fetching contacts - Found ${contacts.length} active members`);
      if (contacts.length > 0) {
        console.log('[Chat] Sample contacts:', contacts.slice(0, 3).map(c => ({ name: c.name, membershipStatus: c.membershipStatus })));
      }
    } else if (userRole === 'user') {
      contacts = await User.find({
        role: 'trainer',
        isActive: true,
        _id: { $ne: userId },
      }).select('name email avatar profileImage role');

      console.log(`[Chat] User ${userId} fetching contacts - Found ${contacts.length} active trainers`);
    } else {
      // Admins can see both trainers and users
      contacts = await User.find({
        role: { $in: ['trainer', 'user'] },
        _id: { $ne: userId },
      }).select('name email avatar profileImage role membershipStatus isActive');

      console.log(`[Chat] Admin ${userId} fetching contacts - Found ${contacts.length} contacts`);
    }

    return res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error: any) {
    console.error('[Chat] Get available contacts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: error.message,
    });
  }
};
