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
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as bookingForm from "../bookingForm.js";
import type * as bookingFormEmail from "../bookingFormEmail.js";
import type * as bookingTokens from "../bookingTokens.js";
import type * as campaignChecks from "../campaignChecks.js";
import type * as campaignSender from "../campaignSender.js";
import type * as campaigns from "../campaigns.js";
import type * as contacts from "../contacts.js";
import type * as contentPlanner from "../contentPlanner.js";
import type * as contracts from "../contracts.js";
import type * as contractsEmail from "../contractsEmail.js";
import type * as crons from "../crons.js";
import type * as demos from "../demos.js";
import type * as discoveryCall from "../discoveryCall.js";
import type * as discoveryCallEmail from "../discoveryCallEmail.js";
import type * as emailTemplates_BalanceReminder from "../emailTemplates/BalanceReminder.js";
import type * as emailTemplates_BookingFormInvite from "../emailTemplates/BookingFormInvite.js";
import type * as emailTemplates_BrandLayout from "../emailTemplates/BrandLayout.js";
import type * as emailTemplates_ContractReady from "../emailTemplates/ContractReady.js";
import type * as emailTemplates_DiscoveryCallInvite from "../emailTemplates/DiscoveryCallInvite.js";
import type * as emailTemplates_InquiryConfirmation from "../emailTemplates/InquiryConfirmation.js";
import type * as emailTemplates_PreEventSurveyInvite from "../emailTemplates/PreEventSurveyInvite.js";
import type * as emails from "../emails.js";
import type * as eventbrite from "../eventbrite.js";
import type * as eventbriteMutations from "../eventbriteMutations.js";
import type * as events from "../events.js";
import type * as expenses from "../expenses.js";
import type * as finance from "../finance.js";
import type * as invitations from "../invitations.js";
import type * as invitationsAdmin from "../invitationsAdmin.js";
import type * as meetingDetails from "../meetingDetails.js";
import type * as migrations_bookingsToEvents from "../migrations/bookingsToEvents.js";
import type * as posts from "../posts.js";
import type * as preEventSurvey from "../preEventSurvey.js";
import type * as preEventSurveyEmail from "../preEventSurveyEmail.js";
import type * as publicInquiry from "../publicInquiry.js";
import type * as publicInquiryEmail from "../publicInquiryEmail.js";
import type * as rateLimit from "../rateLimit.js";
import type * as reminders from "../reminders.js";
import type * as remindersAction from "../remindersAction.js";
import type * as scheduledSenderAction from "../scheduledSenderAction.js";
import type * as setlists from "../setlists.js";
import type * as siteCopy from "../siteCopy.js";
import type * as songs from "../songs.js";
import type * as transcriptExtraction from "../transcriptExtraction.js";
import type * as transcriptExtractionAction from "../transcriptExtractionAction.js";
import type * as users from "../users.js";
import type * as usersAdmin from "../usersAdmin.js";
import type * as welcomeSeries from "../welcomeSeries.js";
import type * as welcomeSeriesAction from "../welcomeSeriesAction.js";
import type * as xero from "../xero.js";
import type * as xeroMutations from "../xeroMutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiDraft: typeof aiDraft;
  analytics: typeof analytics;
  auth: typeof auth;
  bookingForm: typeof bookingForm;
  bookingFormEmail: typeof bookingFormEmail;
  bookingTokens: typeof bookingTokens;
  campaignChecks: typeof campaignChecks;
  campaignSender: typeof campaignSender;
  campaigns: typeof campaigns;
  contacts: typeof contacts;
  contentPlanner: typeof contentPlanner;
  contracts: typeof contracts;
  contractsEmail: typeof contractsEmail;
  crons: typeof crons;
  demos: typeof demos;
  discoveryCall: typeof discoveryCall;
  discoveryCallEmail: typeof discoveryCallEmail;
  "emailTemplates/BalanceReminder": typeof emailTemplates_BalanceReminder;
  "emailTemplates/BookingFormInvite": typeof emailTemplates_BookingFormInvite;
  "emailTemplates/BrandLayout": typeof emailTemplates_BrandLayout;
  "emailTemplates/ContractReady": typeof emailTemplates_ContractReady;
  "emailTemplates/DiscoveryCallInvite": typeof emailTemplates_DiscoveryCallInvite;
  "emailTemplates/InquiryConfirmation": typeof emailTemplates_InquiryConfirmation;
  "emailTemplates/PreEventSurveyInvite": typeof emailTemplates_PreEventSurveyInvite;
  emails: typeof emails;
  eventbrite: typeof eventbrite;
  eventbriteMutations: typeof eventbriteMutations;
  events: typeof events;
  expenses: typeof expenses;
  finance: typeof finance;
  invitations: typeof invitations;
  invitationsAdmin: typeof invitationsAdmin;
  meetingDetails: typeof meetingDetails;
  "migrations/bookingsToEvents": typeof migrations_bookingsToEvents;
  posts: typeof posts;
  preEventSurvey: typeof preEventSurvey;
  preEventSurveyEmail: typeof preEventSurveyEmail;
  publicInquiry: typeof publicInquiry;
  publicInquiryEmail: typeof publicInquiryEmail;
  rateLimit: typeof rateLimit;
  reminders: typeof reminders;
  remindersAction: typeof remindersAction;
  scheduledSenderAction: typeof scheduledSenderAction;
  setlists: typeof setlists;
  siteCopy: typeof siteCopy;
  songs: typeof songs;
  transcriptExtraction: typeof transcriptExtraction;
  transcriptExtractionAction: typeof transcriptExtractionAction;
  users: typeof users;
  usersAdmin: typeof usersAdmin;
  welcomeSeries: typeof welcomeSeries;
  welcomeSeriesAction: typeof welcomeSeriesAction;
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
