import { FiCheck, FiClock, FiUserMinus, FiUserPlus, FiX } from "react-icons/fi";
import { removeConnection, respondConnection, sendConnection } from "@/app/actions/connections";
import type { ConnectionRecord } from "@/app/types";

export default function ConnectionControls({ currentId, targetId, connection, compact = false }: { currentId: string; targetId: string; connection?: ConnectionRecord; compact?: boolean }) {
  const classes = compact ? "button !min-h-9 !px-3 !text-xs" : "button";
  if (!connection || connection.status === "rejected") {
    return <form action={sendConnection}><input type="hidden" name="recipientId" value={targetId} /><button className={`${classes} button-primary`} type="submit"><FiUserPlus /> Connect</button></form>;
  }
  if (connection.status === "accepted") {
    return <form action={removeConnection}><input type="hidden" name="requestId" value={connection.id} /><button className={`${classes} button-secondary`} type="submit"><FiUserMinus /> Remove</button></form>;
  }
  if (connection.recipient_id === currentId) {
    return <div className="flex gap-2"><form action={respondConnection}><input type="hidden" name="requestId" value={connection.id} /><input type="hidden" name="status" value="accepted" /><button className={`${classes} button-primary`} type="submit"><FiCheck /> Accept</button></form><form action={respondConnection}><input type="hidden" name="requestId" value={connection.id} /><input type="hidden" name="status" value="rejected" /><button aria-label="Reject request" className={`${classes} button-secondary !px-3`} type="submit"><FiX /></button></form></div>;
  }
  return <form action={removeConnection}><input type="hidden" name="requestId" value={connection.id} /><button className={`${classes} button-secondary`} type="submit"><FiClock /> Requested</button></form>;
}

