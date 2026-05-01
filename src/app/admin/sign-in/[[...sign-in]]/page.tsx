import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
      <header className="mb-8 text-center">
        <p className="text-teal-400 text-xs uppercase tracking-[0.3em]">LME · Admin</p>
        <h1 className="text-white text-3xl font-bold mt-2">Band team only.</h1>
      </header>
      <SignIn
        path="/admin/sign-in"
        routing="path"
        signUpUrl="/admin/sign-in"
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: "#14b8a6",
            colorBackground: "#0a0a0a",
            colorText: "#ffffff",
            colorTextSecondary: "#9ca3af",
            borderRadius: "0.375rem",
          },
          elements: {
            rootBox: "w-full max-w-md",
            footerActionLink: "text-teal-400 hover:text-teal-300",
            formFieldAction: "text-teal-400",
            identityPreviewEditButton: "text-teal-400",
            formResendCodeLink: "text-teal-400",
          },
        }}
      />
    </div>
  );
}
