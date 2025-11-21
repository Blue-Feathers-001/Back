import { Schema, model, Document, Types } from 'mongoose';

export interface IAttachment {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface IMessage extends Document {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  attachments?: IAttachment[];
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        key: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
MessageSchema.index({ chat: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });

export default model<IMessage>('Message', MessageSchema);
