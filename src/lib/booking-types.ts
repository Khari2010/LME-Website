export interface BookingFormData {
  // Client Details
  clientName: string;
  email: string;
  contactNumber: string;
  clientAddress?: string;
  dayOfContactName?: string;
  dayOfContactNumber?: string;

  // Event Details
  eventType: string;
  eventDate: string;
  personCelebrated?: string;
  eventStartTime?: string;
  guestArrivalTime?: string;
  venueCurfew?: string;
  expectedGuests?: string;

  // Venue Details
  venueName: string;
  venueAddress?: string;
  venueContactName?: string;
  venueContactNumber?: string;
  earliestAccessTime?: string;
  powerSupply?: string;

  // Toggles (stored as strings: "Yes" | "No" | "Not Sure")
  parking?: string;
  soundLimiter?: string;
  stepFreeAccess?: string;

  // Load-in & Access
  accessRestrictions?: string;
  vehicleDistance?: string;
  unloadingPoint?: string;

  // Performance Details
  soundcheckTime?: string;
  djRequired?: string;
  djSetTimings?: string;
  djGenres?: string;

  // Genre Preferences
  genres: string[];
  otherGenres?: string;

  // Special Requests
  specialRequests?: string;
}
