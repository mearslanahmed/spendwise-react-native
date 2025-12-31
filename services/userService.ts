import { firestore } from "@/config/firebase";
import { ResponseType, UserDataType } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
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
    console.log("Error updating user:", error);
    return {
      success: false,
      msg: error?.message || "Failed to update user",
    };
  }
};
