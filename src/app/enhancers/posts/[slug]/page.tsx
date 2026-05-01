import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchQuery(api.posts.getPostBySlug, { slug });
  if (!post || post.status !== "published") notFound();

  return (
    <main className="min-h-screen bg-black px-6 md:px-12 lg:px-24 py-12">
      <article className="max-w-3xl mx-auto">
        <Link
          href="/enhancers"
          className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-xs uppercase tracking-widest mb-8 transition"
        >
          <span aria-hidden="true">←</span> Back to Enhancers
        </Link>
        <p className="text-teal-400 uppercase tracking-widest text-sm">Enhancers</p>
        <h1 className="text-white text-4xl md:text-5xl font-bold mt-2 mb-4">{post.title}</h1>
        {post.publishedDate && (
          <time className="text-gray-500 text-sm">
            {new Date(post.publishedDate).toLocaleDateString()}
          </time>
        )}
        {post.heroImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={post.heroImageUrl} alt="" className="rounded-lg my-8 w-full" />
        )}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </article>
    </main>
  );
}
