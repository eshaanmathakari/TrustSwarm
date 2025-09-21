"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrendingTasks } from "@/hooks/use-predict-tasks";
import { TrendingUp, Calendar, Users } from "lucide-react";

export function TrendingSection() {
    const { tasks, loading, error } = useTrendingTasks();

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Trending
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
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
                        <TrendingUp className="w-5 h-5" />
                        Trending
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-4">
                        <p>Failed to load trending predictions</p>
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
                    <TrendingUp className="w-5 h-5" />
                    Trending
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {tasks.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            <p>No trending predictions available</p>
                        </div>
                    ) : (
                        tasks.map((task, index) => (
                            <div key={`${task.title}-${task.created_at}-${index}`} className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-sm leading-tight">
                                            {task.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {task.category} • {task.event_ticker}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                        #{index + 1}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        <span>{task.answers?.length || 0} answers</span>
                                    </div>
                                    <div className="text-xs">
                                        Sources: {task.sources?.length || 0}
                                    </div>
                                </div>

                                {index < tasks.length - 1 && (
                                    <div className="border-t border-border/50 pt-2"></div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
