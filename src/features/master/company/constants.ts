import type { ComboboxOption } from "@/components/ui/combobox";
import type { CompanyFormValues } from "./schemas";

/** Indian states & union territories, for the State dropdown. */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

/** Major cities per state, for the (optional) City dropdown. */
export const CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Tirupati",
    "Nellore",
  ],
  Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba"],
  Delhi: ["New Delhi", "Delhi", "Dwarka", "Rohini"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Gandhinagar",
    "Bhavnagar",
  ],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
  ],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  "Uttar Pradesh": [
    "Lucknow",
    "Kanpur",
    "Agra",
    "Varanasi",
    "Noida",
    "Ghaziabad",
  ],
  Uttarakhand: ["Dehradun", "Haridwar", "Roorkee", "Haldwani"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
};

export const STATE_OPTIONS: ComboboxOption[] = INDIAN_STATES.map((s) => ({
  label: s,
  value: s,
}));

/** City options for a given state (empty until a state is chosen). */
export function cityOptions(state: string): ComboboxOption[] {
  return (CITIES_BY_STATE[state] ?? []).map((c) => ({ label: c, value: c }));
}

/** Establish-year choices: current year down to 1900. */
export const YEAR_OPTIONS: ComboboxOption[] = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, i) => {
    const year = String(new Date().getFullYear() - i);
    return { label: year, value: year };
  },
);

/** Blank form values for a brand-new company. */
export const EMPTY_COMPANY_FORM: CompanyFormValues = {
  companyName: "",
  companyCode: "",
  establishYear: "",
  registrationNumber: "",
  panNumber: "",
  gstNumber: "",
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  state: "",
  city: "",
  pinCode: "",
  phone: "",
  mobile1: "",
  mobile2: "",
  email: "",
};
