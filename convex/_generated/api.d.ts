/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiDraft from "../aiDraft.js";
import type * as campaignSender from "../campaignSender.js";
import type * as campaigns from "../campaigns.js";
import type * as contacts from "../contacts.js";
import type * as emails from "../emails.js";
import type * as events from "../events.js";
import type * as invitations from "../invitations.js";
import type * as invitationsAdmin from "../invitationsAdmin.js";
import type * as migrations_bookingsToEvents from "../migrations/bookingsToEvents.js";
import type * as posts from "../posts.js";
import type * as publicInquiry from "../publicInquiry.js";
import type * as publicInquiryEmail from "../publicInquiryEmail.js";
import type * as users from "../users.js";
import type * as usersAdmin from "../usersAdmin.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiDraft: typeof aiDraft;
  campaignSender: typeof campaignSender;
  campaigns: typeof campaigns;
  contacts: typeof contacts;
  emails: typeof emails;
  events: typeof events;
  invitations: typeof invitations;
  invitationsAdmin: typeof invitationsAdmin;
  "migrations/bookingsToEvents": typeof migrations_bookingsToEvents;
  posts: typeof posts;
  publicInquiry: typeof publicInquiry;
  publicInquiryEmail: typeof publicInquiryEmail;
  users: typeof users;
  usersAdmin: typeof usersAdmin;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
