import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto mt-24 max-w-sm card">
      <h1 className="h1">Discovery CRM</h1>
      <form action={login} className="space-y-3">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button className="btn w-full justify-center">Log in</button>
      </form>
    </div>
  );
}
