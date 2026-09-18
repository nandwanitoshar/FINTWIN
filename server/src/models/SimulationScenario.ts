import mongoose, { Schema, Document } from 'mongoose';
import { getIsConnected } from '../config/db.js';

export interface ISimulationScenario {
  _id: string;
  userId: string;
  scenarioName: string;
  incomeDelta: number;
  expenseDelta: number;
  lumpSumEvents: Array<{
    month: number;
    amount: number;
    description: string;
  }>;
  newEmiEvents: Array<{
    principal: number;
    annualRate: number;
    tenureMonths: number;
    startMonth: number;
    description: string;
  }>;
  horizonMonths: number;
  results: {
    baselineSeries: Array<{
      month: number;
      netWorth: number;
      liquidReserves: number;
      debt: number;
      runwayMonths: number;
    }>;
    simulatedSeries: Array<{
      month: number;
      netWorth: number;
      liquidReserves: number;
      debt: number;
      runwayMonths: number;
      emiBurden: number;
    }>;
    summaryDeltas?: {
      netWorthDelta: number;
      runwayMonthsDelta: number;
      monthlyCashflowDelta: number;
      dtiDelta: number;
    };
    deltas: {
      netWorthDelta: number;
      liquidDelta: number;
      runwayDeltaMonths: number;
      monthlyCashflowDelta: number;
      dtiDelta?: number;
    };
    timeSeries?: Array<{
      monthIndex: number;
      monthLabel: string;
      baselineNetWorth: number;
      simulatedNetWorth: number;
      baselineReserves: number;
      simulatedReserves: number;
      baselineDebt: number;
      simulatedDebt: number;
      baselineDti?: number;
      simulatedDti?: number;
    }>;
    signalsTriggered: Array<{
      code: string;
      title: string;
      severity: string;
      month: number;
      explanation?: string;
    }>;
  };
  createdAt: Date;
}

export interface ISimulationScenarioDocument extends Document, Omit<ISimulationScenario, '_id'> {}

const SimulationScenarioSchema = new Schema<ISimulationScenarioDocument>(
  {
    userId: { type: Schema.Types.ObjectId as any, ref: 'User', required: true, index: true },
    scenarioName: { type: String, required: true, trim: true },
    incomeDelta: { type: Number, default: 0 },
    expenseDelta: { type: Number, default: 0 },
    lumpSumEvents: [
      {
        month: { type: Number, required: true },
        amount: { type: Number, required: true },
        description: { type: String, required: true },
      },
    ],
    newEmiEvents: [
      {
        principal: { type: Number, required: true },
        annualRate: { type: Number, required: true },
        tenureMonths: { type: Number, required: true },
        startMonth: { type: Number, required: true },
        description: { type: String, required: true },
      },
    ],
    horizonMonths: { type: Number, required: true, default: 12 },
    results: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SimulationScenarioSchema.index({ userId: 1, createdAt: -1 });

export const SimulationScenarioModel =
  mongoose.models.SimulationScenario ||
  mongoose.model<ISimulationScenarioDocument>('SimulationScenario', SimulationScenarioSchema);

const inMemoryScenarios: Map<string, ISimulationScenario> = new Map();

export const SimulationScenarioRepository = {
  async create(data: Omit<ISimulationScenario, '_id' | 'createdAt'>): Promise<ISimulationScenario> {
    if (getIsConnected()) {
      const doc = await SimulationScenarioModel.create(data);
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        scenarioName: doc.scenarioName,
        incomeDelta: doc.incomeDelta,
        expenseDelta: doc.expenseDelta,
        lumpSumEvents: doc.lumpSumEvents,
        newEmiEvents: doc.newEmiEvents,
        horizonMonths: doc.horizonMonths,
        results: doc.results,
        createdAt: doc.createdAt,
      };
    } else {
      const id = 'scen_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const scenario: ISimulationScenario = {
        _id: id,
        ...data,
        createdAt: new Date(),
      };
      inMemoryScenarios.set(id, scenario);
      return scenario;
    }
  },

  async findByUserId(userId: string): Promise<ISimulationScenario[]> {
    if (getIsConnected()) {
      const docs = await SimulationScenarioModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({
        _id: d._id.toString(),
        userId: d.userId.toString(),
        scenarioName: d.scenarioName,
        incomeDelta: d.incomeDelta,
        expenseDelta: d.expenseDelta,
        lumpSumEvents: d.lumpSumEvents,
        newEmiEvents: d.newEmiEvents,
        horizonMonths: d.horizonMonths,
        results: d.results,
        createdAt: d.createdAt,
      }));
    } else {
      const list = Array.from(inMemoryScenarios.values()).filter((s) => s.userId === userId);
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list;
    }
  },

  async findById(id: string, userId: string): Promise<ISimulationScenario | null> {
    if (getIsConnected()) {
      const doc: any = await SimulationScenarioModel.findOne({ _id: id, userId }).lean();
      if (!doc) return null;
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        scenarioName: doc.scenarioName,
        incomeDelta: doc.incomeDelta,
        expenseDelta: doc.expenseDelta,
        lumpSumEvents: doc.lumpSumEvents,
        newEmiEvents: doc.newEmiEvents,
        horizonMonths: doc.horizonMonths,
        results: doc.results,
        createdAt: doc.createdAt,
      };
    } else {
      const scenario = inMemoryScenarios.get(id);
      if (!scenario || scenario.userId !== userId) return null;
      return scenario;
    }
  },

  async deleteById(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      const res = await SimulationScenarioModel.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    } else {
      const scenario = inMemoryScenarios.get(id);
      if (!scenario || scenario.userId !== userId) return false;
      return inMemoryScenarios.delete(id);
    }
  },

  async deleteAllForUser(userId: string): Promise<number> {
    if (getIsConnected()) {
      const res = await SimulationScenarioModel.deleteMany({ userId });
      return res.deletedCount || 0;
    } else {
      let count = 0;
      for (const [id, sc] of inMemoryScenarios.entries()) {
        if (sc.userId === userId) {
          inMemoryScenarios.delete(id);
          count++;
        }
      }
      return count;
    }
  },
};

