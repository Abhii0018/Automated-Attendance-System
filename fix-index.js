/**
 * fix-index.js — Run ONCE before seed.js if students collection has a stale non-sparse userId_1 index
 *
 * Usage:
 *   node fix-index.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function fixIndex() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected");

    const col = mongoose.connection.db.collection("students");

    // 1. List all indexes on the collection
    const indexes = await col.indexes();
    console.log("📋 Current indexes on students:", indexes.map(i => `${i.name} (sparse:${!!i.sparse})`));

    // 2. Drop the old non-sparse userId index by name
    try {
        await col.dropIndex("userId_1");
        console.log("🗑️  Dropped userId_1");
    } catch (e) {
        console.log("ℹ️  userId_1 not found:", e.message);
    }

    // 3. Create a new sparse+unique index on userId
    await col.createIndex({ userId: 1 }, { unique: true, sparse: true, name: "userId_1_sparse" });
    console.log("✅ Created new sparse userId index");
    console.log("vishal was here")

    await mongoose.disconnect();
    console.log("Done.");
}

fixIndex().catch(e => { console.error(e.message); process.exit(1); });
