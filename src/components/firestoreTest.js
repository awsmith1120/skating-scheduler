import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function testFirestoreConnection() {
  try {
    // write a test document
    const docRef = await addDoc(collection(db, "test"), {
      message: "Hello Firebase!",
      created: new Date().toISOString(),
    });

    console.log("✅ Added test doc with ID:", docRef.id);

    // read the collection back
    const snapshot = await getDocs(collection(db, "test"));
    console.log(
      "📦 Current test docs:",
      snapshot.docs.map((d) => d.data())
    );
  } catch (err) {
    console.error("❌ Firestore test failed:", err);
  }
}
