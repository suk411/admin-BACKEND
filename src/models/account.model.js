import mongoose from "mongoose";

const turnoverBatchSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["DEPOSIT", "BONUS", "SIGNUP_BONUS", "FIRST_DEPOSIT_BONUS", "VIP_BONUS", "WEEKLY_BONUS", "UPGRADE_BONUS", "ADMIN_BONUS", "GIFT_CODE", "DEPOSIT_BONUS", "AGENT_COMMISSION"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  multiplier: {
    type: Number,
    default: 1,
    min: 0,
  },
  required: {
    type: Number,
    required: true,
  },
  completed: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastCalcAt: {
    type: Date,
    default: null,
  },
  lastBetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  sourceRef: {
    type: String,
    default: null,
  },
});

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: Number,
      required: [true, "User reference is required"],
      unique: true,
      sparse: true,
      index: true,
    },

    vipLevel: {
      type: String,
      default: "VIP 1",
      index: true,
    },
    vipSince: {
      type: Date,
      default: null,
    },
    totalDeposits: {
      type: Number,
      default: 0,
      min: [0, "Total deposits cannot be negative"],
      index: true,
    },
    lastWeeklyBonusAt: {
      type: Date,
      default: null,
    },
    pendingUpgradeBonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    statusRemark: {
      type: String,
      default: "",
    },

    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },

    withdrawable: {
      type: Number,
      default: 0,
      min: [0, "Withdrawable cannot be negative"],
    },

    turnover_requirement: {
      type: Number,
      default: 0,
      min: [0, "Turnover requirement cannot be negative"],
    },
    total_turnover_completed: {
      type: Number,
      default: 0,
      min: 0,
    },
    turnover_batches: [turnoverBatchSchema],

    lastTurnoverCalcAt: {
      type: Date,
      default: null,
    },
    lastBetCalcAt: {
      type: Date,
      default: null,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
    },

    gameMemberCreated: {
      type: Boolean,
      default: false,
      index: true,
    },

    firstDepositBonusGiven: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

accountSchema.index({ user: 1, status: 1 });
accountSchema.index({ "turnover_batches.createdAt": 1 });

export default mongoose.model("Account", accountSchema);
