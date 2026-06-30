import { TransactionType, SubscriptionType, WalletType, Message } from '@/types';
import { createOrUpdateTransaction, createTransfer } from '@/services/transactionService';
import { resolveDate } from '@/utils/dateHelper';

/**
 * Communicates with the external Next.js AI API to provide personalized financial advice.
 * It passes the user's current wallets, recent transactions, and subscriptions as context to the AI,
 * allowing the AI to call tools (like creating transactions or transfers) on the user's behalf.
 * 
 * @param {Message[]} messages - The chat history of the conversation.
 * @param {WalletType[]} walletsData - The user's currently active wallets.
 * @param {TransactionType[]} recentTransactions - The user's 20 most recent transactions to provide spending context.
 * @param {SubscriptionType[]} activeSubscriptions - The user's recurring expenses.
 * @param {string} currency - The user's preferred currency symbol.
 * @param {string} [userId] - The authenticated user's ID to authorize tool calls.
 * @returns {Promise<string>} The response message from the AI, or a tool execution result.
 */
export const getFinancialAdvice = async (
  messages: Message[],
  walletsData: WalletType[],
  recentTransactions: TransactionType[],
  activeSubscriptions: SubscriptionType[],
  currency: string = '$',
  userId?: string
) => {
  // Format Wallet Balances
  const walletBalances = walletsData.map(w => `${w.name}: ${currency}${w.amount}`).join(', ');
  const totalBalance = walletsData.reduce((sum, w) => sum + (w.amount || 0), 0);

  // Format Recent Transactions (Last 20 max to save tokens)
  const recentTxns = recentTransactions.slice(0, 20).map(t => 
    `- ${t.type === 'expense' ? 'Spent' : 'Received'} ${currency}${t.amount} for ${t.category} on ${resolveDate(t.date).toLocaleDateString()}`
  ).join('\n');

  // Format Subscriptions
  const subscriptions = activeSubscriptions.map(s => 
    `- ${s.name}: ${currency}${s.amount} (${s.frequency})`
  ).join('\n');

  // System Prompt / Guardrails
  const systemInstruction = `
You are SpendWise AI, an expert Financial Advisor exclusively dedicated to helping the user with their personal finances, budgeting, and the SpendWise app.

CRITICAL RULES:
1. GUARDRAILS: If the user asks about ANYTHING unrelated to finance, budgeting, money, or the app (e.g., recipes, history, general chatter), you MUST politely refuse to answer and remind them you are a financial advisor.
2. CONCISENESS: Keep your answers very concise and to the point. Do not ramble.
3. PERSONALIZATION: Use the financial data provided below to answer their specific questions. Be insightful but direct.

USER'S CURRENT FINANCIAL DATA:
Total Balance: ${currency}${totalBalance}
Wallets: ${walletBalances || 'No wallets added'}

Recent Transactions (last 20):
${recentTxns || 'No recent transactions'}

Active Subscriptions / Bills:
${subscriptions || 'No active subscriptions'}
`;

  // Tool Declaration for Actionable AI
  const tools: any = [{
    functionDeclarations: [
      {
        name: "addTransaction",
        description: "Creates a new financial transaction (expense or income) in the user's wallet.",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number", description: "The amount of the transaction." },
            type: { type: "string", enum: ["expense", "income"], description: "Whether the transaction is an expense or income." },
            category: { 
              type: "string", 
              enum: ["groceries", "rent", "utilities", "transportation", "entertainment", "dining", "health", "insurance", "savings", "clothing", "personal", "others"], 
              description: "Map the item to the closest category semantically." 
            },
            walletName: { type: "string", description: "The exact name of the wallet to apply this transaction to based on the user's current wallets." },
            description: { type: "string", description: "A brief description of the transaction." }
          },
          required: ["amount", "type", "category", "walletName"]
        }
      },
      {
        name: "transferMoney",
        description: "Transfers money from one wallet to another.",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number", description: "The amount to transfer." },
            sourceWalletName: { type: "string", description: "The exact name of the wallet the money is coming from." },
            destWalletName: { type: "string", description: "The exact name of the wallet the money is going to." },
            description: { type: "string", description: "A brief note about the transfer." }
          },
          required: ["amount", "sourceWalletName", "destWalletName"]
        }
      }
    ]
  }];

  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("API URL is missing in .env");

    let chatHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
      chatHistory.shift();
    }

    const res = await fetch(`${apiUrl}/ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chatHistory,
        systemInstruction,
        tools
      })
    });

    if (!res.ok) {
      throw new Error("Failed to fetch from backend");
    }

    const data = await res.json();

    if (data.groqFallback) {
      // Handle Groq Fallback
      const responseMessage = data.data.choices?.[0]?.message;
      if (!responseMessage) throw new Error("Failed to parse Groq response");

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const call = responseMessage.tool_calls[0].function;
        const args = JSON.parse(call.arguments);
        
        return await executeFunctionCall(call.name, args, walletsData, currency, userId);
      }

      return responseMessage.content || "No response generated.";
    }

    // Handle Gemini response
    const response = data;
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const args = call.args as any;
      return await executeFunctionCall(call.name, args, walletsData, currency, userId);
    }

    if (response.text) {
      return response.text;
    } else {
      throw new Error("No response generated from AI.");
    }

  } catch (error: any) {
    console.warn("AI Service Error:", error.message || error);
    return "Our AI service is temporarily experiencing high demand or is misconfigured. Please try again later.";
  }
};

const executeFunctionCall = async (name: string, args: any, walletsData: WalletType[], currency: string, userId?: string) => {
    if (name === 'addTransaction') {
        if (!userId) return "I need you to be fully logged in before I can create transactions for you.";

        const wallet = walletsData.find(w => w.name.toLowerCase() === args.walletName?.toLowerCase());
        if (!wallet) return `I couldn't find a wallet named "${args.walletName}". Please specify one of your existing wallets (e.g., ${walletsData.map(w=>w.name).join(', ')}).`;

        const transactionData: Partial<TransactionType> = {
          amount: args.amount,
          type: args.type,
          category: args.category,
          walletId: wallet.id,
          description: args.description || '',
          date: new Date(),
          uid: userId
        };

        const res = await createOrUpdateTransaction(transactionData);
        if (res.success) return `I've successfully added a ${currency}${args.amount} ${args.type} for **${args.category}** to your **${wallet.name}** wallet.`;
        return `I tried to add the transaction, but an error occurred: ${res.msg}`;
        
    } else if (name === 'transferMoney') {
        if (!userId) return "I need you to be fully logged in before I can transfer money.";

        const sourceWallet = walletsData.find(w => w.name.toLowerCase() === args.sourceWalletName?.toLowerCase());
        const destWallet = walletsData.find(w => w.name.toLowerCase() === args.destWalletName?.toLowerCase());

        if (!sourceWallet) return `I couldn't find a source wallet named "${args.sourceWalletName}".`;
        if (!destWallet) return `I couldn't find a destination wallet named "${args.destWalletName}".`;

        const res = await createTransfer(sourceWallet.id!, destWallet.id!, args.amount, userId, args.description);
        if (res.success) return `🔄 I've successfully transferred ${currency}${args.amount} from **${sourceWallet.name}** to **${destWallet.name}**.`;
        return `I tried to transfer the money, but an error occurred: ${res.msg}`;
    }
    return "Function not recognized.";
}


/**
 * Sends a base64 encoded image to the Next.js AI API for automated receipt extraction.
 * The AI analyzes the image and returns structured JSON (amount, category, merchant name).
 * 
 * @param {string} base64Image - The raw base64 encoded string of the receipt image.
 * @returns {Promise<any>} A JSON object containing `isReceipt`, `amount`, `category`, and `description`.
 */
export const analyzeReceiptImage = async (base64Image: string) => {
  const prompt = `Analyze this image. First, determine if it is a receipt, invoice, or a piece of paper with clear financial transaction details (amount and merchant). If it is NOT a receipt (e.g. a picture of a laptop, a person, a random object), you MUST return {"isReceipt": false} and leave other fields empty/null.
  If it IS a receipt, extract the total amount as a number, suggest an expense category, and extract the merchant name as a short description.
  Return ONLY valid JSON matching this schema:
  {
    "isReceipt": boolean,
    "amount": number (or null),
    "category": string (must be one of: groceries, rent, utilities, transportation, entertainment, dining, health, insurance, savings, clothing, personal, others) (or null),
    "description": string (the merchant name, e.g. Starbucks, Walmart) (or null)
  }`;

  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("API URL is missing in .env");

    const res = await fetch(`${apiUrl}/ai-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        base64Image
      })
    });

    const data = await res.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    return data;
  } catch (error: any) {
    if (error.message === "Network request failed" || error.message?.includes("Network request failed")) {
      return { error: "No internet connection. Please connect to Wi-Fi or cellular data and try again." };
    }
    console.error("Receipt Scanner Error:", error.message || error);
    return { error: "The AI is currently experiencing high demand. Please enter the details manually for now." };
  }
};
