"use client";

import { useState, useEffect } from "react";
import { PredictTask } from "@/lib/supabase";

interface UsePredictTasksOptions {
    limit?: number;
    category?: string;
    status?: string;
    autoFetch?: boolean;
}

interface UsePredictTasksReturn {
    tasks: PredictTask[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createTask: (task: Omit<PredictTask, 'id' | 'created_at' | 'updated_at'>) => Promise<PredictTask | null>;
}

export function usePredictTasks(options: UsePredictTasksOptions = {}): UsePredictTasksReturn {
    const { limit = 50, category, status, autoFetch = true } = options;
    const [tasks, setTasks] = useState<PredictTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (limit) params.append('limit', limit.toString());
            if (category) params.append('category', category);
            if (status) params.append('status', status);

            const response = await fetch(`/api/predict-tasks?${params.toString()}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch predict tasks');
            }

            setTasks(result.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching predict tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const createTask = async (taskData: Omit<PredictTask, 'id' | 'created_at' | 'updated_at'>): Promise<PredictTask | null> => {
        try {
            const response = await fetch('/api/predict-tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create predict task');
            }

            // Refresh the tasks list after creating a new task
            await fetchTasks();
            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create task');
            console.error('Error creating predict task:', err);
            return null;
        }
    };

    useEffect(() => {
        if (autoFetch) {
            fetchTasks();
        }
    }, [limit, category, status, autoFetch]);

    return {
        tasks,
        loading,
        error,
        refetch: fetchTasks,
        createTask,
    };
}

// Specialized hooks for different sections
export function useTrendingTasks() {
    return usePredictTasks({
        limit: 3,
        status: 'active',
        category: 'sports'
    });
}

export function useSportsLeaderboard() {
    return usePredictTasks({
        limit: 10,
        category: 'sports',
        status: 'active'
    });
}

export function useFinanceLeaderboard() {
    return usePredictTasks({
        limit: 10,
        category: 'finance',
        status: 'active'
    });
}
