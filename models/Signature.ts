// models/Signature.ts
import mongoose, { Document, Model, Types } from 'mongoose';

interface ISignature extends Document {
  contractId: Types.ObjectId;
  partyEmail: string;
  signatureData: string;
  ipAddress?: string | null;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SignatureSchema = new mongoose.Schema<ISignature>({
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true,
    index: true
  },
  partyEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  signatureData: {
    type: String, // Base64 encoded signature image
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Prevent duplicate signatures
SignatureSchema.index({ contractId: 1, partyEmail: 1 }, { unique: true });

export default (mongoose.models.Signature as Model<ISignature>) || mongoose.model<ISignature>('Signature', SignatureSchema);