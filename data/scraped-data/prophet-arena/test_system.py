#!/usr/bin/env python3
"""
Test script for Prophet Arena Data Extraction System

This script tests the basic functionality of the system without actually scraping data.
"""

import os
import sys
import json
import sqlite3
import tempfile
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from prophet_arena_scraper import EventData, PredictionData
from trust_metrics import TrustMetricsCalculator
from data_pipeline import ProphetArenaDataPipeline

def test_database_schema():
    """Test database schema creation"""
    print("Testing database schema...")
    
    # Create temporary database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_db:
        db_path = tmp_db.name
    
    try:
        # Initialize database with schema
        schema_path = os.path.join(os.path.dirname(__file__), "database_schema.sql")
        if not os.path.exists(schema_path):
            print("❌ Database schema file not found")
            return False
        
        conn = sqlite3.connect(db_path)
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        conn.executescript(schema_sql)
        
        # Test that tables were created
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['events', 'predictions', 'model_performance', 'trust_scores', 'categories']
        for table in expected_tables:
            if table not in tables:
                print(f"❌ Table {table} not created")
                return False
        
        print("✅ Database schema test passed")
        return True
        
    except Exception as e:
        print(f"❌ Database schema test failed: {e}")
        return False
    finally:
        conn.close()
        os.unlink(db_path)

def test_trust_metrics_calculation():
    """Test trust metrics calculation with sample data"""
    print("Testing trust metrics calculation...")
    
    # Create temporary database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_db:
        db_path = tmp_db.name
    
    try:
        # Initialize database
        schema_path = os.path.join(os.path.dirname(__file__), "database_schema.sql")
        conn = sqlite3.connect(db_path)
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        conn.executescript(schema_sql)
        
        # Insert sample data
        cursor = conn.cursor()
        
        # Insert sample event
        cursor.execute('''
            INSERT INTO events (event_id, event_title, category, event_date, resolved_date, resolved_outcome, options)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            'test_event_1',
            'Test Basketball Game',
            'sports',
            '2024-01-01',
            '2024-01-02',
            'Team A',
            '["Team A", "Team B"]'
        ))
        
        # Insert sample predictions
        sample_predictions = [
            ('test_event_1', 'GPT-4', 'Team A', 0.7, True, 0.4),
            ('test_event_1', 'GPT-4', 'Team B', 0.3, False, 0.4),
            ('test_event_1', 'Claude', 'Team A', 0.6, True, 0.2),
            ('test_event_1', 'Claude', 'Team B', 0.4, False, 0.2),
        ]
        
        for pred in sample_predictions:
            cursor.execute('''
                INSERT INTO predictions (event_id, model_name, predicted_option, probability, is_correct, confidence_score)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', pred)
        
        conn.commit()
        conn.close()
        
        # Test trust metrics calculation
        calculator = TrustMetricsCalculator(db_path)
        
        # Calculate trust score for GPT-4
        gpt4_metrics = calculator.calculate_trust_score('GPT-4')
        
        if gpt4_metrics.trust_score > 0 and gpt4_metrics.accuracy > 0:
            print("✅ Trust metrics calculation test passed")
            print(f"   GPT-4 Trust Score: {gpt4_metrics.trust_score:.3f}")
            print(f"   GPT-4 Accuracy: {gpt4_metrics.accuracy:.3f}")
            return True
        else:
            print("❌ Trust metrics calculation test failed")
            return False
            
    except Exception as e:
        print(f"❌ Trust metrics calculation test failed: {e}")
        return False
    finally:
        os.unlink(db_path)

def test_data_structures():
    """Test data structure classes"""
    print("Testing data structures...")
    
    try:
        # Test PredictionData
        prediction = PredictionData(
            model_name="Test Model",
            option="Test Option",
            probability=0.8,
            is_correct=True,
            confidence_score=0.6
        )
        
        if prediction.model_name != "Test Model":
            print("❌ PredictionData test failed")
            return False
        
        # Test EventData
        event = EventData(
            event_id="test_event",
            event_title="Test Event",
            category="sports",
            event_date="2024-01-01",
            resolved_date="2024-01-02",
            resolved_outcome="Winner",
            options=["Option 1", "Option 2"],
            predictions=[prediction],
            metadata={"test": "value"}
        )
        
        if event.event_id != "test_event" or len(event.predictions) != 1:
            print("❌ EventData test failed")
            return False
        
        print("✅ Data structures test passed")
        return True
        
    except Exception as e:
        print(f"❌ Data structures test failed: {e}")
        return False

def test_configuration():
    """Test configuration loading"""
    print("Testing configuration...")
    
    try:
        # Create temporary config file
        test_config = {
            "database_path": "test.db",
            "scraping": {
                "headless": True,
                "categories": ["sports"],
                "limit_per_category": 5
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_config:
            json.dump(test_config, tmp_config)
            config_path = tmp_config.name
        
        # Test pipeline initialization
        pipeline = ProphetArenaDataPipeline(config_path)
        
        if pipeline.config['database_path'] != "test.db":
            print("❌ Configuration test failed")
            return False
        
        print("✅ Configuration test passed")
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False
    finally:
        if 'config_path' in locals():
            os.unlink(config_path)

def main():
    """Run all tests"""
    print("Prophet Arena Data Extraction System - Test Suite")
    print("=" * 50)
    
    tests = [
        test_data_structures,
        test_configuration,
        test_database_schema,
        test_trust_metrics_calculation,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            print()
    
    print("=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The system is ready to use.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
