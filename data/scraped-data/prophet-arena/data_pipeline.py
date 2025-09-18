#!/usr/bin/env python3
"""
Prophet Arena Data Processing Pipeline

This module provides a complete pipeline for scraping, processing, and analyzing
Prophet Arena data for trust metrics calculation.
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from pathlib import Path

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from prophet_arena_scraper import ProphetArenaScraper
from trust_metrics import TrustMetricsCalculator
import sqlite3
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProphetArenaDataPipeline:
    """Complete data pipeline for Prophet Arena data processing"""
    
    def __init__(self, config_path: str = "config.json"):
        """
        Initialize the data pipeline
        
        Args:
            config_path: Path to configuration file
        """
        self.config = self._load_config(config_path)
        self.scraper = None
        self.trust_calculator = TrustMetricsCalculator(self.config['database_path'])
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        default_config = {
            "database_path": "prophet_arena.db",
            "output_dir": "output",
            "scraping": {
                "headless": True,
                "delay_range": [2, 5],
                "categories": ["sports", "economics", "crypto"],
                "limit_per_category": 50,
                "max_retries": 3
            },
            "trust_metrics": {
                "weights": {
                    "accuracy": 0.4,
                    "calibration": 0.3,
                    "confidence": 0.2,
                    "recency": 0.1
                },
                "recent_days": 30,
                "calibration_bins": 10
            },
            "output": {
                "save_csv": True,
                "save_json": True,
                "save_database": True,
                "generate_reports": True
            }
        }
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with defaults
                default_config.update(user_config)
        else:
            # Create default config file
            with open(config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            logger.info(f"Created default config file: {config_path}")
        
        return default_config
    
    def setup_database(self):
        """Initialize database with schema"""
        logger.info("Setting up database schema...")
        
        schema_path = os.path.join(os.path.dirname(__file__), "database_schema.sql")
        if not os.path.exists(schema_path):
            logger.error(f"Database schema file not found: {schema_path}")
            return False
        
        try:
            conn = sqlite3.connect(self.config['database_path'])
            with open(schema_path, 'r') as f:
                schema_sql = f.read()
            
            # Execute schema
            conn.executescript(schema_sql)
            conn.close()
            
            logger.info("Database schema initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error setting up database: {e}")
            return False
    
    def scrape_data(self, categories: List[str] = None, limit_per_category: int = None) -> bool:
        """
        Scrape data from Prophet Arena
        
        Args:
            categories: List of categories to scrape
            limit_per_category: Maximum events per category
            
        Returns:
            True if successful, False otherwise
        """
        logger.info("Starting data scraping...")
        
        if categories is None:
            categories = self.config['scraping']['categories']
        if limit_per_category is None:
            limit_per_category = self.config['scraping']['limit_per_category']
        
        try:
            # Initialize scraper
            self.scraper = ProphetArenaScraper(
                headless=self.config['scraping']['headless'],
                delay_range=tuple(self.config['scraping']['delay_range'])
            )
            
            # Scrape events
            events = self.scraper.scrape_all_historical_events(
                categories=categories,
                limit_per_category=limit_per_category
            )
            
            if not events:
                logger.warning("No events were scraped")
                return False
            
            # Save data
            if self.config['output']['save_csv']:
                output_dir = Path(self.config['output_dir'])
                output_dir.mkdir(exist_ok=True)
                csv_path = output_dir / f"prophet_arena_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                self.scraper.save_to_csv(events, str(csv_path))
            
            if self.config['output']['save_database']:
                self.scraper.save_to_database(events, self.config['database_path'])
            
            logger.info(f"Successfully scraped {len(events)} events")
            return True
            
        except Exception as e:
            logger.error(f"Error during scraping: {e}")
            return False
        finally:
            if self.scraper:
                self.scraper.close()
    
    def calculate_trust_metrics(self) -> bool:
        """
        Calculate trust metrics for all models
        
        Returns:
            True if successful, False otherwise
        """
        logger.info("Calculating trust metrics...")
        
        try:
            # Update weights if specified in config
            if 'weights' in self.config['trust_metrics']:
                self.trust_calculator.update_weights(self.config['trust_metrics']['weights'])
            
            # Calculate trust scores
            trust_metrics = self.trust_calculator.calculate_all_trust_scores(
                categories=self.config['scraping']['categories']
            )
            
            if not trust_metrics:
                logger.warning("No trust metrics calculated")
                return False
            
            # Save trust scores
            self.trust_calculator.save_trust_scores(trust_metrics)
            
            logger.info(f"Calculated trust metrics for {len(trust_metrics)} model-category combinations")
            return True
            
        except Exception as e:
            logger.error(f"Error calculating trust metrics: {e}")
            return False
    
    def generate_reports(self) -> bool:
        """
        Generate analysis reports
        
        Returns:
            True if successful, False otherwise
        """
        logger.info("Generating reports...")
        
        try:
            output_dir = Path(self.config['output_dir'])
            output_dir.mkdir(exist_ok=True)
            
            # Overall leaderboard
            leaderboard = self.trust_calculator.get_trust_leaderboard()
            if not leaderboard.empty:
                leaderboard_path = output_dir / f"trust_leaderboard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                leaderboard.to_csv(leaderboard_path, index=False)
                logger.info(f"Saved overall leaderboard to {leaderboard_path}")
            
            # Category-specific leaderboards
            for category in self.config['scraping']['categories']:
                category_leaderboard = self.trust_calculator.get_trust_leaderboard(category=category)
                if not category_leaderboard.empty:
                    category_path = output_dir / f"trust_leaderboard_{category}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                    category_leaderboard.to_csv(category_path, index=False)
                    logger.info(f"Saved {category} leaderboard to {category_path}")
            
            # Model performance analysis
            conn = sqlite3.connect(self.config['database_path'])
            model_names = pd.read_sql_query("SELECT DISTINCT model_name FROM predictions", conn)
            conn.close()
            
            for _, row in model_names.iterrows():
                model_name = row['model_name']
                analysis = self.trust_calculator.get_model_performance_analysis(model_name)
                
                if self.config['output']['save_json']:
                    analysis_path = output_dir / f"model_analysis_{model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                    with open(analysis_path, 'w') as f:
                        json.dump(analysis, f, indent=2, default=str)
                    logger.info(f"Saved analysis for {model_name} to {analysis_path}")
            
            logger.info("Reports generated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error generating reports: {e}")
            return False
    
    def run_full_pipeline(self, categories: List[str] = None, limit_per_category: int = None) -> bool:
        """
        Run the complete data pipeline
        
        Args:
            categories: List of categories to process
            limit_per_category: Maximum events per category
            
        Returns:
            True if successful, False otherwise
        """
        logger.info("Starting full data pipeline...")
        
        try:
            # Setup database
            if not self.setup_database():
                return False
            
            # Scrape data
            if not self.scrape_data(categories, limit_per_category):
                return False
            
            # Calculate trust metrics
            if not self.calculate_trust_metrics():
                return False
            
            # Generate reports
            if self.config['output']['generate_reports']:
                if not self.generate_reports():
                    return False
            
            logger.info("Full data pipeline completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error in full pipeline: {e}")
            return False
    
    def get_pipeline_status(self) -> Dict[str, Any]:
        """
        Get current status of the pipeline
        
        Returns:
            Dictionary with pipeline status information
        """
        status = {
            'database_exists': os.path.exists(self.config['database_path']),
            'output_dir_exists': os.path.exists(self.config['output_dir']),
            'last_run': None,
            'total_events': 0,
            'total_predictions': 0,
            'total_models': 0
        }
        
        if status['database_exists']:
            try:
                conn = sqlite3.connect(self.config['database_path'])
                
                # Get counts
                events_count = pd.read_sql_query("SELECT COUNT(*) as count FROM events", conn).iloc[0]['count']
                predictions_count = pd.read_sql_query("SELECT COUNT(*) as count FROM predictions", conn).iloc[0]['count']
                models_count = pd.read_sql_query("SELECT COUNT(DISTINCT model_name) as count FROM predictions", conn).iloc[0]['count']
                
                # Get last run time
                last_run = pd.read_sql_query("SELECT MAX(scraped_at) as last_run FROM events", conn).iloc[0]['last_run']
                
                status.update({
                    'total_events': events_count,
                    'total_predictions': predictions_count,
                    'total_models': models_count,
                    'last_run': last_run
                })
                
                conn.close()
                
            except Exception as e:
                logger.error(f"Error getting pipeline status: {e}")
        
        return status

def main():
    """Main function for running the data pipeline"""
    parser = argparse.ArgumentParser(description='Prophet Arena Data Pipeline')
    parser.add_argument('--config', default='config.json', help='Configuration file path')
    parser.add_argument('--action', choices=['scrape', 'metrics', 'reports', 'full', 'status'], 
                       default='full', help='Action to perform')
    parser.add_argument('--categories', nargs='+', help='Categories to process')
    parser.add_argument('--limit', type=int, help='Limit per category')
    parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = ProphetArenaDataPipeline(args.config)
    
    # Override config with command line arguments
    if args.headless:
        pipeline.config['scraping']['headless'] = True
    
    try:
        if args.action == 'status':
            status = pipeline.get_pipeline_status()
            print("\nPipeline Status:")
            print(json.dumps(status, indent=2, default=str))
            
        elif args.action == 'scrape':
            success = pipeline.scrape_data(args.categories, args.limit)
            print(f"Scraping {'completed successfully' if success else 'failed'}")
            
        elif args.action == 'metrics':
            success = pipeline.calculate_trust_metrics()
            print(f"Trust metrics calculation {'completed successfully' if success else 'failed'}")
            
        elif args.action == 'reports':
            success = pipeline.generate_reports()
            print(f"Report generation {'completed successfully' if success else 'failed'}")
            
        elif args.action == 'full':
            success = pipeline.run_full_pipeline(args.categories, args.limit)
            print(f"Full pipeline {'completed successfully' if success else 'failed'}")
        
    except KeyboardInterrupt:
        logger.info("Pipeline interrupted by user")
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")

if __name__ == "__main__":
    main()
