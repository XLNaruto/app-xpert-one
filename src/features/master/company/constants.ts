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

export const STATE_OPTIONS: ComboboxOption[] = INDIAN_STATES.map((s) => ({
  label: s,
  value: s,
}));

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
