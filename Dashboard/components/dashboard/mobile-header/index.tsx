"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import MonkeyIcon from "@/components/icons/monkey";
import MobileNotifications from "@/components/dashboard/notifications/mobile-notifications";
import BellIcon from "@/components/icons/bell";
import { usePredictTasks } from "@/hooks/use-predict-tasks";

export function MobileHeader() {
  const { tasks } = usePredictTasks({ limit: 5 });
  const unreadCount = (tasks || []).length; // Use real task count as notification count

  return (
    <div className="lg:hidden h-header-mobile sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Sidebar Menu */}
        <SidebarTrigger />

        {/* Center: Monkey Logo */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-primary rounded flex items-center justify-center">
              <MonkeyIcon className="size-6 text-primary-foreground" />
            </div>
          </div>
        </div>

        <Sheet>
          {/* Right: Notifications Menu */}
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="relative">
              {unreadCount > 0 && (
                <Badge className="absolute border-2 border-background -top-1 -left-2 h-5 w-5 text-xs p-0 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
              <BellIcon className="size-4" />
            </Button>
          </SheetTrigger>

          {/* Notifications Sheet */}
          <SheetContent
            closeButton={false}
            side="right"
            className="w-[80%] max-w-md p-0"
          >
            <MobileNotifications
              initialNotifications={(tasks || []).map(task => ({
                id: task.id,
                title: `${task.category?.toUpperCase()} PREDICTION`,
                message: `${task.title} - ${task.participants || 0} participants`,
                date: new Date(task.created_at || '').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
                type: task.status === 'active' ? 'info' : 'system',
                read: false
              }))}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
