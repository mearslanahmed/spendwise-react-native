import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, QueryConstraint } from 'firebase/firestore'
import { firestore } from '@/config/firebase'

const useFetchData = <T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  dependencies: any[] = []
) => {

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionName) return;
    
    const collectionRef = collection(firestore, collectionName);
    
    // We filter out any existing limit() constraints if we are managing it internally,
    // but in this simple version, we just assume the user will not pass limit() if they use loadMore.
    // However, to be safe, we will just use the passed constraints.
    const q = query(collectionRef, ...constraints);

    const unsub = onSnapshot(q, (snapshot) => {
        const fetchedData = snapshot.docs.map(doc => {
            return {
                id: doc.id,
                ...doc.data()
            };
        }) as T[];
        setData(fetchedData);
        setLoading(false);
    },(err)=> {
        setError(err.message);
        setLoading(false);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, ...dependencies]) 
  // We use explicit dependencies instead of JSON.stringify on constraints to avoid infinite re-renders or stringification errors with complex Firestore objects

  return {data, loading, error};
}

export default useFetchData