import { SignIn } from "@clerk/nextjs";

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
          variables: {
            colorPrimary: "#14b8a6",
            colorBackground: "#0a0a0a",
            colorInputBackground: "#0a0a0a",
            colorInputText: "#ffffff",
            colorText: "#ffffff",
            colorTextSecondary: "#9ca3af",
            colorNeutral: "#ffffff",
            colorDanger: "#f87171",
            colorSuccess: "#34d399",
            colorWarning: "#fbbf24",
            borderRadius: "0.375rem",
            fontFamily: "Helvetica, Arial, sans-serif",
          },
          elements: {
            rootBox: "w-full max-w-md",
            card: "bg-gray-950 border border-gray-800 shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton:
              "bg-gray-900 border border-gray-800 text-white hover:bg-gray-800",
            socialButtonsBlockButtonText: "text-white",
            dividerLine: "bg-gray-800",
            dividerText: "text-gray-500",
            formFieldLabel: "text-gray-400 uppercase tracking-widest text-xs",
            formFieldInput:
              "bg-gray-900 border border-gray-800 text-white focus:border-teal-400",
            formButtonPrimary:
              "bg-teal-400 text-black uppercase tracking-wider font-bold hover:bg-teal-300 transition",
            footerActionLink: "text-teal-400 hover:text-teal-300",
            footerActionText: "text-gray-400",
            identityPreviewText: "text-white",
            identityPreviewEditButton: "text-teal-400",
            formFieldAction: "text-teal-400",
            formFieldInputShowPasswordButton: "text-gray-400",
            formResendCodeLink: "text-teal-400",
            otpCodeFieldInput:
              "bg-gray-900 border border-gray-800 text-white focus:border-teal-400",
            footer: "bg-gray-950 border-t border-gray-800",
          },
        }}
      />
    </div>
  );
}
