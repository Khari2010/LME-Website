import SignupCard from "@/components/enhancers/SignupCard";

export default function EnhancersFooterCTA() {
  return (
    <section className="bg-black px-6 md:px-12 lg:px-24 border-t border-gray-900">
      <div className="max-w-4xl mx-auto">
        <SignupCard variant="footer" />
      </div>
    </section>
  );
}
