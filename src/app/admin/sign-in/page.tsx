import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
      <header className="mb-8 text-center">
        <p className="text-teal-400 text-xs uppercase tracking-[0.3em]">LME · Admin</p>
        <h1 className="text-white text-3xl font-bold mt-2">Band team only.</h1>
      </header>
      <SignIn
        forceRedirectUrl="/admin"
        signUpForceRedirectUrl="/admin"
      />
    </div>
  );
}
