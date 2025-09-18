#!/usr/bin/env python3
"""
Integration script for Prophet Arena data with TrustSwarm system

This script integrates the Prophet Arena data extraction system with the main
TrustSwarm trust metrics and agent communication system.
"""

import os
import sys
import json
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

# Add paths for imports
current_dir = Path(__file__).parent
trustswarm_root = current_dir.parent.parent.parent
sys.path.append(str(trustswarm_root))
sys.path.append(str(current_dir))

from prophet_arena_scraper import ProphetArenaScraper
from trust_metrics import TrustMetricsCalculator
from data_pipeline import ProphetArenaDataPipeline
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrustSwarmProphetArenaIntegration:
    """Integration class for Prophet Arena data with TrustSwarm"""
    
    def __init__(self, trustswarm_db_path: str = None, prophet_arena_db_path: str = "prophet_arena.db"):
        """
        Initialize the integration
        
        Args:
            trustswarm_db_path: Path to main TrustSwarm database
            prophet_arena_db_path: Path to Prophet Arena database
        """
        self.prophet_arena_db = prophet_arena_db_path
        self.trustswarm_db = trustswarm_db_path or str(trustswarm_root / "core" / "database" / "trustswarm.db")
        
        # Initialize components
        self.pipeline = ProphetArenaDataPipeline()
        self.trust_calculator = TrustMetricsCalculator(prophet_arena_db_path)
        
    def sync_trust_scores_to_trustswarm(self) -> bool:
        """
        Sync Prophet Arena trust scores to TrustSwarm database
        
        Returns:
            True if successful, False otherwise
        """
        logger.info("Syncing Prophet Arena trust scores to TrustSwarm...")
        
        try:
            # Get latest trust scores from Prophet Arena
            prophet_conn = sqlite3.connect(self.prophet_arena_db)
            trust_scores = pd.read_sql_query("""
                SELECT 
                    model_name,
                    category,
                    trust_score,
                    calculation_date,
                    metadata
                FROM trust_scores
                WHERE calculation_date = (
                    SELECT MAX(calculation_date) 
                    FROM trust_scores ts2 
                    WHERE ts2.model_name = trust_scores.model_name
                    AND (trust_scores.category IS NULL OR ts2.category = trust_scores.category)
                )
            """, prophet_conn)
            prophet_conn.close()
            
            if trust_scores.empty:
                logger.warning("No trust scores found in Prophet Arena database")
                return False
            
            # Connect to TrustSwarm database
            trustswarm_conn = sqlite3.connect(self.trustswarm_db)
            
            # Create or update trust scores table in TrustSwarm
            trustswarm_conn.execute('''
                CREATE TABLE IF NOT EXISTS prophet_arena_trust_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT NOT NULL,
                    category TEXT,
                    trust_score REAL NOT NULL,
                    source TEXT DEFAULT 'prophet_arena',
                    calculation_date TIMESTAMP,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(model_name, category, calculation_date)
                )
            ''')
            
            # Insert trust scores
            for _, row in trust_scores.iterrows():
                trustswarm_conn.execute('''
                    INSERT OR REPLACE INTO prophet_arena_trust_scores 
                    (model_name, category, trust_score, calculation_date, metadata)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    row['model_name'],
                    row['category'],
                    row['trust_score'],
                    row['calculation_date'],
                    row['metadata']
                ))
            
            trustswarm_conn.commit()
            trustswarm_conn.close()
            
            logger.info(f"Synced {len(trust_scores)} trust scores to TrustSwarm")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing trust scores: {e}")
            return False
    
    def get_model_trust_ranking(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get model trust ranking for TrustSwarm system
        
        Args:
            category: Optional category filter
            
        Returns:
            List of model rankings
        """
        try:
            prophet_conn = sqlite3.connect(self.prophet_arena_db)
            
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
            
            query += " ORDER BY ts.trust_score DESC"
            
            rankings = pd.read_sql_query(query, prophet_conn, params=params)
            prophet_conn.close()
            
            return rankings.to_dict('records')
            
        except Exception as e:
            logger.error(f"Error getting model trust ranking: {e}")
            return []
    
    def update_trustswarm_agent_trust_scores(self) -> bool:
        """
        Update TrustSwarm agent trust scores with Prophet Arena data
        
        Returns:
            True if successful, False otherwise
        """
        logger.info("Updating TrustSwarm agent trust scores...")
        
        try:
            # Get model rankings
            rankings = self.get_model_trust_ranking()
            
            if not rankings:
                logger.warning("No model rankings found")
                return False
            
            # Connect to TrustSwarm database
            trustswarm_conn = sqlite3.connect(self.trustswarm_db)
            
            # Create or update agent trust scores table
            trustswarm_conn.execute('''
                CREATE TABLE IF NOT EXISTS agent_trust_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT NOT NULL,
                    trust_score REAL NOT NULL,
                    source TEXT NOT NULL,
                    category TEXT,
                    metadata TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(agent_id, source, category)
                )
            ''')
            
            # Map Prophet Arena models to TrustSwarm agents
            # This mapping can be customized based on your agent naming convention
            model_to_agent_mapping = {
                'GPT-4': 'gpt-4-agent',
                'GPT-5': 'gpt-5-agent',
                'Claude': 'claude-agent',
                'o3': 'o3-agent',
                'Gemini': 'gemini-agent'
            }
            
            updated_count = 0
            for ranking in rankings:
                model_name = ranking['model_name']
                agent_id = model_to_agent_mapping.get(model_name, f"{model_name.lower().replace(' ', '-')}-agent")
                
                trustswarm_conn.execute('''
                    INSERT OR REPLACE INTO agent_trust_scores 
                    (agent_id, trust_score, source, category, metadata)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    agent_id,
                    ranking['trust_score'],
                    'prophet_arena',
                    ranking['category'],
                    json.dumps({
                        'total_predictions': ranking['total_predictions'],
                        'accuracy': ranking['accuracy'],
                        'average_confidence': ranking['average_confidence'],
                        'calculation_date': ranking['calculation_date']
                    })
                ))
                updated_count += 1
            
            trustswarm_conn.commit()
            trustswarm_conn.close()
            
            logger.info(f"Updated {updated_count} agent trust scores in TrustSwarm")
            return True
            
        except Exception as e:
            logger.error(f"Error updating TrustSwarm agent trust scores: {e}")
            return False
    
    def get_trustswarm_agent_recommendations(self, category: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get agent recommendations for TrustSwarm based on Prophet Arena trust scores
        
        Args:
            category: Optional category filter
            limit: Maximum number of recommendations
            
        Returns:
            List of agent recommendations
        """
        try:
            trustswarm_conn = sqlite3.connect(self.trustswarm_db)
            
            query = """
                SELECT 
                    agent_id,
                    trust_score,
                    category,
                    metadata,
                    updated_at
                FROM agent_trust_scores
                WHERE source = 'prophet_arena'
            """
            
            params = []
            if category:
                query += " AND (category = ? OR category IS NULL)"
                params.append(category)
            
            query += " ORDER BY trust_score DESC LIMIT ?"
            params.append(limit)
            
            recommendations = pd.read_sql_query(query, trustswarm_conn, params=params)
            trustswarm_conn.close()
            
            return recommendations.to_dict('records')
            
        except Exception as e:
            logger.error(f"Error getting agent recommendations: {e}")
            return []
    
    def run_full_integration(self, scrape_new_data: bool = True) -> bool:
        """
        Run full integration process
        
        Args:
            scrape_new_data: Whether to scrape new data from Prophet Arena
            
        Returns:
            True if successful, False otherwise
        """
        logger.info("Running full Prophet Arena integration with TrustSwarm...")
        
        try:
            # Step 1: Scrape new data if requested
            if scrape_new_data:
                logger.info("Scraping new data from Prophet Arena...")
                if not self.pipeline.scrape_data(limit_per_category=25):
                    logger.warning("Data scraping failed, continuing with existing data")
            
            # Step 2: Calculate trust metrics
            logger.info("Calculating trust metrics...")
            if not self.pipeline.calculate_trust_metrics():
                logger.error("Trust metrics calculation failed")
                return False
            
            # Step 3: Sync trust scores to TrustSwarm
            if not self.sync_trust_scores_to_trustswarm():
                logger.error("Failed to sync trust scores to TrustSwarm")
                return False
            
            # Step 4: Update agent trust scores
            if not self.update_trustswarm_agent_trust_scores():
                logger.error("Failed to update agent trust scores")
                return False
            
            # Step 5: Generate integration report
            self.generate_integration_report()
            
            logger.info("Full integration completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error in full integration: {e}")
            return False
    
    def generate_integration_report(self):
        """Generate integration report"""
        try:
            # Get current status
            rankings = self.get_model_trust_ranking()
            recommendations = self.get_trustswarm_agent_recommendations()
            
            report = {
                'integration_date': datetime.now().isoformat(),
                'total_models_ranked': len(rankings),
                'total_agents_updated': len(recommendations),
                'top_models': rankings[:5] if rankings else [],
                'top_agents': recommendations[:5] if recommendations else [],
                'categories_covered': list(set([r['category'] for r in rankings if r['category']]))
            }
            
            # Save report
            report_path = Path(self.pipeline.config['output_dir']) / f"integration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            report_path.parent.mkdir(exist_ok=True)
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"Integration report saved to {report_path}")
            
            # Print summary
            print("\n" + "="*50)
            print("PROPHET ARENA INTEGRATION REPORT")
            print("="*50)
            print(f"Integration Date: {report['integration_date']}")
            print(f"Total Models Ranked: {report['total_models_ranked']}")
            print(f"Total Agents Updated: {report['total_agents_updated']}")
            print(f"Categories Covered: {', '.join(report['categories_covered'])}")
            
            if report['top_models']:
                print("\nTop 5 Models by Trust Score:")
                for i, model in enumerate(report['top_models'], 1):
                    print(f"  {i}. {model['model_name']}: {model['trust_score']:.3f}")
            
            if report['top_agents']:
                print("\nTop 5 Agents for TrustSwarm:")
                for i, agent in enumerate(report['top_agents'], 1):
                    print(f"  {i}. {agent['agent_id']}: {agent['trust_score']:.3f}")
            
            print("="*50)
            
        except Exception as e:
            logger.error(f"Error generating integration report: {e}")

def main():
    """Main function for running the integration"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Prophet Arena TrustSwarm Integration')
    parser.add_argument('--action', choices=['sync', 'update', 'recommend', 'full'], 
                       default='full', help='Action to perform')
    parser.add_argument('--category', help='Category filter')
    parser.add_argument('--no-scrape', action='store_true', help='Skip data scraping')
    parser.add_argument('--trustswarm-db', help='Path to TrustSwarm database')
    
    args = parser.parse_args()
    
    # Initialize integration
    integration = TrustSwarmProphetArenaIntegration(
        trustswarm_db_path=args.trustswarm_db
    )
    
    try:
        if args.action == 'sync':
            success = integration.sync_trust_scores_to_trustswarm()
        elif args.action == 'update':
            success = integration.update_trustswarm_agent_trust_scores()
        elif args.action == 'recommend':
            recommendations = integration.get_trustswarm_agent_recommendations(args.category)
            print(f"Found {len(recommendations)} agent recommendations")
            for rec in recommendations:
                print(f"  {rec['agent_id']}: {rec['trust_score']:.3f}")
            success = True
        elif args.action == 'full':
            success = integration.run_full_integration(scrape_new_data=not args.no_scrape)
        
        if success:
            print(f"\n✅ {args.action} action completed successfully")
        else:
            print(f"\n❌ {args.action} action failed")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Integration interrupted by user")
    except Exception as e:
        logger.error(f"Integration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
