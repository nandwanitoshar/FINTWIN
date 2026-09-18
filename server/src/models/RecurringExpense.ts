import mongoose, { Schema, Document } from 'mongoose';
import { getIsConnected } from '../config/db.js';

export type RecurrenceCadence =
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL'
  | 'YEARLY';

export type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface IRecurringExpense {
  _id: string;
  userId: string;
  name: string;
  entityId?: string;
  entityName: string;
  averageAmount: number;
  averageAmountPaise: number;
  lastAmount?: number;
  cadence: RecurrenceCadence;
  category: string;
  estimatedMonthlyImpact: number;
  averageIntervalDays?: number;
  firstDetectedDate?: string;
  lastOccurrenceDate: string;
  nextExpectedDate: string;
  nextOccurrenceReliable?: boolean;
  nextOccurrenceMessage?: string;
  totalOccurrences?: number;
  status: RecurringStatus;
  detectedAutomatically: boolean;
  confidenceScore: number; // 0.0 - 1.0
  confidenceFormula?: string;
  evidence?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecurringExpenseDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  entityId?: string;
  entityName: string;
  averageAmount: number;
  averageAmountPaise: number;
  lastAmount?: number;
  cadence: RecurrenceCadence;
  category: string;
  estimatedMonthlyImpact: number;
  averageIntervalDays?: number;
  firstDetectedDate?: string;
  lastOccurrenceDate: string;
  nextExpectedDate: string;
  nextOccurrenceReliable?: boolean;
  nextOccurrenceMessage?: string;
  totalOccurrences?: number;
  status: RecurringStatus;
  detectedAutomatically: boolean;
  confidenceScore: number;
  confidenceFormula?: string;
  evidence?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringExpenseSchema = new Schema<IRecurringExpenseDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    entityId: { type: String },
    entityName: { type: String, required: true, trim: true },
    averageAmount: { type: Number, required: true, min: 0 },
    averageAmountPaise: { type: Number, required: true, min: 0 },
    lastAmount: { type: Number, default: 0 },
    cadence: {
      type: String,
      enum: ['WEEKLY', 'BI_WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'YEARLY'],
      default: 'MONTHLY',
    },
    category: { type: String, default: 'Subscription', trim: true },
    estimatedMonthlyImpact: { type: Number, required: true, min: 0 },
    averageIntervalDays: { type: Number, default: 30 },
    firstDetectedDate: { type: String, default: '' },
    lastOccurrenceDate: { type: String, required: true },
    nextExpectedDate: { type: String, required: true },
    nextOccurrenceReliable: { type: Boolean, default: true },
    nextOccurrenceMessage: { type: String, default: '' },
    totalOccurrences: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    detectedAutomatically: { type: Boolean, default: true },
    confidenceScore: { type: Number, default: 0.9, min: 0, max: 1 },
    confidenceFormula: { type: String, default: '' },
    evidence: { type: [String], default: [] },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

RecurringExpenseSchema.index({ userId: 1, entityName: 1 });

export const RecurringExpenseModel =
  mongoose.models.RecurringExpense ||
  mongoose.model<IRecurringExpenseDocument>('RecurringExpense', RecurringExpenseSchema);

// In-memory fallback
const inMemoryRecurring = new Map<string, IRecurringExpense>();

export const RecurringExpenseRepository = {
  async create(data: Omit<IRecurringExpense, '_id' | 'createdAt' | 'updatedAt'>): Promise<IRecurringExpense> {
    if (getIsConnected()) {
      const doc = await RecurringExpenseModel.create(data);
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        entityId: doc.entityId,
        entityName: doc.entityName,
        averageAmount: doc.averageAmount,
        averageAmountPaise: doc.averageAmountPaise,
        lastAmount: doc.lastAmount,
        cadence: doc.cadence,
        category: doc.category,
        estimatedMonthlyImpact: doc.estimatedMonthlyImpact,
        averageIntervalDays: doc.averageIntervalDays,
        firstDetectedDate: doc.firstDetectedDate,
        lastOccurrenceDate: doc.lastOccurrenceDate,
        nextExpectedDate: doc.nextExpectedDate,
        nextOccurrenceReliable: doc.nextOccurrenceReliable,
        nextOccurrenceMessage: doc.nextOccurrenceMessage,
        totalOccurrences: doc.totalOccurrences,
        status: doc.status,
        detectedAutomatically: doc.detectedAutomatically,
        confidenceScore: doc.confidenceScore,
        confidenceFormula: doc.confidenceFormula,
        evidence: doc.evidence,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const id = new mongoose.Types.ObjectId().toString();
      const rec: IRecurringExpense = {
        ...data,
        _id: id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryRecurring.set(id, rec);
      return rec;
    }
  },

  async findByUserId(userId: string): Promise<IRecurringExpense[]> {
    if (getIsConnected()) {
      const docs = await RecurringExpenseModel.find({ userId }).sort({ nextExpectedDate: 1 }).lean();
      return docs.map((d: any) => ({
        _id: d._id.toString(),
        userId: d.userId.toString(),
        name: d.name,
        entityId: d.entityId,
        entityName: d.entityName,
        averageAmount: d.averageAmount,
        averageAmountPaise: d.averageAmountPaise,
        lastAmount: d.lastAmount,
        cadence: d.cadence as RecurrenceCadence,
        category: d.category,
        estimatedMonthlyImpact: d.estimatedMonthlyImpact,
        averageIntervalDays: d.averageIntervalDays,
        firstDetectedDate: d.firstDetectedDate,
        lastOccurrenceDate: d.lastOccurrenceDate,
        nextExpectedDate: d.nextExpectedDate,
        nextOccurrenceReliable: d.nextOccurrenceReliable,
        nextOccurrenceMessage: d.nextOccurrenceMessage,
        totalOccurrences: d.totalOccurrences,
        status: d.status as RecurringStatus,
        detectedAutomatically: d.detectedAutomatically,
        confidenceScore: d.confidenceScore,
        confidenceFormula: d.confidenceFormula,
        evidence: d.evidence || [],
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    } else {
      return Array.from(inMemoryRecurring.values()).filter((r) => r.userId === userId);
    }
  },

  async findByIdAndUserId(id: string, userId: string): Promise<IRecurringExpense | null> {
    if (getIsConnected()) {
      const doc = (await RecurringExpenseModel.findOne({ _id: id, userId }).lean()) as any;
      if (!doc) return null;
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        entityId: doc.entityId,
        entityName: doc.entityName,
        averageAmount: doc.averageAmount,
        averageAmountPaise: doc.averageAmountPaise,
        lastAmount: doc.lastAmount,
        cadence: doc.cadence as RecurrenceCadence,
        category: doc.category,
        estimatedMonthlyImpact: doc.estimatedMonthlyImpact,
        averageIntervalDays: doc.averageIntervalDays,
        firstDetectedDate: doc.firstDetectedDate,
        lastOccurrenceDate: doc.lastOccurrenceDate,
        nextExpectedDate: doc.nextExpectedDate,
        nextOccurrenceReliable: doc.nextOccurrenceReliable,
        nextOccurrenceMessage: doc.nextOccurrenceMessage,
        totalOccurrences: doc.totalOccurrences,
        status: doc.status as RecurringStatus,
        detectedAutomatically: doc.detectedAutomatically,
        confidenceScore: doc.confidenceScore,
        confidenceFormula: doc.confidenceFormula,
        evidence: doc.evidence || [],
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const rec = inMemoryRecurring.get(id);
      if (!rec || rec.userId !== userId) return null;
      return rec;
    }
  },

  async update(id: string, userId: string, updateData: Partial<IRecurringExpense>): Promise<IRecurringExpense | null> {
    if (getIsConnected()) {
      const doc = (await RecurringExpenseModel.findOneAndUpdate(
        { _id: id, userId },
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).lean()) as any;
      if (!doc) return null;
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        entityId: doc.entityId,
        entityName: doc.entityName,
        averageAmount: doc.averageAmount,
        averageAmountPaise: doc.averageAmountPaise,
        lastAmount: doc.lastAmount,
        cadence: doc.cadence as RecurrenceCadence,
        category: doc.category,
        estimatedMonthlyImpact: doc.estimatedMonthlyImpact,
        averageIntervalDays: doc.averageIntervalDays,
        firstDetectedDate: doc.firstDetectedDate,
        lastOccurrenceDate: doc.lastOccurrenceDate,
        nextExpectedDate: doc.nextExpectedDate,
        nextOccurrenceReliable: doc.nextOccurrenceReliable,
        nextOccurrenceMessage: doc.nextOccurrenceMessage,
        totalOccurrences: doc.totalOccurrences,
        status: doc.status as RecurringStatus,
        detectedAutomatically: doc.detectedAutomatically,
        confidenceScore: doc.confidenceScore,
        confidenceFormula: doc.confidenceFormula,
        evidence: doc.evidence || [],
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const rec = inMemoryRecurring.get(id);
      if (!rec || rec.userId !== userId) return null;
      const updated = { ...rec, ...updateData, updatedAt: new Date() };
      inMemoryRecurring.set(id, updated);
      return updated;
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      const res = await RecurringExpenseModel.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    } else {
      const rec = inMemoryRecurring.get(id);
      if (!rec || rec.userId !== userId) return false;
      return inMemoryRecurring.delete(id);
    }
  },
};
