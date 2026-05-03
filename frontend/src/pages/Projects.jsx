import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { Layout } from '../components/Layout'

export function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setError('')
    try {
      const data = await api('/api/projects')
      setProjects(data.projects)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description }),
      })
      setName('')
      setDescription('')
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create project')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <p className="mt-1 text-slate-400">
            Create a project and invite teammates. Your role is shown per project.
          </p>
        </div>
      </div>

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-medium text-white">New project</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          {error ? (
            <p className="sm:col-span-2 text-sm text-red-400">{error}</p>
          ) : null}
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-300" htmlFor="pname">
              Name
            </label>
            <input
              id="pname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-300" htmlFor="pdesc">
              Description
            </label>
            <textarea
              id="pdesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">Your projects</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="mt-4 text-slate-500">No projects yet. Create one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-lg font-medium text-white hover:text-sky-400"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 max-w-prose text-sm text-slate-400">
                    {p.description || 'No description'}
                  </p>
                </div>
                <span
                  className={
                    p.role === 'ADMIN'
                      ? 'rounded-full bg-violet-950 px-3 py-1 text-xs font-medium text-violet-200'
                      : 'rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300'
                  }
                >
                  {p.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  )
}
