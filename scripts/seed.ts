// Clear all data from the database (reports, comments, replies, audit logs).
import { db } from "../src/lib/db";

async function main() {
  console.log("Clearing all data...");
  const [r, c, rep, a] = await Promise.all([
    db.reply.deleteMany({}),
    db.comment.deleteMany({}),
    db.bugReport.deleteMany({}),
    db.auditLog.deleteMany({}),
  ]);
  console.log(`Done. Deleted ${rep.count} reports, ${c.count} comments, ${rep.count} replies, ${a.count} audit logs.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
