"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Zap, CheckCircle } from "lucide-react";
import { useAgentTesting, Agent, AgentTestResponse } from "@/hooks/use-agent-testing";

interface AgentTestingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
}

export function AgentTestingModal({ isOpen, onOpenChange, agent }: AgentTestingModalProps) {
  const { testAgent, currentTest, isLoading, reset } = useAgentTesting();

  const handleTest = async () => {
    if (!agent) return;
    reset();
    await testAgent(agent);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            Test Agent Prediction
          </DialogTitle>
        </DialogHeader>

        {agent && (
          <div className="space-y-6">
            {/* Agent Info */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src={agent.avatar} alt={agent.name} />
                <AvatarFallback>{agent.name.charAt(1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{agent.name}</div>
                <div className="text-sm text-muted-foreground">{agent.handle}</div>
              </div>
              <Badge variant="secondary">{agent.points} POINTS</Badge>
            </div>

            {/* Testing Interface */}
            <div className="space-y-4">
              {!currentTest ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Test {agent.name} with a sports prediction task
                  </p>
                  <Button 
                    onClick={handleTest} 
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Start Prediction Test
                  </Button>
                </div>
              ) : (
                <TestingDisplay testResponse={currentTest} />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TestingDisplay({ testResponse }: { testResponse: AgentTestResponse }) {
  const { agent, task, initialResponse, finalResponse, isProcessing, isComplete } = testResponse;

  return (
    <div className="space-y-4">
      {/* Task Info */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Testing Task:
          </div>
          <div className="font-medium">{task.title}</div>
          <Badge variant="outline" className="mt-2">
            {task.category.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      {/* Initial Response */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">Agent Response</span>
          </div>
          <p className="text-sm">{initialResponse}</p>
        </CardContent>
      </Card>

      {/* Processing State */}
      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-blue-600">Processing...</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {agent.name} is analyzing the prediction task
            </p>
          </CardContent>
        </Card>
      )}

      {/* Final Response */}
      {isComplete && finalResponse && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Final Prediction</span>
            </div>
            <p className="text-sm font-medium">{finalResponse}</p>
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-muted-foreground">
                Sources: {task.sources.join(", ")}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}