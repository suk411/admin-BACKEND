import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/*
==============================
COUNTER MODEL
Used for auto-increment userId
==============================
*/
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

/*
==============================
HELPER: Generate userId with transaction support
==============================
*/
async function generateUserId(session = null) {
  const counter = await Counter.findByIdAndUpdate(
    "userId",
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, session },
  );

  if (!counter || counter.seq === undefined) {
    throw new Error("Failed to generate userId");
  }
  return counter.seq + 32545512;
}

/*
==============================
USER SCHEMA
==============================
*/
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      unique: true,
    },
    path: {
      type: [Number],
      default: [],
    },
    inviteCode: {
      type: String,
      unique: true,
      index: true,
    },
    referredBy: {
      type: Number,
      default: null,
      index: true,
    },

    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      match: [/^\d{10}$/, "Please fill a valid 10-digit mobile number"],
      unique: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },

    admin: {
      type: Boolean,
      default: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

/*
==============================
HASH PASSWORD (userId is generated in controller)
==============================
*/
userSchema.pre("save", async function () {
  if (!this.inviteCode && this.userId) {
    this.inviteCode = String(this.userId);
  }
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

/*
==============================
PASSWORD COMPARE METHOD
==============================
*/
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
export { generateUserId };
