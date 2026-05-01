import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <SignIn path="/admin/sign-in" routing="path" signUpUrl="/admin/sign-in" />
    </div>
  );
}
