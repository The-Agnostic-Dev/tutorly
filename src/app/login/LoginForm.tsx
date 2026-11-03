'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state.email} required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p className="notice error">{state.error}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
