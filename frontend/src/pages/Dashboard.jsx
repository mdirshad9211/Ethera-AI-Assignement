import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Layout } from '../components/Layout'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isOverdue(iso, status) {
  if (!iso || status === 'DONE') return false
  return new Date(iso) < new Date()
}

export function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
      <p className="mt-1 text-slate-400">
        Overview of your workload across all projects.
      </p>

      {error ? (
        <p className="mt-4 text-red-400">{error}</p>
      ) : null}

      {!data && !error ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : null}

      {data ? (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Summary
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-slate-400">Projects</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {data.summary.projectCount}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-slate-400">Total tasks</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {data.summary.totalTasks}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-slate-400">To do / Doing / Done</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {data.summary.byStatus.TODO} /{' '}
                  {data.summary.byStatus.IN_PROGRESS} /{' '}
                  {data.summary.byStatus.DONE}
                </p>
              </div>
              <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
                <p className="text-amber-200/80">Overdue (open)</p>
                <p className="mt-1 text-2xl font-semibold text-amber-100">
                  {data.overdueTasks.length}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              My open assignments
            </h2>
            {data.myTasksOpen.length === 0 ? (
              <p className="mt-3 text-slate-500">No open tasks assigned to you.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-800 rounded-lg border border-slate-800">
                {data.myTasksOpen.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{t.title}</p>
                      <p className="text-xs text-slate-500">
                        Project:{' '}
                        <Link
                          to={`/projects/${t.projectId}`}
                          className="text-sky-400 hover:underline"
                        >
                          open
                        </Link>
                        {' · '}
                        {t.status.replace('_', ' ')}
                        {isOverdue(t.dueDate, t.status) ? (
                          <span className="text-amber-400"> · overdue</span>
                        ) : null}
                      </p>
                    </div>
                    <span className="text-sm text-slate-400">
                      due {formatDate(t.dueDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Overdue (all projects you belong to)
            </h2>
            {data.overdueTasks.length === 0 ? (
              <p className="mt-3 text-slate-500">Nothing overdue. Nice work.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-800 rounded-lg border border-slate-800">
                {data.overdueTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-amber-100">{t.title}</p>
                      <p className="text-xs text-slate-500">
                        <Link
                          to={`/projects/${t.projectId}`}
                          className="text-sky-400 hover:underline"
                        >
                          View project
                        </Link>
                        {' · '}
                        {t.status.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="text-sm text-amber-200/90">
                      due {formatDate(t.dueDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Layout>
  )
}
