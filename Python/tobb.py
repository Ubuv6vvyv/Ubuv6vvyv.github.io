import pandas as pd
import numpy as np
import os
from datetime import datetime
from collections import Counter

# --- CONFIGURATION & MAPPING ---
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
    'TOKYO': 'JAPAN', 'YOKOHAMA': 'JAPAN', 'OSAKA': 'JAPAN', 'KOBE': 'JAPAN',
    'AARHUS': 'DENMARK', 'COPENHAGEN': 'DENMARK'
}

HOT_SPOTS = ['JEBEL ALI', 'TURKEY', 'AMBARLI', 'ISTANBUL', 'MERSIN', 'DUBAI', 'UAE']

# Tobacco product density ranges (kg/m³)
TOBACCO_PROFILES = {
    'Cigarettes_Carton': (200, 280),
    'Cigarettes_MasterCase': (150, 220),
    'Loose_Tobacco': (250, 450),
    'Cigars': (180, 320),
    'Shisha_Tobacco': (300, 500)
}

def log(msg): print(msg, flush=True)

def get_country(city):
    return PORT_TO_COUNTRY.get(str(city).upper(), 'Unknown')

def clean_num(val, unit):
    if pd.isna(val) or val == '': return 0.0
    clean = str(val).upper().replace(unit, '').replace(',', '').strip()
    try: return float(clean)
    except: return 0.0

def analyze_cargo_intelligence(filename):
    log("\n" + "="*70)
    log(f"   ENHANCED CARGO INTELLIGENCE SCAN v6.0: {filename}")
    log("="*70)

    # 1. LOAD DATA
    try:
        df = pd.read_csv(filename, on_bad_lines='skip')
        log(f"[INFO] Data loaded. Rows: {len(df):,}")
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
    df['StatusDateUtc'] = pd.to_datetime(df['StatusDateUtc'], errors='coerce')
    df['Duration'] = (df['ArrivalDate'] - df['DepartureDate']).dt.days
    df['DayOfWeek'] = df['DepartureDate'].dt.day_name()
    df['DepartureHour'] = df['DepartureDate'].dt.hour
    df['Month'] = df['DepartureDate'].dt.month
    df['MonthName'] = df['DepartureDate'].dt.strftime('%B')
    df['IsWeekend'] = df['DayOfWeek'].isin(['Saturday', 'Sunday'])

    # 3. ADVANCED RISK ASSESSMENT
    log("[INFO] Applying Enhanced Risk Logic...")
    
    # Density Calculation
    df['Density'] = df['Weight_kg'] / df['Cubic_m3']
    df['Density'] = df['Density'].replace([np.inf, -np.inf], 0).fillna(0)
    
    # Weight per piece
    df['Weight_Per_Piece'] = (df['Weight_kg'] / df['Pieces_Num']).replace([np.inf, -np.inf], 0).fillna(0)
    
    # Cubic per piece
    df['Cubic_Per_Piece'] = (df['Cubic_m3'] / df['Pieces_Num']).replace([np.inf, -np.inf], 0).fillna(0)
    
    # Risk Flags
    hot_pattern = '|'.join(HOT_SPOTS)
    df['Flag_HotOrigin'] = df['Origin'].str.upper().str.contains(hot_pattern, na=False, regex=True)
    df['Flag_HotDest'] = df['Destination'].str.upper().str.contains(hot_pattern, na=False, regex=True)
    df['Flag_Density'] = (df['Density'] >= 150) & (df['Density'] <= 400)
    df['Flag_CaseWeight'] = (df['Weight_Per_Piece'] >= 8) & (df['Weight_Per_Piece'] <= 30)
    
    # Tobacco Product Type Classification
    def classify_tobacco_type(density):
        for prod_type, (min_d, max_d) in TOBACCO_PROFILES.items():
            if min_d <= density <= max_d:
                return prod_type
        return 'None'
    
    df['Tobacco_Type'] = df['Density'].apply(classify_tobacco_type)
    
    # Composite Risk Score (0-100)
    df['Risk_Score'] = 0
    df.loc[df['Flag_HotOrigin'], 'Risk_Score'] += 30
    df.loc[df['Flag_HotDest'], 'Risk_Score'] += 15
    df.loc[df['Flag_Density'], 'Risk_Score'] += 40
    df.loc[df['Flag_CaseWeight'], 'Risk_Score'] += 15
    df.loc[df['IsWeekend'], 'Risk_Score'] += 5
    df.loc[(df['DepartureHour'] >= 22) | (df['DepartureHour'] <= 5), 'Risk_Score'] += 5
    
    # Risk Level Classification
    def get_risk_label(score, row):
        if score >= 70:
            return 'CRITICAL: Multi-Flag Match'
        elif score >= 50 and row['Flag_HotOrigin'] and row['Flag_Density']:
            return 'HIGH: Origin + Density Match'
        elif score >= 40:
            return 'MEDIUM: Density + Profile'
        elif score >= 25:
            return 'WATCH: Elevated Indicators'
        else:
            return 'Low/Normal'
    
    df['Risk_Level'] = df.apply(lambda row: get_risk_label(row['Risk_Score'], row), axis=1)
    suspicious_df = df[df['Risk_Level'] != 'Low/Normal'].copy()

    # 4. ENHANCED INTELLIGENCE REPORT
    log("\n" + "="*25 + " INTELLIGENCE REPORT " + "="*25)
    
    # === TOBACCO-SPECIFIC ANALYTICS ===
    log("\n" + "─"*70)
    log("  SECTION A: TOBACCO PRODUCT INTELLIGENCE")
    log("─"*70)
    
    # A1: Tobacco Type Distribution
    log("\n[A1] TOBACCO PRODUCT TYPE DISTRIBUTION (by Density Profile)")
    tobacco_dist = df[df['Tobacco_Type'] != 'None']['Tobacco_Type'].value_counts()
    if not tobacco_dist.empty:
        total_tobacco = tobacco_dist.sum()
        for prod_type, count in tobacco_dist.items():
            pct = (count / total_tobacco) * 100
            log(f"  {prod_type:30s}: {count:5d} ({pct:5.1f}%)")
    else:
        log("  No tobacco-density matches found.")
    
    # A2: Tobacco Density Concentration by Origin
    log("\n[A2] TOBACCO DENSITY CONCENTRATION BY ORIGIN (Top 15)")
    tobacco_by_origin = df[df['Flag_Density']].groupby('Origin').agg(
        Count=('Reference', 'count'),
        Avg_Density=('Density', 'mean'),
        Avg_Weight=('Weight_kg', 'mean'),
        Total_Weight=('Weight_kg', 'sum')
    ).sort_values('Count', ascending=False).head(15)
    
    if not tobacco_by_origin.empty:
        for idx, row in tobacco_by_origin.iterrows():
            log(f"  {idx:20s}: {row['Count']:4.0f} shipments | "
                f"Avg Density: {row['Avg_Density']:6.1f} kg/m³ | "
                f"Total: {row['Total_Weight']:8.0f} kg")
    
    # A3: Cigarette Master Case Profile Detection
    log("\n[A3] CIGARETTE MASTER CASE PROFILE DETECTION")
    master_case = df[(df['Weight_Per_Piece'] >= 10) & (df['Weight_Per_Piece'] <= 25) & 
                     (df['Density'] >= 150) & (df['Density'] <= 220)]
    if not master_case.empty:
        log(f"  Total Matches: {len(master_case):,}")
        log(f"  Avg Weight/Piece: {master_case['Weight_Per_Piece'].mean():.1f} kg")
        log(f"  Avg Density: {master_case['Density'].mean():.1f} kg/m³")
        log("\n  Top Origins for Master Case Profile:")
        mc_origins = master_case['Origin'].value_counts().head(10)
        for origin, count in mc_origins.items():
            pct = (count / len(master_case)) * 100
            log(f"    {origin:20s}: {count:4d} ({pct:5.1f}%)")
    else:
        log("  No master case profiles detected.")
    
    # A4: Tobacco Corridor Analysis (Origin-Destination Pairs)
    log("\n[A4] HIGH-RISK TOBACCO CORRIDORS (Min 5 shipments)")
    tobacco_corridors = df[df['Flag_Density']].groupby(['Origin_Country', 'Dest_Country']).agg(
        Shipments=('Reference', 'count'),
        Avg_Density=('Density', 'mean'),
        Total_KG=('Weight_kg', 'sum')
    ).sort_values('Shipments', ascending=False)
    tobacco_corridors = tobacco_corridors[tobacco_corridors['Shipments'] >= 5].head(10)
    
    if not tobacco_corridors.empty:
        for (orig, dest), row in tobacco_corridors.iterrows():
            log(f"  {orig:15s} → {dest:15s}: {row['Shipments']:3.0f} shipments | "
                f"{row['Total_KG']:8.0f} kg | Avg Density: {row['Avg_Density']:6.1f}")
    
    # === TREND ANALYTICS ===
    log("\n" + "─"*70)
    log("  SECTION B: TEMPORAL & TREND ANALYSIS")
    log("─"*70)
    
    # B1: Monthly Risk Trend
    log("\n[B1] MONTHLY SUSPICIOUS CARGO TREND")
    monthly_risk = df[df['Risk_Score'] >= 40].groupby('MonthName').size()
    total_monthly = df.groupby('MonthName').size()
    
    if not monthly_risk.empty:
        month_order = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
        for month in month_order:
            if month in monthly_risk.index and month in total_monthly.index:
                susp = monthly_risk[month]
                total = total_monthly[month]
                pct = (susp / total) * 100
                log(f"  {month:10s}: {susp:4d}/{total:4d} ({pct:5.1f}% suspicious)")
    
    # B2: Day-of-Week Risk Pattern
    log("\n[B2] DEPARTURE DAY RISK PATTERN")
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_risk = df.groupby('DayOfWeek').agg(
        Total=('Reference', 'count'),
        Suspicious=('Risk_Score', lambda x: (x >= 40).sum())
    ).reindex(day_order)
    day_risk['Risk_Pct'] = (day_risk['Suspicious'] / day_risk['Total']) * 100
    
    for day, row in day_risk.iterrows():
        log(f"  {day:10s}: {row['Suspicious']:4.0f}/{row['Total']:4.0f} "
            f"({row['Risk_Pct']:5.1f}% suspicious)")
    
    # B3: Hour-of-Day Analysis (Night Departures)
    log("\n[B3] DEPARTURE HOUR ANALYSIS (Suspicious Cargo)")
    night_hours = suspicious_df[(suspicious_df['DepartureHour'] >= 20) | 
                                (suspicious_df['DepartureHour'] <= 6)]
    night_pct = (len(night_hours) / len(suspicious_df)) * 100 if len(suspicious_df) > 0 else 0
    log(f"  Night Departures (8PM-6AM): {len(night_hours):4d} ({night_pct:5.1f}%)")
    log(f"  Day Departures (6AM-8PM):   {len(suspicious_df) - len(night_hours):4d} "
        f"({100 - night_pct:5.1f}%)")
    
    # === PROBABILITY & PREDICTION METRICS ===
    log("\n" + "─"*70)
    log("  SECTION C: PROBABILITY & PREDICTIVE METRICS")
    log("─"*70)
    
    # C1: Conditional Probability Analysis
    log("\n[C1] CONDITIONAL PROBABILITY ANALYSIS")
    
    # P(Tobacco Density | Hot Origin)
    hot_origin = df[df['Flag_HotOrigin']]
    if not hot_origin.empty:
        p_tobacco_given_hot = (hot_origin['Flag_Density'].sum() / len(hot_origin)) * 100
        log(f"  P(Tobacco Density | Hot Origin): {p_tobacco_given_hot:5.1f}%")
    
    # P(Hot Origin | Tobacco Density)
    tobacco_dens = df[df['Flag_Density']]
    if not tobacco_dens.empty:
        p_hot_given_tobacco = (tobacco_dens['Flag_HotOrigin'].sum() / len(tobacco_dens)) * 100
        log(f"  P(Hot Origin | Tobacco Density): {p_hot_given_tobacco:5.1f}%")
    
    # Overall baseline
    baseline_tobacco = (df['Flag_Density'].sum() / len(df)) * 100
    log(f"  Baseline Tobacco Density Rate:   {baseline_tobacco:5.1f}%")
    
    # C2: Risk Score Distribution
    log("\n[C2] RISK SCORE DISTRIBUTION")
    score_bins = [0, 20, 40, 60, 80, 100]
    score_labels = ['0-20', '21-40', '41-60', '61-80', '81-100']
    df['Score_Bin'] = pd.cut(df['Risk_Score'], bins=score_bins, labels=score_labels, include_lowest=True)
    score_dist = df['Score_Bin'].value_counts().sort_index()
    
    for score_range, count in score_dist.items():
        pct = (count / len(df)) * 100
        log(f"  Score {score_range:8s}: {count:6d} ({pct:5.1f}%)")
    
    # C3: Vessel Risk Propensity
    log("\n[C3] VESSEL RISK PROPENSITY (Top 10 by % Suspicious, Min 10 shipments)")
    vessel_stats = df.groupby('VehicleName').agg(
        Total=('Reference', 'count'),
        Suspicious=('Risk_Score', lambda x: (x >= 40).sum())
    )
    vessel_stats = vessel_stats[vessel_stats['Total'] >= 10]
    vessel_stats['Risk_Pct'] = (vessel_stats['Suspicious'] / vessel_stats['Total']) * 100
    vessel_stats = vessel_stats.sort_values('Risk_Pct', ascending=False).head(10)
    
    if not vessel_stats.empty:
        for vessel, row in vessel_stats.iterrows():
            log(f"  {vessel:30s}: {row['Suspicious']:3.0f}/{row['Total']:3.0f} "
                f"({row['Risk_Pct']:5.1f}%)")
    
    # === ANOMALY DETECTION ===
    log("\n" + "─"*70)
    log("  SECTION D: ANOMALY DETECTION & OUTLIERS")
    log("─"*70)
    
    # D1: Extreme Density Outliers
    log("\n[D1] EXTREME DENSITY OUTLIERS (>3 Std Dev from Mean)")
    density_mean = df['Density'].mean()
    density_std = df['Density'].std()
    outliers = df[df['Density'] > density_mean + (3 * density_std)]
    if not outliers.empty:
        log(f"  Total Outliers: {len(outliers)}")
        log(f"  Avg Density: {outliers['Density'].mean():.1f} kg/m³")
        log("  Top Origins:")
        for origin, count in outliers['Origin'].value_counts().head(5).items():
            log(f"    {origin:20s}: {count:3d}")
    else:
        log("  No extreme outliers detected.")
    
    # D2: Size Anomalies (Huge or Tiny Shipments)
    log("\n[D2] SIZE ANOMALIES")
    huge_shipments = df[df['Weight_kg'] > df['Weight_kg'].quantile(0.99)]
    tiny_shipments = df[(df['Weight_kg'] > 0) & (df['Weight_kg'] < df['Weight_kg'].quantile(0.01))]
    
    log(f"  Huge Shipments (Top 1%): {len(huge_shipments):4d} | "
        f"Avg: {huge_shipments['Weight_kg'].mean():,.0f} kg")
    log(f"  Tiny Shipments (Bottom 1%): {len(tiny_shipments):4d} | "
        f"Avg: {tiny_shipments['Weight_kg'].mean():.1f} kg")
    
    # D3: Rapid Transit Analysis
    log("\n[D3] RAPID TRANSIT ANALYSIS (Unusually Fast Deliveries)")
    fast_transit = df[df['Duration'] < df['Duration'].quantile(0.05)]
    fast_suspicious = fast_transit[fast_transit['Risk_Score'] >= 40]
    
    if not fast_transit.empty:
        log(f"  Fast Shipments (Bottom 5% duration): {len(fast_transit):4d}")
        log(f"  Of those, Suspicious: {len(fast_suspicious):4d} "
            f"({(len(fast_suspicious)/len(fast_transit)*100):5.1f}%)")
        log(f"  Avg Duration (Fast): {fast_transit['Duration'].mean():.1f} days")
    
    # === CONCENTRATION METRICS ===
    log("\n" + "─"*70)
    log("  SECTION E: CONCENTRATION & DIVERSITY METRICS")
    log("─"*70)
    
    # E1: Origin Concentration Index (Herfindahl-Hirschman Index)
    log("\n[E1] ORIGIN CONCENTRATION INDEX (HHI)")
    origin_shares = df['Origin'].value_counts(normalize=True)
    hhi = (origin_shares ** 2).sum() * 10000
    log(f"  HHI Score: {hhi:.0f}")
    log(f"  Interpretation: {'Highly Concentrated' if hhi > 2500 else 'Moderately Concentrated' if hhi > 1500 else 'Diverse'}")
    
    # E2: Top Origin Market Share
    log("\n[E2] TOP ORIGIN MARKET SHARE (Tobacco Density Cargo)")
    if not tobacco_dens.empty:
        tobacco_origin_share = tobacco_dens['Origin'].value_counts(normalize=True).head(10) * 100
        for origin, share in tobacco_origin_share.items():
            log(f"  {origin:20s}: {share:5.1f}%")
    
    # E3: Route Diversity Score
    log("\n[E3] ROUTE DIVERSITY")
    total_routes = df.groupby(['Origin', 'Destination']).size()
    log(f"  Unique Routes: {len(total_routes):,}")
    log(f"  Avg Shipments per Route: {total_routes.mean():.1f}")
    log(f"  Most Trafficked Route: {total_routes.idxmax()} ({total_routes.max()} shipments)")
    
    # === COMPARATIVE ANALYTICS ===
    log("\n" + "─"*70)
    log("  SECTION F: COMPARATIVE ANALYTICS")
    log("─"*70)
    
    # F1: Hot Origin vs Non-Hot Origin Comparison
    log("\n[F1] HOT ORIGIN vs CLEAN ORIGIN COMPARISON")
    hot_stats = df[df['Flag_HotOrigin']].agg({
        'Risk_Score': 'mean',
        'Density': 'mean',
        'Weight_kg': 'mean',
        'Duration': 'mean'
    })
    clean_stats = df[~df['Flag_HotOrigin']].agg({
        'Risk_Score': 'mean',
        'Density': 'mean',
        'Weight_kg': 'mean',
        'Duration': 'mean'
    })
    
    log(f"  Avg Risk Score:  Hot={hot_stats['Risk_Score']:.1f} | Clean={clean_stats['Risk_Score']:.1f}")
    log(f"  Avg Density:     Hot={hot_stats['Density']:.1f} | Clean={clean_stats['Density']:.1f} kg/m³")
    log(f"  Avg Weight:      Hot={hot_stats['Weight_kg']:.1f} | Clean={clean_stats['Weight_kg']:.1f} kg")
    log(f"  Avg Duration:    Hot={hot_stats['Duration']:.1f} | Clean={clean_stats['Duration']:.1f} days")
    
    # F2: Weekend vs Weekday Comparison
    log("\n[F2] WEEKEND vs WEEKDAY DEPARTURE COMPARISON")
    weekend_risk = df[df['IsWeekend']]['Risk_Score'].mean()
    weekday_risk = df[~df['IsWeekend']]['Risk_Score'].mean()
    log(f"  Avg Risk Score (Weekend): {weekend_risk:.1f}")
    log(f"  Avg Risk Score (Weekday): {weekday_risk:.1f}")
    log(f"  Differential: {weekend_risk - weekday_risk:+.1f} points")
    
    # === ORIGINAL METRICS (Enhanced) ===
    log("\n" + "─"*70)
    log("  SECTION G: ENHANCED ORIGINAL METRICS")
    log("─"*70)
    
    # G1: High Risk Country Conversion Rate
    log("\n[G1] HIGH RISK ORIGIN TOBACCO CONVERSION")
    hot_origins_df = df[df['Flag_HotOrigin']]
    if not hot_origins_df.empty:
        conversion = hot_origins_df.groupby('Origin').agg(
            Total=('Reference', 'count'),
            Tobacco=('Flag_Density', 'sum')
        )
        conversion['Conversion_Pct'] = (conversion['Tobacco'] / conversion['Total']) * 100
        conversion = conversion.sort_values('Conversion_Pct', ascending=False).head(10)
        
        for origin, row in conversion.iterrows():
            log(f"  {origin:20s}: {row['Tobacco']:3.0f}/{row['Total']:3.0f} "
                f"({row['Conversion_Pct']:5.1f}%)")
    
    # G2: Ghost Shipments with Enhanced Metrics
    log("\n[G2] GHOST SHIPMENTS (Enhanced)")
    ghosts = df[(df['Weight_kg'] == 0) | (df['Pieces_Num'] == 0)]
    if not ghosts.empty:
        log(f"  Total Ghost Shipments: {len(ghosts):,} ({(len(ghosts)/len(df)*100):.1f}% of all cargo)")
        ghost_suspicious = ghosts[ghosts['Risk_Score'] >= 40]
        log(f"  Suspicious Ghosts: {len(ghost_suspicious):,} ({(len(ghost_suspicious)/len(ghosts)*100):.1f}%)")
        
        log("  Top Ghost Origins:")
        for origin, count in ghosts['Origin'].value_counts().head(5).items():
            log(f"    {origin:20s}: {count:3d}")
    
    # G3: Port Stagnation Enhanced
    log("\n[G3] PORT STAGNATION ANALYSIS")
    df['Stagnation_Days'] = (df['StatusDateUtc'] - df['ArrivalDate']).dt.days
    stagnant = df[df['Stagnation_Days'] > 10]
    stagnant_suspicious = stagnant[stagnant['Risk_Score'] >= 40]
    
    if not stagnant.empty:
        log(f"  Total Stagnant: {len(stagnant):,}")
        log(f"  Suspicious Stagnant: {len(stagnant_suspicious):,} "
            f"({(len(stagnant_suspicious)/len(stagnant)*100):.1f}%)")
        log(f"  Avg Stagnation: {stagnant['Stagnation_Days'].mean():.1f} days")
        
        log("  Stagnation by Destination:")
        for dest, count in stagnant['Destination'].value_counts().head(5).items():
            log(f"    {dest:20s}: {count:3d}")
    
    # === SUMMARY STATISTICS ===
    log("\n" + "="*70)
    log("  EXECUTIVE SUMMARY")
    log("="*70)
    
    total_shipments = len(df)
    critical = len(df[df['Risk_Level'].str.contains('CRITICAL', na=False)])
    high_risk = len(df[df['Risk_Level'].str.contains('HIGH', na=False)])
    medium_risk = len(df[df['Risk_Level'].str.contains('MEDIUM', na=False)])
    watch = len(df[df['Risk_Level'].str.contains('WATCH', na=False)])
    
    log(f"\n  Total Shipments Analyzed: {total_shipments:,}")
    log(f"  Critical Risk:  {critical:6,} ({(critical/total_shipments*100):5.1f}%)")
    log(f"  High Risk:      {high_risk:6,} ({(high_risk/total_shipments*100):5.1f}%)")
    log(f"  Medium Risk:    {medium_risk:6,} ({(medium_risk/total_shipments*100):5.1f}%)")
    log(f"  Watch List:     {watch:6,} ({(watch/total_shipments*100):5.1f}%)")
    log(f"  Low/Normal:     {total_shipments-critical-high_risk-medium_risk-watch:6,} "
        f"({((total_shipments-critical-high_risk-medium_risk-watch)/total_shipments*100):5.1f}%)")
    log(f"\n  Tobacco Density Matches: {len(df[df['Flag_Density']]):,} ({(len(df[df['Flag_Density']])/total_shipments*100):5.1f}%)")
    log(f"  Hot Origin Shipments: {len(df[df['Flag_HotOrigin']]):,} ({(len(df[df['Flag_HotOrigin']])/total_shipments*100):5.1f}%)")
    log(f"  Average Risk Score: {df['Risk_Score'].mean():.1f}/100")
    
    log("\n  Top 3 Highest Risk Origins:")
    top_risk_origins = df.groupby('Origin')['Risk_Score'].mean().sort_values(ascending=False).head(3)
    for origin, score in top_risk_origins.items():
        log(f"    {origin:20s}: {score:.1f}/100")
    
    log("\n  Top 3 Highest Volume Tobacco Routes:")
    top_tobacco_routes = df[df['Flag_Density']].groupby(['Origin', 'Destination']).size().sort_values(ascending=False).head(3)
    for (orig, dest), count in top_tobacco_routes.items():
        log(f"    {orig} → {dest}: {count} shipments")

    # 5. SAVING OUTPUTS
    log("\n" + "="*70)
    log("  SAVING INTELLIGENCE FILES")
    log("="*70)
    
    # Save Suspicious Cargo
    if not suspicious_df.empty:
        out_sus = f"INTELLIGENCE_SUSPICIOUS_{filename}"
        cols_sus = ['Reference', 'Origin', 'Destination', 'Dest_Country', 'Risk_Level', 'Risk_Score',
                    'Flag_Density', 'Flag_HotOrigin', 'Tobacco_Type', 'Pieces', 'Weight', 'Cubic', 
                    'Density', 'Weight_Per_Piece', 'VehicleName', 'DepartureDate', 'DayOfWeek', 
                    'DepartureHour', 'Duration', 'Status']
        final_cols = [c for c in cols_sus if c in suspicious_df.columns]
        suspicious_df[final_cols].to_csv(out_sus, index=False)
        log(f"  ✓ Suspicious Cargo: {out_sus}")
        log(f"    Records: {len(suspicious_df):,}")

    # Save Enhanced Statistics
    out_stats = f"INTELLIGENCE_STATS_{filename}"
    stats_summary = df.groupby(['Origin', 'Destination']).agg(
        Total_Shipments=('Reference', 'count'),
        High_Risk_Count=('Risk_Level', lambda x: x.str.contains('HIGH|CRITICAL').sum()),
        Tobacco_Count=('Flag_Density', 'sum'),
        Avg_Risk_Score=('Risk_Score', 'mean'),
        Avg_Density=('Density', 'mean'),
        Avg_Weight=('Weight_kg', 'mean'),
        Total_Weight=('Weight_kg', 'sum'),
        Avg_Duration=('Duration', 'mean')
    ).sort_values('Total_Shipments', ascending=False)
    
    stats_summary.to_csv(out_stats)
    log(f"  ✓ Route Statistics: {out_stats}")
    log(f"    Routes: {len(stats_summary):,}")
    
    # Save Critical Alerts Only
    critical_only = df[df['Risk_Level'].str.contains('CRITICAL', na=False)]
    if not critical_only.empty:
        out_critical = f"INTELLIGENCE_CRITICAL_ALERTS_{filename}"
        critical_only[final_cols].to_csv(out_critical, index=False)
        log(f"  ✓ Critical Alerts: {out_critical}")
        log(f"    Records: {len(critical_only):,}")
    
    # Save Tobacco Profile Report
    tobacco_only = df[df['Tobacco_Type'] != 'None']
    if not tobacco_only.empty:
        out_tobacco = f"INTELLIGENCE_TOBACCO_PROFILE_{filename}"
        tobacco_cols = ['Reference', 'Origin', 'Destination', 'Tobacco_Type', 'Density', 
                       'Weight', 'Cubic', 'Pieces', 'Weight_Per_Piece', 'VehicleName', 
                       'DepartureDate', 'Risk_Score']
        tobacco_final = [c for c in tobacco_cols if c in tobacco_only.columns]
        tobacco_only[tobacco_final].to_csv(out_tobacco, index=False)
        log(f"  ✓ Tobacco Profile: {out_tobacco}")
        log(f"    Records: {len(tobacco_only):,}")
    
    # Save Vessel Risk Report
    out_vessels = f"INTELLIGENCE_VESSEL_RISK_{filename}"
    vessel_report = df.groupby('VehicleName').agg(
        Total_Shipments=('Reference', 'count'),
        Suspicious_Count=('Risk_Score', lambda x: (x >= 40).sum()),
        Avg_Risk_Score=('Risk_Score', 'mean'),
        Tobacco_Count=('Flag_Density', 'sum'),
        Hot_Origin_Count=('Flag_HotOrigin', 'sum')
    )
    vessel_report['Suspicious_Pct'] = (vessel_report['Suspicious_Count'] / vessel_report['Total_Shipments']) * 100
    vessel_report = vessel_report.sort_values('Suspicious_Pct', ascending=False)
    vessel_report.to_csv(out_vessels)
    log(f"  ✓ Vessel Risk Profile: {out_vessels}")
    log(f"    Vessels: {len(vessel_report):,}")
    
    log("\n" + "="*70)
    log("  ANALYSIS COMPLETE")
    log("="*70 + "\n")

def main():
    log("\n" + "="*70)
    log("  CARGO INTELLIGENCE ANALYZER v6.0 - ENHANCED EDITION")
    log("  Advanced Tobacco Smuggling Detection & Trend Analysis")
    log("="*70)
    
    files = [f for f in os.listdir('.') if f.lower().endswith('.csv')]
    
    if not files:
        log("\n[ERROR] No CSV files found in current directory.")
        input("\nPress Enter to exit...")
        return

    log(f"\n[INFO] Found {len(files)} CSV file(s):")
    for i, f in enumerate(files, 1):
        log(f"  {i}. {f}")
    
    target = input(f"\nEnter filename to analyze (default: {files[0]}): ").strip()
    if not target: 
        target = files[0]
    
    if os.path.exists(target):
        analyze_cargo_intelligence(target)
        log("\n[SUCCESS] All intelligence files generated successfully.")
    else:
        log(f"\n[ERROR] File '{target}' not found.")
    
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
