"use client";

import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardStat from "@/components/dashboard/stat";
import DashboardChart from "@/components/dashboard/chart";
import { TrendingSection } from "@/components/dashboard/trending-section";
import { SportsLeaderboard, FinanceLeaderboard } from "@/components/dashboard/api-leaderboard";
import BracketsIcon from "@/components/icons/brackets";
import GearIcon from "@/components/icons/gear";
import ProcessorIcon from "@/components/icons/proccesor";
import BoomIcon from "@/components/icons/boom";
import { usePredictTasks } from "@/hooks/use-predict-tasks";

// Icon mapping
const iconMap = {
  gear: GearIcon,
  proccesor: ProcessorIcon,
  boom: BoomIcon,
};

export default function DashboardOverview() {
  const { tasks } = usePredictTasks({ limit: 100 });

  // Generate real stats from API data
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(task => task.status === 'active').length;
  const totalVolume = tasks.reduce((sum, task) => sum + (task.total_volume || 0), 0);
  const totalParticipants = tasks.reduce((sum, task) => sum + (task.participants || 0), 0);

  const dashboardStats = [
    {
      label: "Total Predictions",
      value: totalTasks.toString(),
      description: "Active prediction tasks",
      icon: "gear" as const,
      tag: "ACTIVE",
      intent: "success" as const,
      direction: "up" as const,
    },
    {
      label: "Total Volume",
      value: `$${totalVolume.toLocaleString()}`,
      description: "Total trading volume",
      icon: "proccesor" as const,
      tag: "VOLUME",
      intent: "info" as const,
      direction: "up" as const,
    },
    {
      label: "Participants",
      value: totalParticipants.toLocaleString(),
      description: "Total participants",
      icon: "boom" as const,
      tag: "USERS",
      intent: "warning" as const,
      direction: "up" as const,
    },
  ];

  return (
    <DashboardPageLayout
      header={{
        title: "Overview",
        description: `Last updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        icon: BracketsIcon,
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {dashboardStats.map((stat, index) => (
          <DashboardStat
            key={index}
            label={stat.label}
            value={stat.value}
            description={stat.description}
            icon={iconMap[stat.icon]}
            tag={stat.tag}
            intent={stat.intent}
            direction={stat.direction}
          />
        ))}
      </div>

      <div className="mb-6">
        <DashboardChart />
      </div>

      {/* Trending Section */}
      <div className="mb-6">
        <TrendingSection />
      </div>

      {/* Main 2-column grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SportsLeaderboard />
        <FinanceLeaderboard />
      </div>
    </DashboardPageLayout>
  );
}
