import mongoose, { Document, Schema } from 'mongoose';
import { getIsConnected } from '../config/db.js';

export type GoalCategory =
  | 'EMERGENCY_FUND'
  | 'PURCHASE'
  | 'EDUCATION'
  | 'TRAVEL'
  | 'INVESTMENT'
  | 'LAPTOP'
  | 'OTHER'
  | 'CUSTOM';

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface IGoal {
  _id: string;
  userId: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  monthlyContribution?: number;
  status: GoalStatus;
  notes?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoalCalculations {
  targetAmount: number;
  currentAmount: number;
  amountRemaining: number;
  progressPercent: number;
  monthlyContribution: number;
  targetDate: string;
  requiredMonthlyContribution: number;
  monthsRemaining: number;
  estimatedCompletionDate: string | null;
  completionLimitation?: string | null;
  isOverdue: boolean;
}

export interface IGoalWithCalculations extends IGoal {
  calculations: IGoalCalculations;
}

export interface IGoalDocument extends Omit<IGoal, '_id'>, Document {}

const GoalSchema = new Schema<IGoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      enum: ['EMERGENCY_FUND', 'PURCHASE', 'EDUCATION', 'TRAVEL', 'INVESTMENT', 'LAPTOP', 'OTHER', 'CUSTOM'],
      default: 'CUSTOM',
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be greater than zero'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    targetDate: {
      type: Date,
      required: [true, 'Target deadline date is required'],
    },
    monthlyContribution: {
      type: Number,
      default: 0,
      min: [0, 'Monthly contribution cannot be negative'],
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED'],
      default: 'ACTIVE',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
  },
  {
    timestamps: true,
  }
);

GoalSchema.index({ userId: 1, status: 1 });

export const GoalModel =
  mongoose.models.Goal || mongoose.model<IGoalDocument>('Goal', GoalSchema);

// In-Memory store for fast test isolation and offline resilience
const inMemoryGoals: Map<string, IGoal> = new Map();

export const calculateGoalMetrics = (
  targetAmount: number,
  currentAmount: number,
  targetDate: Date | string,
  monthlyContribution: number = 0
): IGoalCalculations => {
  const remaining = Math.max(0, targetAmount - currentAmount);
  // Clamp progress between 0 and 100, protect against division by zero
  const progress = targetAmount > 0 ? Math.min(100, Math.max(0, Math.round((currentAmount / targetAmount) * 100))) : 0;

  const now = new Date();
  const deadline = new Date(targetDate);
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.44));
  const isOverdue = diffMs < 0 && remaining > 0;

  const requiredMonthly = remaining > 0 ? Math.round(remaining / monthsRemaining) : 0;

  let estimatedCompletionDate: string | null = null;
  let completionLimitation: string | null = null;

  if (remaining === 0) {
    estimatedCompletionDate = 'COMPLETED';
  } else if (monthlyContribution > 0) {
    const monthsNeeded = Math.ceil(remaining / monthlyContribution);
    const estDate = new Date();
    estDate.setMonth(estDate.getMonth() + monthsNeeded);
    estimatedCompletionDate = estDate.toISOString().split('T')[0];
  } else if (requiredMonthly > 0) {
    estimatedCompletionDate = deadline.toISOString().split('T')[0];
    completionLimitation = 'Based on target deadline pace. Specify an explicit monthly contribution for personalized cash-flow projection.';
  } else {
    completionLimitation = 'Insufficient contribution data to calculate completion date.';
  }

  return {
    targetAmount,
    currentAmount,
    amountRemaining: remaining,
    progressPercent: progress,
    monthlyContribution: monthlyContribution || 0,
    targetDate: typeof targetDate === 'string' ? targetDate : targetDate.toISOString(),
    requiredMonthlyContribution: requiredMonthly,
    monthsRemaining,
    estimatedCompletionDate,
    completionLimitation,
    isOverdue,
  };
};

export const GoalRepository = {
  async create(data: {
    userId: string;
    name: string;
    category?: GoalCategory;
    targetAmount: number;
    currentAmount?: number;
    targetDate: Date | string;
    monthlyContribution?: number;
    status?: GoalStatus;
    notes?: string;
    color?: string;
  }): Promise<IGoalWithCalculations> {
    const targetDate = new Date(data.targetDate);
    const category: GoalCategory = data.category || 'CUSTOM';
    const status: GoalStatus = data.status || 'ACTIVE';
    const currentAmount = data.currentAmount || 0;
    const monthlyContribution = data.monthlyContribution || 0;

    if (getIsConnected()) {
      const doc = await GoalModel.create({
        userId: data.userId,
        name: data.name.trim(),
        category,
        targetAmount: data.targetAmount,
        currentAmount,
        targetDate,
        monthlyContribution,
        status,
        notes: data.notes || '',
        color: data.color || '#6366f1',
      });

      const goal: IGoal = {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        category: doc.category as GoalCategory,
        targetAmount: doc.targetAmount,
        currentAmount: doc.currentAmount,
        targetDate: doc.targetDate,
        monthlyContribution: doc.monthlyContribution,
        status: doc.status as GoalStatus,
        notes: doc.notes,
        color: doc.color,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };

      return {
        ...goal,
        calculations: calculateGoalMetrics(goal.targetAmount, goal.currentAmount, goal.targetDate, goal.monthlyContribution),
      };
    } else {
      const id = 'goal_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const goal: IGoal = {
        _id: id,
        userId: data.userId,
        name: data.name.trim(),
        category,
        targetAmount: data.targetAmount,
        currentAmount,
        targetDate,
        monthlyContribution,
        status,
        notes: data.notes || '',
        color: data.color || '#6366f1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryGoals.set(id, goal);
      return {
        ...goal,
        calculations: calculateGoalMetrics(goal.targetAmount, goal.currentAmount, goal.targetDate, goal.monthlyContribution),
      };
    }
  },

  async findByUserId(userId: string): Promise<IGoalWithCalculations[]> {
    if (getIsConnected()) {
      const docs = await GoalModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => {
        const goal: IGoal = {
          _id: d._id.toString(),
          userId: d.userId.toString(),
          name: d.name,
          category: d.category as GoalCategory,
          targetAmount: d.targetAmount,
          currentAmount: d.currentAmount,
          targetDate: d.targetDate,
          monthlyContribution: d.monthlyContribution || 0,
          status: d.status as GoalStatus,
          notes: d.notes,
          color: d.color,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
        return {
          ...goal,
          calculations: calculateGoalMetrics(goal.targetAmount, goal.currentAmount, goal.targetDate, goal.monthlyContribution),
        };
      });
    } else {
      const userGoals = Array.from(inMemoryGoals.values()).filter((g) => g.userId === userId);
      return userGoals.map((goal) => ({
        ...goal,
        calculations: calculateGoalMetrics(goal.targetAmount, goal.currentAmount, goal.targetDate, goal.monthlyContribution),
      }));
    }
  },

  async findByIdAndUserId(id: string, userId: string): Promise<IGoalWithCalculations | null> {
    if (getIsConnected()) {
      const doc = (await GoalModel.findOne({ _id: id, userId }).lean()) as any;
      if (!doc) return null;
      const goal: IGoal = {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        category: doc.category as GoalCategory,
        targetAmount: doc.targetAmount,
        currentAmount: doc.currentAmount,
        targetDate: doc.targetDate,
        monthlyContribution: doc.monthlyContribution || 0,
        status: doc.status as GoalStatus,
        notes: doc.notes,
        color: doc.color,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
      return {
        ...goal,
        calculations: calculateGoalMetrics(goal.targetAmount, goal.currentAmount, goal.targetDate, goal.monthlyContribution),
      };
    } else {
      const goal = inMemoryGoals.get(id);
      if (!goal || goal.userId !== userId) return null;
      return {
        ...goal,
        calculations: calculateGoalMetrics(goal.targetAmount, goal.currentAmount, goal.targetDate, goal.monthlyContribution),
      };
    }
  },

  async update(id: string, userId: string, updateData: Partial<IGoal>): Promise<IGoalWithCalculations | null> {
    if (getIsConnected()) {
      const doc = (await GoalModel.findOneAndUpdate(
        { _id: id, userId },
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).lean()) as any;
      if (!doc) return null;
      const goal: IGoal = {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        category: doc.category as GoalCategory,
        targetAmount: doc.targetAmount,
        currentAmount: doc.currentAmount,
        targetDate: doc.targetDate,
        monthlyContribution: doc.monthlyContribution || 0,
        status: doc.status as GoalStatus,
        notes: doc.notes,
        color: doc.color,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
      return {
        ...goal,
        calculations: calculateGoalMetrics(goal.targetAmount, goal.currentAmount, goal.targetDate, goal.monthlyContribution),
      };
    } else {
      const goal = inMemoryGoals.get(id);
      if (!goal || goal.userId !== userId) return null;
      const updated: IGoal = {
        ...goal,
        ...updateData,
        updatedAt: new Date(),
      };
      inMemoryGoals.set(id, updated);
      return {
        ...updated,
        calculations: calculateGoalMetrics(updated.targetAmount, updated.currentAmount, updated.targetDate, updated.monthlyContribution),
      };
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      const res = await GoalModel.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    } else {
      const goal = inMemoryGoals.get(id);
      if (!goal || goal.userId !== userId) return false;
      return inMemoryGoals.delete(id);
    }
  },

  async deleteAllForUser(userId: string): Promise<number> {
    if (getIsConnected()) {
      const res = await GoalModel.deleteMany({ userId });
      return res.deletedCount || 0;
    } else {
      let count = 0;
      for (const [id, goal] of inMemoryGoals.entries()) {
        if (goal.userId === userId) {
          inMemoryGoals.delete(id);
          count++;
        }
      }
      return count;
    }
  },

  clearMemory(): void {
    inMemoryGoals.clear();
  },
};
