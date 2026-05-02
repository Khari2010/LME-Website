import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
      <header className="mb-8 text-center">
        <p className="text-teal-400 text-xs uppercase tracking-[0.3em]">LME · Admin</p>
        <h1 className="text-white text-3xl font-bold mt-2">Set up your password.</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          You&apos;ve been invited to the LME admin platform. Pick a password to finish setting up your account.
        </p>
      </header>
      <SignUp
        path="/admin/sign-up"
        routing="path"
        signInUrl="/admin/sign-in"
        forceRedirectUrl="/admin"
      />
    </div>
  );
}
