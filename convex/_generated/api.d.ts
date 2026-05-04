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
import type * as bookingForm from "../bookingForm.js";
import type * as bookingFormEmail from "../bookingFormEmail.js";
import type * as bookingTokens from "../bookingTokens.js";
import type * as campaignSender from "../campaignSender.js";
import type * as campaigns from "../campaigns.js";
import type * as contacts from "../contacts.js";
import type * as contracts from "../contracts.js";
import type * as contractsEmail from "../contractsEmail.js";
import type * as crons from "../crons.js";
import type * as discoveryCall from "../discoveryCall.js";
import type * as discoveryCallEmail from "../discoveryCallEmail.js";
import type * as emails from "../emails.js";
import type * as events from "../events.js";
import type * as invitations from "../invitations.js";
import type * as invitationsAdmin from "../invitationsAdmin.js";
import type * as migrations_bookingsToEvents from "../migrations/bookingsToEvents.js";
import type * as posts from "../posts.js";
import type * as preEventSurvey from "../preEventSurvey.js";
import type * as preEventSurveyEmail from "../preEventSurveyEmail.js";
import type * as publicInquiry from "../publicInquiry.js";
import type * as publicInquiryEmail from "../publicInquiryEmail.js";
import type * as reminders from "../reminders.js";
import type * as remindersAction from "../remindersAction.js";
import type * as users from "../users.js";
import type * as usersAdmin from "../usersAdmin.js";
import type * as xero from "../xero.js";
import type * as xeroMutations from "../xeroMutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiDraft: typeof aiDraft;
  bookingForm: typeof bookingForm;
  bookingFormEmail: typeof bookingFormEmail;
  bookingTokens: typeof bookingTokens;
  campaignSender: typeof campaignSender;
  campaigns: typeof campaigns;
  contacts: typeof contacts;
  contracts: typeof contracts;
  contractsEmail: typeof contractsEmail;
  crons: typeof crons;
  discoveryCall: typeof discoveryCall;
  discoveryCallEmail: typeof discoveryCallEmail;
  emails: typeof emails;
  events: typeof events;
  invitations: typeof invitations;
  invitationsAdmin: typeof invitationsAdmin;
  "migrations/bookingsToEvents": typeof migrations_bookingsToEvents;
  posts: typeof posts;
  preEventSurvey: typeof preEventSurvey;
  preEventSurveyEmail: typeof preEventSurveyEmail;
  publicInquiry: typeof publicInquiry;
  publicInquiryEmail: typeof publicInquiryEmail;
  reminders: typeof reminders;
  remindersAction: typeof remindersAction;
  users: typeof users;
  usersAdmin: typeof usersAdmin;
  xero: typeof xero;
  xeroMutations: typeof xeroMutations;
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
