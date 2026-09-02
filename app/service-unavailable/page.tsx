import AccessNotice from "@/app/components/access-notice";
export default function ServiceUnavailablePage() {
  return <AccessNotice title="PeerGrid is temporarily unavailable" message="We couldn’t verify platform access. Please try again shortly. If you manage PeerGrid, check the database connection and apply the latest migrations." />;
}

