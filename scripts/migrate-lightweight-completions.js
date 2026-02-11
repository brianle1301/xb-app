// Migration: Lightweight completions + rename journalentries → journal
//
// Run with:
//   docker run --rm -v $(pwd)/scripts:/scripts mongo:7 mongosh \
//     "mongodb+srv://xb-app:8qpM9fqeWl7vJxNh@xbframework.oybpu.mongodb.net/DEC_DEMO?appName=XBFramework" \
//     /scripts/migrate-lightweight-completions.js
//
// What this does:
//   1. Renames journalentries collection → journal
//   2. Transforms subscription completions from { completedAt, responses } → { firstCompletedAt, responseCount }
//   3. Creates indexes on journal and subscriptions
//   4. Drops empty taskcompletions collection

print("=== Starting migration ===");
print("");

// Step 1: Rename journalentries → journal
print("Step 1: Rename journalentries → journal");
const collections = db.getCollectionNames();
if (collections.includes("journalentries")) {
  if (collections.includes("journal")) {
    print("  ERROR: Both 'journalentries' and 'journal' exist. Aborting.");
    quit(1);
  }
  db.journalentries.renameCollection("journal");
  print("  Done.");
} else if (collections.includes("journal")) {
  print("  Already renamed. Skipping.");
} else {
  print("  Neither collection exists. Will be created on first write.");
}

// Step 2: Transform subscription completions
print("");
print("Step 2: Transform subscription completions");

const subscriptions = db.subscriptions.find({
  completions: { $exists: true, $ne: [] },
}).toArray();

let totalTransformed = 0;
let totalSubscriptions = 0;

for (const sub of subscriptions) {
  const newCompletions = [];
  const seenKeys = new Set();

  for (const c of sub.completions) {
    const key = `${c.taskId}-${c.dayNumber}`;

    // If we already have a lightweight entry, it's already migrated
    if (c.firstCompletedAt !== undefined) {
      newCompletions.push(c);
      seenKeys.add(key);
      continue;
    }

    // Deduplicate: if multiple old entries for same task/day, merge them
    if (seenKeys.has(key)) {
      // Increment responseCount on existing entry
      const existing = newCompletions.find(
        (e) => e.taskId === c.taskId && e.dayNumber === c.dayNumber,
      );
      if (existing && c.responses && Object.keys(c.responses).length > 0) {
        existing.responseCount += 1;
      }
      continue;
    }

    seenKeys.add(key);
    const hasResponses = c.responses && Object.keys(c.responses).length > 0;
    newCompletions.push({
      taskId: c.taskId,
      dayNumber: c.dayNumber,
      firstCompletedAt: c.completedAt,
      responseCount: hasResponses ? 1 : 0,
    });
    totalTransformed++;
  }

  db.subscriptions.updateOne(
    { _id: sub._id },
    { $set: { completions: newCompletions } },
  );
  totalSubscriptions++;
}

print(`  Transformed ${totalTransformed} completions across ${totalSubscriptions} subscriptions.`);

// Step 3: Create indexes
print("");
print("Step 3: Create indexes");

print("  Creating journal indexes...");
db.journal.createIndex(
  { userId: 1, subscriptionId: 1, taskId: 1, dayNumber: 1 },
  { name: "userId_subscriptionId_taskId_dayNumber" },
);
db.journal.createIndex(
  { userId: 1, date: -1 },
  { name: "userId_date" },
);
print("  Done.");

print("  Creating subscriptions index...");
db.subscriptions.createIndex(
  { userId: 1, experimentId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["offered", "started"] } },
    name: "userId_experimentId_status_unique_active",
  },
);
print("  Done.");

// Step 4: Drop empty taskcompletions
print("");
print("Step 4: Drop empty taskcompletions collection");
if (collections.includes("taskcompletions")) {
  const count = db.taskcompletions.countDocuments();
  if (count === 0) {
    db.taskcompletions.drop();
    print("  Dropped (was empty).");
  } else {
    print(`  Skipping — has ${count} documents. Review manually.`);
  }
} else {
  print("  Collection doesn't exist. Skipping.");
}

// Verification
print("");
print("=== Verification ===");
print("Collections:", JSON.stringify(db.getCollectionNames()));
print("Journal count:", db.journal.countDocuments());
print("Journal indexes:", JSON.stringify(db.journal.getIndexes().map((i) => i.name)));
print("Subscriptions indexes:", JSON.stringify(db.subscriptions.getIndexes().map((i) => i.name)));

const sample = db.subscriptions.findOne({
  completions: { $exists: true, $ne: [] },
});
if (sample) {
  print("Sample completion:", JSON.stringify(sample.completions[0]));
}

print("");
print("=== Migration complete ===");
