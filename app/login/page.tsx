import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="card mx-auto mt-24 max-w-sm shadow-[0_0_60px_-15px_rgba(139,92,246,0.6)]">
      <h1 className="h1 text-center font-logo tracking-[0.2em]">DISCOVERY</h1>
      <p className="-mt-2 mb-5 text-center text-xs uppercase tracking-[0.3em] text-slate-400">pharma sprint crm</p>
      <form action={login} className="space-y-3">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {error && <p className="text-rose-400">{error}</p>}
        <button className="btn w-full justify-center">Log in</button>
      </form>
    </div>
  );
}
