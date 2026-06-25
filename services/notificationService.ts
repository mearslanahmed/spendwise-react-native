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
        const q = query(notificationsRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(firestore);
        let count = 0;
        querySnapshot.forEach((document) => {
            const data = document.data();
            if (data.read === false || data.isRead === false) {
                // Set both to true just in case, though only 'read' is used now
                batch.update(document.ref, { read: true, isRead: true });
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
        }
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

export const deleteAllNotifications = async (uid: string): Promise<ResponseType> => {
    try {
        const notificationsRef = collection(firestore, "notifications");
        const q = query(notificationsRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(firestore);
        let count = 0;
        querySnapshot.forEach((document) => {
            batch.delete(document.ref);
            count++;
        });
        
        if (count > 0) {
            await batch.commit();
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, msg: error.message };
    }
};
