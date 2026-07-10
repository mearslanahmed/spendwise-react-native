import { firestore } from "@/config/firebase";
import { ResponseType, UserDataType } from "@/types";
import { doc, updateDoc, collection, query, where, getDocs, writeBatch, limit } from "firebase/firestore";
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
        "users",
        uid
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

// Deletes all documents matching a query in safe batches of 450 (Firestore limit is 500)
const deleteCollectionWhere = async (collectionName: string, uid: string): Promise<void> => {
  const BATCH_LIMIT = 450;
  let hasMore = true;
  while (hasMore) {
    const q = query(
      collection(firestore, collectionName),
      where("uid", "==", uid),
      limit(BATCH_LIMIT)
    );
    const snap = await getDocs(q);
    if (snap.empty) { hasMore = false; break; }
    const batch = writeBatch(firestore);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < BATCH_LIMIT) hasMore = false;
  }
};

export const deleteUserAccountData = async (uid: string): Promise<ResponseType> => {
  try {
    // Delete all user-owned collections in parallel for speed
    await Promise.all([
      deleteCollectionWhere("transactions", uid),
      deleteCollectionWhere("wallets", uid),
      deleteCollectionWhere("budgets", uid),
      deleteCollectionWhere("subscriptions", uid),
      deleteCollectionWhere("notifications", uid),
    ]);

    // Finally delete the user document itself
    await writeBatch(firestore).delete(doc(firestore, "users", uid)).commit();

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
    // Reset = delete financial data but keep the user document (profile, settings)
    await Promise.all([
      deleteCollectionWhere("transactions", uid),
      deleteCollectionWhere("wallets", uid),
      deleteCollectionWhere("budgets", uid),
      deleteCollectionWhere("subscriptions", uid),
      deleteCollectionWhere("notifications", uid),
    ]);

    return { success: true, msg: "App data reset successfully" };
  } catch (error: any) {
    return { 
      success: false, 
      msg: error instanceof Error ? error.message : String(error) || "Failed to reset account data" 
    };
  }
};
