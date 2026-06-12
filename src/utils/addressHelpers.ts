/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AddressSuggestion {
  label: string; // The street / place name shown in suggestion list
  address1: string;
  address2?: string;
  city: string;
  county: string;
  state: string; // e.g. "CA"
  zip: string;
  placeId?: string;
}

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District Of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" }
];

export const ADDRESS_TEMPLATES: AddressSuggestion[] = [
  // Oracle Offices (very relevant to LCA)
  { label: "1 Oracle Way, Redwood City, CA (Oracle HQ Plaza)", address1: "1 Oracle Way", city: "Redwood City", county: "San Mateo", state: "CA", zip: "94065" },
  { label: "100 Pine St, San Francisco, CA (Oracle Downtown)", address1: "100 Pine St", city: "San Francisco", county: "San Francisco", state: "CA", zip: "94111" },
  { label: "400 Oracle Pkwy, Redwood Shores, CA (Oracle Park)", address1: "400 Oracle Pkwy", city: "Redwood City", county: "San Mateo", state: "CA", zip: "94065" },
  // Google Offices
  { label: "1600 Amphitheatre Pkwy, Mountain View, CA (Googleplex)", address1: "1600 Amphitheatre Pkwy", city: "Mountain View", county: "Santa Clara", state: "CA", zip: "94043" },
  { label: "345 Spear St, San Francisco, CA (Google SF)", address1: "345 Spear St", city: "San Francisco", county: "San Francisco", state: "CA", zip: "94105" },
  { label: "111 8th Ave, New York, NY (Google Chelsea)", address1: "111 8th Ave", city: "New York", county: "New York", state: "NY", zip: "10011" },
  { label: "601 N 34th St, Seattle, WA (Google Fremont)", address1: "601 N 34th St", city: "Seattle", county: "King", state: "WA", zip: "98103" },
  // Apple
  { label: "1 Infinite Loop, Cupertino, CA (Apple Infinite Loop)", address1: "1 Infinite Loop", city: "Cupertino", county: "Santa Clara", state: "CA", zip: "95014" },
  { label: "1 Apple Park Way, Cupertino, CA (Apple Park HQ)", address1: "1 Apple Park Way", city: "Cupertino", county: "Santa Clara", state: "CA", zip: "95014" },
  // Microsoft
  { label: "1 Microsoft Way, Redmond, WA (Redmond West Campus)", address1: "1 Microsoft Way", city: "Redmond", county: "King", state: "WA", zip: "98052" },
  // Amazon
  { label: "410 Terry Ave N, Seattle, WA (Amazon HQ)", address1: "410 Terry Ave N", city: "Seattle", county: "King", state: "WA", zip: "98109" },
  // Residential examples for tech hubs
  { label: "450 Sutter St, San Francisco, CA (Sutter Apts)", address1: "450 Sutter St", city: "San Francisco", county: "San Francisco", state: "CA", zip: "94108" },
  { label: "201 Folsom St, San Francisco, CA (Lumina SF)", address1: "201 Folsom St", city: "San Francisco", county: "San Francisco", state: "CA", zip: "94105" },
  { label: "888 Boylston St, Boston, MA (The Prudential Suites)", address1: "888 Boylston St", city: "Boston", county: "Suffolk", state: "MA", zip: "02199" },
  { label: "300 Bowie St, Austin, TX (The Bowie Highrise)", address1: "300 Bowie St", city: "Austin", county: "Travis", state: "TX", zip: "78703" },
  { label: "555 W Madison St, Chicago, IL (Presidential Towers)", address1: "555 W Madison St", city: "Chicago", county: "Cook", state: "IL", zip: "60661" },
  { label: "1000 2nd Ave, Seattle, WA (Downtown Seattle Condos)", address1: "1000 2nd Ave", city: "Seattle", county: "King", state: "WA", zip: "98104" },
  { label: "2100 McKinney Ave, Dallas, TX (McKinney Plaza Residence)", address1: "2100 McKinney Ave", city: "Dallas", county: "Dallas", state: "TX", zip: "75201" },
  { label: "400 Broad St, Seattle, WA (Broad Street Center)", address1: "400 Broad St", city: "Seattle", county: "King", state: "WA", zip: "98109" },
  { label: "1200 Broadway, Nashville, TN (Broadway Residences)", address1: "1200 Broadway", city: "Nashville", county: "Davidson", state: "TN", zip: "37203" }
];

/**
 * Formats entered digits/characters into standard LCA pattern: I-200-XXXXX-XXXXXX
 */
export function formatLCANumber(val: string): string {
  const digits = val.replace(/[^0-9]/g, "");
  // Standard format is I-200-[5 digits]-[6 digits]
  let result = "I-200-";

  if (digits.length <= 3) {
    // just output whatever digits they typed if not starting with 200, or I-200-
    if (val.toUpperCase().startsWith("I-200-")) {
      return val.toUpperCase();
    }
    const cleanRaw = val.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    return cleanRaw;
  }

  // extract actual variable sections (excluding prefix I-200 if they typed it directly or after stripping)
  let cleanDigits = digits;
  if (digits.startsWith("200")) {
    cleanDigits = digits.substring(3);
  }

  if (cleanDigits.length > 5) {
    result += cleanDigits.substring(0, 5) + "-" + cleanDigits.substring(5, 11);
  } else if (cleanDigits.length > 0) {
    result += cleanDigits;
  }

  return result;
}

/**
 * Validates whether the LCA number follows the required I-200-XXXXX-XXXXXX structure
 */
export function validateLCANumber(val: string): boolean {
  if (!val) return true;
  // Regex to check exact H-1B LCA format matching
  const regex = /^I-200-\d{5}-\d{6}$/;
  return regex.test(val);
}

/**
 * Validates whether a ZIP Code follows the US standard 5-digit format or 5+4 format
 */
export function validateZipCode(zip: string): boolean {
  if (!zip) return true;
  // Regex to check US Zip Code (5 digits or 5+4 optional separation)
  const regex = /^\d{5}(-\d{4})?$/;
  return regex.test(zip.trim());
}

/**
 * Combines separate address lines into a single well-formatted address string
 */
export function compileFullAddress(
  address1: string,
  address2: string | undefined,
  city: string,
  county: string,
  state: string,
  zip: string
): string {
  const parts = [
    address1.trim(),
    address2?.trim() || "",
    city.trim(),
    county.trim() ? (county.trim().toLowerCase().endsWith("county") ? county.trim() : `${county.trim()} County`) : "",
    state.trim(),
    zip.trim()
  ].filter(p => p !== "");
  return parts.join(", ");
}

/**
 * Searches the address suggestions list for matching input
 */
export function getAddressSuggestions(input: string): AddressSuggestion[] {
  if (!input || input.trim().length < 2) return [];
  const query = input.trim().toLowerCase();
  return ADDRESS_TEMPLATES.filter(
    addr =>
      addr.label.toLowerCase().includes(query) ||
      addr.address1.toLowerCase().includes(query) ||
      addr.city.toLowerCase().includes(query)
  );
}

// Custom runtime loaders and services integration for Google Maps Autocomplete & Details

export function getGoogleMapsApiKey(): string {
  // Try to read custom key from environment defines or process.env
  return (
    (process.env as any).GOOGLE_MAPS_PLATFORM_KEY ||
    (window as any).GOOGLE_MAPS_PLATFORM_KEY ||
    ""
  );
}

let mapsLoadedPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (mapsLoadedPromise) return mapsLoadedPromise;

  mapsLoadedPromise = new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    // Already active?
    if ((window as any).google?.maps?.places) {
      resolve();
      return;
    }

    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      console.warn("GOOGLE_MAPS_PLATFORM_KEY is missing. Using local static templates only.");
      resolve();
      return;
    }

    const callbackName = "__googleMapsCallbackInit";
    (window as any)[callbackName] = () => {
      resolve();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error("Error loading Google Maps JavaScript API via dynamic injection", e);
      resolve();
    };
    document.head.appendChild(script);
  });

  return mapsLoadedPromise;
}

export async function getGoogleMapsAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
  if (!input || input.trim().length < 3) return [];

  try {
    await loadGoogleMaps();
    const google = (window as any).google;
    if (!google?.maps?.places) {
      return getAddressSuggestions(input);
    }

    const service = new google.maps.places.AutocompleteService();
    return new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input,
          types: ["address"],
          componentRestrictions: { country: "us" }
        },
        (predictions: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const list: AddressSuggestion[] = predictions.map((p: any) => ({
              label: p.description,
              address1: p.structured_formatting?.main_text || p.description,
              city: "",
              county: "",
              state: "",
              zip: "",
              placeId: p.place_id
            }));
            resolve(list);
          } else {
            resolve(getAddressSuggestions(input));
          }
        }
      );
    });
  } catch (err) {
    console.warn("Google Maps places search failed, falling back to offline patterns:", err);
    return getAddressSuggestions(input);
  }
}

export async function getPlaceDetails(placeId: string): Promise<Partial<AddressSuggestion>> {
  try {
    await loadGoogleMaps();
    const google = (window as any).google;
    if (!google?.maps?.places) return {};

    const dummyEl = document.createElement("div");
    const service = new google.maps.places.PlacesService(dummyEl);

    return new Promise((resolve) => {
      service.getDetails(
        {
          placeId,
          fields: ["address_components", "formatted_address"]
        },
        (place: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const components = place.address_components || [];
            let streetNumber = "";
            let route = "";
            let city = "";
            let county = "";
            let state = "";
            let zip = "";

            for (const c of components) {
              const types = c.types || [];
              if (types.includes("street_number")) {
                streetNumber = c.long_name;
              } else if (types.includes("route")) {
                route = c.long_name;
              } else if (types.includes("locality")) {
                city = c.long_name;
              } else if (types.includes("administrative_area_level_2")) {
                // e.g. "San Mateo County" => remove "County" if standard is wanted, or keep
                county = c.long_name.replace(" County", "").trim();
              } else if (types.includes("administrative_area_level_1")) {
                state = c.short_name;
              } else if (types.includes("postal_code")) {
                zip = c.long_name;
              }
            }

            const address1 = streetNumber ? `${streetNumber} ${route}` : route;
            resolve({
              address1: address1 || place.formatted_address || "",
              city,
              county,
              state,
              zip
            });
          } else {
            resolve({});
          }
        }
      );
    });
  } catch (err) {
    console.error("Error retrieving Place details:", err);
    return {};
  }
}

