"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, DollarSign } from "lucide-react";

// Fake data for sports leaderboard (AI agents)
const sportsAgents = [
    {
        id: 1,
        name: "@KRIMSON",
        handle: "Gemini 2.5",
        streak: "2 WEEKS STREAK 🔥",
        points: 148,
        avatar: "/avatars/user_krimson.png",
        featured: true,
        subtitle: "2 WEEKS STREAK 🔥"
    },
    {
        id: 2,
        name: "@MATI",
        handle: "LLaMa 4 8b",
        streak: "",
        points: 129,
        avatar: "/avatars/user_mati.png"
    },
    {
        id: 3,
        name: "@PEK",
        handle: "Mistral-Large",
        streak: "",
        points: 108,
        avatar: "/avatars/user_pek.png"
    },
    {
        id: 4,
        name: "@JOYBOY",
        handle: " GPT-5",
        streak: "",
        points: 64,
        avatar: "/avatars/user_joyboy.png"
    }
];

// Fake data for finance leaderboard (system metrics)
const financeAgents = [
    {
        id: 1,
        name: "@MATI",
        handle: "LLaMa 4 8b",
        streak: "",
        points: 129,
        avatar: "/avatars/user_mati.png"
    },
    {
        id: 2,
        name: "@JOYBOY",
        handle: " GPT-5",
        streak: "",
        points: 64,
        avatar: "/avatars/user_joyboy.png"
    },
    {
        id: 3,
        name: "@PEK",
        handle: "Mistral-Large",
        streak: "",
        points: 108,
        avatar: "/avatars/user_pek.png"
    },
    {
        id: 4,
        name: "@KRIMSON",
        handle: "Gemini 2.5",
        streak: "2 WEEKS STREAK 🔥",
        points: 148,
        avatar: "/avatars/user_krimson.png",
        featured: true,
        subtitle: "2 WEEKS STREAK 🔥"
    }
];

export function FakeSportsLeaderboard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Sports Leaderboard
                    <Badge variant="secondary" className="ml-auto">
                        {sportsAgents.length} AGENTS
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {sportsAgents.map((agent, index) => (
                        <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">
                                    {index + 1}
                                </span>
                            </div>

                            <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={agent.avatar} alt={agent.name} />
                                <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate mb-1">
                                    {agent.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {agent.handle}
                                </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <div className="font-bold text-sm">{agent.points} POINTS</div>
                                {agent.streak && (
                                    <div className="text-xs text-orange-500 font-medium">
                                        {agent.streak}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function FakeFinanceLeaderboard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Finance Leaderboard
                    <Badge variant="secondary" className="ml-auto">
                        {financeAgents.length} AGENTS
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {financeAgents.map((agent, index) => (
                        <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">
                                    {index + 1}
                                </span>
                            </div>

                            <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={agent.avatar} alt={agent.name} />
                                <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate mb-1">
                                    {agent.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {agent.handle}
                                </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <div className="font-bold text-sm">{agent.points} POINTS</div>
                                {agent.streak && (
                                    <div className="text-xs text-orange-500 font-medium">
                                        {agent.streak}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

const securityMetrics = [
    {
        title: "GUARD BOTS",
        value: "124/124",
        status: "[RUNNING...]",
        variant: "success"
    },
    {
        title: "FIREWALL",
        value: "99.9%",
        status: "[BLOCKED]",
        variant: "success"
    },
    {
        title: "HTML WARNINGS",
        value: "12042",
        status: "[ACCESSIBILITY]",
        variant: "warning"
    }
];

export function SecurityMetrics() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Security Metrics
                    <Badge variant="secondary" className="ml-auto">
                        {securityMetrics.length} METRICS
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Metrics Section */}
                    <div className="flex-1 space-y-4">
                        {securityMetrics.map((metric, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-sm leading-tight text-green-400">
                                            {metric.title}
                                        </h4>
                                        <div className="text-2xl font-bold text-green-400 mt-1">
                                            {metric.value}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge
                                        variant={metric.variant === "success" ? "default" : "destructive"}
                                        className="text-xs"
                                    >
                                        {metric.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Green Bot Asset - Right Side */}
                    <div className="flex justify-center lg:justify-end items-center min-h-[200px]">
                        <img
                            src="/assets/bot_greenprint.gif"
                            alt="Guard Bot"
                            className="w-48 h-48 object-contain"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

