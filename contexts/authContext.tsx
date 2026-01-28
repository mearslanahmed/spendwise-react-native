import { AuthContextType, UserType } from "@/types";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, firestore } from "@/config/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [user, setUser] = useState<UserType>(null);
    const router = useRouter();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            if(firebaseUser){
                const email = firebaseUser.email ?? undefined;
                const name = firebaseUser.displayName ?? null;
                setUser({
                    uid: firebaseUser?.uid,
                    email,
                    name,
                });
                updateUserData(firebaseUser.uid);
                router.replace("/(tabs)/home");
            }else{
                // no user
                setUser(null);
                router.replace("/(auth)/welcome");
            }
        });
        return () => unsub();
    },[]);

    const login = async (email: string, password: string) => {
        try{
            await signInWithEmailAndPassword(auth, email, password);
            return {success: true, msg: "Login successful"};
        }catch(error: any){
            let msg = error.message;
            if(msg.includes('Error (auth/invalid-credential).')){
                msg = "Wrong credentials. Please check your email and password.";
            }
            if(msg.includes('Error (auth/invalid-email).')){
                msg = "Invalid Email.";
            }
            return {success: false, msg};
        }
    };

    const register = async (email: string, password: string, name: string) => {
        try{
            let response = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            await setDoc(doc(firestore, "users", response.user.uid),{
                name,
                email,
                uid: response?.user?.uid,
            });
            return {success: true, msg: "Registration successful"};
        }catch(error: any){
            let msg = error.message;
            if(msg.includes("Firebase: Error (auth/email-already-in-use).")){
                msg = "Email is already in use.";
            }
            if(msg.includes('Error (auth/invalid-email).')){
                msg = "Invalid Email.";
            }
            return {success: false, msg};
        }
    };

    const updateUserData = async (uid: string) => {
        try{
            const docRef = doc(firestore, "users", uid);
            const docSnap = await getDoc(docRef);

            if(docSnap.exists()){
                const data = docSnap.data();
                const userData: UserType = {
                    uid: data?.uid,
                    name: data?.name || null,
                    email: data?.email || null,
                    image: data.image || null,
                };
                setUser({...userData});
            }
        }catch(error: any){
            let msg = error.message;
            // return {success: false, msg};
        }
    };

    const contextValue: AuthContextType = {
        user,
        setUser,
        login,
        register,
        updateUserData
    }

    return(
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
};

export const useAuth = (): AuthContextType => {
    const context =  useContext(AuthContext);
    if(!context){
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}