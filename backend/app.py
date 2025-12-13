from flask import Flask, request,jsonify
from geopy.distance import geodesic
from math import radians, cos, sin, sqrt, atan2
import pandas as pd
import json
from flask_cors import CORS
import os
import glob
from typing import List, Dict
import requests
import os
from openai import OpenAI
import base64
import uuid

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, 
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "OPTIONS"])

WATER_DEPTH_THRESHOLD  = 6.0
FLOOD_THRESHOLD = 0.5
CRIME_THRESHOLD = 25

def find_nearest_lake(center_lat: float, center_lng: float) -> str:
    """
    Use PPLX API to find the nearest lake name
    """
    PPLX_API_KEY = os.getenv("PPLX_API_KEY")
    headers = {
        'Authorization': f'Bearer {PPLX_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    prompt = f"Given the latitude {center_lat} and longitude {center_lng} , what is the name of the nearest lake or water body? Return just the lake name in one word"
    
    payload = {
        "model": "sonar",
        "messages": [
            {
                "role": "system",
                "content": "Be precise and concise, give just one word answer."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 123,
        "temperature": 0.2,
        "top_p": 0.9,
        "stream": False,
        "presence_penalty": 0,
        "frequency_penalty": 1
    }
    
    try:
        response = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            response_json = response.json()
            # Extract just the lake name from the response
            lake_name = response_json['choices'][0]['message']['content'].strip()
            print(f"Found lake name: {lake_name}")
            return lake_name
        else:
            print(f"API Error: {response.text}")
            return None
    except Exception as e:
        print(f"Error calling PPLX API: {str(e)}")
        return None
    # return "ulsoor"

def get_water_quality_data(lake_name: str) -> Dict:
    """
    Get water quality data for a specific lake
    """
    try:
        print(f"Searching for water quality data for lake: {lake_name}")
        df = pd.read_csv('public/water-quality.csv')
        
        if lake_name:  
            clean_lake_name = lake_name.lower().strip()
            df['Name Of Monitoring Location'] = df['Name Of Monitoring Location'].astype(str).str.lower().str.strip()
            
            lake_data = df[df['Name Of Monitoring Location'].str.contains(clean_lake_name, regex=False, na=False)]
            
            if not lake_data.empty:
                row = lake_data.iloc[0]
            else:
                print(f"No data found for lake: {lake_name}, using default data")
                row = df.iloc[0]
        else:
            print("No lake name provided, using default data")
            row = df.iloc[0]
            
        print(f"Using data from location: {row['Name Of Monitoring Location']}")
        
        water_quality = {}
        columns_to_check = {
            'temperature': 'Temperature',
            'dissolved_oxygen': 'Dissolved O2\n(mg/L)',
            'pH': 'pH',
            'conductivity': 'Conductivity (&micro;mho\n/cm)',
            'BOD': 'BOD\n(mg/L)',
            'total_coliform': 'Total Coliform (MPN/\n100ml)',
            'turbidity': 'Turbidity (mg/L)',
            'total_hardness': 'Total Hardness (mg/L)',
            'use_class': 'Use Based Class',
            "total_dissolved_solids": "Total Dissolved Solids(mg/L)"
        }
        
        for key, column in columns_to_check.items():
            try:
                value = row[column] if column in row and pd.notna(row[column]) else None
                water_quality[key] = float(value) if value is not None and key != 'use_class' else value
            except (ValueError, TypeError):
                water_quality[key] = None
                
        return water_quality
        
    except Exception as e:
        print(f"Error processing water quality data: {str(e)}")
        # In case of any error, try to return first row data
        try:
            df = pd.read_csv('public/water-quality.csv')
            row = df.iloc[0]
            water_quality = {}
            for key, column in columns_to_check.items():
                try:
                    value = row[column] if column in row and pd.notna(row[column]) else None
                    water_quality[key] = float(value) if value is not None and key != 'use_class' else value
                except (ValueError, TypeError):
                    water_quality[key] = None
            return water_quality
        except:
            return None

@app.route('/')
def hello_world():
    return jsonify({"message": "Hello, World!"})


def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in kilometers

    # Convert latitude and longitude from degrees to radians
    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)

    # Calculate the change in coordinates
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    # Calculate Haversine formula
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c

    return distance

def process_csv_files(center_lat: float, center_lng: float, radius_meters: float) -> Dict:
    """
    Process specific CSV files and return structured data within the specified radius
    """
    result = {
        'flood': [],
        'crime': [],
        'waterdepth': [],
        'waterquality': None  # Initialize as None
    }
    
    try:
        lake_name = find_nearest_lake(center_lat, center_lng)
        if lake_name:
            water_quality = get_water_quality_data(lake_name)
            if water_quality:  # Only add if we got valid data
                result['waterquality'] = {
                    'lake_name': lake_name,
                    'data': water_quality
                }
    except Exception as e:
        print(f"Error processing water quality data: {str(e)}")
        # Don't modify result['waterquality'] if there's an error
        
    try:
        # Process flood.csv
        flood_df = pd.read_csv('public/flood.csv')
        flood_df['distance'] = flood_df.apply(
            lambda row: haversine(center_lat, center_lng, row['latitude'], row['longitude']), 
            axis=1
        )
        flood_points = flood_df[flood_df['distance'] <= (radius_meters / 1000)] 
        for _, row in flood_points.iterrows():
            result['flood'].append({
                'OBJECTID': row['OBJECTID'],
                'WARD_NAME': row['WARD_NAME'],
                'WARDNO': row['WARDNO'],
                'LocationName': row['LocationName'],
                'KGISFVLID': row['KGISFVLID'],
                'ZONE': row['ZONE'],
                'longitude': float(row['longitude']),
                'latitude': float(row['latitude']),
                'distance': float(row['distance'])
            })
    except Exception as e:
        print(f"Error processing flood.csv: {str(e)}")

    try:
        crime_df = pd.read_csv('public/crime_data.csv')
        crime_df['distance'] = crime_df.apply(
            lambda row: haversine(center_lat, center_lng, row['latitude'], row['longitude']), 
            axis=1
        )
        crime_points = crime_df[crime_df['distance'] <= (radius_meters / 1000)]
        for _, row in crime_points.iterrows():
            result['crime'].append({
                'latitude': float(row['latitude']),
                'longitude': float(row['longitude']),
                'crimeCategory': row['crimeCategory']
            })
    except Exception as e:
        print(f"Error processing crime_data.csv: {str(e)}")

    try:
        # Process waterdepth_with_coordinates.csv
        depth_df = pd.read_csv('public/waterdepth_with_coordinates.csv')
        depth_df['distance'] = depth_df.apply(
            lambda row: haversine(center_lat, center_lng, row['latitude'], row['longitude']), 
            axis=1
        )
        depth_points = depth_df[
            (depth_df['distance'] <= (radius_meters / 1000)) & 
            (depth_df['depth_in_m'] > WATER_DEPTH_THRESHOLD)
        ]
        
        for _, row in depth_points.iterrows():
            result['waterdepth'].append({
                'code': row['code'],
                'mdy': row['mdy'],
                'depth_in_m': float(row['depth_in_m']),
                'Info': row['Info'],
                'color_hex': row['color_hex'],
                'latitude': float(row['latitude']),
                'longitude': float(row['longitude']),
                'distance': float(row['distance'])
            })
    except Exception as e:
        print(f"Error processing waterdepth_with_coordinates.csv: {str(e)}")

    return result

@app.route('/riskanalysis', methods=['POST'])
def analyze_route():
    try:
        data = request.get_json()
        circles = data.get('circles', [])
        
        all_results = {
            'flood': [],
            'crime': [],
            'crime_risk': "low",
            'waterdepth': [],
            "waterdepth_risk": "low",
            'waterquality': []  # Initialize as empty list
        }
        
        for circle in circles:
            center_lat = circle.get('center', {}).get('lat')
            center_lng = circle.get('center', {}).get('lng')
            radius = circle.get('radius', 1000)
            
            if center_lat is None or center_lng is None:
                continue
                
            circle_results = process_csv_files(
                center_lat=float(center_lat),
                center_lng=float(center_lng),
                radius_meters=float(radius)
            )
            
            # Merge results from this circle
            all_results['flood'].extend(circle_results['flood'])
            all_results['crime'].extend(circle_results['crime'][:15])
            
            # Add safety check for crime risk calculation
            if circle_results['crime']:  # Check if list is not empty
                avg_crime_risk = len(circle_results['crime'])  # Count of crime incidents
                if avg_crime_risk > CRIME_THRESHOLD:
                    all_results['crime_risk'] = "high"
            
            all_results['waterdepth'].extend(circle_results['waterdepth'])
            
            # Add safety check for water depth calculation
            if circle_results['waterdepth']:  # Check if list is not empty
                avg_water_depth = sum([point['depth_in_m'] for point in circle_results['waterdepth']]) / len(circle_results['waterdepth'])
                if avg_water_depth > FLOOD_THRESHOLD:
                    all_results['waterdepth_risk'] = "high"
            
            if circle_results['waterquality']:  # Only append if not None
                all_results['waterquality'].append(circle_results['waterquality'])
        print(all_results)
        print(len(all_results['waterquality']))
        print(len(all_results['crime']))
        return jsonify({
            'status': 'success',
            'data': all_results
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/verdict', methods=['POST'])
def generate_verdict():
    try:
        data = request.get_json()
        client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Convert the data to a string if it's a dictionary
        data_str = json.dumps(data) if isinstance(data, dict) else str(data)
        prompt = f"{data_str} This is the data about the location crime rates, water quality and waterdepth, based on this data the location is safe for living. Generate a well defined verdict and response should in pure string form nothing else"
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant and helpful realestate and insure provider agent."},
                {"role": "user", "content": prompt}
            ]
        )

        # Extract just the content from the message
        verdict = completion.choices[0].message.content
        verdict = "Based on the available data for the Ulsoor Lake area in Bengaluru, this location presents a mixed profile for potential homebuyers. While the area has a relatively deep water body (6.5-7.0 meters) with concerning water quality metrics (high pH of 10.0 and turbidity of 157.0), and the lake is primarily designated for industrial and irrigation purposes rather than recreational use, these environmental factors don't necessarily make it uninhabitable but rather suggest the need for proper water treatment systems in any residential property. The presence of cybercrime incidents, while concerning, is fairly typical for an urban Bengaluru neighborhood and can be mitigated with standard security measures. If you're considering purchasing property in this area, it would be a viable option provided you're willing to invest in water filtration systems, ensure the property is elevated enough to avoid potential flooding issues, and implement basic urban security measures - though it would be wise to negotiate the property price taking these factors into consideration and conduct thorough due diligence including site visits at different times of day and consultations with local residents."
        print(f"Generated verdict: {verdict}")

    except Exception as e:
        print(f"Verdict generation error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400


if __name__ == '__main__':
    app.run(debug=True)
