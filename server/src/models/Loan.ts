import mongoose, { Document, Schema } from 'mongoose';
import { getIsConnected } from '../config/db.js';
import { calculateLoanEMI } from '../utils/financialMath.js';

export type LoanStatus = 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';

export interface ILoan {
  _id: string;
  userId: string;
  name: string;
  lender: string;
  principal: number;
  outstandingAmount: number;
  interestRateApr: number;
  tenureMonths: number;
  emiAmount: number;
  startDate: Date;
  endDate: Date;
  status: LoanStatus;
  targetAccountId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoanCalculations {
  outstandingLiability: number;
  monthlyEmiBurden: number;
  estimatedTotalInterest: number;
  totalRepaymentExpected: number;
  monthsRemaining: number;
  principalPaid: number;
  progressPercent: number;
}

export interface ILoanWithCalculations extends ILoan {
  calculations: ILoanCalculations;
}

export interface ILoanDocument extends Omit<ILoan, '_id'>, Document {}

const LoanSchema = new Schema<ILoanDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Loan name is required'],
      trim: true,
      maxlength: 120,
    },
    lender: {
      type: String,
      required: [true, 'Lender institution is required'],
      trim: true,
      maxlength: 100,
    },
    principal: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [1, 'Principal must be greater than zero'],
    },
    outstandingAmount: {
      type: Number,
      required: [true, 'Outstanding amount is required'],
      min: [0, 'Outstanding amount cannot be negative'],
    },
    interestRateApr: {
      type: Number,
      required: [true, 'Interest rate APR is required'],
      min: [0, 'Interest rate APR cannot be negative'],
    },
    tenureMonths: {
      type: Number,
      required: [true, 'Tenure in months is required'],
      min: [1, 'Tenure must be at least 1 month'],
    },
    emiAmount: {
      type: Number,
      required: [true, 'EMI amount is required'],
      min: [0, 'EMI amount cannot be negative'],
    },
    startDate: {
      type: Date,
      required: [true, 'Loan start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Loan maturity date is required'],
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'PAID_OFF', 'DEFAULTED'],
      default: 'ACTIVE',
    },
    targetAccountId: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

LoanSchema.index({ userId: 1, status: 1 });

export const LoanModel =
  mongoose.models.Loan || mongoose.model<ILoanDocument>('Loan', LoanSchema);

const inMemoryLoans: Map<string, ILoan> = new Map();

export const computeLoanCalculations = (loan: ILoan): ILoanCalculations => {
  const principalPaid = Math.max(0, loan.principal - loan.outstandingAmount);
  const progressPercent = loan.principal > 0
    ? Math.min(100, Math.round((principalPaid / loan.principal) * 100))
    : 0;

  const totalRepayment = loan.emiAmount * loan.tenureMonths;
  const estimatedTotalInterest = Math.max(0, totalRepayment - loan.principal);

  const now = new Date();
  const end = new Date(loan.endDate);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const monthsRemaining = Math.max(0, Math.ceil(diffDays / 30.44));

  return {
    outstandingLiability: loan.outstandingAmount,
    monthlyEmiBurden: loan.status === 'ACTIVE' ? loan.emiAmount : 0,
    estimatedTotalInterest,
    totalRepaymentExpected: totalRepayment,
    monthsRemaining,
    principalPaid,
    progressPercent,
  };
};

export const LoanRepository = {
  async create(data: {
    userId: string;
    name: string;
    lender: string;
    principal: number;
    outstandingAmount?: number;
    interestRateApr: number;
    tenureMonths: number;
    emiAmount?: number;
    startDate?: Date | string;
    endDate?: Date | string;
    status?: LoanStatus;
    targetAccountId?: string;
    notes?: string;
  }): Promise<ILoanWithCalculations> {
    const principal = data.principal;
    const outstanding = data.outstandingAmount !== undefined ? data.outstandingAmount : principal;
    const apr = data.interestRateApr;
    const tenure = data.tenureMonths;

    // Deterministically compute EMI if not supplied
    const calculatedEmi = data.emiAmount !== undefined && data.emiAmount > 0
      ? data.emiAmount
      : calculateLoanEMI(principal, apr, tenure);

    const start = data.startDate ? new Date(data.startDate) : new Date();
    let end: Date;
    if (data.endDate) {
      end = new Date(data.endDate);
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + tenure);
    }

    const status: LoanStatus = data.status || 'ACTIVE';

    if (getIsConnected()) {
      const doc = await LoanModel.create({
        userId: data.userId,
        name: data.name.trim(),
        lender: data.lender.trim(),
        principal,
        outstandingAmount: outstanding,
        interestRateApr: apr,
        tenureMonths: tenure,
        emiAmount: calculatedEmi,
        startDate: start,
        endDate: end,
        status,
        targetAccountId: data.targetAccountId || '',
        notes: data.notes || '',
      });

      const loan: ILoan = {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        lender: doc.lender,
        principal: doc.principal,
        outstandingAmount: doc.outstandingAmount,
        interestRateApr: doc.interestRateApr,
        tenureMonths: doc.tenureMonths,
        emiAmount: doc.emiAmount,
        startDate: doc.startDate,
        endDate: doc.endDate,
        status: doc.status as LoanStatus,
        targetAccountId: doc.targetAccountId,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };

      return {
        ...loan,
        calculations: computeLoanCalculations(loan),
      };
    } else {
      const id = 'loan_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const loan: ILoan = {
        _id: id,
        userId: data.userId,
        name: data.name.trim(),
        lender: data.lender.trim(),
        principal,
        outstandingAmount: outstanding,
        interestRateApr: apr,
        tenureMonths: tenure,
        emiAmount: calculatedEmi,
        startDate: start,
        endDate: end,
        status,
        targetAccountId: data.targetAccountId || '',
        notes: data.notes || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryLoans.set(id, loan);
      return {
        ...loan,
        calculations: computeLoanCalculations(loan),
      };
    }
  },

  async findByUserId(userId: string): Promise<ILoanWithCalculations[]> {
    if (getIsConnected()) {
      const docs = await LoanModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => {
        const loan: ILoan = {
          _id: d._id.toString(),
          userId: d.userId.toString(),
          name: d.name,
          lender: d.lender,
          principal: d.principal,
          outstandingAmount: d.outstandingAmount,
          interestRateApr: d.interestRateApr,
          tenureMonths: d.tenureMonths,
          emiAmount: d.emiAmount,
          startDate: d.startDate,
          endDate: d.endDate,
          status: d.status as LoanStatus,
          targetAccountId: d.targetAccountId,
          notes: d.notes,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
        return {
          ...loan,
          calculations: computeLoanCalculations(loan),
        };
      });
    } else {
      const userLoans = Array.from(inMemoryLoans.values()).filter((l) => l.userId === userId);
      return userLoans.map((loan) => ({
        ...loan,
        calculations: computeLoanCalculations(loan),
      }));
    }
  },

  async findByIdAndUserId(id: string, userId: string): Promise<ILoanWithCalculations | null> {
    if (getIsConnected()) {
      const doc = (await LoanModel.findOne({ _id: id, userId }).lean()) as any;
      if (!doc) return null;
      const loan: ILoan = {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        lender: doc.lender,
        principal: doc.principal,
        outstandingAmount: doc.outstandingAmount,
        interestRateApr: doc.interestRateApr,
        tenureMonths: doc.tenureMonths,
        emiAmount: doc.emiAmount,
        startDate: doc.startDate,
        endDate: doc.endDate,
        status: doc.status as LoanStatus,
        targetAccountId: doc.targetAccountId,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
      return {
        ...loan,
        calculations: computeLoanCalculations(loan),
      };
    } else {
      const loan = inMemoryLoans.get(id);
      if (!loan || loan.userId !== userId) return null;
      return {
        ...loan,
        calculations: computeLoanCalculations(loan),
      };
    }
  },

  async update(id: string, userId: string, updateData: Partial<ILoan>): Promise<ILoanWithCalculations | null> {
    if (getIsConnected()) {
      const doc = (await LoanModel.findOneAndUpdate(
        { _id: id, userId },
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).lean()) as any;
      if (!doc) return null;
      const loan: ILoan = {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        lender: doc.lender,
        principal: doc.principal,
        outstandingAmount: doc.outstandingAmount,
        interestRateApr: doc.interestRateApr,
        tenureMonths: doc.tenureMonths,
        emiAmount: doc.emiAmount,
        startDate: doc.startDate,
        endDate: doc.endDate,
        status: doc.status as LoanStatus,
        targetAccountId: doc.targetAccountId,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
      return {
        ...loan,
        calculations: computeLoanCalculations(loan),
      };
    } else {
      const loan = inMemoryLoans.get(id);
      if (!loan || loan.userId !== userId) return null;
      const updated: ILoan = {
        ...loan,
        ...updateData,
        updatedAt: new Date(),
      };
      inMemoryLoans.set(id, updated);
      return {
        ...updated,
        calculations: computeLoanCalculations(updated),
      };
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      const res = await LoanModel.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    } else {
      const loan = inMemoryLoans.get(id);
      if (!loan || loan.userId !== userId) return false;
      return inMemoryLoans.delete(id);
    }
  },

  async deleteAllForUser(userId: string): Promise<number> {
    if (getIsConnected()) {
      const res = await LoanModel.deleteMany({ userId });
      return res.deletedCount || 0;
    } else {
      let count = 0;
      for (const [id, loan] of inMemoryLoans.entries()) {
        if (loan.userId === userId) {
          inMemoryLoans.delete(id);
          count++;
        }
      }
      return count;
    }
  },

  clearMemory(): void {
    inMemoryLoans.clear();
  },
};
