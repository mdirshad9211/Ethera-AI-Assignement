import mongoose from 'mongoose'
import { Task } from '../models/Task.js'
import { ProjectMember } from '../models/ProjectMember.js'

export async function dashboard(req, res) {
  const memberships = await ProjectMember.find({ userId: req.user.id })
    .select('projectId role')
    .lean()

  const projectIds = memberships.map((m) => m.projectId)
  const roleByProject = new Map(
    memberships.map((m) => [m.projectId.toString(), m.role]),
  )

  if (projectIds.length === 0) {
    return res.json({
      summary: {
        totalTasks: 0,
        byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
        projectCount: 0,
      },
      overdueTasks: [],
      myTasksOpen: [],
    })
  }

  const now = new Date()
  const userOid = new mongoose.Types.ObjectId(req.user.id)

  const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 }
  const grouped = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  for (const row of grouped) {
    if (row._id && Object.prototype.hasOwnProperty.call(statusCounts, row._id)) {
      statusCounts[row._id] = row.count
    }
  }

  const overdue = await Task.find({
    projectId: { $in: projectIds },
    dueDate: { $lt: now },
    status: { $ne: 'DONE' },
  })
    .sort({ dueDate: 1 })
    .limit(50)
    .lean()

  const myOpen = await Task.find({
    projectId: { $in: projectIds },
    assigneeId: userOid,
    status: { $ne: 'DONE' },
  })
    .sort({ dueDate: 1 })
    .limit(50)
    .lean()

  const serialize = (t) => ({
    id: t._id.toString(),
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId.toString(),
    assigneeId: t.assigneeId ? t.assigneeId.toString() : null,
  })

  res.json({
    summary: {
      totalTasks:
        statusCounts.TODO + statusCounts.IN_PROGRESS + statusCounts.DONE,
      byStatus: statusCounts,
      projectCount: projectIds.length,
    },
    overdueTasks: overdue.map(serialize),
    myTasksOpen: myOpen.map((t) => ({
      ...serialize(t),
      projectRole: roleByProject.get(t.projectId.toString()) ?? 'MEMBER',
    })),
  })
}
