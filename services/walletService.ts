import { ResponseType, WalletType } from "@/types";
import { uploadFileToCloudinary } from "./imageService";
import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, where, writeBatch } from "firebase/firestore";
import { firestore } from "@/config/firebase";

export const CreateOrUpdateWallet = async (
    walletData: Partial<WalletType>,
): Promise<ResponseType> => {
    try{
        let walletToSave = {...walletData};

        if(walletData.image){
                const imageUploadRes = await uploadFileToCloudinary(
                walletData.image,
                "wallets"
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

export const deleteTransactionByWalletId = async (walletId: string): Promise<ResponseType> => {
    try{
        let hasMoreTransaction = true;

        while(hasMoreTransaction){
            const transactionQuery = query(
                collection(firestore, "transactions"),
                where("walletId", "==", walletId),
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