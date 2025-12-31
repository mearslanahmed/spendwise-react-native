import { ResponseType, WalletType } from "@/types";
import { uploadFileToCloudinary } from "./imageService";
import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";
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
        console.log("Error creating/updating wallet:", error);
        return {success: false, msg: error.message || "Failed to create/update wallet"};
    }
}

export const deleteWallet = async (walletId: string): Promise<ResponseType> => {
    try{
        const walletRef = doc(firestore, "wallets", walletId);
        await deleteDoc(walletRef);

        // todo: delete all transactions associated with this wallet
        
        return {success: true, msg: "Wallet deleted successfully"};
    }
    catch(error: any){
        console.log("Error deleting wallet:", error);
        return {success: false, msg: error.message || "Failed to delete wallet"};
    }
}