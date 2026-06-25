import { CategoryType, ExpenseCategoriesType } from "@/types";
import { colors } from "./theme";

import * as Icons from "phosphor-react-native"; // Import all icons dynamically

export const expenseCategories: ExpenseCategoriesType = {
  groceries: {
    label: "Groceries",
    value: "groceries",
    icon: Icons.ShoppingCartIcon,
    bgColor: "#4B5563", // Deep Teal Green
  },
  rent: {
    label: "Rent",
    value: "rent",
    icon: Icons.HouseIcon,
    bgColor: "#075985", // Dark Blue
  },
  utilities: {
    label: "Utilities",
    value: "utilities",
    icon: Icons.LightbulbIcon,
    bgColor: "#ca8a04", // Dark Golden Brown
  },
  transportation: {
    label: "Transportation",
    value: "transportation",
    icon: Icons.CarIcon,
    bgColor: "#b45309", // Dark Orange-Red
  },
  entertainment: {
    label: "Entertainment",
    value: "entertainment",
    icon: Icons.FilmStripIcon,
    bgColor: "#0f766e", // Dark Purple
  },
  dining: {
    label: "Dining",
    value: "dining",
    icon: Icons.ForkKnifeIcon,
    bgColor: "#be185d", // Dark Red
  },
  health: {
    label: "Health",
    value: "health",
    icon: Icons.HeartIcon,
    bgColor: "#e11d48", // Dark Purple
  },
  insurance: {
    label: "Insurance",
    value: "insurance",
    icon: Icons.ShieldCheckIcon,
    bgColor: "#404040", // Dark Gray
  },
  savings: {
    label: "Savings",
    value: "savings",
    icon: Icons.PiggyBankIcon,
    bgColor: "#065f46", // Deep Teal Green
  },
  clothing: {
    label: "Clothing",
    value: "clothing",
    icon: Icons.TShirtIcon,
    bgColor: "#7c3aed", // Dark Indigo
  },

  personal: {
    label: "Personal",
    value: "personal",
    icon: Icons.UserIcon,
    bgColor: "#a21caf", // Deep Pink
  },
  others: {
    label: "Others",
    value: "others",
    icon: Icons.DotsThreeOutlineIcon,
    bgColor: "#525252", // Neutral Dark Gray
  },
  transfer: {
    label: "Transfer",
    value: "transfer",
    icon: Icons.ArrowsLeftRightIcon,
    bgColor: "#0891b2", // Cyan
  },
};

export const incomeCategory: CategoryType = {
  label: "Income",
  value: "income",
  icon: Icons.CurrencyDollarSimpleIcon,
  bgColor: "#16a34a", // Dark
};

export const transactionTypes = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
];

export const walletPresets: {
  [key: string]: {
    label: string;
    value: string;
    icon: any;
    color: string;
    bgColor: string;
    gradient: string[];
  }
} = {
  preset_cash: {
    label: "Cash Wallet",
    value: "preset_cash",
    icon: Icons.CoinsIcon,
    color: "#ffffff",
    bgColor: "#10B981",
    gradient: ["#10b981", "#047857"], // Emerald green
  },
  preset_bank: {
    label: "Bank Card/Account",
    value: "preset_bank",
    icon: Icons.CreditCardIcon,
    color: "#ffffff",
    bgColor: "#2563EB",
    gradient: ["#3b82f6", "#1e3a8a"], // Navy blue
  },
  preset_freelance: {
    label: "Freelance Account",
    value: "preset_freelance",
    icon: Icons.BriefcaseIcon,
    color: "#ffffff",
    bgColor: "#8B5CF6",
    gradient: ["#8b5cf6", "#4c1d95"], // Violet purple
  },
  preset_digital: {
    label: "Digital Wallet",
    value: "preset_digital",
    icon: Icons.GlobeIcon,
    color: "#ffffff",
    bgColor: "#0EA5E9",
    gradient: ["#0ea5e9", "#0369a1"], // Cyan blue
  },
  preset_savings: {
    label: "Savings Vault",
    value: "preset_savings",
    icon: Icons.PiggyBankIcon,
    color: "#ffffff",
    bgColor: "#EAB308",
    gradient: ["#f5af19", "#e15f00"], // Gold amber
  },
  preset_crypto: {
    label: "Crypto Account",
    value: "preset_crypto",
    icon: Icons.ShieldIcon,
    color: "#ffffff",
    bgColor: "#D946EF",
    gradient: ["#ec4899", "#701a75"], // Indigo magenta
  },
  preset_other: {
    label: "Other Wallet",
    value: "preset_other",
    icon: Icons.DotsThreeIcon,
    color: "#ffffff",
    bgColor: "#6B7280",
    gradient: ["#6b7280", "#374151"], // Slate grey
  },
};
