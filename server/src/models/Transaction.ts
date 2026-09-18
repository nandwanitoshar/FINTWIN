import mongoose, { Document, Schema } from 'mongoose';
import { getIsConnected } from '../config/db.js';
import { toPaise } from '../utils/calculations.js';

export type TransactionDirection = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'REFUND' | 'OTHER';
export type TransactionType = 'CREDIT' | 'DEBIT' | 'INTERNAL_TRANSFER';
export type RecurrenceType = 'ONE_OFF' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
export type TransactionSource = 'MANUAL' | 'CSV' | 'JSON' | 'API';
export type TransactionStatus = 'NORMALIZED' | 'CONFIRMED' | 'PENDING';

export interface ITransaction {
  _id: string;
  userId: string;
  accountId: string;
  sourceAccountId: string;
  destinationAccountId?: string;
  entityId?: string;
  destinationEntityId?: string;
  amount: number;
  amountPaise: number;
  currency: string;
  direction: TransactionDirection;
  type: TransactionType;
  category: string;
  description: string;
  date: Date;
  reference?: string;
  source: TransactionSource;
  status: TransactionStatus;
  metadata?: Record<string, any>;
  recurrence: RecurrenceType;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ITransactionDocument extends Omit<ITransaction, '_id'>, Document {}

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be non-negative'],
    },
    amountPaise: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      trim: true,
      uppercase: true,
    },
    sourceAccountId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Account',
      required: true,
      index: true,
    },
    destinationAccountId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Account',
    },
    destinationEntityId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Entity',
      index: true,
    },
    direction: {
      type: String,
      enum: ['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'OTHER'],
      default: 'EXPENSE',
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['CREDIT', 'DEBIT', 'INTERNAL_TRANSFER'],
      default: 'DEBIT',
    },
    category: {
      type: String,
      required: true,
      default: 'General',
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['MANUAL', 'CSV', 'JSON', 'API'],
      default: 'MANUAL',
    },
    status: {
      type: String,
      enum: ['NORMALIZED', 'CONFIRMED', 'PENDING'],
      default: 'CONFIRMED',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    recurrence: {
      type: String,
      enum: ['ONE_OFF', 'WEEKLY', 'MONTHLY', 'ANNUAL'],
      default: 'ONE_OFF',
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.virtual('accountId').get(function (this: ITransactionDocument) {
  return this.sourceAccountId ? this.sourceAccountId.toString() : '';
});

TransactionSchema.virtual('entityId').get(function (this: ITransactionDocument) {
  return this.destinationEntityId ? this.destinationEntityId.toString() : undefined;
});

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, sourceAccountId: 1 });
TransactionSchema.index({ userId: 1, destinationEntityId: 1 });
TransactionSchema.index({ userId: 1, direction: 1 });

export const TransactionModel =
  mongoose.models.Transaction ||
  mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);

const inMemoryTransactions: Map<string, ITransaction> = new Map();

export interface TransactionFilterOptions {
  category?: string;
  type?: TransactionType;
  direction?: TransactionDirection;
  accountId?: string;
  entityId?: string;
  currency?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  limit?: number;
  skip?: number;
}

export const TransactionRepository = {
  async create(data: {
    userId: string;
    date?: Date | string;
    amount: number;
    amountPaise?: number;
    currency?: string;
    sourceAccountId?: string;
    accountId?: string;
    destinationAccountId?: string;
    destinationEntityId?: string;
    entityId?: string;
    direction?: TransactionDirection;
    category?: string;
    type?: TransactionType;
    recurrence?: RecurrenceType;
    description: string;
    reference?: string;
    source?: TransactionSource;
    status?: TransactionStatus;
    metadata?: Record<string, any>;
  }): Promise<ITransaction> {
    const txDate = data.date ? new Date(data.date) : new Date();
    const sourceAcc = data.sourceAccountId || data.accountId || '';
    const destEntity = data.destinationEntityId || data.entityId;
    const destAcc = data.destinationAccountId;
    const rawDirection = data.direction;
    const rawType = data.type;

    let derivedDirection: TransactionDirection = rawDirection || 'EXPENSE';
    let derivedType: TransactionType = rawType || 'DEBIT';

    if (!rawDirection && rawType) {
      derivedDirection = rawType === 'CREDIT' ? 'INCOME' : rawType === 'INTERNAL_TRANSFER' ? 'TRANSFER' : 'EXPENSE';
    } else if (rawDirection && !rawType) {
      derivedType = rawDirection === 'INCOME' ? 'CREDIT' : rawDirection === 'TRANSFER' ? 'INTERNAL_TRANSFER' : 'DEBIT';
    }

    const recurrence: RecurrenceType = data.recurrence || 'ONE_OFF';
    const category = data.category || 'General';
    const currency = (data.currency || 'INR').toUpperCase().trim();
    const amountPaise = data.amountPaise !== undefined ? data.amountPaise : toPaise(data.amount);
    const source: TransactionSource = data.source || 'MANUAL';
    const status: TransactionStatus = data.status || 'CONFIRMED';

    if (getIsConnected()) {
      const doc = await TransactionModel.create({
        userId: data.userId,
        date: txDate,
        amount: data.amount,
        amountPaise,
        currency,
        sourceAccountId: sourceAcc,
        destinationAccountId: destAcc,
        destinationEntityId: destEntity,
        direction: derivedDirection,
        type: derivedType,
        category,
        description: data.description.trim(),
        reference: data.reference?.trim(),
        source,
        status,
        metadata: data.metadata,
        recurrence,
      });

      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        accountId: doc.sourceAccountId.toString(),
        sourceAccountId: doc.sourceAccountId.toString(),
        destinationAccountId: doc.destinationAccountId?.toString(),
        entityId: doc.destinationEntityId?.toString(),
        destinationEntityId: doc.destinationEntityId?.toString(),
        amount: doc.amount,
        amountPaise: doc.amountPaise || toPaise(doc.amount),
        currency: doc.currency || 'INR',
        direction: doc.direction as TransactionDirection,
        type: doc.type as TransactionType,
        category: doc.category,
        description: doc.description,
        date: doc.date,
        reference: doc.reference,
        source: (doc.source as TransactionSource) || 'MANUAL',
        status: (doc.status as TransactionStatus) || 'CONFIRMED',
        metadata: doc.metadata,
        recurrence: doc.recurrence as RecurrenceType,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const id = 'tx_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const tx: ITransaction = {
        _id: id,
        userId: data.userId,
        accountId: sourceAcc,
        sourceAccountId: sourceAcc,
        destinationAccountId: destAcc,
        entityId: destEntity,
        destinationEntityId: destEntity,
        amount: data.amount,
        amountPaise,
        currency,
        direction: derivedDirection,
        type: derivedType,
        category,
        description: data.description.trim(),
        date: txDate,
        reference: data.reference?.trim(),
        source,
        status,
        metadata: data.metadata,
        recurrence,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryTransactions.set(id, tx);
      return tx;
    }
  },

  async findByUserId(
    userId: string,
    options: TransactionFilterOptions = {}
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    const {
      category,
      type,
      direction,
      accountId,
      entityId,
      currency,
      startDate,
      endDate,
      search,
      limit = 100,
      skip = 0,
    } = options;

    if (getIsConnected()) {
      const query: any = { userId };
      if (category) query.category = category;
      if (type) query.type = type;
      if (direction) query.direction = direction;
      if (accountId) query.sourceAccountId = accountId;
      if (entityId) query.destinationEntityId = entityId;
      if (currency) query.currency = currency.toUpperCase();

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ description: regex }, { category: regex }, { reference: regex }];
      }

      const [docs, total] = await Promise.all([
        TransactionModel.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
        TransactionModel.countDocuments(query),
      ]);

      const transactions = docs.map((d: any) => ({
        _id: d._id.toString(),
        userId: d.userId.toString(),
        accountId: d.sourceAccountId.toString(),
        sourceAccountId: d.sourceAccountId.toString(),
        destinationAccountId: d.destinationAccountId?.toString(),
        entityId: d.destinationEntityId?.toString(),
        destinationEntityId: d.destinationEntityId?.toString(),
        amount: d.amount,
        amountPaise: d.amountPaise || toPaise(d.amount),
        currency: d.currency || 'INR',
        direction: (d.direction || (d.type === 'CREDIT' ? 'INCOME' : 'EXPENSE')) as TransactionDirection,
        type: d.type as TransactionType,
        category: d.category,
        description: d.description,
        date: d.date,
        reference: d.reference,
        source: (d.source as TransactionSource) || 'MANUAL',
        status: (d.status as TransactionStatus) || 'CONFIRMED',
        metadata: d.metadata,
        recurrence: d.recurrence as RecurrenceType,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));

      return { transactions, total };
    } else {
      let list = Array.from(inMemoryTransactions.values()).filter((t) => t.userId === userId);
      if (category) list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
      if (type) list = list.filter((t) => t.type === type);
      if (direction) list = list.filter((t) => t.direction === direction);
      if (accountId) list = list.filter((t) => t.sourceAccountId === accountId || t.accountId === accountId);
      if (entityId) list = list.filter((t) => t.destinationEntityId === entityId || t.entityId === entityId);
      if (currency) list = list.filter((t) => t.currency.toUpperCase() === currency.toUpperCase());
      if (startDate) list = list.filter((t) => new Date(t.date) >= new Date(startDate));
      if (endDate) list = list.filter((t) => new Date(t.date) <= new Date(endDate));
      if (search && search.trim()) {
        const s = search.toLowerCase().trim();
        list = list.filter(
          (t) =>
            t.description.toLowerCase().includes(s) ||
            t.category.toLowerCase().includes(s) ||
            (t.reference && t.reference.toLowerCase().includes(s))
        );
      }

      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const total = list.length;
      const transactions = list.slice(skip, skip + limit);

      return { transactions, total };
    }
  },

  async findByIdAndUserId(id: string, userId: string): Promise<ITransaction | null> {
    if (getIsConnected()) {
      const doc = await TransactionModel.findOne({ _id: id, userId }).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        userId: (doc as any).userId.toString(),
        accountId: (doc as any).sourceAccountId.toString(),
        sourceAccountId: (doc as any).sourceAccountId.toString(),
        destinationAccountId: (doc as any).destinationAccountId?.toString(),
        entityId: (doc as any).destinationEntityId?.toString(),
        destinationEntityId: (doc as any).destinationEntityId?.toString(),
        amount: (doc as any).amount,
        amountPaise: (doc as any).amountPaise || toPaise((doc as any).amount),
        currency: (doc as any).currency || 'INR',
        direction: ((doc as any).direction || ((doc as any).type === 'CREDIT' ? 'INCOME' : 'EXPENSE')) as TransactionDirection,
        type: (doc as any).type as TransactionType,
        category: (doc as any).category,
        description: (doc as any).description,
        date: (doc as any).date,
        reference: (doc as any).reference,
        source: ((doc as any).source as TransactionSource) || 'MANUAL',
        status: ((doc as any).status as TransactionStatus) || 'CONFIRMED',
        metadata: (doc as any).metadata,
        recurrence: (doc as any).recurrence as RecurrenceType,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const tx = inMemoryTransactions.get(id);
      if (tx && tx.userId === userId) return { ...tx };
      return null;
    }
  },

  async update(id: string, userId: string, data: Partial<ITransaction>): Promise<ITransaction | null> {
    if (getIsConnected()) {
      const updateData: any = { ...data };
      if (data.amount !== undefined) {
        updateData.amountPaise = toPaise(data.amount);
      }
      if (data.accountId && !data.sourceAccountId) {
        updateData.sourceAccountId = data.accountId;
      }
      if (data.entityId && !data.destinationEntityId) {
        updateData.destinationEntityId = data.entityId;
      }

      const doc = await TransactionModel.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true }
      ).lean();
      if (!doc) return null;

      return {
        _id: (doc as any)._id.toString(),
        userId: (doc as any).userId.toString(),
        accountId: (doc as any).sourceAccountId.toString(),
        sourceAccountId: (doc as any).sourceAccountId.toString(),
        destinationAccountId: (doc as any).destinationAccountId?.toString(),
        entityId: (doc as any).destinationEntityId?.toString(),
        destinationEntityId: (doc as any).destinationEntityId?.toString(),
        amount: (doc as any).amount,
        amountPaise: (doc as any).amountPaise || toPaise((doc as any).amount),
        currency: (doc as any).currency || 'INR',
        direction: ((doc as any).direction || ((doc as any).type === 'CREDIT' ? 'INCOME' : 'EXPENSE')) as TransactionDirection,
        type: (doc as any).type as TransactionType,
        category: (doc as any).category,
        description: (doc as any).description,
        date: (doc as any).date,
        reference: (doc as any).reference,
        source: ((doc as any).source as TransactionSource) || 'MANUAL',
        status: ((doc as any).status as TransactionStatus) || 'CONFIRMED',
        metadata: (doc as any).metadata,
        recurrence: (doc as any).recurrence as RecurrenceType,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const tx = inMemoryTransactions.get(id);
      if (!tx || tx.userId !== userId) return null;
      const amount = data.amount !== undefined ? data.amount : tx.amount;
      const updated: ITransaction = {
        ...tx,
        ...data,
        amount,
        amountPaise: toPaise(amount),
        updatedAt: new Date(),
      };
      inMemoryTransactions.set(id, updated);
      return updated;
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      const res = await TransactionModel.deleteOne({ _id: id, userId });
      return (res.deletedCount || 0) > 0;
    } else {
      const tx = inMemoryTransactions.get(id);
      if (tx && tx.userId === userId) {
        inMemoryTransactions.delete(id);
        return true;
      }
      return false;
    }
  },

  async deleteAllForUser(userId: string): Promise<number> {
    if (getIsConnected()) {
      const res = await TransactionModel.deleteMany({ userId });
      return res.deletedCount || 0;
    } else {
      let count = 0;
      for (const [id, tx] of inMemoryTransactions.entries()) {
        if (tx.userId === userId) {
          inMemoryTransactions.delete(id);
          count++;
        }
      }
      return count;
    }
  },

  async clearInMemory(): Promise<void> {
    inMemoryTransactions.clear();
  },
};
