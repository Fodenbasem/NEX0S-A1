import { mongoose } from "../lib/mongodb";

export interface IWhitelistedUser {
  email: string;
  addedBy?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new mongoose.Schema<IWhitelistedUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    addedBy: { type: String },
    note: { type: String },
  },
  { timestamps: true },
);

schema.index({ email: 1 }, { unique: true });

export const WhitelistedUser =
  mongoose.models["WhitelistedUser"] ??
  mongoose.model<IWhitelistedUser>("WhitelistedUser", schema);
