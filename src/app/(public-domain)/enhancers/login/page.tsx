import LoginForm from "@/components/enhancers/LoginForm";

export const metadata = {
  title: "Enhancers · Sign in",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <p className="text-teal-400 uppercase tracking-widest text-sm">LME · Enhancers</p>
        <h1 className="text-white text-3xl font-bold mt-2 mb-6">Welcome back.</h1>
        <p className="text-gray-400 mb-8">
          Enter your email and we&apos;ll send you a one-tap link to your Enhancers area.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
