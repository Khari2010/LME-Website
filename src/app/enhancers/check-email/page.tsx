export const metadata = {
  title: "Enhancers · Check your inbox",
};

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <p className="text-teal-400 uppercase tracking-widest text-sm">LME · Enhancers</p>
        <h1 className="text-white text-3xl font-bold mt-2 mb-6">Check your inbox.</h1>
        <p className="text-gray-400">
          We just sent you a one-tap link. It expires in 7 days. If you don&apos;t see it, check spam.
        </p>
      </div>
    </div>
  );
}
