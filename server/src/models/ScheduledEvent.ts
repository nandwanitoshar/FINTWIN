import mongoose, { Schema, Document } from 'mongoose';
import { getIsConnected } from '../config/db.js';

export type ScheduledEventType = 'EXPENSE' | 'INCOME' | 'EMI' | 'GOAL_MILESTONE' | 'SUBSCRIPTION' | 'CUSTOM';
export type ScheduledEventRecurrence = 'NONE' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';

export interface IScheduledEvent {
  _id: string;
  userId: string;
  title: string;
  amount: number;
  amountPaise: number;
  type: ScheduledEventType;
  date: string; // YYYY-MM-DD
  recurrence: ScheduledEventRecurrence;
  targetAccountId?: string;
  category?: string;
  notes?: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduledEventDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  amountPaise: number;
  type: ScheduledEventType;
  date: string;
  recurrence: ScheduledEventRecurrence;
  targetAccountId?: string;
  category?: string;
  notes?: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledEventSchema = new Schema<IScheduledEventDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: ['EXPENSE', 'INCOME', 'EMI', 'GOAL_MILESTONE', 'SUBSCRIPTION', 'CUSTOM'],
      default: 'EXPENSE',
    },
    date: { type: String, required: true, index: true },
    recurrence: {
      type: String,
      enum: ['NONE', 'WEEKLY', 'MONTHLY', 'ANNUAL'],
      default: 'NONE',
    },
    targetAccountId: { type: String },
    category: { type: String, default: 'General' },
    notes: { type: String, default: '' },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ScheduledEventSchema.index({ userId: 1, date: 1 });

export const ScheduledEventModel = mongoose.model<IScheduledEventDocument>(
  'ScheduledEvent',
  ScheduledEventSchema
);

const inMemoryEvents = new Map<string, IScheduledEvent>();

export const ScheduledEventRepository = {
  async create(data: Omit<IScheduledEvent, '_id' | 'createdAt' | 'updatedAt'>): Promise<IScheduledEvent> {
    if (getIsConnected()) {
      const doc = await ScheduledEventModel.create(data);
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        title: doc.title,
        amount: doc.amount,
        amountPaise: doc.amountPaise,
        type: doc.type,
        date: doc.date,
        recurrence: doc.recurrence,
        targetAccountId: doc.targetAccountId,
        category: doc.category,
        notes: doc.notes,
        isCompleted: doc.isCompleted,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const id = new mongoose.Types.ObjectId().toString();
      const ev: IScheduledEvent = {
        ...data,
        _id: id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryEvents.set(id, ev);
      return ev;
    }
  },

  async findByUserId(userId: string): Promise<IScheduledEvent[]> {
    if (getIsConnected()) {
      const docs = await ScheduledEventModel.find({ userId }).sort({ date: 1 }).lean();
      return docs.map((d: any) => ({
        _id: d._id.toString(),
        userId: d.userId.toString(),
        title: d.title,
        amount: d.amount,
        amountPaise: d.amountPaise,
        type: d.type as ScheduledEventType,
        date: d.date,
        recurrence: d.recurrence as ScheduledEventRecurrence,
        targetAccountId: d.targetAccountId,
        category: d.category,
        notes: d.notes,
        isCompleted: d.isCompleted,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    } else {
      return Array.from(inMemoryEvents.values())
        .filter((e) => e.userId === userId)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  },

  async findByIdAndUserId(id: string, userId: string): Promise<IScheduledEvent | null> {
    if (getIsConnected()) {
      const doc = (await ScheduledEventModel.findOne({ _id: id, userId }).lean()) as any;
      if (!doc) return null;
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        title: doc.title,
        amount: doc.amount,
        amountPaise: doc.amountPaise,
        type: doc.type as ScheduledEventType,
        date: doc.date,
        recurrence: doc.recurrence as ScheduledEventRecurrence,
        targetAccountId: doc.targetAccountId,
        category: doc.category,
        notes: doc.notes,
        isCompleted: doc.isCompleted,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const ev = inMemoryEvents.get(id);
      if (!ev || ev.userId !== userId) return null;
      return ev;
    }
  },

  async update(id: string, userId: string, updateData: Partial<IScheduledEvent>): Promise<IScheduledEvent | null> {
    if (getIsConnected()) {
      const doc = (await ScheduledEventModel.findOneAndUpdate(
        { _id: id, userId },
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).lean()) as any;
      if (!doc) return null;
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        title: doc.title,
        amount: doc.amount,
        amountPaise: doc.amountPaise,
        type: doc.type as ScheduledEventType,
        date: doc.date,
        recurrence: doc.recurrence as ScheduledEventRecurrence,
        targetAccountId: doc.targetAccountId,
        category: doc.category,
        notes: doc.notes,
        isCompleted: doc.isCompleted,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const ev = inMemoryEvents.get(id);
      if (!ev || ev.userId !== userId) return null;
      const updated = { ...ev, ...updateData, updatedAt: new Date() };
      inMemoryEvents.set(id, updated);
      return updated;
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      const res = await ScheduledEventModel.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    } else {
      const ev = inMemoryEvents.get(id);
      if (!ev || ev.userId !== userId) return false;
      return inMemoryEvents.delete(id);
    }
  },
};
