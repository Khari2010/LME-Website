import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import PostFeatured from "@/components/enhancers/PostFeatured";
import PostCard from "@/components/enhancers/PostCard";

export const metadata = {
  title: "Enhancers · Live Music Enhancers",
};

export default async function EnhancersPage() {
  const posts = await fetchQuery(api.posts.getPublishedPosts, { limit: 7 });
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p._id !== featured?._id);

  return (
    <main className="min-h-screen bg-black px-6 md:px-12 lg:px-24 py-12">
      <header className="max-w-6xl mx-auto mb-8">
        <p className="text-teal-400 uppercase tracking-widest text-sm">You&apos;re in</p>
        <h1 className="text-white text-4xl md:text-5xl font-bold mt-2">Welcome to the Enhancers.</h1>
      </header>

      <div className="max-w-6xl mx-auto space-y-12">
        {featured ? (
          <PostFeatured post={featured} />
        ) : (
          <p className="text-gray-400">No content yet — check back soon.</p>
        )}

        {rest.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
