import Link from "next/link";
import Image from "next/image";
import type { Doc } from "../../../convex/_generated/dataModel";

export default function PostFeatured({ post }: { post: Doc<"posts"> }) {
  return (
    <Link href={`/enhancers/posts/${post.slug}`} className="block group">
      <article className="relative overflow-hidden rounded-lg bg-gray-900 aspect-[16/9]">
        {post.heroImageUrl ? (
          <Image
            src={post.heroImageUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 1280px) 1024px, 100vw"
            className="object-cover group-hover:scale-105 transition duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-black to-teal-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <p className="text-teal-400 text-xs uppercase tracking-widest mb-2">Latest drop</p>
          <h2 className="text-white text-3xl md:text-4xl font-bold">{post.title}</h2>
        </div>
      </article>
    </Link>
  );
}
