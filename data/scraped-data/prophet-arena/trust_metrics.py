#!/usr/bin/env python3
"""
Trust Metrics Calculator for Prophet Arena Data

This module provides functionality to calculate trust scores and performance metrics
for AI models based on their prediction accuracy and calibration.
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np
import pandas as pd
from scipy import stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TrustMetrics:
    """Data structure for trust metrics"""
    model_name: str
    category: Optional[str]
    trust_score: float
    accuracy: float
    calibration_score: float
    confidence_score: float
    total_predictions: int
    correct_predictions: int
    brier_score: float
    log_loss: float
    weighted_accuracy: float
    calculation_date: datetime

class TrustMetricsCalculator:
    """Calculator for trust metrics and model performance"""
    
    def __init__(self, db_path: str = "prophet_arena.db"):
        """
        Initialize the trust metrics calculator
        
        Args:
            db_path: Path to the SQLite database
        """
        self.db_path = db_path
        self.weights = {
            'accuracy': 0.4,
            'calibration': 0.3,
            'confidence': 0.2,
            'recency': 0.1
        }
    
    def calculate_brier_score(self, predictions: pd.DataFrame) -> float:
        """
        Calculate Brier score for calibration assessment
        
        Args:
            predictions: DataFrame with 'probability' and 'is_correct' columns
            
        Returns:
            Brier score (lower is better)
        """
        if len(predictions) == 0:
            return 1.0
        
        probabilities = predictions['probability'].values
        outcomes = predictions['is_correct'].astype(int).values
        
        brier_score = np.mean((probabilities - outcomes) ** 2)
        return float(brier_score)
    
    def calculate_log_loss(self, predictions: pd.DataFrame) -> float:
        """
        Calculate log loss for calibration assessment
        
        Args:
            predictions: DataFrame with 'probability' and 'is_correct' columns
            
        Returns:
            Log loss (lower is better)
        """
        if len(predictions) == 0:
            return float('inf')
        
        probabilities = predictions['probability'].values
        outcomes = predictions['is_correct'].astype(int).values
        
        # Avoid log(0) by clipping probabilities
        probabilities = np.clip(probabilities, 1e-15, 1 - 1e-15)
        
        log_loss = -np.mean(outcomes * np.log(probabilities) + (1 - outcomes) * np.log(1 - probabilities))
        return float(log_loss)
    
    def calculate_calibration_score(self, predictions: pd.DataFrame, bins: int = 10) -> float:
        """
        Calculate calibration score using reliability diagram
        
        Args:
            predictions: DataFrame with 'probability' and 'is_correct' columns
            bins: Number of bins for calibration assessment
            
        Returns:
            Calibration score (higher is better, max 1.0)
        """
        if len(predictions) == 0:
            return 0.0
        
        probabilities = predictions['probability'].values
        outcomes = predictions['is_correct'].astype(int).values
        
        # Create bins
        bin_edges = np.linspace(0, 1, bins + 1)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
        
        calibration_errors = []
        total_weight = 0
        
        for i in range(bins):
            # Find predictions in this bin
            mask = (probabilities >= bin_edges[i]) & (probabilities < bin_edges[i + 1])
            if i == bins - 1:  # Include the last edge
                mask = (probabilities >= bin_edges[i]) & (probabilities <= bin_edges[i + 1])
            
            if np.sum(mask) == 0:
                continue
            
            bin_probabilities = probabilities[mask]
            bin_outcomes = outcomes[mask]
            bin_size = len(bin_probabilities)
            
            # Calculate empirical frequency
            empirical_freq = np.mean(bin_outcomes)
            predicted_freq = np.mean(bin_probabilities)
            
            # Calculate calibration error
            calibration_error = abs(empirical_freq - predicted_freq)
            calibration_errors.append(calibration_error * bin_size)
            total_weight += bin_size
        
        if total_weight == 0:
            return 0.0
        
        # Weighted average calibration error
        avg_calibration_error = np.sum(calibration_errors) / total_weight
        
        # Convert to score (1 - error, with max of 1.0)
        calibration_score = max(0.0, 1.0 - avg_calibration_error)
        return float(calibration_score)
    
    def calculate_recency_score(self, predictions: pd.DataFrame, days: int = 30) -> float:
        """
        Calculate recency score based on recent performance
        
        Args:
            predictions: DataFrame with 'created_at' and 'is_correct' columns
            days: Number of days to consider for recent performance
            
        Returns:
            Recency score (higher is better)
        """
        if len(predictions) == 0:
            return 0.0
        
        # Convert created_at to datetime if it's not already
        if not pd.api.types.is_datetime64_any_dtype(predictions['created_at']):
            predictions['created_at'] = pd.to_datetime(predictions['created_at'])
        
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Filter recent predictions
        recent_predictions = predictions[predictions['created_at'] >= cutoff_date]
        
        if len(recent_predictions) == 0:
            return 0.0
        
        # Calculate recent accuracy
        recent_accuracy = recent_predictions['is_correct'].mean()
        
        # Weight by recency (more recent = higher weight)
        days_ago = (datetime.now() - recent_predictions['created_at']).dt.days
        weights = np.exp(-days_ago / days)  # Exponential decay
        weighted_accuracy = np.average(recent_predictions['is_correct'], weights=weights)
        
        return float(weighted_accuracy)
    
    def calculate_trust_score(self, model_name: str, category: Optional[str] = None) -> TrustMetrics:
        """
        Calculate comprehensive trust score for a model
        
        Args:
            model_name: Name of the model
            category: Optional category filter
            
        Returns:
            TrustMetrics object
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Get predictions for the model
            query = """
                SELECT p.*, e.category, e.resolved_date
                FROM predictions p
                JOIN events e ON p.event_id = e.event_id
                WHERE p.model_name = ?
            """
            params = [model_name]
            
            if category:
                query += " AND e.category = ?"
                params.append(category)
            
            predictions_df = pd.read_sql_query(query, conn, params=params)
            
            if len(predictions_df) == 0:
                logger.warning(f"No predictions found for model: {model_name}")
                return TrustMetrics(
                    model_name=model_name,
                    category=category,
                    trust_score=0.0,
                    accuracy=0.0,
                    calibration_score=0.0,
                    confidence_score=0.0,
                    total_predictions=0,
                    correct_predictions=0,
                    brier_score=1.0,
                    log_loss=float('inf'),
                    weighted_accuracy=0.0,
                    calculation_date=datetime.now()
                )
            
            # Calculate individual metrics
            accuracy = predictions_df['is_correct'].mean()
            total_predictions = len(predictions_df)
            correct_predictions = predictions_df['is_correct'].sum()
            
            # Weighted accuracy (weighted by confidence)
            weighted_accuracy = np.average(
                predictions_df['is_correct'], 
                weights=predictions_df['confidence_score']
            )
            
            # Calibration metrics
            brier_score = self.calculate_brier_score(predictions_df)
            log_loss = self.calculate_log_loss(predictions_df)
            calibration_score = self.calculate_calibration_score(predictions_df)
            
            # Confidence score (average confidence)
            confidence_score = predictions_df['confidence_score'].mean()
            
            # Recency score
            recency_score = self.calculate_recency_score(predictions_df)
            
            # Calculate composite trust score
            trust_score = (
                self.weights['accuracy'] * accuracy +
                self.weights['calibration'] * calibration_score +
                self.weights['confidence'] * confidence_score +
                self.weights['recency'] * recency_score
            )
            
            return TrustMetrics(
                model_name=model_name,
                category=category,
                trust_score=trust_score,
                accuracy=accuracy,
                calibration_score=calibration_score,
                confidence_score=confidence_score,
                total_predictions=total_predictions,
                correct_predictions=correct_predictions,
                brier_score=brier_score,
                log_loss=log_loss,
                weighted_accuracy=weighted_accuracy,
                calculation_date=datetime.now()
            )
            
        finally:
            conn.close()
    
    def calculate_all_trust_scores(self, categories: List[str] = None) -> List[TrustMetrics]:
        """
        Calculate trust scores for all models
        
        Args:
            categories: Optional list of categories to include
            
        Returns:
            List of TrustMetrics objects
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Get all unique model names
            query = "SELECT DISTINCT model_name FROM predictions"
            if categories:
                query += """
                    WHERE model_name IN (
                        SELECT DISTINCT p.model_name 
                        FROM predictions p 
                        JOIN events e ON p.event_id = e.event_id 
                        WHERE e.category IN ({})
                    )
                """.format(','.join(['?' for _ in categories]))
            
            model_names = pd.read_sql_query(query, conn, params=categories or [])
            
            trust_metrics = []
            for _, row in model_names.iterrows():
                model_name = row['model_name']
                
                # Calculate overall trust score
                overall_metrics = self.calculate_trust_score(model_name)
                trust_metrics.append(overall_metrics)
                
                # Calculate per-category trust scores
                if categories:
                    for category in categories:
                        category_metrics = self.calculate_trust_score(model_name, category)
                        trust_metrics.append(category_metrics)
            
            return trust_metrics
            
        finally:
            conn.close()
    
    def save_trust_scores(self, trust_metrics: List[TrustMetrics], calculation_method: str = "composite"):
        """
        Save trust scores to database
        
        Args:
            trust_metrics: List of TrustMetrics objects
            calculation_method: Method used for calculation
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            for metrics in trust_metrics:
                cursor.execute('''
                    INSERT INTO trust_scores (
                        model_name, category, trust_score, confidence_weight,
                        accuracy_weight, calibration_weight, recency_weight,
                        calculation_method, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    metrics.model_name,
                    metrics.category,
                    metrics.trust_score,
                    self.weights['confidence'],
                    self.weights['accuracy'],
                    self.weights['calibration'],
                    self.weights['recency'],
                    calculation_method,
                    json.dumps({
                        'accuracy': metrics.accuracy,
                        'calibration_score': metrics.calibration_score,
                        'confidence_score': metrics.confidence_score,
                        'total_predictions': metrics.total_predictions,
                        'correct_predictions': metrics.correct_predictions,
                        'brier_score': metrics.brier_score,
                        'log_loss': metrics.log_loss,
                        'weighted_accuracy': metrics.weighted_accuracy
                    })
                ))
            
            conn.commit()
            logger.info(f"Saved {len(trust_metrics)} trust scores to database")
            
        finally:
            conn.close()
    
    def get_trust_leaderboard(self, category: Optional[str] = None, limit: int = 50) -> pd.DataFrame:
        """
        Get trust leaderboard
        
        Args:
            category: Optional category filter
            limit: Maximum number of results
            
        Returns:
            DataFrame with trust leaderboard
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            query = """
                SELECT 
                    ts.model_name,
                    ts.category,
                    ts.trust_score,
                    mp.total_predictions,
                    mp.accuracy,
                    mp.average_confidence,
                    ts.calculation_date
                FROM trust_scores ts
                JOIN model_performance mp ON ts.model_name = mp.model_name
                WHERE ts.calculation_date = (
                    SELECT MAX(calculation_date) 
                    FROM trust_scores ts2 
                    WHERE ts2.model_name = ts.model_name 
                    AND (ts.category IS NULL OR ts2.category = ts.category)
                )
            """
            
            params = []
            if category:
                query += " AND (ts.category = ? OR ts.category IS NULL)"
                params.append(category)
            
            query += " ORDER BY ts.trust_score DESC LIMIT ?"
            params.append(limit)
            
            return pd.read_sql_query(query, conn, params=params)
            
        finally:
            conn.close()
    
    def get_model_performance_analysis(self, model_name: str) -> Dict[str, Any]:
        """
        Get detailed performance analysis for a model
        
        Args:
            model_name: Name of the model
            
        Returns:
            Dictionary with performance analysis
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Get basic performance metrics
            query = """
                SELECT 
                    COUNT(*) as total_predictions,
                    SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_predictions,
                    AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) as accuracy,
                    AVG(confidence_score) as avg_confidence,
                    AVG(probability) as avg_probability
                FROM predictions 
                WHERE model_name = ?
            """
            
            basic_metrics = pd.read_sql_query(query, conn, params=[model_name]).iloc[0]
            
            # Get category breakdown
            query = """
                SELECT 
                    e.category,
                    COUNT(*) as predictions,
                    AVG(CASE WHEN p.is_correct THEN 1.0 ELSE 0.0 END) as accuracy,
                    AVG(p.confidence_score) as avg_confidence
                FROM predictions p
                JOIN events e ON p.event_id = e.event_id
                WHERE p.model_name = ?
                GROUP BY e.category
            """
            
            category_breakdown = pd.read_sql_query(query, conn, params=[model_name])
            
            # Get recent performance
            query = """
                SELECT 
                    COUNT(*) as recent_predictions,
                    AVG(CASE WHEN p.is_correct THEN 1.0 ELSE 0.0 END) as recent_accuracy
                FROM predictions p
                JOIN events e ON p.event_id = e.event_id
                WHERE p.model_name = ? 
                AND e.resolved_date >= date('now', '-30 days')
            """
            
            recent_performance = pd.read_sql_query(query, conn, params=[model_name]).iloc[0]
            
            return {
                'model_name': model_name,
                'basic_metrics': basic_metrics.to_dict(),
                'category_breakdown': category_breakdown.to_dict('records'),
                'recent_performance': recent_performance.to_dict()
            }
            
        finally:
            conn.close()
    
    def update_weights(self, weights: Dict[str, float]):
        """
        Update the weights for trust score calculation
        
        Args:
            weights: Dictionary with new weights
        """
        if abs(sum(weights.values()) - 1.0) > 1e-6:
            raise ValueError("Weights must sum to 1.0")
        
        self.weights.update(weights)
        logger.info(f"Updated trust score weights: {self.weights}")

def main():
    """Main function for running trust metrics calculation"""
    calculator = TrustMetricsCalculator()
    
    try:
        # Calculate trust scores for all models
        trust_metrics = calculator.calculate_all_trust_scores(['sports', 'economics', 'crypto'])
        
        # Save to database
        calculator.save_trust_scores(trust_metrics)
        
        # Display leaderboard
        leaderboard = calculator.get_trust_leaderboard()
        print("\nTrust Leaderboard:")
        print(leaderboard.to_string(index=False))
        
        # Display category-specific leaderboards
        for category in ['sports', 'economics', 'crypto']:
            category_leaderboard = calculator.get_trust_leaderboard(category=category)
            if not category_leaderboard.empty:
                print(f"\n{category.title()} Leaderboard:")
                print(category_leaderboard.to_string(index=False))
        
    except Exception as e:
        logger.error(f"Error in trust metrics calculation: {e}")

if __name__ == "__main__":
    main()
