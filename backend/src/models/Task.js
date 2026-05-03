import mongoose from 'mongoose'

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: '', maxlength: 8000 },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'TODO',
      index: true,
    },
    dueDate: { type: Date, default: null, index: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

taskSchema.index({ projectId: 1, status: 1 })

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema)
