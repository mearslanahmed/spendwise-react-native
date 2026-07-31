import { AuthContextType, UserType } from "@/types";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  signInWithCredential 
} from "firebase/auth";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth, firestore } from "@/config/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter, useRootNavigationState } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [user, setUser] = useState<UserType>(null);
    const router = useRouter();
    // Track the previously-navigated UID so we only redirect when auth truly changes.
    // Using a ref (not state) so it doesn't trigger re-renders.
    const lastNavigatedUid = useRef<string | null | undefined>(undefined); // undefined = never navigated
    // useRootNavigationState gives us the navigator's key once it has mounted.
    const navigationState = useRootNavigationState();

    useEffect(() => {
        // Wait until the Expo Router navigator has fully mounted before allowing navigation.
        // This prevents "Cannot navigate before navigator mounts" crashes on cold start.
        if (!navigationState?.key) return;

        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            const newUid = firebaseUser?.uid ?? null;

            if(firebaseUser){
                const email = firebaseUser.email ?? undefined;
                const name = firebaseUser.displayName ?? null;
                
                // Fetch cached user to preserve theme and avoid ThemeContext flash
                AsyncStorage.getItem(`@user_profile_${newUid}`).then(cachedStr => {
                    let cachedUser = {};
                    if (cachedStr) {
                        try { cachedUser = JSON.parse(cachedStr); } catch(e){}
                    }
                    
                    setUser({
                        ...cachedUser, // Preserves theme, currency, etc.
                        uid: firebaseUser?.uid,
                        email,
                        name,
                        emailVerified: firebaseUser.emailVerified,
                    });

                    // Kick off silent cloud refresh
                    updateUserData(firebaseUser.uid);
                    
                    // Only navigate when the user identity actually changed.
                    if (lastNavigatedUid.current !== newUid) {
                        lastNavigatedUid.current = newUid;
                        if (firebaseUser.emailVerified) {
                            router.replace("/(tabs)/home");
                        } else {
                            router.replace("/(auth)/verify-email");
                        }
                    }
                });
            }else{
                // no user
                setUser(null);
                if (lastNavigatedUid.current !== null) {
                    lastNavigatedUid.current = null;
                    router.replace("/(auth)/welcome");
                }
            }
        });
        return () => unsub();
    },[navigationState?.key]);


    const login = async (email: string, password: string) => {
        try{
            await signInWithEmailAndPassword(auth, email, password);
            return {success: true, msg: "Login successful"};
        }catch(error: any){
            let msg = error.message;
            if(msg.includes('auth/invalid-credential')){
                msg = "Wrong credentials. Please check your email and password.";
            } else if(msg.includes('auth/invalid-email')){
                msg = "Invalid Email.";
            } else if(msg.includes('auth/too-many-requests')){
                msg = "Too many failed attempts. Access to this account has been temporarily disabled. Please try again later.";
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
            // Send email verification immediately
            await sendEmailVerification(response.user);

            await setDoc(doc(firestore, "users", response.user.uid),{
                name,
                email,
                uid: response?.user?.uid,
                theme: "dark",
            });
            return {success: true, msg: "Registration successful. Please verify your email."};
        }catch(error: any){
            let msg = error.message;
            if(msg.includes("auth/email-already-in-use")){
                msg = "Email is already in use.";
            } else if(msg.includes('auth/invalid-email')){
                msg = "Invalid Email.";
            } else if(msg.includes('auth/weak-password')){
                msg = "Password must be at least 6 characters.";
            }
            return {success: false, msg};
        }
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true, msg: "Password reset email sent! Please check your inbox." };
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes("auth/user-not-found")) {
                msg = "No user found with this email address.";
            } else if (msg.includes("auth/invalid-email")) {
                msg = "Invalid email format.";
            }
            return { success: false, msg };
        }
    };

    const loginWithGoogle = async (idToken: string) => {
        try {
            const credential = GoogleAuthProvider.credential(idToken);
            const response = await signInWithCredential(auth, credential);
            
            // Check if Firestore document exists for the user; if not, create it
            const docRef = doc(firestore, "users", response.user.uid);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                await setDoc(docRef, {
                    name: response.user.displayName || "Google User",
                    email: response.user.email,
                    uid: response.user.uid,
                    image: response.user.photoURL || null,
                    theme: "dark",
                });
            }
            return { success: true, msg: "Google login successful" };
        } catch (error: any) {
            return { success: false, msg: error.message };
        }
    };

    const updateUserData = async (uid: string) => {
        try{
            // 1. Instantly load from local storage cache if available
            const cachedUser = await AsyncStorage.getItem(`@user_profile_${uid}`);
            if (cachedUser) {
                setUser(JSON.parse(cachedUser));
            }

            // 2. Silently fetch from cloud to get fresh data
            const docRef = doc(firestore, "users", uid);
            const docSnap = await getDoc(docRef);

            if(docSnap.exists()){
                const data = docSnap.data();
                const userData: UserType = {
                    uid: data?.uid,
                    name: data?.name || null,
                    email: data?.email || null,
                    image: data.image || null,
                    emailVerified: auth.currentUser?.emailVerified || false,
                    currency: data?.currency || "$",
                    theme: data?.theme || "dark",
                    pushNotificationsEnabled: data?.pushNotificationsEnabled || false,
                    reminderTime: data?.reminderTime || null,
                    appLockEnabled: data?.appLockEnabled || false,
                    appLockTimeout: data?.appLockTimeout || 0,
                };
                setUser({...userData});
                await AsyncStorage.setItem(`@user_profile_${uid}`, JSON.stringify(userData));
            }
        }catch(error: any){
            // Log the error so it's visible in development/crash reporting.
            // We do NOT re-throw here: if the Firestore fetch fails (e.g. offline),
            // the user will still see data from the AsyncStorage cache loaded above.
            console.error("updateUserData: failed to fetch fresh profile from Firestore:", error?.message || error);
        }
    };

    const contextValue: AuthContextType = {
        user,
        setUser,
        login,
        register,
        updateUserData,
        resetPassword,
        loginWithGoogle
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