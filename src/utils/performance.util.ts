/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';

interface PerformanceMetrics {
  operationName: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class PerformanceUtil {
  private readonly metrics = new Map<string, PerformanceMetrics[]>();
  private readonly maxMetricsSize = 1000;

  /**
   * Measure function execution time
   * Time Complexity: O(1)
   */
  async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      const result = await operation();
      return result;
    } catch (error) {
      success = false;
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operationName,
        duration,
        timestamp: new Date(),
        success,
        errorMessage,
      });
    }
  }

  /**
   * Measure synchronous function execution time
   * Time Complexity: O(1)
   */
  measure<T>(operationName: string, operation: () => T): T {
    const startTime = performance.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      const result = operation();
      return result;
    } catch (error) {
      success = false;
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operationName,
        duration,
        timestamp: new Date(),
        success,
        errorMessage,
      });
    }
  }

  /**
   * Record performance metric with LRU eviction
   * Time Complexity: O(1)
   */
  private recordMetric(metric: PerformanceMetrics): void {
    let operationMetrics = this.metrics.get(metric.operationName);
    
    if (!operationMetrics) {
      operationMetrics = [];
      this.metrics.set(metric.operationName, operationMetrics);
    }

    // LRU eviction
    if (operationMetrics.length >= this.maxMetricsSize) {
      operationMetrics.shift();
    }

    operationMetrics.push(metric);
  }

  /**
   * Get performance statistics
   * Time Complexity: O(n) where n is number of metrics
   */
  getStats(operationName: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
  } | null {
    const metrics = this.metrics.get(operationName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const successCount = metrics.filter(m => m.success).length;

    return {
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successCount / metrics.length,
    };
  }

  /**
   * Clear metrics for memory management
   * Time Complexity: O(1)
   */
  clearMetrics(operationName?: string): void {
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }
}