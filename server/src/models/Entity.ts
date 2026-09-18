import mongoose, { Document, Schema } from 'mongoose';
import { getIsConnected } from '../config/db.js';

export type EntityType =
  | 'EMPLOYER'
  | 'LENDER'
  | 'UTILITY'
  | 'MERCHANT'
  | 'INVESTMENT_BROKER'
  | 'BANK'
  | 'SERVICE_PROVIDER'
  | 'INDIVIDUAL'
  | 'ORGANIZATION'
  | 'OTHER';
export type EntityRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface IEntity {
  _id: string;
  userId: string;
  name: string;
  type: EntityType;
  category: string;
  cadenceScore: number;
  riskRating: EntityRisk;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEntityDocument extends Omit<IEntity, '_id'>, Document {}

const EntitySchema = new Schema<IEntityDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Entity name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'EMPLOYER',
        'LENDER',
        'UTILITY',
        'MERCHANT',
        'INVESTMENT_BROKER',
        'BANK',
        'SERVICE_PROVIDER',
        'INDIVIDUAL',
        'ORGANIZATION',
        'OTHER',
      ],
      default: 'MERCHANT',
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    cadenceScore: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    riskRating: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
  },
  {
    timestamps: true,
  }
);

EntitySchema.index({ userId: 1, type: 1 });

export const EntityModel =
  mongoose.models.Entity || mongoose.model<IEntityDocument>('Entity', EntitySchema);

const inMemoryEntities: Map<string, IEntity> = new Map();

export const EntityRepository = {
  async create(data: {
    userId: string;
    name: string;
    type: EntityType;
    category?: string;
    cadenceScore?: number;
    riskRating?: EntityRisk;
  }): Promise<IEntity> {
    if (getIsConnected()) {
      const doc = await EntityModel.create({
        ...data,
        category: data.category || 'General',
        cadenceScore: data.cadenceScore !== undefined ? data.cadenceScore : 0.5,
        riskRating: data.riskRating || 'LOW',
      });
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        name: doc.name,
        type: doc.type as EntityType,
        category: doc.category,
        cadenceScore: doc.cadenceScore,
        riskRating: doc.riskRating as EntityRisk,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } else {
      const id = 'ent_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const entity: IEntity = {
        _id: id,
        userId: data.userId,
        name: data.name.trim(),
        type: data.type,
        category: data.category || 'General',
        cadenceScore: data.cadenceScore !== undefined ? data.cadenceScore : 0.5,
        riskRating: data.riskRating || 'LOW',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryEntities.set(id, entity);
      return entity;
    }
  },

  async findByUserId(userId: string): Promise<IEntity[]> {
    if (getIsConnected()) {
      const docs = await EntityModel.find({ userId }).lean();
      return docs.map((d: any) => ({
        _id: d._id.toString(),
        userId: d.userId.toString(),
        name: d.name,
        type: d.type as EntityType,
        category: d.category,
        cadenceScore: d.cadenceScore,
        riskRating: d.riskRating as EntityRisk,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    } else {
      return Array.from(inMemoryEntities.values()).filter((e) => e.userId === userId);
    }
  },

  async findByIdAndUserId(id: string, userId: string): Promise<IEntity | null> {
    if (getIsConnected()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await EntityModel.findOne({ _id: id, userId }).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        userId: (doc as any).userId.toString(),
        name: (doc as any).name,
        type: (doc as any).type as EntityType,
        category: (doc as any).category,
        cadenceScore: (doc as any).cadenceScore,
        riskRating: (doc as any).riskRating as EntityRisk,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const e = inMemoryEntities.get(id);
      if (e && e.userId === userId) return { ...e };
      return null;
    }
  },

  async update(id: string, userId: string, data: Partial<IEntity>): Promise<IEntity | null> {
    if (getIsConnected()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await EntityModel.findOneAndUpdate(
        { _id: id, userId },
        { $set: data },
        { new: true }
      ).lean();
      if (!doc) return null;
      return {
        _id: (doc as any)._id.toString(),
        userId: (doc as any).userId.toString(),
        name: (doc as any).name,
        type: (doc as any).type as EntityType,
        category: (doc as any).category,
        cadenceScore: (doc as any).cadenceScore,
        riskRating: (doc as any).riskRating as EntityRisk,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    } else {
      const e = inMemoryEntities.get(id);
      if (!e || e.userId !== userId) return null;
      const updated = { ...e, ...data, updatedAt: new Date() };
      inMemoryEntities.set(id, updated);
      return updated;
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (getIsConnected()) {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await EntityModel.deleteOne({ _id: id, userId });
      return (res.deletedCount || 0) > 0;
    } else {
      const e = inMemoryEntities.get(id);
      if (e && e.userId === userId) {
        inMemoryEntities.delete(id);
        return true;
      }
      return false;
    }
  },

  async deleteAllForUser(userId: string): Promise<number> {
    if (getIsConnected()) {
      const res = await EntityModel.deleteMany({ userId });
      return res.deletedCount || 0;
    } else {
      let count = 0;
      for (const [id, entity] of inMemoryEntities.entries()) {
        if (entity.userId === userId) {
          inMemoryEntities.delete(id);
          count++;
        }
      }
      return count;
    }
  },

  async clearInMemory(): Promise<void> {
    inMemoryEntities.clear();
  },
};
