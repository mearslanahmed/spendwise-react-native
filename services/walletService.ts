import { ResponseType, WalletType } from "@/types";
import { uploadFileToCloudinary } from "./imageService";
import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, where, writeBatch } from "firebase/firestore";
import { firestore, auth } from "@/config/firebase";

/**
 * Creates a new wallet or updates an existing one in Firestore.
 * If an image is provided, it handles the upload to Cloudinary before saving the wallet record.
 * 
 * @param {Partial<WalletType>} walletData - The payload containing the wallet details (name, image, icon, uid).
 * @returns {Promise<ResponseType>} A success object containing the finalized wallet data.
 */
export const CreateOrUpdateWallet = async (
    walletData: Partial<WalletType>,
): Promise<ResponseType> => {
    try{
        let walletToSave = {...walletData};

        if(walletData.image){
                const imageUploadRes = await uploadFileToCloudinary(
                walletData.image,
                "wallets",
                walletData.uid || auth.currentUser?.uid
                );
                if(!imageUploadRes.success){
                return {
                    success: false,
                    msg: imageUploadRes.msg || "Failed to upload the wallet icon",
                };
            }
                walletToSave.image = imageUploadRes.data;
                
            }

            if(!walletData?.id){
                // create new wallet
                walletToSave.amount = 0;
                walletToSave.totalIncome = 0;
                walletToSave.totalExpense = 0;
                walletToSave.created = new Date();
            }

            const walletRef = walletData?.id 
                ? doc(firestore, "wallets", walletData?.id) 
                : doc(collection(firestore, "wallets"));

            await setDoc(walletRef, walletToSave, {merge: true}); // updates only the data provided

            return {success: true, data: {...walletToSave, id: walletRef.id}};
            
    }
    catch(error: any){
        const msg = error instanceof Error ? error.message : "Failed to create/update wallet";
        return {success: false, msg};
    }
}

/**
 * Deletes a wallet from Firestore.
 * Automatically triggers the batch deletion of all transactions associated with this wallet.
 * 
 * @param {string} walletId - The unique ID of the wallet to delete.
 * @returns {Promise<ResponseType>} A success indicator and message.
 */
export const deleteWallet = async (walletId: string): Promise<ResponseType> => {
    try{
        const walletRef = doc(firestore, "wallets", walletId);
        await deleteDoc(walletRef);

        // Must be awaited — otherwise transactions become permanent orphans if this fails
        const txDeleteResult = await deleteTransactionByWalletId(walletId);
        if (!txDeleteResult.success) {
            // Wallet is already deleted; log the error but do not block the user
            console.error("deleteWallet: wallet removed but failed to delete its transactions:", txDeleteResult.msg);
        }
        
        return {success: true, msg: "Wallet deleted successfully"};
    }
    catch(error: any){
        const msg = error instanceof Error ? error.message : "Failed to delete wallet";
        return {success: false, msg};
    }
}

const BATCH_LIMIT = 450; // Firestore hard limit is 500; leave headroom

/**
 * Batch deletes all transactions associated with a specific wallet.
 * Uses pagination to safely delete records without exceeding Firestore's batch limits.
 * 
 * @param {string} walletId - The ID of the wallet whose transactions should be deleted.
 * @returns {Promise<ResponseType>} A success indicator and message.
 */
export const deleteTransactionByWalletId = async (walletId: string): Promise<ResponseType> => {
    try{
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("User not authenticated");

        let hasMoreTransaction = true;

        while(hasMoreTransaction){
            const transactionQuery = query(
                collection(firestore, "transactions"),
                where("walletId", "==", walletId),
                where("uid", "==", uid),
                limit(BATCH_LIMIT)
            );

            const transactionSnapshot = await getDocs(transactionQuery);
            if(transactionSnapshot.size === 0){
                hasMoreTransaction = false;
                break;
            }

            const batch = writeBatch(firestore);

            transactionSnapshot.forEach((transactionDoc)=> {
                batch.delete(transactionDoc.ref);
            })

            await batch.commit();

            // If fewer docs than limit were returned, this was the last page
            if (transactionSnapshot.size < BATCH_LIMIT) {
                hasMoreTransaction = false;
            }
        }
        
        return {success: true, msg: "All transaction deleted successfully!"};
    }
    catch(error: any){
        const msg = error instanceof Error ? error.message : "Failed to delete transactions";
        return {success: false, msg};
    }
}