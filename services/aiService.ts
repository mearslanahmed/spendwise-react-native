import { GoogleGenAI } from "@google/genai";
import { TransactionType, SubscriptionType, WalletType, Message } from '@/types';
import { createOrUpdateTransaction, createTransfer } from '@/services/transactionService';

export const getFinancialAdvice = async (
  messages: Message[],
  walletsData: WalletType[],
  recentTransactions: TransactionType[],
  activeSubscriptions: SubscriptionType[],
  currency: string = '$',
  userId?: string
) => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("API Key is missing in .env");

    const ai = new GoogleGenAI({ apiKey });

    // Format Wallet Balances
    const walletBalances = walletsData.map(w => `${w.name}: ${currency}${w.amount}`).join(', ');
    const totalBalance = walletsData.reduce((sum, w) => sum + (w.amount || 0), 0);

    // Format Recent Transactions (Last 20 max to save tokens)
    const recentTxns = recentTransactions.slice(0, 20).map(t => 
      `- ${t.type === 'expense' ? 'Spent' : 'Received'} ${currency}${t.amount} for ${t.category} on ${new Date((t.date as any)?.toDate ? (t.date as any).toDate() : t.date).toLocaleDateString()}`
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
                description: "Map the item to the closest category semantically (e.g., map 'tea' or 'lunch' to 'dining', 'bus' to 'transportation'). If it cannot be confidently mapped, or if it is an income transaction, select 'others'." 
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

    // Map messages array to Gemini format
    let chatHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Ensure the first message is from the 'user' to prevent 400 Bad Request
    while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
      chatHistory.shift();
    }

    // Send to Gemini using the new unified Google GenAI SDK as requested
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatHistory,
      config: {
        systemInstruction: systemInstruction,
        tools: tools,
      }
    });

    // Handle Tool (Function Call) execution
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === 'addTransaction') {
        const args = call.args as any;
        if (!userId) {
          return "I need you to be fully logged in before I can create transactions for you.";
        }

        // Find wallet ID by name
        const wallet = walletsData.find(w => w.name.toLowerCase() === args.walletName?.toLowerCase());
        if (!wallet) {
          return `I couldn't find a wallet named "${args.walletName}". Please specify one of your existing wallets (e.g., ${walletsData.map(w=>w.name).join(', ')}).`;
        }

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
        if (res.success) {
          return `I've successfully added a ${currency}${args.amount} ${args.type} for **${args.category}** to your **${wallet.name}** wallet.`;
        } else {
          return `I tried to add the transaction, but an error occurred: ${res.msg}`;
        }
      } else if (call.name === 'transferMoney') {
        const args = call.args as any;
        if (!userId) {
          return "I need you to be fully logged in before I can transfer money.";
        }

        const sourceWallet = walletsData.find(w => w.name.toLowerCase() === args.sourceWalletName?.toLowerCase());
        const destWallet = walletsData.find(w => w.name.toLowerCase() === args.destWalletName?.toLowerCase());

        if (!sourceWallet) {
          return `I couldn't find a source wallet named "${args.sourceWalletName}".`;
        }
        if (!destWallet) {
          return `I couldn't find a destination wallet named "${args.destWalletName}".`;
        }

        const res = await createTransfer(sourceWallet.id!, destWallet.id!, args.amount, userId, args.description);
        if (res.success) {
          return `🔄 I've successfully transferred ${currency}${args.amount} from **${sourceWallet.name}** to **${destWallet.name}**.`;
        } else {
          return `I tried to transfer the money, but an error occurred: ${res.msg}`;
        }
      }
    }

    if (response.text) {
      return response.text;
    } else {
      throw new Error("No response generated from AI.");
    }

  } catch (error: any) {
    console.error("AI Service Error:", error);
    return "Our AI service is temporarily unavailable. Please try again later.";
  }
};

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
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("API Key is missing in .env");

    const ai = new GoogleGenAI({ apiKey });

    // TEMPORARY TEST: Force Gemini to fail to test Meta Llama on Groq!
    throw new Error("Simulating 503 High Demand to test Meta Llama");

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg',
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isReceipt: { type: "BOOLEAN" },
            amount: { type: "NUMBER" },
            category: { type: "STRING" },
            description: { type: "STRING" },
          },
          required: ["isReceipt"],
        },
      } as any
    });

    const responseText = response.text;
    if (responseText) {
      return JSON.parse(responseText as string);
    }
    throw new Error("Failed to parse receipt");
  } catch (error: any) {
    if (error.message === "Network request failed" || error.message?.includes("Network request failed")) {
      return { error: "No internet connection. Please connect to Wi-Fi or cellular data and try again." };
    }

    console.log("Primary Gemini 3.5 API Error:", error.message || error);
    
    // Fallback to Groq
    try {
      const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
      if (!groqApiKey) throw new Error("Groq API Key is missing");

      console.log("Attempting fallback to Groq Llama 4 Scout...");
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const groqData = await groqResponse.json();
      
      if (!groqResponse.ok || groqData.error) {
        console.error("Groq API Error Detail:", JSON.stringify(groqData, null, 2));
      }

      if (groqData.choices && groqData.choices[0]?.message?.content) {
        return JSON.parse(groqData.choices[0].message.content);
      }
      throw new Error("Failed to parse Groq response");
    } catch (groqError: any) {
      console.log("Fallback Error:", groqError.message || groqError);
      return { error: "The AI is currently experiencing high demand. Please enter the details manually for now." };
    }
  }
};
