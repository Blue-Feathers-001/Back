import express from 'express';
import {
  getOrCreateChat,
  getUserChats,
  sendMessage,
  getChatMessages,
  markAsRead,
  getAvailableContacts,
} from '../controllers/chatController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

// Get available contacts to chat with
router.get('/contacts', getAvailableContacts);

// Get all chats for current user
router.get('/', getUserChats);

// Get or create a chat with another user
router.post('/', getOrCreateChat);

// Get messages for a specific chat
router.get('/:chatId/messages', getChatMessages);

// Send a message
router.post('/messages', sendMessage);

// Mark messages as read
router.patch('/:chatId/read', markAsRead);

export default router;
