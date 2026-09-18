import mongoose, { Document, Schema } from 'mongoose';
import { getIsConnected } from '../config/db.js';

export type AccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'INVESTMENT'
  | 'WALLET'
  | 'CASH'
  | 'OTHER';

export interface IAccount {
  _id: string;
  userId: string;
  name: string;
  type: AccountType;
  institution: string;
  currency: string;
  balance: number;
  currentBalance: number;
  initialBalance: number;
  creditLimit?: number;
  interestRateApr?: number;
  accountNumberMask?: string;
  isLiquid: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountDocument extends Omit<IAccount, '_id'>, Document {}

const AccountSchema = new Schema<IAccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'WALLET', 'CASH', 'OTHER'],
      default: 'CHECKING',
    },
    institution: {
      type: String,
      required: true,
      trim: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      trim: true,
      uppercase: true,
    },
    currentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
    interestRateApr: {
      type: Number,
      default: 0,
    },
    accountNumberMask: {
      type: String,
      default: '••••',
    },
    isLiquid: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

AccountSchema.virtual('balance').get(function (this: IAccountDocument) {
  return this.currentBalance;
});

AccountSchema.index({ userId: 1, type: 1 });

export const AccountModel =
  mongoose.models.Account || mongoose.model<IAccountDocument>('Account', AccountSchema);

const inMemoryAccounts: Map<string, IAccount> = new Map();

export const AccountRepository = {
  async create(data: {
    userId: string;
    name: string;
    type: AccountType;
    institution: string;
    currency?: string;
    currentBalance?: number;
    balance?: number;
    initialBalance?: number;
    creditLimit?: number;
    interestRateApr?: number;
    accountNumberMask?: string;
    isLiquid?: boolean;
  }): Promise<IAccount> {
    const isLiquid =
      data.isLiquid !== undefined
        ? data.isLiquid
        : ['CHECKING', 'SAVINGS', 'WALLET', 'CASH'].includes(data.type);

    const balanceValue = data.balance !== undefined ? data.balance : (data.currentBalance || 0);
    const initialBalance = data.initialBalance !== undefined ? data.initialBalance : balanceValue;
    const currency = (data.currency || 'INR').toUpperCase().trim();

    if (getIsConnected()) {
      const doc = await AccountModel.create({
        ...data,
        currency,
        currentBalance: balanceValue,
        initialBalance,
        isLiquid,
        status: 'ACTIVE',
      });
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        type: doc.type as AccountType,
        institution: doc.institution,
        currency: doc.currency || 'INR',
        balance: doc.currentBalance,
        currentBalance: doc.currentBalance,
        initialBalance: doc.initialBalance !== undefined ? doc.initialBalance : doc.currentBalance,
        creditLimit: doc.creditLimit,
        interestRateApr: doc.interestRateApr,
        accountNumberMask: doc.accountNumberMask,
        isLiquid: doc.isLiquid,
        status: doc.status as 'ACTIVE' | 'ARCHIVED',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const id = 'acc_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const acc: IAccount = {
        _id: id,
        userId: data.userId,
        name: data.name.trim(),
        type: data.type,
        institution: data.institution.trim(),
        currency,
        balance: balanceValue,
        currentBalance: balanceValue,
        initialBalance,
        creditLimit: data.creditLimit || 0,
        interestRateApr: data.interestRateApr || 0,
        accountNumberMask: data.accountNumberMask || '••••',
        isLiquid,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryAccounts.set(id, acc);
      return acc;
    }
  },

  async findByUserId(userId: string): Promise<IAccount[]> {
    if (getIsConnected()) {
      const docs = await AccountModel.find({ userId, status: 'ACTIVE' }).lean();
      return docs.map((d: any) => ({
        _id: d._id.toString(),
        userId: d.userId.toString(),
        name: d.name,
        type: d.type as AccountType,
        institution: d.institution,
        currency: d.currency || 'INR',
        balance: d.currentBalance,
        currentBalance: d.currentBalance,
        initialBalance: d.initialBalance !== undefined ? d.initialBalance : d.currentBalance,
        creditLimit: d.creditLimit,
        interestRateApr: d.interestRateApr,
        accountNumberMask: d.accountNumberMask,
        isLiquid: d.isLiquid,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    } else {
      return Array.from(inMemoryAccounts.values()).filter(
        (a) => a.userId === userId && a.status === 'ACTIVE'
      );
    }
  },

  async findByIdAndUserId(id: string, userId: string): Promise<IAccount | null> {
    if (getIsConnected()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await AccountModel.findOne({ _id: id, userId }).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        userId: (doc as any).userId.toString(),
        name: (doc as any).name,
        type: (doc as any).type as AccountType,
        institution: (doc as any).institution,
        currency: (doc as any).currency || 'INR',
        balance: (doc as any).currentBalance,
        currentBalance: (doc as any).currentBalance,
        initialBalance: (doc as any).initialBalance !== undefined ? (doc as any).initialBalance : (doc as any).currentBalance,
        creditLimit: (doc as any).creditLimit,
        interestRateApr: (doc as any).interestRateApr,
        accountNumberMask: (doc as any).accountNumberMask,
        isLiquid: (doc as any).isLiquid,
        status: (doc as any).status,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const acc = inMemoryAccounts.get(id);
      if (acc && acc.userId === userId) return { ...acc };
      return null;
    }
  },

  async update(id: string, userId: string, data: Partial<IAccount>): Promise<IAccount | null> {
    if (getIsConnected()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const updateData: any = { ...data };
      if (data.balance !== undefined && data.currentBalance === undefined) {
        updateData.currentBalance = data.balance;
      }
      const doc = await AccountModel.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true }
      ).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        userId: (doc as any).userId.toString(),
        name: (doc as any).name,
        type: (doc as any).type as AccountType,
        institution: (doc as any).institution,
        currency: (doc as any).currency || 'INR',
        balance: (doc as any).currentBalance,
        currentBalance: (doc as any).currentBalance,
        initialBalance: (doc as any).initialBalance !== undefined ? (doc as any).initialBalance : (doc as any).currentBalance,
        creditLimit: (doc as any).creditLimit,
        interestRateApr: (doc as any).interestRateApr,
        accountNumberMask: (doc as any).accountNumberMask,
        isLiquid: (doc as any).isLiquid,
        status: (doc as any).status,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const acc = inMemoryAccounts.get(id);
      if (!acc || acc.userId !== userId) return null;
      const balance = data.balance !== undefined ? data.balance : (data.currentBalance !== undefined ? data.currentBalance : acc.currentBalance);
      const updated: IAccount = {
        ...acc,
        ...data,
        balance,
        currentBalance: balance,
        updatedAt: new Date(),
      };
      inMemoryAccounts.set(id, updated);
      return updated;
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await AccountModel.deleteOne({ _id: id, userId });
      return (res.deletedCount || 0) > 0;
    } else {
      const acc = inMemoryAccounts.get(id);
      if (acc && acc.userId === userId) {
        inMemoryAccounts.delete(id);
        return true;
      }
      return false;
    }
  },

  async deleteAllForUser(userId: string): Promise<number> {
    if (getIsConnected()) {
      const res = await AccountModel.deleteMany({ userId });
      return res.deletedCount || 0;
    } else {
      let count = 0;
      for (const [id, acc] of inMemoryAccounts.entries()) {
        if (acc.userId === userId) {
          inMemoryAccounts.delete(id);
          count++;
        }
      }
      return count;
    }
  },

  async clearInMemory(): Promise<void> {
    inMemoryAccounts.clear();
  },
};
