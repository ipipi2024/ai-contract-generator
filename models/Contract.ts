// models/Contract.ts
import mongoose, { Document, Model, Types } from 'mongoose';

interface IParty {
  name: string;
  email: string;
  role: string;
  signed: boolean;
  signedAt?: Date | null;
  signatureId?: Types.ObjectId;
  signatureData?: string; // Base64 encoded signature image
}

interface IExtractionChange {
  added: string[];
  modified: string[];
  removed: string[];
}

interface IExtractionHistory {
  timestamp: Date;
  confidence: number;
  changes: IExtractionChange;
  triggeredBy: {
    type: 'manual_edit' | 'ai_refinement' | 'initial_generation';
    userId: string;
  };
}

interface IFieldSource {
  source: 'user' | 'ai' | 'original';
  lastUpdated: Date;
  confidence: number;
}

interface IRequirements {
  originalPrompt: string;
  contractType: string;
  extractedData: any; // Contains all extracted structured data
  generatedBy: string;
  timestamp: Date;
  // New fields for tracking extractions
  lastExtraction?: Date;
  extractionConfidence?: number;
  extractionHistory?: IExtractionHistory[];
  // Additional extracted fields
  keyDates?: Array<{ date: string; description: string }>;
  financialTerms?: Array<{ amount: string; description: string }>;
  obligations?: string[];
  specialConditions?: string[];
}

interface IContract extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  type: 'service' | 'nda' | 'employment' | 'lease' | 'custom';
  requirements: IRequirements;
  content: string;
  parties: IParty[];
  status: 'draft' | 'pending' | 'signed' | 'completed';
  
  // New fields for tracking synchronization
  fieldSources?: Map<string, IFieldSource>;
  lastReextraction?: Date;
  reextractionCount?: number;
  syncStatus?: 'synced' | 'pending_sync' | 'sync_failed';
  lastSyncError?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const ExtractionChangeSchema = new mongoose.Schema({
  added: [String],
  modified: [String],
  removed: [String]
}, { _id: false });

const ExtractionHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  changes: {
    type: ExtractionChangeSchema,
    required: true
  },
  triggeredBy: {
    type: {
      type: String,
      enum: ['manual_edit', 'ai_refinement', 'initial_generation'],
      required: true
    },
    userId: {
      type: String,
      required: true
    }
  }
}, { _id: false });

const FieldSourceSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['user', 'ai', 'original'],
    required: true
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  }
}, { _id: false });

const ContractSchema = new mongoose.Schema<IContract>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['service', 'nda', 'employment', 'lease', 'custom']
  },
  requirements: {
    originalPrompt: {
      type: String,
      required: true
    },
    contractType: {
      type: String,
      required: true
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    generatedBy: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    // New extraction tracking fields
    lastExtraction: {
      type: Date,
      default: null
    },
    extractionConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    extractionHistory: {
      type: [ExtractionHistorySchema],
      default: []
    },
    // Additional structured data fields
    keyDates: [{
      date: String,
      description: String
    }],
    financialTerms: [{
      amount: String,
      description: String
    }],
    obligations: [String],
    specialConditions: [String]
  },
  content: {
    type: String,
    required: true
  },
  parties: [{
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    email: { 
      type: String, 
      required: false,
      trim: true,
      lowercase: true,
      default: ''
    },
    role: { 
      type: String, 
      required: true 
    },
    signed: { 
      type: Boolean, 
      default: false 
    },
    signedAt: {
      type: Date,
      default: null
    },
    signatureId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Signature' 
    },
    signatureData: {
      type: String, // Base64 encoded signature image
      default: null
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'signed', 'completed'],
    default: 'draft'
  },
  
  // New synchronization tracking fields
  fieldSources: {
    type: Map,
    of: FieldSourceSchema,
    default: new Map()
  },
  lastReextraction: {
    type: Date,
    default: null
  },
  reextractionCount: {
    type: Number,
    default: 0
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending_sync', 'sync_failed'],
    default: 'synced'
  },
  lastSyncError: {
    type: String,
    default: null
  }
}, { 
  timestamps: true, 
  versionKey: false 
});

// Indexes for common queries
ContractSchema.index({ userId: 1, status: 1 });
ContractSchema.index({ userId: 1, type: 1 });
ContractSchema.index({ 'parties.email': 1 });
ContractSchema.index({ syncStatus: 1 });
ContractSchema.index({ lastReextraction: 1 });

// Pre-save hook to validate email when signing
ContractSchema.pre('save', function(next) {
  // Check if any party is trying to sign without an email
  const signingWithoutEmail = this.parties.some(party => 
    party.signed && (!party.email || party.email.trim() === '')
  );
  
  if (signingWithoutEmail) {
    next(new Error('Cannot sign contract without providing an email address'));
  } else {
    next();
  }
});

// Method to check if contract needs re-extraction
ContractSchema.methods.needsReextraction = function(): boolean {
  // If never re-extracted, check if content has been edited
  if (!this.lastReextraction) {
    return this.updatedAt > this.createdAt;
  }
  
  // If sync failed, needs re-extraction
  if (this.syncStatus === 'sync_failed') {
    return true;
  }
  
  // If content updated after last re-extraction
  return this.updatedAt > this.lastReextraction;
};

// Method to add extraction history entry
ContractSchema.methods.addExtractionHistory = function(
  confidence: number,
  changes: IExtractionChange,
  triggeredBy: { type: string; userId: string }
) {
  if (!this.requirements.extractionHistory) {
    this.requirements.extractionHistory = [];
  }
  
  this.requirements.extractionHistory.push({
    timestamp: new Date(),
    confidence,
    changes,
    triggeredBy
  });
  
  // Keep only last 10 extraction history entries
  if (this.requirements.extractionHistory.length > 10) {
    this.requirements.extractionHistory = this.requirements.extractionHistory.slice(-10);
  }
};

// Method to update field source tracking
ContractSchema.methods.updateFieldSource = function(
  fieldPath: string,
  source: 'user' | 'ai' | 'original',
  confidence: number = 1
) {
  if (!this.fieldSources) {
    this.fieldSources = new Map();
  }
  
  this.fieldSources.set(fieldPath, {
    source,
    lastUpdated: new Date(),
    confidence
  });
};

// Virtual to get extraction health
ContractSchema.virtual('extractionHealth').get(function() {
  if (!this.requirements.extractionConfidence) {
    return 'unknown';
  }
  
  if (this.requirements.extractionConfidence >= 0.9) {
    return 'excellent';
  } else if (this.requirements.extractionConfidence >= 0.7) {
    return 'good';
  } else if (this.requirements.extractionConfidence >= 0.5) {
    return 'fair';
  } else {
    return 'poor';
  }
});

// Static method to find contracts needing re-extraction
ContractSchema.statics.findNeedingReextraction = function(userId?: Types.ObjectId) {
  const query: any = {
    status: { $ne: 'completed' },
    $or: [
      { syncStatus: 'sync_failed' },
      { syncStatus: 'pending_sync' },
      { lastReextraction: null, updatedAt: { $ne: '$createdAt' } }
    ]
  };
  
  if (userId) {
    query.userId = userId;
  }
  
  return this.find(query);
};

export default (mongoose.models.Contract as Model<IContract>) || mongoose.model<IContract>('Contract', ContractSchema);