import mongoose, { Document, Schema } from 'mongoose';
import { getIsConnected } from '../config/db.js';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose model
export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

// In-memory fallback store for offline development and lightning-fast test isolation
const inMemoryUsers: Map<string, IUser> = new Map();

export const UserRepository = {
  async create(data: { name: string; email: string; passwordHash: string; currency?: string }): Promise<IUser> {
    const normalizedEmail = data.email.trim().toLowerCase();

    if (getIsConnected()) {
      const doc = await UserModel.create({
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: data.passwordHash,
        currency: data.currency || 'INR',
      });
      return {
        _id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        passwordHash: doc.passwordHash,
        currency: doc.currency,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      // In-memory operation
      for (const u of inMemoryUsers.values()) {
        if (u.email === normalizedEmail) {
          throw new Error('E11000 duplicate key error: email already exists');
        }
      }
      const id = 'user_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const user: IUser = {
        _id: id,
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: data.passwordHash,
        currency: data.currency || 'INR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryUsers.set(id, user);
      return user;
    }
  },

  async findByEmail(email: string): Promise<IUser | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (getIsConnected()) {
      const doc = await UserModel.findOne({ email: normalizedEmail }).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        name: (doc as any).name,
        email: (doc as any).email,
        passwordHash: (doc as any).passwordHash,
        currency: (doc as any).currency,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      for (const u of inMemoryUsers.values()) {
        if (u.email === normalizedEmail) return { ...u };
      }
      return null;
    }
  },

  async findById(id: string): Promise<IUser | null> {
    if (getIsConnected()) {
      const doc = await UserModel.findById(id).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        name: (doc as any).name,
        email: (doc as any).email,
        passwordHash: (doc as any).passwordHash,
        currency: (doc as any).currency,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const u = inMemoryUsers.get(id);
      return u ? { ...u } : null;
    }
  },

  async update(id: string, data: { name?: string; email?: string; currency?: string }): Promise<IUser | null> {
    if (getIsConnected()) {
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true }
      ).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        name: (doc as any).name,
        email: (doc as any).email,
        passwordHash: (doc as any).passwordHash,
        currency: (doc as any).currency,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const u = inMemoryUsers.get(id);
      if (!u) return null;
      const updated: IUser = {
        ...u,
        ...data,
        updatedAt: new Date(),
      };
      inMemoryUsers.set(id, updated);
      return updated;
    }
  },

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    if (getIsConnected()) {
      const res = await UserModel.updateOne({ _id: id }, { $set: { passwordHash, updatedAt: new Date() } });
      return res.modifiedCount > 0;
    } else {
      const u = inMemoryUsers.get(id);
      if (!u) return false;
      u.passwordHash = passwordHash;
      u.updatedAt = new Date();
      return true;
    }
  },

  async deleteCascade(userId: string): Promise<boolean> {
    const { AccountRepository } = await import('./Account.js');
    const { EntityRepository } = await import('./Entity.js');
    const { TransactionRepository } = await import('./Transaction.js');
    const { SimulationScenarioRepository } = await import('./SimulationScenario.js');
    const { GoalRepository } = await import('./Goal.js');
    const { LoanRepository } = await import('./Loan.js');

    await Promise.all([
      AccountRepository.deleteAllForUser(userId),
      EntityRepository.deleteAllForUser(userId),
      TransactionRepository.deleteAllForUser(userId),
      SimulationScenarioRepository.deleteAllForUser(userId),
      GoalRepository.deleteAllForUser(userId),
      LoanRepository.deleteAllForUser(userId),
    ]);

    if (getIsConnected()) {
      const res = await UserModel.deleteOne({ _id: userId });
      return res.deletedCount > 0;
    } else {
      return inMemoryUsers.delete(userId);
    }
  },

  async clearInMemory(): Promise<void> {
    inMemoryUsers.clear();
  },
};
