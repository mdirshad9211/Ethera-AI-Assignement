import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import { Layout } from '../components/Layout'

export function DirectoryUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await api('/api/users')
      setUsers(data.users)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    setNotice('')
    setCreating(true)
    setError('')
    try {
      const body = {
        email: email.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
      }
      const res = await api('/api/users', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setEmail('')
      setName('')
      setNotice(res.onboardingNote || 'User created.')
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create user')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-white">Directory users</h1>
      <p className="mt-1 max-w-2xl text-slate-400">
        Create accounts that are not tied to a project yet. They sign in with their email and use their email as the temporary password, then must set a new password. Add them to projects later from each project&apos;s Team tab.
      </p>

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-medium text-white">Add user (no project)</h2>
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap gap-4">
          {error ? (
            <p className="w-full text-sm text-red-400">{error}</p>
          ) : null}
          {notice ? (
            <p className="w-full rounded-md bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
              {notice}
            </p>
          ) : null}
          <input
            type="text"
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[180px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2 sm:flex-none sm:basis-[220px]"
          />
          <input
            type="email"
            required
            placeholder="email@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-[220px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create user'}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">All accounts</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{u.name}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.platformAdmin ? (
                    <span className="rounded-full bg-violet-950 px-2 py-0.5 text-xs text-violet-200">
                      Platform admin
                    </span>
                  ) : null}
                  {u.mustChangePassword ? (
                    <span className="rounded-full bg-amber-950 px-2 py-0.5 text-xs text-amber-200">
                      Must change password
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  )
}
