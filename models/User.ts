// models/User.ts
import mongoose, { Document, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the User interface
interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string | null;
  googleId?: string;
  emailVerified?: Date | null;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'enterprise';
  contractsCreated: number;
  planLimits: {
    contractsPerMonth: number;
    lastResetDate: Date;
  };
  lastLoginAt?: Date | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
  canCreateContract(): boolean;
}

const UserSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: function(this: IUser) {
      return !this.googleId;
    },
    select: false
  },
  image: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    sparse: true,
    index: true
  },
  emailVerified: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  contractsCreated: {
    type: Number,
    default: 0
  },
  planLimits: {
    contractsPerMonth: {
      type: Number,
      default: 5
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user can create more contracts
UserSchema.methods.canCreateContract = function(): boolean {
  const now = new Date();
  const lastReset = new Date(this.planLimits.lastResetDate);
  
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.contractsCreated = 0;
    this.planLimits.lastResetDate = now;
  }
  
  const limits: Record<string, number> = {
    free: 5,
    pro: 50,
    enterprise: Infinity
  };
  
  return this.contractsCreated < limits[this.plan];
};

// Remove password from JSON responses
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);