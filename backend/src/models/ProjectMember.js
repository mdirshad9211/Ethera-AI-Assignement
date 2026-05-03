import mongoose from 'mongoose'

export const PROJECT_ROLES = ['ADMIN', 'MEMBER']

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: PROJECT_ROLES,
      default: 'MEMBER',
    },
  },
  { timestamps: true },
)

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true })

export const ProjectMember =
  mongoose.models.ProjectMember ||
  mongoose.model('ProjectMember', projectMemberSchema)
