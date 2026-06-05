import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendSupportNotificationEmail } from '../utils/email';

export const createMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;
    
    // Optional user ID if the user is logged in
    const userId = (req as AuthenticatedRequest).user?.userId;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields (name, email, message) are required' });
    }

    const supportMessage = await prisma.supportMessage.create({
      data: {
        name,
        email,
        message,
        userId: userId || null
      }
    });

    // Send email notification in the background
    sendSupportNotificationEmail(
      email,
      name || 'زائر',
      message
    );

    res.status(201).json({ message: 'Message sent successfully', data: supportMessage });
  } catch (error: any) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

export const getMyMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.query.email as string;

    if (!userId && !email) {
      return res.status(200).json([]);
    }

    const messages = await prisma.supportMessage.findMany({
      where: userId ? { userId } : { email },
      orderBy: { createdAt: 'asc' } // Oldest first for chat display
    });

    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching my messages', error: error.message });
  }
};

export const getAllMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const messages = await prisma.supportMessage.findMany({
      where: { isDeletedByAdmin: false },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

export const replyToMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ message: 'Reply is required' });
    }

    const message = await prisma.supportMessage.update({
      where: { id },
      data: { reply, isRead: true }
    });

    // Here you would also integrate an email sending logic (e.g. Nodemailer)
    // to actually send the reply to the user's email: `message.email`

    res.status(200).json({ message: 'Reply sent and saved', data: message });
  } catch (error: any) {
    res.status(500).json({ message: 'Error replying to message', error: error.message });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const message = await prisma.supportMessage.update({
      where: { id },
      data: { isRead: true }
    });
    res.status(200).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error marking message as read', error: error.message });
  }
};

export const deleteMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.supportMessage.update({ 
      where: { id },
      data: { isDeletedByAdmin: true }
    });
    res.status(200).json({ message: 'Message removed from admin view' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
};
