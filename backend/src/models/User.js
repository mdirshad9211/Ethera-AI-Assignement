import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    /** True when invited by a project admin — initial password equals email until updated. */
    mustChangePassword: { type: Boolean, default: false },
    /** Can manage directory users (create accounts without a project). Also granted via ADMIN_EMAIL / PLATFORM_ADMIN_EMAILS env. */
    platformAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export const User = mongoose.models.User || mongoose.model('User', userSchema)
