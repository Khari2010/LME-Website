import { auth } from "@clerk/nextjs/server";
import { fetchQuery as fetchQueryRaw, fetchMutation as fetchMutationRaw } from "convex/nextjs";
import type { FunctionReference, FunctionReturnType } from "convex/server";

async function authToken(): Promise<string | null> {
  const { getToken } = await auth();
  return await getToken({ template: "convex" });
}

export async function fetchQuery<Q extends FunctionReference<"query">>(
  query: Q,
  args?: Q["_args"],
  options?: { token?: string },
): Promise<FunctionReturnType<Q>> {
  const token = options?.token ?? (await authToken()) ?? undefined;
  return fetchQueryRaw(query, args ?? ({} as Q["_args"]), token ? { token } : {});
}

export async function fetchMutation<M extends FunctionReference<"mutation">>(
  mutation: M,
  args?: M["_args"],
  options?: { token?: string },
): Promise<FunctionReturnType<M>> {
  const token = options?.token ?? (await authToken()) ?? undefined;
  return fetchMutationRaw(mutation, args ?? ({} as M["_args"]), token ? { token } : {});
}
