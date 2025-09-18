#!/usr/bin/env python3
"""
Prophet Arena Data Scraper

This module provides functionality to scrape prediction data from Prophet Arena
for building trust metrics and model performance analysis.
"""

import time
import json
import csv
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import pandas as pd
from fake_useragent import UserAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('prophet_arena_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class PredictionData:
    """Data structure for individual model predictions"""
    model_name: str
    option: str
    probability: float
    is_correct: bool
    confidence_score: float

@dataclass
class EventData:
    """Data structure for complete event information"""
    event_id: str
    event_title: str
    category: str
    event_date: str
    resolved_date: str
    resolved_outcome: str
    options: List[str]
    predictions: List[PredictionData]
    metadata: Dict[str, any]

class ProphetArenaScraper:
    """Main scraper class for Prophet Arena data extraction"""
    
    def __init__(self, headless: bool = True, delay_range: Tuple[int, int] = (2, 5)):
        """
        Initialize the scraper
        
        Args:
            headless: Whether to run browser in headless mode
            delay_range: Range of delays between requests (min, max) in seconds
        """
        self.base_url = "https://www.prophetarena.co"
        self.markets_url = f"{self.base_url}/markets"
        self.delay_range = delay_range
        self.ua = UserAgent()
        
        # Initialize browser
        self.driver = self._setup_driver(headless)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        
    def _setup_driver(self, headless: bool) -> webdriver.Chrome:
        """Setup Chrome driver with appropriate options"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument(f'--user-agent={self.ua.random}')
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        return driver
    
    def _random_delay(self):
        """Add random delay between requests"""
        import random
        delay = random.uniform(*self.delay_range)
        time.sleep(delay)
    
    def _extract_event_id(self, event_url: str) -> str:
        """Extract event ID from URL"""
        # This will need to be updated based on actual URL structure
        parsed = urlparse(event_url)
        path_parts = parsed.path.strip('/').split('/')
        return path_parts[-1] if path_parts else "unknown"
    
    def get_historical_events(self, category: str = None, limit: int = 100) -> List[str]:
        """
        Get list of historical event URLs
        
        Args:
            category: Filter by category ('sports', 'economics', 'crypto')
            limit: Maximum number of events to retrieve
            
        Returns:
            List of event URLs
        """
        logger.info(f"Fetching historical events for category: {category}")
        
        try:
            self.driver.get(self.markets_url)
            self._random_delay()
            
            # Enable historical filter
            try:
                historical_toggle = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Historical')]"))
                )
                historical_toggle.click()
                self._random_delay()
            except TimeoutException:
                logger.warning("Could not find Historical toggle button")
            
            # Apply category filter if specified
            if category:
                try:
                    category_filter = WebDriverWait(self.driver, 10).until(
                        EC.element_to_be_clickable((By.XPATH, f"//button[contains(text(), '{category.title()}')]"))
                    )
                    category_filter.click()
                    self._random_delay()
                except TimeoutException:
                    logger.warning(f"Could not find category filter for: {category}")
            
            # Scroll to load more events
            last_height = self.driver.execute_script("return document.body.scrollHeight")
            event_urls = []
            
            while len(event_urls) < limit:
                # Extract event links from current page
                event_elements = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/markets/']")
                current_urls = [elem.get_attribute('href') for elem in event_elements]
                event_urls.extend([url for url in current_urls if url not in event_urls])
                
                if len(event_urls) >= limit:
                    break
                
                # Scroll down
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self._random_delay()
                
                # Check if new content loaded
                new_height = self.driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height
            
            logger.info(f"Found {len(event_urls)} event URLs")
            return event_urls[:limit]
            
        except Exception as e:
            logger.error(f"Error fetching historical events: {e}")
            return []
    
    def scrape_event_data(self, event_url: str) -> Optional[EventData]:
        """
        Scrape data from a single event page
        
        Args:
            event_url: URL of the event to scrape
            
        Returns:
            EventData object or None if scraping failed
        """
        logger.info(f"Scraping event: {event_url}")
        
        try:
            self.driver.get(event_url)
            self._random_delay()
            
            # Wait for page to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Extract event metadata
            event_title = self._extract_event_title()
            category = self._extract_category()
            event_date = self._extract_event_date()
            resolved_date = self._extract_resolved_date()
            resolved_outcome = self._extract_resolved_outcome()
            options = self._extract_options()
            
            # Extract predictions table
            predictions = self._extract_predictions_table(resolved_outcome, options)
            
            # Extract additional metadata
            metadata = self._extract_metadata()
            
            event_data = EventData(
                event_id=self._extract_event_id(event_url),
                event_title=event_title,
                category=category,
                event_date=event_date,
                resolved_date=resolved_date,
                resolved_outcome=resolved_outcome,
                options=options,
                predictions=predictions,
                metadata=metadata
            )
            
            logger.info(f"Successfully scraped event: {event_title}")
            return event_data
            
        except Exception as e:
            logger.error(f"Error scraping event {event_url}: {e}")
            return None
    
    def _extract_event_title(self) -> str:
        """Extract event title from page"""
        try:
            title_element = self.driver.find_element(By.CSS_SELECTOR, "h1, .event-title, [data-testid='event-title']")
            return title_element.text.strip()
        except NoSuchElementException:
            return "Unknown Event"
    
    def _extract_category(self) -> str:
        """Extract event category"""
        try:
            category_element = self.driver.find_element(By.CSS_SELECTOR, ".category, [data-testid='category']")
            return category_element.text.strip().lower()
        except NoSuchElementException:
            return "unknown"
    
    def _extract_event_date(self) -> str:
        """Extract event date"""
        try:
            date_element = self.driver.find_element(By.CSS_SELECTOR, ".event-date, [data-testid='event-date']")
            return date_element.text.strip()
        except NoSuchElementException:
            return datetime.now().strftime("%Y-%m-%d")
    
    def _extract_resolved_date(self) -> str:
        """Extract resolved date"""
        try:
            resolved_element = self.driver.find_element(By.CSS_SELECTOR, ".resolved-date, [data-testid='resolved-date']")
            return resolved_element.text.strip()
        except NoSuchElementException:
            return datetime.now().strftime("%Y-%m-%d")
    
    def _extract_resolved_outcome(self) -> str:
        """Extract resolved outcome"""
        try:
            outcome_element = self.driver.find_element(By.CSS_SELECTOR, ".resolved-outcome, .winner, [data-testid='resolved-outcome']")
            return outcome_element.text.strip()
        except NoSuchElementException:
            return "Unknown"
    
    def _extract_options(self) -> List[str]:
        """Extract available options/contenders"""
        try:
            option_elements = self.driver.find_elements(By.CSS_SELECTOR, ".option, .contender, [data-testid='option']")
            return [elem.text.strip() for elem in option_elements if elem.text.strip()]
        except NoSuchElementException:
            return []
    
    def _extract_predictions_table(self, resolved_outcome: str, options: List[str]) -> List[PredictionData]:
        """Extract predictions table data"""
        predictions = []
        
        try:
            # Find predictions table
            table = self.driver.find_element(By.CSS_SELECTOR, "table, .predictions-table, [data-testid='predictions-table']")
            
            # Extract table headers (model names)
            headers = table.find_elements(By.CSS_SELECTOR, "th, .header")
            model_names = [header.text.strip() for header in headers[1:]]  # Skip first column (options)
            
            # Extract table rows (options and predictions)
            rows = table.find_elements(By.CSS_SELECTOR, "tr, .prediction-row")
            
            for row in rows[1:]:  # Skip header row
                cells = row.find_elements(By.CSS_SELECTOR, "td, .cell")
                if len(cells) < 2:
                    continue
                
                option = cells[0].text.strip()
                if option not in options:
                    continue
                
                # Extract predictions for this option
                for i, cell in enumerate(cells[1:], 1):
                    if i-1 < len(model_names):
                        try:
                            probability = float(cell.text.strip().replace('%', '')) / 100.0
                            is_correct = (option == resolved_outcome)
                            
                            prediction = PredictionData(
                                model_name=model_names[i-1],
                                option=option,
                                probability=probability,
                                is_correct=is_correct,
                                confidence_score=abs(probability - 0.5) * 2  # Convert to confidence score
                            )
                            predictions.append(prediction)
                        except ValueError:
                            continue
            
        except NoSuchElementException:
            logger.warning("Could not find predictions table")
        
        return predictions
    
    def _extract_metadata(self) -> Dict[str, any]:
        """Extract additional metadata"""
        metadata = {}
        
        try:
            # Extract prediction rationale if available
            rationale_element = self.driver.find_element(By.CSS_SELECTOR, ".rationale, .prediction-rationale")
            metadata['prediction_rationale'] = rationale_element.text.strip()
        except NoSuchElementException:
            pass
        
        try:
            # Extract sources used if available
            sources_elements = self.driver.find_elements(By.CSS_SELECTOR, ".sources, .source")
            metadata['sources_used'] = [elem.text.strip() for elem in sources_elements]
        except NoSuchElementException:
            pass
        
        metadata['scraped_at'] = datetime.now().isoformat()
        metadata['event_url'] = self.driver.current_url
        
        return metadata
    
    def scrape_all_historical_events(self, categories: List[str] = None, limit_per_category: int = 50) -> List[EventData]:
        """
        Scrape all historical events for specified categories
        
        Args:
            categories: List of categories to scrape
            limit_per_category: Maximum events per category
            
        Returns:
            List of EventData objects
        """
        if categories is None:
            categories = ['sports', 'economics', 'crypto']
        
        all_events = []
        
        for category in categories:
            logger.info(f"Scraping category: {category}")
            event_urls = self.get_historical_events(category, limit_per_category)
            
            for url in event_urls:
                event_data = self.scrape_event_data(url)
                if event_data:
                    all_events.append(event_data)
                self._random_delay()
        
        logger.info(f"Scraped {len(all_events)} total events")
        return all_events
    
    def save_to_csv(self, events: List[EventData], filename: str = None):
        """Save events data to CSV file"""
        if filename is None:
            filename = f"prophet_arena_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        rows = []
        for event in events:
            for prediction in event.predictions:
                rows.append({
                    'event_id': event.event_id,
                    'event_title': event.event_title,
                    'category': event.category,
                    'event_date': event.event_date,
                    'resolved_date': event.resolved_date,
                    'resolved_outcome': event.resolved_outcome,
                    'model_name': prediction.model_name,
                    'predicted_option': prediction.option,
                    'probability': prediction.probability,
                    'is_correct': prediction.is_correct,
                    'confidence_score': prediction.confidence_score,
                    'scraped_at': event.metadata.get('scraped_at', ''),
                    'event_url': event.metadata.get('event_url', '')
                })
        
        df = pd.DataFrame(rows)
        df.to_csv(filename, index=False)
        logger.info(f"Saved {len(rows)} prediction records to {filename}")
    
    def save_to_database(self, events: List[EventData], db_path: str = "prophet_arena.db"):
        """Save events data to SQLite database"""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                event_title TEXT,
                category TEXT,
                event_date TEXT,
                resolved_date TEXT,
                resolved_outcome TEXT,
                options TEXT,
                metadata TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT,
                model_name TEXT,
                predicted_option TEXT,
                probability REAL,
                is_correct BOOLEAN,
                confidence_score REAL,
                FOREIGN KEY (event_id) REFERENCES events (event_id)
            )
        ''')
        
        # Insert data
        for event in events:
            cursor.execute('''
                INSERT OR REPLACE INTO events 
                (event_id, event_title, category, event_date, resolved_date, resolved_outcome, options, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                event.event_id,
                event.event_title,
                event.category,
                event.event_date,
                event.resolved_date,
                event.resolved_outcome,
                json.dumps(event.options),
                json.dumps(event.metadata)
            ))
            
            for prediction in event.predictions:
                cursor.execute('''
                    INSERT INTO predictions 
                    (event_id, model_name, predicted_option, probability, is_correct, confidence_score)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    event.event_id,
                    prediction.model_name,
                    prediction.option,
                    prediction.probability,
                    prediction.is_correct,
                    prediction.confidence_score
                ))
        
        conn.commit()
        conn.close()
        logger.info(f"Saved {len(events)} events to database: {db_path}")
    
    def close(self):
        """Close browser and cleanup resources"""
        if self.driver:
            self.driver.quit()
        if self.session:
            self.session.close()

def main():
    """Main function for running the scraper"""
    scraper = ProphetArenaScraper(headless=False)  # Set to True for production
    
    try:
        # Scrape historical events
        events = scraper.scrape_all_historical_events(
            categories=['sports', 'economics', 'crypto'],
            limit_per_category=10  # Start with small number for testing
        )
        
        if events:
            # Save to CSV
            scraper.save_to_csv(events)
            
            # Save to database
            scraper.save_to_database(events)
            
            print(f"Successfully scraped {len(events)} events")
        else:
            print("No events were scraped")
            
    except Exception as e:
        logger.error(f"Error in main execution: {e}")
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
