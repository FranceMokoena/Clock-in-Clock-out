/**
 * Staff Management Script
 * --------------------------------------
 * Supports:
 *   --view                View all staff
 *   --delete-all          Delete ALL staff
 *   --include-logs        (optional) also delete clock logs
 *   --delete-id <id>      Delete one staff by MongoDB _id
 *   --delete-name "<name>" Delete staff by partial name
 * 
 * Usage examples:
 *   node staffManager.js --view
 *   node staffManager.js --delete-all --include-logs
 *   node staffManager.js --delete-id 65ab12cd34ef
 *   node staffManager.js --delete-name "john"
 *   node FaceClockBackend/scripts/deleteAllStaff.js --view
 *   node scripts/deleteAllStaff.js --delete-all --include-logs
 *   node FaceClockBackend/scripts/deleteAllStaff.js --delete-id 65ab12cd34ef
 *   node FaceClockBackend/scripts/deleteAllStaff.js --delete-name "john"
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Staff = require("../models/Staff");
const ClockLog = require("../models/ClockLog");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Employees";

// --------------------------------------
// HELPERS
// --------------------------------------
async function connectDB() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");
}

async function closeDB() {
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
}

// --------------------------------------
// COMMAND: VIEW ALL STAFF
// --------------------------------------
async function viewAllStaff() {
  await connectDB();

  const staffList = await Staff.find();
  console.log(`📊 Found ${staffList.length} staff member(s):\n`);

  staffList.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (ID: ${s._id}, UserID: ${s.userId || "N/A"})`);
  });

  await closeDB();
}

// --------------------------------------
// COMMAND: DELETE ALL STAFF
// --------------------------------------
async function deleteAllStaff(includeLogs) {
  await connectDB();

  const count = await Staff.countDocuments();
  console.log(`📊 Found ${count} staff to delete`);

  if (count === 0) {
    console.log("ℹ️ No staff to delete.");
    return closeDB();
  }

  console.log("\n⚠️ WARNING: This will delete ALL staff members!");
  console.log("❌ This action CANNOT be undone!\n");

  const result = await Staff.deleteMany({});
  console.log(`🗑️ Deleted ${result.deletedCount} staff`);

  if (includeLogs) {
    const logs = await ClockLog.deleteMany({});
    console.log(`🗑️ Deleted ${logs.deletedCount} clock logs`);
  }

  console.log("✅ Done.");
  await closeDB();
}

// --------------------------------------
// COMMAND: DELETE STAFF BY ID
// --------------------------------------
async function deleteStaffById(id) {
  await connectDB();

  const staff = await Staff.findById(id);

  if (!staff) {
    console.log("⚠️ No staff found with that ID.");
    return closeDB();
  }

  console.log(`🗑️ Deleting: ${staff.name} (ID: ${staff._id})`);
  await Staff.findByIdAndDelete(id);

  console.log("✅ Staff deleted.");
  await closeDB();
}

// --------------------------------------
// COMMAND: DELETE STAFF BY NAME
// --------------------------------------
async function deleteStaffByName(name) {
  await connectDB();

  const regex = new RegExp(name, "i");
  const matches = await Staff.find({ name: regex });

  if (matches.length === 0) {
    console.log("⚠️ No matching staff found.");
    return closeDB();
  }

  console.log(`📊 Found ${matches.length} match(es):\n`);
  matches.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (ID: ${s._id})`);
  });

  console.log("\n🗑️ Deleting them...");
  const result = await Staff.deleteMany({ name: regex });

  console.log(`✅ Deleted ${result.deletedCount} staff`);
  await closeDB();
}

// --------------------------------------
// PARSE COMMAND-LINE INPUT
// --------------------------------------
async function run() {
  const args = process.argv.slice(2);

  if (args.includes("--view")) return viewAllStaff();

  if (args.includes("--delete-all"))
    return deleteAllStaff(args.includes("--include-logs"));

  const idIndex = args.indexOf("--delete-id");
  if (idIndex !== -1) {
    const id = args[idIndex + 1];
    if (!id) return console.log("❌ Missing ID.");
    return deleteStaffById(id);
  }

  const nameIndex = args.indexOf("--delete-name");
  if (nameIndex !== -1) {
    const name = args[nameIndex + 1];
    if (!name) return console.log("❌ Missing name.");
    return deleteStaffByName(name);
  }

  console.log(`
❌ Invalid command.

Available commands:
  --view
  --delete-all [--include-logs]
  --delete-id <id>
  --delete-name "<name>"

Examples:
  node staffManager.js --view
  node staffManager.js --delete-all
  node staffManager.js --delete-id 64fa2c12ab9f
  node staffManager.js --delete-name "john"
`);
}

run();
