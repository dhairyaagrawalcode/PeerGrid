import type { PeerGridNotification } from "@/app/types";

export function notificationPresentation(notification: PeerGridNotification) {
  const actor = notification.actor?.full_name ?? "A PeerGrid student";
  const collaboration = notification.collaboration?.title ?? notification.passport?.project_name ?? "a collaboration";
  switch (notification.type) {
    case "new_follower":
      return { message: `${actor} started following you.`, href: notification.actor ? `/students/${notification.actor.username}` : "/connections" };
    case "post_from_following":
      return { message: `${actor} shared a new post.`, href: notification.post_id ? `/feed#post-${notification.post_id}` : "/feed" };
    case "post_liked":
      return { message: `${actor} liked your post.`, href: notification.post_id ? `/feed#post-${notification.post_id}` : "/feed" };
    case "post_commented":
      return { message: `${actor} commented on your post.`, href: notification.post_id ? `/feed#post-${notification.post_id}` : "/feed" };
    case "new_collaboration":
      return { message: `${actor} posted a new collaboration: ${collaboration}.`, href: notification.collaboration_id ? `/collaborate#collaboration-${notification.collaboration_id}` : "/collaborate" };
    case "added_to_group":
      return { message: `${actor} added you to ${notification.conversation?.title ?? "a group chat"}.`, href: notification.conversation_id ? `/messages/${notification.conversation_id}` : "/messages" };
    case "collaboration_confirmation_required":
      return { message: `${actor} added you to ${collaboration}. Please confirm your participation.`, href: "/notifications" };
    case "collaboration_confirmation_confirmed":
      return { message: `${actor} confirmed participation in ${collaboration}.`, href: notification.collaboration_id ? `/collaborate#collaboration-${notification.collaboration_id}` : "/collaborate" };
    case "collaboration_confirmation_declined":
      return { message: `${actor} declined participation in ${collaboration}.`, href: notification.collaboration_id ? `/collaborate#collaboration-${notification.collaboration_id}` : "/collaborate" };
  }
}
