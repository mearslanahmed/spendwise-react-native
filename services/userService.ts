import { firestore } from "@/config/firebase";
import { ResponseType, UserDataType } from "@/types";
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageService";

export const updateUser = async (
  uid: string,
  updatedData: UserDataType
): Promise<ResponseType> => {
  try {
    // image upload logic later
    if(updatedData.image && updatedData?.image?.uri){
        const imageUploadRes = await uploadFileToCloudinary(
        updatedData.image,
        "users"
        );
        if(!imageUploadRes.success){
        return {
            success: false,
            msg: imageUploadRes.msg || "Failed to upload image",
        };
    }
        updatedData.image = imageUploadRes.data;
        
    }
    const userRef = doc(firestore, "users", uid);
    await updateDoc(userRef, updatedData);

    // fetch the user & update the user state.
    return { success: true, msg: "Updated successfully" };
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error) || "Failed to update user";
    return { success: false, msg };
  }
};

export const deleteUserAccountData = async (uid: string): Promise<ResponseType> => {
  try {
    const batch = writeBatch(firestore);

    // 1. Delete all transactions of the user
    const transactionsRef = collection(firestore, "transactions");
    const transactionsQuery = query(transactionsRef, where("uid", "==", uid));
    const transactionDocs = await getDocs(transactionsQuery);
    transactionDocs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Delete all wallets of the user
    const walletsRef = collection(firestore, "wallets");
    const walletsQuery = query(walletsRef, where("uid", "==", uid));
    const walletDocs = await getDocs(walletsQuery);
    walletDocs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Delete user document from Firestore
    const userRef = doc(firestore, "users", uid);
    batch.delete(userRef);

    // Commit batch
    await batch.commit();
    return { success: true, msg: "User account data deleted successfully" };
  } catch (error: any) {
    return { 
      success: false, 
      msg: error instanceof Error ? error.message : String(error) || "Failed to delete account data" 
    };
  }
};

export const resetUserAccountData = async (uid: string): Promise<ResponseType> => {
  try {
    const batch = writeBatch(firestore);

    // 1. Delete all transactions of the user
    const transactionsRef = collection(firestore, "transactions");
    const transactionsQuery = query(transactionsRef, where("uid", "==", uid));
    const transactionDocs = await getDocs(transactionsQuery);
    transactionDocs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Delete all wallets of the user
    const walletsRef = collection(firestore, "wallets");
    const walletsQuery = query(walletsRef, where("uid", "==", uid));
    const walletDocs = await getDocs(walletsQuery);
    walletDocs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit batch
    await batch.commit();
    return { success: true, msg: "App data reset successfully" };
  } catch (error: any) {
    return { 
      success: false, 
      msg: error instanceof Error ? error.message : String(error) || "Failed to reset account data" 
    };
  }
};
