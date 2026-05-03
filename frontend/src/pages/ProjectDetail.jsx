import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Layout } from '../components/Layout'

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']

function formatDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toIsoDateEndOfDay(value) {
  if (!value) return null
  const d = new Date(value + 'T23:59:59.999Z')
  return d.toISOString()
}

export function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('tasks')

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'TODO',
    dueDate: '',
    assigneeId: '',
    assigneeEmail: '',
  })
  const [assignEmailDraft, setAssignEmailDraft] = useState({})
  const [invite, setInvite] = useState({ email: '', role: 'MEMBER', name: '' })
  const [inviteNotice, setInviteNotice] = useState('')

  const isAdmin = project?.role === 'ADMIN'

  const loadAll = useCallback(async () => {
    setError('')
    try {
      const [p, m, t] = await Promise.all([
        api(`/api/projects/${projectId}`),
        api(`/api/projects/${projectId}/members`),
        api(`/api/projects/${projectId}/tasks`),
      ])
      setProject(p.project)
      setMembers(m.members)
      setTasks(t.tasks)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    loadAll()
  }, [loadAll])

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.userId,
        label: `${m.name} (${m.email})`,
      })),
    [members],
  )

  async function handleUpdateProject(e) {
    e.preventDefault()
    if (!isAdmin) return
    setError('')
    try {
      await api(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: project.name,
          description: project.description,
        }),
      })
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed')
    }
  }

  async function handleDeleteProject() {
    if (!isAdmin) return
    if (!window.confirm('Delete this project and all its tasks?')) return
    setError('')
    try {
      await api(`/api/projects/${projectId}`, { method: 'DELETE' })
      navigate('/projects', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed')
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    setError('')
    try {
      const emailTrim = newTask.assigneeEmail.trim()
      const body = {
        title: newTask.title.trim(),
        description: newTask.description,
        status: newTask.status,
        dueDate: newTask.dueDate ? toIsoDateEndOfDay(newTask.dueDate) : null,
      }
      if (isAdmin && emailTrim) {
        body.assigneeEmail = emailTrim
      } else if (isAdmin) {
        body.assigneeId = newTask.assigneeId || null
      }
      await api(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setNewTask({
        title: '',
        description: '',
        status: 'TODO',
        dueDate: '',
        assigneeId: '',
        assigneeEmail: '',
      })
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create task')
    }
  }

  async function patchTask(task, partial) {
    setError('')
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify(partial),
      })
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update task')
    }
  }

  async function assignTaskByEmail(task) {
    const v = assignEmailDraft[task.id]?.trim()
    if (!v) return
    setError('')
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigneeEmail: v }),
      })
      setAssignEmailDraft((p) => ({ ...p, [task.id]: '' }))
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not assign by email')
    }
  }

  async function deleteTask(task) {
    if (!window.confirm('Delete this task?')) return
    setError('')
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: 'DELETE',
      })
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete')
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!isAdmin) return
    setError('')
    setInviteNotice('')
    try {
      const body = {
        email: invite.email.trim(),
        role: invite.role,
        ...(invite.name.trim() ? { name: invite.name.trim() } : {}),
      }
      const res = await api(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setInvite({ email: '', role: 'MEMBER', name: '' })
      if (res.createdAccount && res.onboardingNote) {
        setInviteNotice(res.onboardingNote)
      } else {
        setInviteNotice('Member added to this project.')
      }
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add member')
    }
  }

  async function changeRole(userId, role) {
    if (!isAdmin) return
    setError('')
    try {
      await api(`/api/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update role')
    }
  }

  async function removeMember(userId) {
    if (!isAdmin) return
    if (!window.confirm('Remove this member from the project?')) return
    setError('')
    try {
      await api(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      })
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove')
    }
  }

  if (loading && !project) {
    return (
      <Layout>
        <p className="text-slate-500">Loading…</p>
      </Layout>
    )
  }

  if (error && !project) {
    return (
      <Layout>
        <p className="text-red-400">{error}</p>
        <Link to="/projects" className="mt-4 inline-block text-sky-400">
          ← Back to projects
        </Link>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/projects" className="text-sm text-sky-400 hover:underline">
            ← All projects
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">{project.name}</h1>
          <p className="mt-1 text-slate-400">{project.description || 'No description'}</p>
          <p className="mt-2 text-sm text-slate-500">
            Your role:{' '}
            <span className="text-slate-300">{project.role}</span>
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={handleDeleteProject}
            className="rounded-md border border-red-900/80 bg-red-950/40 px-3 py-1.5 text-sm text-red-200 hover:bg-red-950/70"
          >
            Delete project
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {isAdmin ? (
        <form
          onSubmit={handleUpdateProject}
          className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6"
        >
          <h2 className="text-lg font-medium text-white">Project settings</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-300">Name</label>
              <input
                value={project.name}
                onChange={(e) =>
                  setProject((p) => ({ ...p, name: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-300">Description</label>
              <textarea
                rows={3}
                value={project.description}
                onChange={(e) =>
                  setProject((p) => ({ ...p, description: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
          >
            Save changes
          </button>
        </form>
      ) : null}

      <div className="mt-10 flex gap-2 border-b border-slate-800">
        <button
          type="button"
          className={
            tab === 'tasks'
              ? 'border-b-2 border-sky-500 px-3 py-2 text-sm font-medium text-white'
              : 'px-3 py-2 text-sm text-slate-400 hover:text-white'
          }
          onClick={() => setTab('tasks')}
        >
          Tasks
        </button>
        <button
          type="button"
          className={
            tab === 'members'
              ? 'border-b-2 border-sky-500 px-3 py-2 text-sm font-medium text-white'
              : 'px-3 py-2 text-sm text-slate-400 hover:text-white'
          }
          onClick={() => setTab('members')}
        >
          Team
        </button>
      </div>

      {tab === 'tasks' ? (
        <section className="mt-6 space-y-8">
          <form
            onSubmit={handleCreateTask}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <h3 className="text-lg font-medium text-white">New task</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-300">Title</label>
                <input
                  required
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask((t) => ({ ...t, title: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask((t) => ({ ...t, description: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Status</label>
                <select
                  value={newTask.status}
                  onChange={(e) =>
                    setNewTask((t) => ({ ...t, status: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Due date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) =>
                    setNewTask((t) => ({ ...t, dueDate: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
                />
              </div>
              {isAdmin ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-slate-300">
                      Assignee (team members)
                    </label>
                    <select
                      value={newTask.assigneeId}
                      disabled={Boolean(newTask.assigneeEmail.trim())}
                      onChange={(e) =>
                        setNewTask((t) => ({
                          ...t,
                          assigneeId: e.target.value,
                          assigneeEmail: '',
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2 disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      {memberOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-slate-300">
                      Or assign by email (directory users / adds them to this project)
                    </label>
                    <input
                      type="email"
                      placeholder="someone@company.com"
                      value={newTask.assigneeEmail}
                      onChange={(e) =>
                        setNewTask((t) => ({
                          ...t,
                          assigneeEmail: e.target.value,
                          assigneeId: e.target.value.trim() ? '' : t.assigneeId,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
                    />
                  </div>
                </>
              ) : (
                <p className="sm:col-span-2 text-xs text-slate-500">
                  Admins can assign tasks when creating. You can still update
                  status and dates on tasks you own or that are assigned to you.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Add task
            </button>
          </form>

          <div>
            <h3 className="text-lg font-medium text-white">All tasks</h3>
            {tasks.length === 0 ? (
              <p className="mt-3 text-slate-500">No tasks yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Due</th>
                      <th className="px-3 py-2 font-medium">Assignee</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tasks.map((task) => {
                      const assignee = members.find((m) => m.userId === task.assigneeId)
                      const canEdit =
                        isAdmin ||
                        task.assigneeId === user?.id ||
                        task.createdById === user?.id
                      return (
                        <tr key={task.id} className="bg-slate-950/40">
                          <td className="px-3 py-2 align-top text-white">
                            <div className="font-medium">{task.title}</div>
                            {task.description ? (
                              <div className="mt-1 max-w-md text-xs text-slate-500">
                                {task.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <select
                              disabled={!canEdit}
                              value={task.status}
                              onChange={(e) =>
                                patchTask(task, { status: e.target.value })
                              }
                              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="date"
                              disabled={!canEdit}
                              value={formatDateInput(task.dueDate)}
                              onChange={(e) =>
                                patchTask(task, {
                                  dueDate: e.target.value
                                    ? toIsoDateEndOfDay(e.target.value)
                                    : null,
                                })
                              }
                              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                            />
                          </td>
                          <td className="px-3 py-2 align-top text-slate-300">
                            {isAdmin ? (
                              <div className="flex max-w-[260px] flex-col gap-2">
                                <select
                                  value={task.assigneeId || ''}
                                  onChange={(e) =>
                                    patchTask(task, {
                                      assigneeId: e.target.value || null,
                                    })
                                  }
                                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                                >
                                  <option value="">Unassigned</option>
                                  {memberOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex gap-1">
                                  <input
                                    type="email"
                                    placeholder="Email → join & assign"
                                    value={assignEmailDraft[task.id] ?? ''}
                                    onChange={(e) =>
                                      setAssignEmailDraft((p) => ({
                                        ...p,
                                        [task.id]: e.target.value,
                                      }))
                                    }
                                    className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                                  />
                                  <button
                                    type="button"
                                    className="shrink-0 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600"
                                    onClick={() => assignTaskByEmail(task)}
                                  >
                                    Set
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs">
                                {assignee ? assignee.name : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => deleteTask(task)}
                                className="text-xs text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === 'members' ? (
        <section className="mt-6 space-y-8">
          {isAdmin ? (
            <form
              onSubmit={handleInvite}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <h3 className="text-lg font-medium text-white">Invite member</h3>
              <p className="mt-1 text-sm text-slate-500">
                Project admins only. New emails get an account automatically; initial password is their email until they change it.
              </p>
              {inviteNotice ? (
                <p className="mt-3 rounded-md bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
                  {inviteNotice}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Display name (optional, new accounts)"
                  value={invite.name}
                  onChange={(e) =>
                    setInvite((i) => ({ ...i, name: e.target.value }))
                  }
                  className="min-w-[160px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2 sm:flex-none sm:basis-[220px]"
                />
                <input
                  type="email"
                  required
                  placeholder="email@company.com"
                  value={invite.email}
                  onChange={(e) =>
                    setInvite((i) => ({ ...i, email: e.target.value }))
                  }
                  className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
                />
                <select
                  value={invite.role}
                  onChange={(e) =>
                    setInvite((i) => ({ ...i, role: e.target.value }))
                  }
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Add
                </button>
              </div>
            </form>
          ) : (
            <p className="text-slate-500">Only project admins can invite or manage roles.</p>
          )}

          <div>
            <h3 className="text-lg font-medium text-white">Members</h3>
            <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{m.name}</p>
                    <p className="text-sm text-slate-500">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin ? (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.userId, e.target.value)}
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeMember(m.userId)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {m.role}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </Layout>
  )
}
