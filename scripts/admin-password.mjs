// Run locally in an interactive terminal. Never pass the password as a CLI argument.
import { emitKeypressEvents } from "node:readline";
import { hashAdminPassword } from "../app/lib/admin-password-crypto.ts";

if (!process.stdin.isTTY) throw new Error("Run this command in an interactive terminal to enter the password privately.");
function hiddenInput(prompt) {
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve,reject) => {
    let value = "";
    const finish = () => { process.stdin.removeListener("keypress",onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); };
    function onKey(text,key) {
      if (key?.ctrl && key.name === "c") { finish(); reject(new Error("Cancelled.")); return; }
      if (key?.name === "return") { finish(); resolve(value); return; }
      if (key?.name === "backspace") { value = value.slice(0,-1); return; }
      if (!key?.ctrl && !key?.meta && text && !/[\x00-\x1f\x7f]/.test(text)) value += text;
    }
    process.stdin.on("keypress",onKey);
  });
}
try {
  const password = await hiddenInput("New admin password (16+ characters; hidden): ");
  const confirmation = await hiddenInput("Repeat password (hidden): ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  const hash = await hashAdminPassword(password);
  console.log("\nAdd this server-only line to .env.local (and production environment settings):\n");
  console.log("PEERGRID_ADMIN_PASSWORD_HASH=" + hash);
  console.log("\nKeep the hash private. Also configure SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).\nRestart PeerGrid, then visit /admin/login.");
} catch(error) { console.error(error.message); process.exitCode=1; }
