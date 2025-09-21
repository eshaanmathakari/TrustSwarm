"use client";

import { useState, useCallback } from "react";

export interface Agent {
  id: number;
  name: string;
  handle: string;
  streak?: string;
  points: number;
  avatar?: string;
  featured?: boolean;
  subtitle?: string;
}

export interface PredictTask {
  title: string;
  answers: string[];
  sources: string[];
  created_at: string;
  category: string;
  event_ticker: string;
}

export interface AgentTestResponse {
  agent: Agent;
  task: PredictTask;
  initialResponse: string;
  finalResponse: string;
  isProcessing: boolean;
  isComplete: boolean;
}

interface UseAgentTestingReturn {
  testAgent: (agent: Agent, task?: PredictTask, category?: string) => Promise<void>;
  testAgentWithQuery: (agent: Agent, userQuery: string, category?: string) => Promise<void>;
  currentTest: AgentTestResponse | null;
  isLoading: boolean;
  reset: () => void;
}


export function useAgentTesting(): UseAgentTestingReturn {
  const [currentTest, setCurrentTest] = useState<AgentTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPredictionTasks = useCallback(async (category?: string, limit: number = 50) => {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (category) {
        params.append('category', category);
      }
      
      const response = await fetch(`/api/predict-tasks?${params.toString()}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch predict tasks');
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Error fetching prediction tasks:', error);
      return [];
    }
  }, []);

  // Smart query matching function
  const findBestMatchingTask = useCallback((tasks: PredictTask[], userQuery: string): PredictTask | null => {
    if (!tasks.length || !userQuery.trim()) return null;
    
    const query = userQuery.toLowerCase().trim();
    let bestMatch: PredictTask | null = null;
    let highestScore = 0;
    
    for (const task of tasks) {
      const title = task.title.toLowerCase();
      
      // Calculate similarity score
      let score = 0;
      
      // Exact match gets highest score
      if (title === query) {
        score = 100;
      }
      // Title contains the full query
      else if (title.includes(query)) {
        score = 80;
      }
      // Query contains the title
      else if (query.includes(title)) {
        score = 70;
      }
      // Check for word matches
      else {
        const queryWords = query.split(/\s+/).filter(word => word.length > 2);
        const titleWords = title.split(/\s+/).filter(word => word.length > 2);
        
        let matchingWords = 0;
        for (const qWord of queryWords) {
          for (const tWord of titleWords) {
            if (tWord.includes(qWord) || qWord.includes(tWord)) {
              matchingWords++;
              break;
            }
          }
        }
        
        if (matchingWords > 0) {
          score = (matchingWords / Math.max(queryWords.length, titleWords.length)) * 60;
        }
      }
      
      if (score > highestScore && score > 30) { // Minimum threshold
        highestScore = score;
        bestMatch = task;
      }
    }
    
    console.log(`Best match for "${userQuery}": ${bestMatch?.title} (score: ${highestScore})`);
    return bestMatch;
  }, []);

  const searchPredictionTasks = useCallback(async (userQuery: string, category?: string): Promise<PredictTask | null> => {
    console.log('Searching for query:', userQuery, 'in category:', category);
    
    // If no category specified, search both sports and financial
    let allTasks: PredictTask[] = [];
    
    if (category) {
      // Search specific category
      allTasks = await fetchPredictionTasks(category, 100);
    } else {
      // Search both categories
      console.log('Searching both sports and financial categories');
      const [sportsTasks, financeTasks] = await Promise.all([
        fetchPredictionTasks('sports', 100),
        fetchPredictionTasks('financial', 100)
      ]);
      allTasks = [...sportsTasks, ...financeTasks];
    }
    
    if (allTasks.length === 0) {
      console.log('No tasks found in database');
      return null;
    }
    
    // Parse JSON strings in all tasks
    const parsedTasks = allTasks.map(task => {
      const parsedTask = { ...task };
      
      if (typeof parsedTask.answers === 'string') {
        try {
          parsedTask.answers = JSON.parse(parsedTask.answers);
        } catch (error) {
          console.error('Error parsing answers JSON:', error);
          parsedTask.answers = [];
        }
      }
      
      if (typeof parsedTask.sources === 'string') {
        try {
          const parsed = JSON.parse(parsedTask.sources);
          // If it's an array of objects with url and name, extract just names
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
            parsedTask.sources = parsed.map(source => source.name);
          } else {
            parsedTask.sources = parsed;
          }
        } catch (error) {
          console.error('Error parsing sources JSON:', error);
          parsedTask.sources = [];
        }
      }
      
      return parsedTask;
    });
    
    return findBestMatchingTask(parsedTasks, userQuery);
  }, [fetchPredictionTasks, findBestMatchingTask]);

  const testAgent = useCallback(async (agent: Agent, task?: PredictTask, category?: string) => {
    setIsLoading(true);
    
    // Use provided task or fetch a random one from the database
    let selectedTask = task;
    if (!selectedTask) {
      console.log('Fetching prediction tasks for category:', category);
      const tasks = await fetchPredictionTasks(category);
      console.log('Fetched tasks:', tasks);
      
      if (tasks.length > 0) {
        selectedTask = tasks[Math.floor(Math.random() * tasks.length)];
        
        // Parse JSON strings if they exist
        if (typeof selectedTask.answers === 'string') {
          try {
            selectedTask.answers = JSON.parse(selectedTask.answers);
          } catch (error) {
            console.error('Error parsing answers JSON:', error);
            selectedTask.answers = [];
          }
        }
        
        if (typeof selectedTask.sources === 'string') {
          try {
            const parsed = JSON.parse(selectedTask.sources);
            // If it's an array of objects with url and name, extract just names
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
              selectedTask.sources = parsed.map(source => source.name);
            } else {
              selectedTask.sources = parsed;
            }
          } catch (error) {
            console.error('Error parsing sources JSON:', error);
            selectedTask.sources = [];
          }
        }
        
        console.log('Selected task (parsed):', selectedTask);
      } else {
        console.log('No tasks found, creating fallback task');
        // Create a fallback task if no real data is available
        selectedTask = {
          title: `${category || 'sports'} prediction task`,
          answers: [
            `Based on current analysis, this ${category || 'sports'} prediction shows positive trends`,
            `Market indicators suggest a favorable outcome for this ${category || 'sports'} event`,
            `Statistical models predict strong performance in this ${category || 'sports'} category`
          ],
          sources: ['AI Analysis', 'Market Data', 'Statistical Models'],
          created_at: new Date().toISOString(),
          category: category || 'sports',
          event_ticker: 'FALLBACK_TASK'
        };
      }
    }
    
    // Create initial response
    const initialResponse = `Sure, running Agent ${agent.name} with ${selectedTask.title}`;
    
    // Set initial state
    const testResponse: AgentTestResponse = {
      agent,
      task: selectedTask,
      initialResponse,
      finalResponse: "",
      isProcessing: true,
      isComplete: false
    };
    
    setCurrentTest(testResponse);
    
    // Simulate processing time (2-3 seconds)
    const processingTime = 2000 + Math.random() * 1000;
    
    setTimeout(() => {
      // Pick a random answer from the task's answers array
      let randomAnswer = 'Unable to generate prediction at this time';
      
      if (selectedTask.answers && Array.isArray(selectedTask.answers) && selectedTask.answers.length > 0) {
        // Select a random answer from the PredictTask.answers array
        const answerIndex = Math.floor(Math.random() * selectedTask.answers.length);
        randomAnswer = selectedTask.answers[answerIndex];
        console.log(`Selected answer ${answerIndex + 1} of ${selectedTask.answers.length}: ${randomAnswer}`);
      } else {
        console.error('No answers found in selected task:', selectedTask);
      }
      
      // Format response based on whether it's a direct question or random request
      let finalResponse = '';
      
      // Check if this was a direct question match or a random request
      const isDirectMatch = selectedTask.title && task && task.title === selectedTask.title;
      
      if (isDirectMatch) {
        // Direct question - just return the answer with agent name
        finalResponse = `${agent.name} predicts ${randomAnswer}`;
      } else {
        // Random prediction - show question then answer with agent name
        finalResponse = `${selectedTask.title}\n\n${agent.name} predicts ${randomAnswer}`;
      }
      
      console.log('Final response:', finalResponse);
      
      setCurrentTest(prev => prev ? {
        ...prev,
        finalResponse,
        isProcessing: false,
        isComplete: true
      } : null);
      
      setIsLoading(false);
    }, processingTime);
    
  }, [fetchPredictionTasks]);

  const testAgentWithQuery = useCallback(async (agent: Agent, userQuery: string, category?: string) => {
    setIsLoading(true);
    console.log(`Testing agent ${agent.name} with query: "${userQuery}"`);
    
    // First try to find a matching task (search both categories if none specified)
    const matchedTask = await searchPredictionTasks(userQuery, category);
    
    if (matchedTask) {
      console.log('Found matching task:', matchedTask.title);
      console.log('Task category:', matchedTask.category);
      // Use the matched task
      await testAgent(agent, matchedTask, matchedTask.category);
    } else {
      console.log('No matching task found, using random task');
      // Fall back to random task (search both if no category)
      await testAgent(agent, undefined, category || undefined);
    }
  }, [testAgent, searchPredictionTasks]);

  const reset = useCallback(() => {
    setCurrentTest(null);
    setIsLoading(false);
  }, []);

  return {
    testAgent,
    testAgentWithQuery,
    currentTest,
    isLoading,
    reset
  };
}