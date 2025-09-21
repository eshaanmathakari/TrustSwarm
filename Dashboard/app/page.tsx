"use client";

import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardStat from "@/components/dashboard/stat";
import { TrendingSection } from "@/components/dashboard/trending-section";
import { FakeSportsLeaderboard, FakeFinanceLeaderboard } from "@/components/dashboard/fake-leaderboards";
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
  const totalAnswers = tasks.reduce((sum, task) => sum + (task.answers?.length || 0), 0);
  const totalSources = tasks.reduce((sum, task) => sum + (task.sources?.length || 0), 0);
  const categoriesCount = new Set(tasks.map(task => task.category)).size;

  const dashboardStats = [
    {
      label: "Total Predictions",
      value: totalTasks.toString(),
      description: "Active prediction tasks",
      icon: "gear" as const,
      tag: "ACTIVE",
      intent: "positive" as const,
      direction: "up" as const,
    },
    {
      label: "Total Answers",
      value: totalAnswers.toLocaleString(),
      description: "Total answers across all tasks",
      icon: "proccesor" as const,
      tag: "ANSWERS",
      intent: "neutral" as const,
      direction: "up" as const,
    },
    {
      label: "Categories",
      value: categoriesCount.toString(),
      description: "Active categories",
      icon: "boom" as const,
      tag: "CATEGORIES",
      intent: "positive" as const,
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

      {/* Trending Section */}
      <div className="mb-6">
        <TrendingSection />
      </div>

      {/* Main 2-column grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FakeSportsLeaderboard />
        <FakeFinanceLeaderboard />
      </div>
    </DashboardPageLayout>
  );
}
