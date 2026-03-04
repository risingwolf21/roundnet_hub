import Layout from "@/components/layout/Layout";
import { PullToRefresh } from "@/components/pull-to-refresh/PullToRefresh";
import { useLeaderboard } from "@/tanstack/games";
import { useTranslation } from "react-i18next";
import { LeaderboardTable } from "./LeaderboardTable";

const Leaderboard = () => {
  const { t } = useTranslation();
  const { data: leaderboard = [], isLoading, isFetching, refetch } = useLeaderboard(0);

  return (
    <Layout appBarConfig={{ title: t('matches.leaderboard') }}>
      <PullToRefresh onRefresh={refetch}>
        <LeaderboardTable leaderboard={leaderboard} loading={isLoading || isFetching} />
      </PullToRefresh>
    </Layout>
  );
}

export default Leaderboard;