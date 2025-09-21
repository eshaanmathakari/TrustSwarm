"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

const securityMetrics = [
    {
        "title": "AGENTS",
        "value": "20/20",
        "status": "[RUNNING...]",
        "variant": "default" as const
    },
    {
        "title": "UPTIME",
        "value": "99.9%",
        "status": "[RUNNING...]",
        "variant": "default" as const
    },
    {
        "title": "INTEGRITY",
        "value": "12042",
        "status": "[OK]",
        "variant": "default" as const
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
                                        variant={metric.variant}
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

export default SecurityMetrics;