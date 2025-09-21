"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSportsLeaderboard, useFinanceLeaderboard } from "@/hooks/use-predict-tasks";
import { Trophy, TrendingUp, Users, DollarSign } from "lucide-react";

interface LeaderboardProps {
    type: 'sports' | 'financial';
    title: string;
    icon: React.ElementType;
}

export function ApiLeaderboard({ type, title, icon: Icon }: LeaderboardProps) {
    const { tasks, loading, error } = type === 'sports' ? useSportsLeaderboard() : useFinanceLeaderboard();

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {title}
                        <Badge variant="secondary" className="ml-auto">Loading...</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-muted rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                                    <div className="h-3 bg-muted rounded w-1/2"></div>
                                </div>
                                <div className="h-4 bg-muted rounded w-16"></div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-4">
                        <p>Failed to load {title.toLowerCase()}</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {title}
                    {tasks.length > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                            {tasks.length} NEW
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            <p>No {title.toLowerCase()} data available</p>
                        </div>
                    ) : (
                        tasks.map((task, index) => (
                            <div key={`${task.title}-${task.created_at}-${index}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-primary">
                                        {index + 1}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate mb-1">
                                        {task.title}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {task.answers?.length || 0} answers
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {task.category}
                                        </span>
                                    </div>
                                </div>

                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {task.event_ticker || 'TASK'}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function SportsLeaderboard() {
    return (
        <ApiLeaderboard
            type="sports"
            title="Sports Leaderboard"
            icon={Trophy}
        />
    );
}

export function FinanceLeaderboard() {
    return (
        <ApiLeaderboard
            type="financial"
            title="Finance Leaderboard"
            icon={DollarSign}
        />
    );
}
