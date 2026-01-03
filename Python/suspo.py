import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime

# --- CONFIGURATION & MAPPING ---
# Expanded Country Mapping
PORT_TO_COUNTRY = {
    'SHANGHAI': 'CHINA', 'NINGBO': 'CHINA', 'QINGDAO': 'CHINA', 'XINGANG': 'CHINA', 
    'TIANJIN': 'CHINA', 'SHENZHEN': 'CHINA', 'XIAMEN': 'CHINA', 'HK': 'HONG KONG', 'HONG KONG': 'HONG KONG',
    'SINGAPORE': 'SINGAPORE', 'PORT KLANG': 'MALAYSIA', 'BUSAN': 'SOUTH KOREA',
    'JEBEL ALI': 'UAE', 'DUBAI': 'UAE', 'ABU DHABI': 'UAE', 'SHARJAH': 'UAE',
    'MELBOURNE': 'AUSTRALIA', 'SYDNEY': 'AUSTRALIA', 'BRISBANE': 'AUSTRALIA', 
    'ADELAIDE': 'AUSTRALIA', 'FREMANTLE': 'AUSTRALIA',
    'AUCKLAND': 'NEW ZEALAND', 'LYTTELTON': 'NEW ZEALAND', 'WELLINGTON': 'NEW ZEALAND', 'TAURANGA': 'NEW ZEALAND',
    'LOS ANGELES': 'USA', 'LONG BEACH': 'USA', 'NEW YORK': 'USA', 'CHICAGO': 'USA', 
    'HOUSTON': 'USA', 'SAVANNAH': 'USA', 'NORFOLK': 'USA', 'OAKLAND': 'USA',
    'HAMBURG': 'GERMANY', 'BREMERHAVEN': 'GERMANY',
    'ROTTERDAM': 'NETHERLANDS', 'ANTWERP': 'BELGIUM',
    'LONDON': 'UK', 'SOUTHAMPTON': 'UK', 'FELIXSTOWE': 'UK', 'LIVERPOOL': 'UK',
    'ISTANBUL': 'TURKEY', 'AMBARLI': 'TURKEY', 'MERSIN': 'TURKEY', 'IZMIR': 'TURKEY', 'GEMLIK': 'TURKEY',
    'HO CHI MINH': 'VIETNAM', 'HAIPHONG': 'VIETNAM',
    'BANGKOK': 'THAILAND', 'LAEM CHABANG': 'THAILAND',
    'NHAVA SHEVA': 'INDIA', 'MUNDRA': 'INDIA', 'CHENNAI': 'INDIA',
    'TOKYO': 'JAPAN', 'YOKOHAMA': 'JAPAN', 'OSAKA': 'JAPAN', 'KOBE': 'JAPAN'
}

HOT_SPOTS = ['JEBEL ALI', 'TURKEY', 'AMBARLI', 'ISTANBUL', 'MERSIN', 'DUBAI', 'UAE']

def log(msg):
    print(msg, flush=True)

def get_country(city):
    return PORT_TO_COUNTRY.get(str(city).upper(), 'Unknown')

def clean_num(val, unit):
    if pd.isna(val) or val == '': return 0.0
    clean = str(val).upper().replace(unit, '').replace(',', '').strip()
    try: return float(clean)
    except: return 0.0

def analyze_cargo_intelligence(filename):
    log("\n" + "="*50)
    log(f"   INITIATING CARGO INTELLIGENCE SCAN: {filename}")
    log("="*50)

    # 1. LOAD DATA
    try:
        try:
            df = pd.read_csv(filename, on_bad_lines='skip')
        except:
            df = pd.read_csv(filename, engine='python', on_bad_lines='skip')
        
        log(f"[INFO] Data loaded. Rows: {len(df)}")
    except Exception as e:
        log(f"[CRITICAL] Failed to load file: {e}")
        return

    # 2. DATA PRE-PROCESSING
    log("[INFO] Normalizing numeric data and parsing routes...")
    df['Weight_kg'] = df['Weight'].apply(lambda x: clean_num(x, 'KG'))
    df['Cubic_m3'] = df['Cubic'].apply(lambda x: clean_num(x, 'M3'))
    df['Pieces_Num'] = df['Pieces'].apply(lambda x: pd.to_numeric(x, errors='coerce')).fillna(0)

    # Journey Parsing
    def parse_journey(val):
        val = str(val)
        if ' to ' in val:
            parts = val.split(' to ')
            return parts[0].strip(), parts[1].strip()
        return val, 'Unknown'

    journey_data = df['Journey'].apply(parse_journey).tolist()
    df['Origin'] = [x[0] for x in journey_data]
    df['Destination'] = [x[1] for x in journey_data]
    df['Origin_Country'] = df['Origin'].apply(get_country)
    df['Dest_Country'] = df['Destination'].apply(get_country)

    # Date Parsing
    df['DepartureDate'] = pd.to_datetime(df['DepartureDate'], errors='coerce')
    df['ArrivalDate'] = pd.to_datetime(df['ArrivalDate'], errors='coerce')
    df['Duration'] = (df['ArrivalDate'] - df['DepartureDate']).dt.days
    df['DayOfWeek'] = df['DepartureDate'].dt.day_name()

    # 3. BASE RISK ASSESSMENT
    log("[INFO] Applying Risk Logic Definitions...")
    
    # Density Calculation
    df['Density'] = df['Weight_kg'] / df['Cubic_m3']
    df['Density'] = df['Density'].replace([np.inf, -np.inf], 0).fillna(0)
    
    # Risk Flags
    hot_pattern = '|'.join(HOT_SPOTS)
    
    # Flag 1: High Risk Origin
    df['Flag_HotOrigin'] = df['Origin'].str.upper().str.contains(hot_pattern, na=False, regex=True)
    
    # Flag 2: Tobacco Density (Broad range 150-400 to catch various packagings)
    df['Flag_Density'] = (df['Density'] >= 150) & (df['Density'] <= 400)
    
    # Flag 3: Cigarette Master Case Weight (8-25kg per piece is typical for master cases)
    df['Weight_Per_Piece'] = (df['Weight_kg'] / df['Pieces_Num']).replace([np.inf, -np.inf], 0).fillna(0)
    df['Flag_CaseWeight'] = (df['Weight_Per_Piece'] >= 8) & (df['Weight_Per_Piece'] <= 30)

    # Composite Risk Score
    def get_risk_label(row):
        risks = []
        if row['Flag_HotOrigin']: risks.append('High Risk Origin')
        if row['Flag_Density']: risks.append('Tobacco Density')
        
        # High Confidence Alert: Hot Origin + Tobacco Density
        if row['Flag_HotOrigin'] and row['Flag_Density']:
            return 'HIGH: Origin + Density Match'
        # Medium Alert: Density + Case Weight (Suspicious packaging regardless of origin)
        elif row['Flag_Density'] and row['Flag_CaseWeight']:
            return 'MEDIUM: Density + Case Profile'
        # Watchlist: Just Hot Origin
        elif row['Flag_HotOrigin']:
            return 'WATCH: High Risk Origin'
        # Low
        else:
            return 'Low/Normal'

    df['Risk_Level'] = df.apply(get_risk_label, axis=1)
    suspicious_df = df[df['Risk_Level'] != 'Low/Normal'].copy()

    # 4. INTELLIGENCE & INFERENCE ENGINE (The 10 Facts)
    log("\n" + "="*20 + " INTELLIGENCE REPORT " + "="*20)

    # Fact 1: High Risk Country Conversion Rate
    # "Of everything from Turkey, what % was Tobacco Density?"
    log("\n[1] HIGH RISK ORIGIN TOBACCO CONVERSION (Vulnerability Check)")
    hot_origins = df[df['Flag_HotOrigin']]
    if not hot_origins.empty:
        # FIXED LINE BELOW: Selected column before applying lambda
        conversion = hot_origins.groupby('Origin')['Flag_Density'].apply(lambda x: (x.sum() / len(x)) * 100)
        print(conversion.sort_values(ascending=False).to_string(float_format="%.2f%%"))
    else: 
        log("No high risk origins found.")

    # Fact 2: Global Tobacco Density Distribution
    # "Where is the tobacco density cargo coming from generally?"
    log("\n[2] TOP ORIGINS FOR TOBACCO DENSITY MATCHES (Global)")
    tobacco_matches = df[df['Flag_Density']]
    print(tobacco_matches['Origin'].value_counts().head(10).to_string())

    # Fact 3: Highest Risk Ratio
    # Which country has the highest % of suspicious cargo vs clean cargo?
    log("\n[3] HIGHEST RISK RATIO BY COUNTRY (Min 15 shipments)")
    country_stats = df.groupby('Origin_Country').agg(
        Total=('Reference', 'count'),
        Suspicious=('Risk_Level', lambda x: (x != 'Low/Normal').sum())
    )
    country_stats['Risk_Ratio'] = (country_stats['Suspicious'] / country_stats['Total']) * 100
    print(country_stats[country_stats['Total'] > 15].sort_values('Risk_Ratio', ascending=False).head(10).to_string(float_format="%.1f%%"))

    # Fact 4: Vessel Risk Profile
    log("\n[4] TOP VESSELS BY HIGH RISK CARGO COUNT")
    vessel_risk = suspicious_df[suspicious_df['Risk_Level'].str.contains('HIGH')]['VehicleName'].value_counts().head(10)
    print(vessel_risk.to_string())

    # Fact 5: Ghost Shipments
    # Shipments with 0 Weight or 0 Pieces
    log("\n[5] GHOST SHIPMENTS (0 Kg or 0 Pieces - Potential Manifest Manipulation)")
    ghosts = df[(df['Weight_kg'] == 0) | (df['Pieces_Num'] == 0)]
    ghost_origin = ghosts['Origin'].value_counts().head(10)
    print(f"Total Ghost Shipments: {len(ghosts)}")
    if not ghost_origin.empty:
        print("Top Origins for Ghosts:")
        print(ghost_origin.to_string())

    # Fact 6: Weekend Warrior Analysis
    # Do suspicious shipments leave on weekends?
    log("\n[6] WEEKEND DEPARTURES (Suspicious Cargo leaving Sat/Sun)")
    suspicious_df['IsWeekend'] = suspicious_df['DayOfWeek'].isin(['Saturday', 'Sunday'])
    weekend_count = suspicious_df['IsWeekend'].sum()
    weekend_pct = (weekend_count / len(suspicious_df) * 100) if len(suspicious_df) > 0 else 0
    print(f"Suspicious Cargo Departing Weekends: {weekend_count} ({weekend_pct:.1f}%)")
    
    # Fact 7: The "Standard Box" Theory
    # Most common exact cubic size in suspicious cargo (indicates standard illicit packaging)
    log("\n[7] THE 'STANDARD BOX' (Most frequent exact cubic sizes in suspicious cargo)")
    print(suspicious_df['Cubic'].value_counts().head(10).to_string())

    # Fact 8: Route Latency
    # Do suspicious items take longer?
    log("\n[8] ROUTE LATENCY (Avg Transit Time)")
    avg_dur_clean = df[df['Risk_Level'] == 'Low/Normal']['Duration'].mean()
    avg_dur_susp = suspicious_df['Duration'].mean()
    print(f"Avg Transit (Normal Cargo):     {avg_dur_clean:.1f} days")
    print(f"Avg Transit (Suspicious Cargo): {avg_dur_susp:.1f} days")
    
    # Fact 9: Status Stagnation
    # Shipments where StatusDate is significantly after Arrival (Sitting at port?)
    log("\n[9] PORT STAGNATION (Status Update > 10 Days after Arrival)")
    df['StatusDateUtc'] = pd.to_datetime(df['StatusDateUtc'], errors='coerce')
    # If Status Date is > 10 days after Arrival Date
    stagnant = df[(df['StatusDateUtc'] - df['ArrivalDate']).dt.days > 10]
    print(f"Shipments Stagnating: {len(stagnant)}")
    if not stagnant.empty:
        print("Top Origins for Stagnant Cargo:")
        print(stagnant['Origin'].value_counts().head(5).to_string())

    # Fact 10: "Heavy" Route
    # Route with highest average weight per shipment
    log("\n[10] HEAVIEST ROUTES (Avg Kg per shipment - Top 5)")
    route_weight = df.groupby(['Origin', 'Destination'])['Weight_kg'].mean().sort_values(ascending=False).head(5)
    print(route_weight.to_string(float_format="%.0f kg"))

    # 5. SAVING OUTPUTS
    log("\n" + "="*50)
    
    # Save Suspicious
    if not suspicious_df.empty:
        out_sus = f"INTELLIGENCE_SUSPICIOUS_{filename}"
        cols_sus = ['Reference', 'Origin', 'Dest_Country', 'Risk_Level', 'Flag_Density', 'Flag_HotOrigin', 
                    'Pieces', 'Weight', 'Cubic', 'Density', 'VehicleName', 'DepartureDate', 'DayOfWeek', 'Status']
        # Filter cols that exist
        final_cols = [c for c in cols_sus if c in suspicious_df.columns]
        suspicious_df[final_cols].to_csv(out_sus, index=False)
        log(f"[SAVED] Suspicious Cargo List: {out_sus}")

    # Save Stats
    out_stats = f"INTELLIGENCE_STATS_{filename}"
    # Create a summary stats dataframe
    stats_summary = df.groupby(['Origin', 'Destination']).agg(
        Count=('Reference', 'count'),
        High_Risk_Count=('Risk_Level', lambda x: x.str.contains('HIGH').sum()),
        Avg_Density=('Density', 'mean'),
        Avg_Weight=('Weight_kg', 'mean')
    ).sort_values('Count', ascending=False)
    
    stats_summary.to_csv(out_stats)
    log(f"[SAVED] Route Statistics: {out_stats}")
    log("="*50 + "\n")

def main():
    log("Smuggle Buster v5.0 (Fixed & Enhanced)")
    files = [f for f in os.listdir('.') if f.lower().endswith('.csv')]
    
    if not files:
        log("No CSV files found in directory.")
        input("Press Enter to exit.")
        return

    log(f"Found files: {files}")
    target = input(f"Enter filename to analyze (default: {files[0]}): ").strip()
    if not target: target = files[0]
    
    if os.path.exists(target):
        analyze_cargo_intelligence(target)
    else:
        log("File not found.")
    
    input("Press Enter to close.")

if __name__ == "__main__":
    main()
