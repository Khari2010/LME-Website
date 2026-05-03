import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-base px-6">
      <header className="mb-8 text-center">
        <p className="text-text-muted text-xs uppercase tracking-[0.3em]">LME · CRM</p>
        <h1 className="text-text-primary text-3xl font-bold mt-2">Band team only.</h1>
      </header>
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
      />
    </div>
  );
}
