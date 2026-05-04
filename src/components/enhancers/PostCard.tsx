import Link from "next/link";
import Image from "next/image";
import type { Doc } from "@convex/_generated/dataModel";

export default function PostCard({ post }: { post: Doc<"posts"> }) {
  return (
    <Link href={`/enhancers/posts/${post.slug}`} className="block group">
      <article className="rounded-lg bg-gray-900 overflow-hidden">
        {post.heroImageUrl && (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={post.heroImageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover group-hover:scale-105 transition duration-500"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="text-white text-lg font-bold mb-1">{post.title}</h3>
          {post.excerpt && <p className="text-gray-400 text-sm line-clamp-2">{post.excerpt}</p>}
        </div>
      </article>
    </Link>
  );
}
