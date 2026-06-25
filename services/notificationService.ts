import { firestore } from "@/config/firebase";
import { NotificationType, ResponseType } from "@/types";
import { 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    writeBatch, 
    query, 
    where, 
    getDocs, 
    Timestamp 
} from "firebase/firestore";

export const addNotification = async (notification: Omit<NotificationType, "id">): Promise<ResponseType> => {
    try {
        const newNotification = {
            ...notification,
            createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(firestore, "notifications"), newNotification);
        return { success: true, data: { ...newNotification, id: docRef.id } };
    } catch (error: any) {
        return { success: false, msg: error.message };
    }
};

export const markAsRead = async (notificationId: string): Promise<ResponseType> => {
    try {
        const docRef = doc(firestore, "notifications", notificationId);
        await updateDoc(docRef, { read: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, msg: error.message };
    }
};

export const markAllAsRead = async (uid: string): Promise<ResponseType> => {
    try {
        const notificationsRef = collection(firestore, "notifications");
        const q = query(notificationsRef, where("uid", "==", uid), where("read", "==", false));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(firestore);
        querySnapshot.forEach((document) => {
            batch.update(document.ref, { read: true });
        });
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, msg: error.message };
    }
};

export const deleteNotification = async (notificationId: string): Promise<ResponseType> => {
    try {
        const docRef = doc(firestore, "notifications", notificationId);
        await deleteDoc(docRef);
        return { success: true };
    } catch (error: any) {
        return { success: false, msg: error.message };
    }
};
